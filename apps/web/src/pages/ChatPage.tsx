import { type FormEvent, useMemo, useState } from 'react';
import { API } from '../api';
import { GraphCanvas } from '../components/GraphCanvas';
import type { GraphEdge, GraphNode } from '../types';
import { Icon } from '../components/Icon';

const stopWords=new Set(['which','what','where','when','who','why','how','does','that','this','with','from','your','about','answer','govern','governs','business','rules']);
function buildEvidenceRoute(question:string,nodes:GraphNode[],edges:GraphEdge[],targets:string[]){
  const terms=question.toLowerCase().split(/[^a-z0-9_-]+/).filter(term=>term.length>2&&!stopWords.has(term));
  const score=(node:GraphNode)=>{const value=`${node.id} ${node.name} ${Object.values(node.properties).join(' ')}`.toLowerCase();return terms.reduce((total,term)=>total+(value.includes(term)?1:0),0)};
  const starts=[...nodes].filter(node=>!targets.includes(node.id)).sort((a,b)=>score(b)-score(a)).slice(0,3);
  const adjacency=new Map<string,Array<{node:string;edge:GraphEdge}>>();for(const edge of edges){adjacency.set(edge.source,[...(adjacency.get(edge.source)??[]),{node:edge.target,edge}]);adjacency.set(edge.target,[...(adjacency.get(edge.target)??[]),{node:edge.source,edge}])}
  const nodeById=new Map(nodes.map(node=>[node.id,node]));const routes:Array<{elements:string[];labels:string[]}>=[];
  for(const target of targets.slice(0,4)){let best:{nodes:string[];edges:GraphEdge[]}|undefined;for(const start of starts){const queue=[start.id],seen=new Set([start.id]),previous=new Map<string,{node:string;edge:GraphEdge}>();while(queue.length){const current=queue.shift()!;if(current===target)break;for(const next of adjacency.get(current)??[]){if(seen.has(next.node))continue;seen.add(next.node);previous.set(next.node,{node:current,edge:next.edge});queue.push(next.node)}}if(!seen.has(target))continue;const pathNodes=[target],pathEdges:GraphEdge[]=[];let cursor=target;while(cursor!==start.id){const step=previous.get(cursor);if(!step)break;pathEdges.unshift(step.edge);cursor=step.node;pathNodes.unshift(cursor)}if(!best||pathEdges.length<best.edges.length)best={nodes:pathNodes,edges:pathEdges}}if(best){const elements:string[]=[];const labels:string[]=[];best.nodes.forEach((id,index)=>{elements.push(id);labels.push(nodeById.get(id)?.name??id);if(best&&index<best.edges.length){elements.push(best.edges[index].id);labels.push(best.edges[index].type.replaceAll('_',' ').toLowerCase())}});routes.push({elements,labels})}}
  if(!routes.length&&starts[0])routes.push({elements:[starts[0].id],labels:[starts[0].name]});return routes;
}

