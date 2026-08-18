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
import {
  mapNode,
  mapRelationship,
  mapRelationshipBetween,
} from "./graph-mapper.js";
import { GRAPH_QUERIES } from "./graph-queries.js";

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
    const result = await read<{ n: neo4j.Node }>(GRAPH_QUERIES.pageNodes, {
      label: input.label ?? "",
      search: input.search ?? "",
      cursorName: cursor?.name ?? "",
      cursorId: cursor?.id ?? "",
      limitPlusOne: neo4j.int(limit + 1),
    });
    const pageRecords = result.records.slice(0, limit);
    const nodes = pageRecords.map((record) => mapNode(record.get("n")));
    const ids = nodes.map((n) => n.id);
    const rels = ids.length
      ? await read<{ r: neo4j.Relationship; rMap: Record<string, unknown> }>(
          GRAPH_QUERIES.internalRelationships,
          { ids },
        )
      : null;
    const edges =
      rels?.records.map((rec) => {
        const r = rec.get("r");
        const map = rec.get("rMap");
        return {
          ...mapRelationship(r),
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
    }>(GRAPH_QUERIES.neighbors, {
      id,
      after: neo4j.int(after),
      limitPlusOne: neo4j.int(safeLimit + 1),
    });
    const rows = result.records.slice(0, safeLimit);
    const nodesById = new Map<string, GraphNode>();
    const edges: GraphEdge[] = [];
    for (const row of rows) {
      const sourceNode = row.get("n");
      const neighborNode = row.get("other");
      const a = mapNode(sourceNode);
      const b = mapNode(neighborNode);
      const rel = row.get("r");
      nodesById.set(a.id, a);
      nodesById.set(b.id, b);
      edges.push(mapRelationshipBetween(rel, sourceNode, a, neighborNode, b));
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
    }>(GRAPH_QUERIES.keywordNeighborhood, { terms });
    const nodes = new Map<string, GraphNode>();
    const edges = new Map<string, GraphEdge>();
    for (const row of result.records) {
      const sourceNode = row.get("n");
      const a = mapNode(sourceNode);
      nodes.set(a.id, a);
      const bRaw = row.get("m");
      const r = row.get("r");
      if (bRaw && r) {
        const b = mapNode(bRaw);
        nodes.set(b.id, b);
        edges.set(
          r.elementId,
          mapRelationshipBetween(r, sourceNode, a, bRaw, b),
        );
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
