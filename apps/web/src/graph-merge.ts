import type { GraphEdge, GraphNode, GraphSlice } from "./types";
export function mergeGraph(
  current: Pick<GraphSlice, "nodes" | "edges">,
  incoming: Pick<GraphSlice, "nodes" | "edges">,
): { nodes: GraphNode[]; edges: GraphEdge[] } {
  return {
    nodes: [
      ...new Map(
        [...current.nodes, ...incoming.nodes].map((item) => [item.id, item]),
      ).values(),
    ],
    edges: [
      ...new Map(
        [...current.edges, ...incoming.edges].map((item) => [item.id, item]),
      ).values(),
    ],
  };
}
