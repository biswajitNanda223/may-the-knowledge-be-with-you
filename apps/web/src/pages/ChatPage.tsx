import { FormEvent, useState } from 'react';
import { API } from '../api';
import { GraphCanvas } from '../components/GraphCanvas';
import type { GraphEdge, GraphNode } from '../types';
export function ChatPage() {
  const [question, setQuestion] = useState('Which business rules govern a project?'); const [answer, setAnswer] = useState(''); const [nodes, setNodes] = useState<GraphNode[]>([]); const [edges, setEdges] = useState<GraphEdge[]>([]); const [busy, setBusy] = useState(false); const [trace, setTrace] = useState('');
  async function submit(e: FormEvent) {
    e.preventDefault(); setAnswer(''); setBusy(true);
    try {
      const response = await fetch(`${API}/v1/chat`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ question }) });
      if (!response.ok || !response.body) throw new Error(`Chat failed: ${response.status}`);
      const reader = response.body.getReader(); const decoder = new TextDecoder(); let buffer = '';
      while (true) { const { value, done } = await reader.read(); if (done) break; buffer += decoder.decode(value, { stream: true }); const frames = buffer.split('\n\n'); buffer = frames.pop() ?? '';
        for (const frame of frames) { const event = frame.match(/^event: (.+)$/m)?.[1]; const raw = frame.match(/^data: (.+)$/m)?.[1]; if (!raw) continue; const data = JSON.parse(raw); if (event === 'token') setAnswer(v => v + data.token); if (event === 'trace') { setNodes(data.nodes); setEdges(data.edges); setTrace(`${data.cypherId} · ${data.elapsedMs}ms · ${data.traceId}`); } }
      }
    } catch (err) { setAnswer(err instanceof Error ? err.message : 'Request failed'); } finally { setBusy(false); }
  }
  return <main className="chat-grid"><section className="panel chat-panel"><div><p className="eyebrow">PAGE 1 · LIVE ANSWER EVIDENCE</p><h1>Ask enterprise knowledge</h1><p className="muted">Answer streams while exact Neo4j evidence appears beside it.</p></div><div className="answer" aria-live="polite">{answer || 'Answer will stream here…'}{busy && <span className="cursor">▌</span>}</div><form onSubmit={submit}><textarea value={question} onChange={e => setQuestion(e.target.value)} rows={3}/><button disabled={busy}>{busy ? 'Tracing…' : 'Ask agent →'}</button></form></section><section className="panel evidence"><div className="panel-head"><div><p className="eyebrow">QUESTION-SPECIFIC SUBGRAPH</p><h2>Evidence trace</h2></div><span className="pill">{nodes.length} nodes</span></div><GraphCanvas nodes={nodes} edges={edges}/><code className="trace">{trace || 'Waiting for query trace'}</code></section></main>;
}

