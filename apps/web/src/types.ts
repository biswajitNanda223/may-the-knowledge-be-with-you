export type GraphNode = { id: string; label: string; name: string; properties: Record<string, unknown> };
export type GraphEdge = { id: string; source: string; target: string; type: string; properties: Record<string, unknown> };
export type GraphSlice = { nodes: GraphNode[]; edges: GraphEdge[]; nextCursor: string | null };

