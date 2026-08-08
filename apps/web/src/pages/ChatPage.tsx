import { type FormEvent, useState } from 'react';
import { API } from '../api';
import { GraphCanvas } from '../components/GraphCanvas';
import type { GraphEdge, GraphNode } from '../types';

export function ChatPage() {
  const [question, setQuestion] = useState('Which business rules govern a project?');
  const [answer, setAnswer] = useState('');
  const [nodes, setNodes] = useState<GraphNode[]>([]);
  const [edges, setEdges] = useState<GraphEdge[]>([]);
  const [busy, setBusy] = useState(false);
  const [trace, setTrace] = useState('');
  const [evidenceOpen, setEvidenceOpen] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!question.trim() || busy) return;
    setAnswer(''); setBusy(true); setNodes([]); setEdges([]); setTrace('');
    try {
      const response = await fetch(`${API}/v1/chat`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ question }) });
      if (!response.ok || !response.body) throw new Error(`Chat failed: ${response.status}`);
      const reader = response.body.getReader(); const decoder = new TextDecoder(); let buffer = '';
      while (true) {
        const { value, done } = await reader.read(); if (done) break;
        buffer += decoder.decode(value, { stream: true }); const frames = buffer.split('\n\n'); buffer = frames.pop() ?? '';
        for (const frame of frames) {
          const eventName = frame.match(/^event: (.+)$/m)?.[1]; const raw = frame.match(/^data: (.+)$/m)?.[1]; if (!raw) continue;
          const data = JSON.parse(raw);
          if (eventName === 'token') setAnswer(value => value + data.token);
          if (eventName === 'trace') { setNodes(data.nodes); setEdges(data.edges); setTrace(`${data.cypherId} · ${data.elapsedMs}ms · ${data.traceId}`); }
          if (eventName === 'error') setAnswer(data.message ?? 'Agent request failed');
        }
      }
    } catch (error) { setAnswer(error instanceof Error ? error.message : 'Request failed'); }
    finally { setBusy(false); }
  }

  return <main className="chat-workspace">
    <section className="chat-surface">
      <div className="chat-heading">
        <div><p className="eyebrow">ARMY KNOWLEDGE ASSISTANT</p><h1>Ask your enterprise knowledge</h1><p className="muted">Grounded answers from your Neo4j ontology, with evidence available on demand.</p></div>
        <button type="button" className="secondary-button evidence-toggle" onClick={() => setEvidenceOpen(true)}><span>◇</span> Evidence <b>{nodes.length}</b></button>
      </div>
      <div className={`conversation ${answer ? 'has-answer' : ''}`} aria-live="polite">
        {answer ? <><div className="assistant-avatar">A</div><div><small>ARMY</small><p>{answer}</p>{busy && <span className="cursor">▌</span>}</div></> : <div className="chat-empty"><span>✦</span><h2>How can I help?</h2><p>Ask about entities, business rules, systems, processes, or relationships.</p><div className="prompt-chips">{['Which rules govern a project?','Show project ownership','What systems support CAPEX?'].map(prompt => <button type="button" key={prompt} onClick={() => setQuestion(prompt)}>{prompt}</button>)}</div></div>}
      </div>
      <form className="chat-composer" onSubmit={submit}>
        <textarea aria-label="Ask ARMY" placeholder="Ask a question about your enterprise ontology…" value={question} onChange={event => setQuestion(event.target.value)} rows={2} onKeyDown={event => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); event.currentTarget.form?.requestSubmit(); } }}/>
        <button className="send-button" disabled={busy || !question.trim()} aria-label="Send question">{busy ? '…' : '↑'}</button>
        <small>Enter to send · Shift + Enter for new line</small>
      </form>
    </section>
    {evidenceOpen && <button className="drawer-backdrop" aria-label="Close evidence" onClick={() => setEvidenceOpen(false)} />}
    <aside className={`evidence-drawer ${evidenceOpen ? 'open' : ''}`} aria-hidden={!evidenceOpen}>
      <div className="drawer-head"><div><p className="eyebrow">QUESTION-SPECIFIC SUBGRAPH</p><h2>Evidence trace</h2></div><button type="button" className="icon-button" onClick={() => setEvidenceOpen(false)} aria-label="Close evidence">×</button></div>
      <div className="drawer-stats"><span>{nodes.length} nodes</span><span>{edges.length} relationships</span></div>
      <GraphCanvas nodes={nodes} edges={edges}/><code className="trace">{trace || 'Ask a question to generate evidence'}</code>
    </aside>
  </main>;
}
