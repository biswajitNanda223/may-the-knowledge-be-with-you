export type GraphNode = { id: string; label: string; name: string; properties: Record<string, unknown> };
export type GraphEdge = { id: string; source: string; target: string; type: string; properties: Record<string, unknown> };
export type GraphSlice = { nodes: GraphNode[]; edges: GraphEdge[]; nextCursor: string | null };
export type Evidence = { nodes: GraphNode[]; edges: GraphEdge[]; cypherId: string; elapsedMs: number };
export const encodeCursor = (name: string, id: string) => Buffer.from(JSON.stringify({ name, id })).toString('base64url');
export const decodeCursor = (value?: string) => {
  if (!value) return null;
  try { return JSON.parse(Buffer.from(value, 'base64url').toString('utf8')) as { name: string; id: string }; }
  catch { throw new Error('Invalid cursor'); }
};

