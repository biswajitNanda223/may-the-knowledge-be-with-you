import { type FormEvent, useMemo, useState } from 'react';
import { buildEvidenceRoutes } from '../chat-evidence';
import { streamAnswer } from '../chat-stream';
import { GraphCanvas } from '../components/GraphCanvas';
import { Icon } from '../components/Icon';
import type { GraphEdge, GraphNode } from '../types';

export function ChatPage() {
  const [question, setQuestion] = useState('Which business rules govern a project?');
  const [answer, setAnswer] = useState(''), [submittedQuestion, setSubmittedQuestion] = useState('');
  const [nodes, setNodes] = useState<GraphNode[]>([]), [edges, setEdges] = useState<GraphEdge[]>([]);
  const [busy, setBusy] = useState(false), [trace, setTrace] = useState('');
  const [evidenceOpen, setEvidenceOpen] = useState(false);
  const [evidenceMode, setEvidenceMode] = useState<'normal'|'expanded'|'minimized'>('normal');
  const citedNodeIds = useMemo(() => Array.from(answer.matchAll(/\[([A-Za-z0-9_-]+)\]/g), match => match[1])
    .filter(id => nodes.some(node => node.id === id)), [answer, nodes]);
  const evidenceRoutes = useMemo(() => evidenceOpen
    ? buildEvidenceRoutes(submittedQuestion, nodes, edges, citedNodeIds) : [],
  [evidenceOpen, submittedQuestion, nodes, edges, citedNodeIds]);
  const animatedPaths = useMemo(() => evidenceRoutes.map(route => route.elements), [evidenceRoutes]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!question.trim() || busy) return;
    const submitted = question.trim();
    setAnswer(''); setSubmittedQuestion(submitted); setQuestion(''); setBusy(true);
    setNodes([]); setEdges([]); setTrace('');
    try {
      const finalAnswer = await streamAnswer(submitted, {
        onToken: setAnswer,
        onTrace: data => {
          setNodes(data.nodes); setEdges(data.edges);
          setTrace(`${data.cypherId} · ${data.elapsedMs}ms · ${data.traceId}`);
        },
      });
      setAnswer(finalAnswer);
    } catch (error) {
      setAnswer(error instanceof Error ? error.message : 'Request failed');
    } finally { setBusy(false); }
  }

  const openEvidence = () => { setEvidenceOpen(true); setEvidenceMode('normal'); };
  const toggleEvidenceSize = () => setEvidenceMode(value => value === 'expanded' ? 'normal' : 'expanded');

  return <main className="chat-workspace">
    <section className="chat-surface">
      <div className="chat-heading">
        <div><h1>Ask Knowledge Way</h1><p className="muted">Answers grounded in your enterprise knowledge.</p></div>
        <button type="button" className="secondary-button evidence-toggle" onClick={openEvidence}>Sources <b>{nodes.length}</b></button>
      </div>
      <div className={`conversation ${answer ? 'has-answer' : ''}`} aria-live="polite">
        {answer || busy ? <div className="message-list">
          <div className="user-message"><small>You</small><p>{submittedQuestion}</p></div>
          <div className="assistant-message"><div className="assistant-avatar"><img src="/knowledge-way-logo.png" alt="" /></div><div><small>Knowledge Way</small><p>{answer || 'Reviewing connected sources…'}{busy && answer && <span className="cursor">▌</span>}</p></div></div>
        </div> : <div className="chat-empty">
          <span className="empty-mark"><img src="/knowledge-way-logo.png" alt="" /></span>
          <h2>Ask a question about your organization</h2><p>Search across policies, processes, ownership, systems, and relationships.</p>
          <div className="prompt-chips">{['Which rules govern a project?', 'Who owns project delivery?', 'What systems support CAPEX?'].map(prompt => <button type="button" key={prompt} onClick={() => setQuestion(prompt)}>{prompt}</button>)}</div>
        </div>}
      </div>
      <form className="chat-composer" onSubmit={submit}>
        <textarea aria-label="Ask Knowledge Way" placeholder="Ask a question…" value={question} onChange={event => setQuestion(event.target.value)} rows={1} onKeyDown={event => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); event.currentTarget.form?.requestSubmit(); } }}/>
        <button className="send-button" disabled={busy || !question.trim()} aria-label="Send question">{busy ? '…' : <><Icon name="send" size={14}/> Send</>}</button>
        <small>Enter to send · Shift + Enter for a new line</small>
      </form>
    </section>
    {evidenceOpen && <>{evidenceMode !== 'minimized' && <button className="drawer-backdrop" aria-label="Close sources" onClick={() => setEvidenceOpen(false)} />}
      <aside className={`evidence-drawer open ${evidenceMode}`}>
        <div className="drawer-head"><div><p className="eyebrow">Answer evidence</p><h2>Sources</h2></div><div className="drawer-actions">
          <button type="button" className="icon-button" title="Minimize" onClick={() => setEvidenceMode('minimized')} aria-label="Minimize sources"><Icon name="minimize"/></button>
          <button type="button" className="icon-button" title={evidenceMode === 'expanded' ? 'Restore size' : 'Expand'} onClick={toggleEvidenceSize} aria-label={evidenceMode === 'expanded' ? 'Restore sources size' : 'Expand sources'}><Icon name="maximize"/></button>
          <button type="button" className="icon-button" title="Close" onClick={() => setEvidenceOpen(false)} aria-label="Close sources"><Icon name="close"/></button>
        </div></div>
        <div className="drawer-stats"><span>{nodes.length} sources</span><span>{edges.length} relationships</span>{animatedPaths.length > 0 && <span className="highlight-key"><i/> Answer path</span>}</div>
        <GraphCanvas nodes={nodes} edges={edges} highlightedNodeIds={citedNodeIds} animatedPaths={animatedPaths}/>
        <code className="trace">{trace || 'Ask a question to generate source evidence'}</code>
      </aside></>}
  </main>;
}
