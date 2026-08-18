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

const DEFAULT_NEIGHBOR_LIMIT = 50;
const MAX_SEARCH_TERMS = 12;
const MIN_SEARCH_TERM_LENGTH = 3;
const RETRIEVAL_QUERY_ID = "retrieval.keyword-neighborhood.v1";

export type GraphPageInput = {
  cursor?: string;
  limit?: number;
  search?: string;
  label?: string;
};

function clampLimit(requested: number | undefined, fallback: number): number {
  return Math.min(requested ?? fallback, config.GRAPH_MAX_PAGE_SIZE);
}

function decodeOffset(cursor?: string): number {
  if (!cursor) return 0;

  const offset = Number(Buffer.from(cursor, "base64url").toString());
  return Number.isSafeInteger(offset) && offset >= 0 ? offset : 0;
}

function encodeOffset(offset: number): string {
  return Buffer.from(String(offset)).toString("base64url");
}

function extractSearchTerms(question: string): string[] {
  return question
    .toLowerCase()
    .split(/[^a-z0-9_-]+/)
    .filter((term) => term.length >= MIN_SEARCH_TERM_LENGTH)
    .slice(0, MAX_SEARCH_TERMS);
}

export class GraphService {
  async page(input: GraphPageInput): Promise<GraphSlice> {
    const limit = clampLimit(input.limit, config.GRAPH_PAGE_SIZE);
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
    const edges = await this.findInternalRelationships(
      nodes.map((node) => node.id),
    );
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
    limit = DEFAULT_NEIGHBOR_LIMIT,
    cursor?: string,
  ): Promise<GraphSlice> {
    const after = decodeOffset(cursor);
    const safeLimit = clampLimit(limit, DEFAULT_NEIGHBOR_LIMIT);
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
      const source = mapNode(sourceNode);
      const neighbor = mapNode(neighborNode);
      const relationship = row.get("r");
      nodesById.set(source.id, source);
      nodesById.set(neighbor.id, neighbor);
      edges.push(
        mapRelationshipBetween(
          relationship,
          sourceNode,
          source,
          neighborNode,
          neighbor,
        ),
      );
    }
    return {
      nodes: [...nodesById.values()],
      edges,
      nextCursor:
        result.records.length > safeLimit
          ? encodeOffset(after + safeLimit)
          : null,
    };
  }

  async retrieve(question: string): Promise<Evidence> {
    const started = Date.now();
    const terms = extractSearchTerms(question);
    const result = await read<{
      n: neo4j.Node;
      r: neo4j.Relationship | null;
      m: neo4j.Node | null;
    }>(GRAPH_QUERIES.keywordNeighborhood, { terms });
    const nodes = new Map<string, GraphNode>();
    const edges = new Map<string, GraphEdge>();
    for (const row of result.records) {
      const sourceNode = row.get("n");
      const source = mapNode(sourceNode);
      nodes.set(source.id, source);
      const neighborNode = row.get("m");
      const relationship = row.get("r");
      if (neighborNode && relationship) {
        const neighbor = mapNode(neighborNode);
        nodes.set(neighbor.id, neighbor);
        edges.set(
          relationship.elementId,
          mapRelationshipBetween(
            relationship,
            sourceNode,
            source,
            neighborNode,
            neighbor,
          ),
        );
      }
    }
    return {
      nodes: [...nodes.values()],
      edges: [...edges.values()],
      cypherId: RETRIEVAL_QUERY_ID,
      elapsedMs: Date.now() - started,
    };
  }

  private async findInternalRelationships(ids: string[]): Promise<GraphEdge[]> {
    if (ids.length === 0) return [];

    const result = await read<{
      r: neo4j.Relationship;
      rMap: Record<string, unknown>;
    }>(GRAPH_QUERIES.internalRelationships, { ids });

    return result.records.map((record) => {
      const relationship = record.get("r");
      const endpoints = record.get("rMap");

      return {
        ...mapRelationship(relationship),
        source: String(endpoints.fromId),
        target: String(endpoints.toId),
      };
    });
  }
}