export function ChatPage() {
  const [question, setQuestion] = useState('Which business rules govern a project?');
  const [answer, setAnswer] = useState('');
  const [submittedQuestion, setSubmittedQuestion] = useState('');
  const [nodes, setNodes] = useState<GraphNode[]>([]);
  const [edges, setEdges] = useState<GraphEdge[]>([]);
  const [busy, setBusy] = useState(false);
  const [trace, setTrace] = useState('');
  const [evidenceOpen, setEvidenceOpen] = useState(false);
  const [evidenceMode, setEvidenceMode] = useState<'normal'|'expanded'|'minimized'>('normal');
  const citedNodeIds=useMemo(()=>Array.from(answer.matchAll(/\[([A-Za-z0-9_-]+)\]/g),match=>match[1]).filter(id=>nodes.some(node=>node.id===id)),[answer,nodes]);
  const evidenceRoutes=useMemo(()=>evidenceOpen?buildEvidenceRoute(submittedQuestion,nodes,edges,citedNodeIds):[],[evidenceOpen,submittedQuestion,nodes,edges,citedNodeIds]);
  const animatedPaths=useMemo(()=>evidenceRoutes.map(route=>route.elements),[evidenceRoutes]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!question.trim() || busy) return;
    const submitted=question.trim();
    setAnswer(''); setSubmittedQuestion(submitted); setQuestion(''); setBusy(true); setNodes([]); setEdges([]); setTrace('');
    try {
      const response = await fetch(`${API}/v1/chat`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ question: submitted }) });
      if (!response.ok || !response.body) throw new Error(`Request failed: ${response.status}`);
      const reader = response.body.getReader(); const decoder = new TextDecoder(); let buffer = '', streamedAnswer = '', streamError = '', renderFrame: number | undefined;
      while (true) {
        const { value, done } = await reader.read(); if (done) break;
        buffer += decoder.decode(value, { stream: true }); const frames = buffer.split('\n\n'); buffer = frames.pop() ?? '';
        for (const frame of frames) {
          const eventName = frame.match(/^event: (.+)$/m)?.[1]; const raw = frame.match(/^data: (.+)$/m)?.[1]; if (!raw) continue;
          const data = JSON.parse(raw);
          if (eventName === 'token') { streamedAnswer += data.token; if(renderFrame===undefined)renderFrame=requestAnimationFrame(()=>{setAnswer(streamedAnswer);renderFrame=undefined}); }
          if (eventName === 'trace') { setNodes(data.nodes); setEdges(data.edges); setTrace(`${data.cypherId} · ${data.elapsedMs}ms · ${data.traceId}`); }
          if (eventName === 'error') streamError=data.message ?? 'The request could not be completed.';
        }
      }
      if(renderFrame!==undefined)cancelAnimationFrame(renderFrame);setAnswer(streamError||streamedAnswer);
    } catch (error) { setAnswer(error instanceof Error ? error.message : 'Request failed'); }
    finally { setBusy(false); }
  }

  return <main className="chat-workspace">
    <section className="chat-surface">
      <div className="chat-heading">
        <div><h1>Ask Knowledge Way</h1><p className="muted">Answers grounded in your enterprise knowledge.</p></div>
        <button type="button" className="secondary-button evidence-toggle" onClick={() => { setEvidenceOpen(true); setEvidenceMode('normal'); }}>Sources <b>{nodes.length}</b></button>
      </div>
      <div className={`conversation ${answer ? 'has-answer' : ''}`} aria-live="polite">
        {answer || busy ? <div className="message-list"><div className="user-message"><small>You</small><p>{submittedQuestion}</p></div><div className="assistant-message"><div className="assistant-avatar"><img src="/knowledge-way-logo.png" alt="" /></div><div><small>Knowledge Way</small><p>{answer || 'Reviewing connected sources…'}{busy && answer && <span className="cursor">▌</span>}</p></div></div></div> : <div className="chat-empty"><span className="empty-mark"><img src="/knowledge-way-logo.png" alt="" /></span><h2>Ask a question about your organization</h2><p>Search across policies, processes, ownership, systems, and relationships.</p><div className="prompt-chips">{['Which rules govern a project?','Who owns project delivery?','What systems support CAPEX?'].map(prompt => <button type="button" key={prompt} onClick={() => setQuestion(prompt)}>{prompt}</button>)}</div></div>}
      </div>
      <form className="chat-composer" onSubmit={submit}>
        <textarea aria-label="Ask Knowledge Way" placeholder="Ask a question…" value={question} onChange={event => setQuestion(event.target.value)} rows={1} onKeyDown={event => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); event.currentTarget.form?.requestSubmit(); } }}/>
        <button className="send-button" disabled={busy || !question.trim()} aria-label="Send question">{busy ? '…' : <><Icon name="send" size={14}/> Send</>}</button>
        <small>Enter to send · Shift + Enter for a new line</small>
      </form>
    </section>
    {evidenceOpen&&<>{evidenceMode !== 'minimized' && <button className="drawer-backdrop" aria-label="Close sources" onClick={() => setEvidenceOpen(false)} />}
    <aside className={`evidence-drawer open ${evidenceMode}`}>
      <div className="drawer-head"><div><p className="eyebrow">Answer evidence</p><h2>Sources</h2></div><div className="drawer-actions"><button type="button" className="icon-button" title="Minimize" onClick={() => setEvidenceMode('minimized')} aria-label="Minimize sources"><Icon name="minimize"/></button><button type="button" className="icon-button" title={evidenceMode==='expanded'?'Restore size':'Expand'} onClick={() => setEvidenceMode(value=>value==='expanded'?'normal':'expanded')} aria-label={evidenceMode==='expanded'?'Restore sources size':'Expand sources'}><Icon name="maximize"/></button><button type="button" className="icon-button" title="Close" onClick={() => setEvidenceOpen(false)} aria-label="Close sources"><Icon name="close"/></button></div></div>
      <div className="drawer-stats"><span>{nodes.length} sources</span><span>{edges.length} relationships</span>{animatedPaths.length>0&&<span className="highlight-key"><i/> Answer path</span>}</div>
      <GraphCanvas nodes={nodes} edges={edges} highlightedNodeIds={citedNodeIds} animatedPaths={animatedPaths}/><code className="trace">{trace || 'Ask a question to generate source evidence'}</code>
    </aside></>}
  </main>;
}
