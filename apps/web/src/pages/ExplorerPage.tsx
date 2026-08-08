import { FormEvent, useCallback, useEffect, useState } from 'react';
import { getGraph, getNeighbors } from '../api';
import { GraphCanvas } from '../components/GraphCanvas';
import type { GraphEdge, GraphNode } from '../types';
import { mergeGraph } from '../graph-merge';
export function ExplorerPage() {
  const [nodes, setNodes] = useState<GraphNode[]>([]), [edges, setEdges] = useState<GraphEdge[]>([]); const [cursor, setCursor] = useState<string | null>(null); const [search, setSearch] = useState(''); const [error, setError] = useState('');
  const merge = (incoming: { nodes: GraphNode[]; edges: GraphEdge[] }) => { const merged = mergeGraph({ nodes, edges }, incoming); setNodes(merged.nodes); setEdges(merged.edges); };
  const load = useCallback(async (reset = false) => { try { const p = new URLSearchParams({ limit: '50' }); if (!reset && cursor) p.set('cursor', cursor); if (search) p.set('search', search); const data = await getGraph(p); if (reset) { setNodes(data.nodes); setEdges(data.edges); } else merge(data); setCursor(data.nextCursor); setError(''); } catch (e) { setError(e instanceof Error ? e.message : 'Failed'); } }, [cursor, search]);
  useEffect(() => { void load(true); }, []);
  async function expand(id: string) { try { merge(await getNeighbors(id)); } catch (e) { setError(e instanceof Error ? e.message : 'Failed'); } }
  function submit(e: FormEvent) { e.preventDefault(); setCursor(null); void load(true); }
  return <main className="explorer"><section className="toolbar"><div><p className="eyebrow">PAGE 2 · CURSOR-PAGINATED EXPLORATION</p><h1>Ontology explorer</h1></div><form onSubmit={submit}><input placeholder="Search entity, rule, system…" value={search} onChange={e => setSearch(e.target.value)}/><button>Search</button></form><div className="stats"><span>{nodes.length} loaded</span><span>{edges.length} edges</span><span>Click node to expand</span></div></section>{error && <p className="error">{error}</p>}<section className="panel explorer-graph"><GraphCanvas nodes={nodes} edges={edges} onNode={expand}/><button className="load-more" disabled={!cursor} onClick={() => load(false)}>{cursor ? '+ Load next 50' : 'End of result set'}</button></section></main>;
}
