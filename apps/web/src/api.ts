import type { GraphSlice } from './types';
export const API = '/api';
export async function getGraph(params: URLSearchParams): Promise<GraphSlice> { const r = await fetch(`${API}/v1/graph/nodes?${params}`); if (!r.ok) throw new Error(`Graph request failed: ${r.status}`); return r.json(); }
export async function getNeighbors(id: string, cursor?: string): Promise<GraphSlice> { const p = new URLSearchParams({ limit: '50' }); if (cursor) p.set('cursor', cursor); const r = await fetch(`${API}/v1/graph/nodes/${encodeURIComponent(id)}/neighbors?${p}`); if (!r.ok) throw new Error(`Expand failed: ${r.status}`); return r.json(); }
