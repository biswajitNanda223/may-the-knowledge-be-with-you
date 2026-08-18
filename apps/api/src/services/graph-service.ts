import neo4j from "neo4j-driver";
import { config } from "../config.js";
import {
  decodeCursor,
  encodeCursor,
  type Evidence,
  type GraphEdge,
  type GraphNode,
  type GraphSlice,
} from "../domain/graph.js";
import { read } from "../infra/neo4j.js";

const val = (x: unknown): unknown =>
  neo4j.isInt(x) ? (x as neo4j.Integer).toNumber() : x;
const props = (p: Record<string, unknown>) =>
  Object.fromEntries(Object.entries(p).map(([k, v]) => [k, val(v)]));
const node = (n: neo4j.Node): GraphNode => ({
  id: String(n.properties.id ?? n.elementId),
  label: n.labels[0] ?? "Node",
  name: String(n.properties.name ?? n.properties.id ?? n.elementId),
  properties: props(n.properties),
});
const edge = (r: neo4j.Relationship): GraphEdge => ({
  id: r.elementId,
  source: String(r.properties.fromId ?? r.startNodeElementId),
  target: String(r.properties.toId ?? r.endNodeElementId),
  type: r.type,
  properties: props(r.properties),
});

export class GraphService {
  async page(input: {
    cursor?: string;
    limit?: number;
    search?: string;
    label?: string;
  }): Promise<GraphSlice> {
    const limit = Math.min(
      input.limit ?? config.GRAPH_PAGE_SIZE,
      config.GRAPH_MAX_PAGE_SIZE,
    );
    const cursor = decodeCursor(input.cursor);
    const result = await read<{ n: neo4j.Node }>(
      `
      MATCH (n) WHERE n.id IS NOT NULL
        AND ($label = '' OR $label IN labels(n))
        AND ($search = '' OR toLower(coalesce(n.name,n.id)) CONTAINS toLower($search))
        AND ($cursorName = '' OR coalesce(n.name,n.id) > $cursorName OR (coalesce(n.name,n.id) = $cursorName AND n.id > $cursorId))
      RETURN n ORDER BY coalesce(n.name,n.id), n.id LIMIT $limitPlusOne`,
      {
        label: input.label ?? "",
        search: input.search ?? "",
        cursorName: cursor?.name ?? "",
        cursorId: cursor?.id ?? "",
        limitPlusOne: neo4j.int(limit + 1),
      },
    );
    const pageRecords = result.records.slice(0, limit);
    const nodes = pageRecords.map((r) => node(r.get("n")));
    const ids = nodes.map((n) => n.id);
    const rels = ids.length
      ? await read<{ r: neo4j.Relationship; rMap: Record<string, unknown> }>(
          `
      MATCH (a)-[r]->(b) WHERE a.id IN $ids AND b.id IN $ids
      RETURN r{.*, fromId:a.id, toId:b.id} AS rMap, r`,
          { ids },
        )
      : null;
    const edges =
      rels?.records.map((rec) => {
        const r = rec.get("r");
        const map = rec.get("rMap");
        return {
          ...edge(r),
          source: String(map.fromId),
          target: String(map.toId),
        };
      }) ?? [];
    const last = nodes.at(-1);
    return {
      nodes,
      edges,
      nextCursor:
        result.records.length > limit && last
          ? encodeCursor(last.name, last.id)
          : null,
    };
  }

  async neighbors(
    id: string,
    limit = 50,
    cursor?: string,
  ): Promise<GraphSlice> {
    const after = cursor
      ? Number(Buffer.from(cursor, "base64url").toString())
      : 0;
    const safeLimit = Math.min(limit, config.GRAPH_MAX_PAGE_SIZE);
    const result = await read<{
      n: neo4j.Node;
      r: neo4j.Relationship;
      other: neo4j.Node;
    }>(
      `
      MATCH (n {id:$id})-[r]-(other) WITH n,r,other ORDER BY other.id
      SKIP $after LIMIT $limitPlusOne RETURN n,r,other`,
      { id, after: neo4j.int(after), limitPlusOne: neo4j.int(safeLimit + 1) },
    );
    const rows = result.records.slice(0, safeLimit);
    const nodesById = new Map<string, GraphNode>();
    const edges: GraphEdge[] = [];
    for (const row of rows) {
      const a = node(row.get("n"));
      const b = node(row.get("other"));
      const rel = row.get("r");
      nodesById.set(a.id, a);
      nodesById.set(b.id, b);
      edges.push({
        ...edge(rel),
        source: rel.startNodeElementId === row.get("n").elementId ? a.id : b.id,
        target:
          rel.endNodeElementId === row.get("other").elementId ? b.id : a.id,
      });
    }
    return {
      nodes: [...nodesById.values()],
      edges,
      nextCursor:
        result.records.length > safeLimit
          ? Buffer.from(String(after + safeLimit)).toString("base64url")
          : null,
    };
  }

  async retrieve(question: string): Promise<Evidence> {
    const started = Date.now();
    const terms = question
      .toLowerCase()
      .split(/[^a-z0-9_-]+/)
      .filter((x) => x.length > 2)
      .slice(0, 12);
    const result = await read<{
      n: neo4j.Node;
      r: neo4j.Relationship | null;
      m: neo4j.Node | null;
    }>(
      `
      MATCH (n) WHERE any(term IN $terms WHERE toLower(coalesce(n.name,'') + ' ' + coalesce(n.description,'') + ' ' + coalesce(n.id,'')) CONTAINS term)
      WITH n LIMIT 12 OPTIONAL MATCH (n)-[r]-(m) RETURN n,r,m LIMIT 60`,
      { terms },
    );
    const nodes = new Map<string, GraphNode>();
    const edges = new Map<string, GraphEdge>();
    for (const row of result.records) {
      const a = node(row.get("n"));
      nodes.set(a.id, a);
      const bRaw = row.get("m");
      const r = row.get("r");
      if (bRaw && r) {
        const b = node(bRaw);
        nodes.set(b.id, b);
        edges.set(r.elementId, {
          ...edge(r),
          source: r.startNodeElementId === row.get("n").elementId ? a.id : b.id,
          target: r.endNodeElementId === bRaw.elementId ? b.id : a.id,
        });
      }
    }
    return {
      nodes: [...nodes.values()],
      edges: [...edges.values()],
      cypherId: "retrieval.keyword-neighborhood.v1",
      elapsedMs: Date.now() - started,
    };
  }
}
