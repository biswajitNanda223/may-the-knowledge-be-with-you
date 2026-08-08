import { type FormEvent, useEffect, useState } from 'react';
import { getGraph, getNeighbors } from '../api';
import { GraphCanvas } from '../components/GraphCanvas';
import type { GraphEdge, GraphNode } from '../types';

export function ExplorerPage() {
  const [nodes, setNodes] = useState<GraphNode[]>([]);
  const [edges, setEdges] = useState<GraphEdge[]>([]);
  const [requestCursor, setRequestCursor] = useState<string | null>(null);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [history, setHistory] = useState<Array<string | null>>([]);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [selected, setSelected] = useState<GraphNode | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);

  async function loadPage(cursor: string | null, reset = false) {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: '25' }); if (cursor) params.set('cursor', cursor); if (search.trim()) params.set('search', search.trim());
      const data = await getGraph(params); setNodes(data.nodes); setEdges(data.edges); setRequestCursor(cursor); setNextCursor(data.nextCursor); setSelected(null); setError('');
      if (reset) { setHistory([]); setPage(1); }
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Graph request failed'); }
    finally { setLoading(false); }
  }
  useEffect(() => { void loadPage(null, true); }, []);

  async function isolateNode(id: string) {
    setLoading(true);
    try { const data = await getNeighbors(id); setNodes(data.nodes); setEdges(data.edges); setSelected(data.nodes.find(node => node.id === id) ?? data.nodes[0] ?? null); setError(''); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Node expansion failed'); }
    finally { setLoading(false); }
  }
  function submit(event: FormEvent) { event.preventDefault(); void loadPage(null, true); }
  function nextPage() { if (!nextCursor) return; setHistory(value => [...value, requestCursor]); setPage(value => value + 1); void loadPage(nextCursor); }
  function previousPage() { if (!history.length) return; const previous = history[history.length - 1]; setHistory(value => value.slice(0, -1)); setPage(value => Math.max(1, value - 1)); void loadPage(previous); }

  return <main className="explorer">
    <section className="toolbar"><div><p className="eyebrow">CURSOR-PAGINATED EXPLORATION</p><h1>Ontology explorer</h1></div><form onSubmit={submit}><input placeholder="Search entity, rule, system…" value={search} onChange={event => setSearch(event.target.value)}/><button disabled={loading}>Search</button></form><div className="stats"><span>{nodes.length} visible</span><span>{edges.length} relationships</span><span>{selected ? `Focused: ${selected.name}` : `Page ${page}`}</span></div></section>
    {error && <p className="error">{error}</p>}
    <section className="panel explorer-graph"><GraphCanvas nodes={nodes} edges={edges} onNode={isolateNode}/>{loading && <div className="graph-loading">Loading graph…</div>}<div className="pagination-bar">{selected ? <><button className="secondary-button" onClick={() => loadPage(requestCursor)}>← Back to page {page}</button><span>Showing selected node and direct neighbors only</span></> : <><button className="secondary-button" disabled={!history.length || loading} onClick={previousPage}>← Previous</button><span>Page {page} · 25 nodes maximum</span><button disabled={!nextCursor || loading} onClick={nextPage}>Next →</button></>}</div></section>
  </main>;
}
