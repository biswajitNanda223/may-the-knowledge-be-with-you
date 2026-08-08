import { type FormEvent, useEffect, useState } from 'react';
import type React from 'react';
import { getGraph, getNeighbors } from '../api';
import { getNodeKind, GraphCanvas, nodeColors } from '../components/GraphCanvas';
import type { GraphEdge, GraphNode } from '../types';

export function ExplorerPage(){
  const[nodes,setNodes]=useState<GraphNode[]>([]),[edges,setEdges]=useState<GraphEdge[]>([]);
  const[requestCursor,setRequestCursor]=useState<string|null>(null),[nextCursor,setNextCursor]=useState<string|null>(null),[history,setHistory]=useState<Array<string|null>>([]);
  const[search,setSearch]=useState(''),[error,setError]=useState(''),[selected,setSelected]=useState<GraphNode|null>(null);
  const[page,setPage]=useState(1),[loading,setLoading]=useState(false),[trackerOpen,setTrackerOpen]=useState(true);
  const[trail,setTrail]=useState<Array<{id:string;name:string;kind:string}>>([]);

  async function loadPage(cursor:string|null,reset=false){setLoading(true);try{const params=new URLSearchParams({limit:'25'});if(cursor)params.set('cursor',cursor);if(search.trim())params.set('search',search.trim());const data=await getGraph(params);setNodes(data.nodes);setEdges(data.edges);setRequestCursor(cursor);setNextCursor(data.nextCursor);setSelected(null);setTrail([]);setError('');if(reset){setHistory([]);setPage(1)}}catch(reason){setError(reason instanceof Error?reason.message:'Graph request failed')}finally{setLoading(false)}}
  useEffect(()=>{void loadPage(null,true)},[]);
  async function isolateNode(id:string){setLoading(true);try{const clicked=nodes.find(node=>node.id===id),data=await getNeighbors(id),focus=data.nodes.find(node=>node.id===id)??clicked??data.nodes[0]??null;setNodes(data.nodes);setEdges(data.edges);setSelected(focus);setTrackerOpen(true);if(focus)setTrail(value=>[...value.filter(item=>item.id!==focus.id),{id:focus.id,name:focus.name,kind:getNodeKind(focus)}].slice(-5));setError('')}catch(reason){setError(reason instanceof Error?reason.message:'Node expansion failed')}finally{setLoading(false)}}
  function submit(event:FormEvent){event.preventDefault();void loadPage(null,true)}
  function nextPage(){if(!nextCursor)return;setHistory(value=>[...value,requestCursor]);setPage(value=>value+1);void loadPage(nextCursor)}
  function previousPage(){if(!history.length)return;const previous=history[history.length-1];setHistory(value=>value.slice(0,-1));setPage(value=>Math.max(1,value-1));void loadPage(previous)}
  const activeKind=selected?getNodeKind(selected):null,incoming=selected?edges.filter(edge=>edge.target===selected.id).length:0,outgoing=selected?edges.filter(edge=>edge.source===selected.id).length:0;

  return <main className="explorer">
    <section className="toolbar"><div><p className="eyebrow">CURSOR-PAGINATED EXPLORATION</p><h1>Ontology explorer</h1></div><form onSubmit={submit}><input placeholder="Search entity, rule, system…" value={search} onChange={event=>setSearch(event.target.value)}/><button disabled={loading}>Search</button></form><div className="stats"><span>{nodes.length} visible</span><span>{edges.length} relationships</span><span>{selected?`Focused: ${selected.name}`:`Page ${page}`}</span></div></section>
    {error&&<p className="error">{error}</p>}
    <section className="panel explorer-graph">
      <GraphCanvas nodes={nodes} edges={edges} onNode={isolateNode}/>
      <div className={`exploration-track ${trackerOpen?'':'minimized'}`}>
        <div className="track-heading"><span>LIVE EXPLORATION TRACK</span><b>{selected?'Focused subgraph':`Ontology page ${page}`}</b><button className="track-toggle" title={trackerOpen?'Minimize tracker':'Expand tracker'} onClick={()=>setTrackerOpen(value=>!value)}>{trackerOpen?'−':'+'}</button></div>
        {trackerOpen&&<div className="track-content"><div className="track-path"><button onClick={()=>loadPage(requestCursor)}>Ontology</button><i>→</i><button onClick={()=>loadPage(requestCursor)}>Page {page}</button>{trail.map(item=><span key={item.id}><i>→</i><button className={selected?.id===item.id?'current':''} onClick={()=>isolateNode(item.id)}>{item.name}</button></span>)}</div><div className="type-track">{Object.entries(nodeColors).map(([kind,color])=><span className={activeKind===kind?'active':''} key={kind} style={{'--node-color':color} as React.CSSProperties}><i/>{kind==='BusinessRule'?'Rule':kind}</span>)}</div>{selected&&<div className="focus-summary"><strong style={{color:nodeColors[activeKind!]}}>{activeKind==='BusinessRule'?'Rule':activeKind}</strong><code>{selected.id}</code><span>← {incoming} incoming</span><span>{outgoing} outgoing →</span></div>}</div>}
      </div>
      {loading&&<div className="graph-loading">Loading graph…</div>}
      <div className="pagination-bar">{selected?<><button className="secondary-button" onClick={()=>loadPage(requestCursor)}>← Back to page {page}</button><span>Showing selected node and direct neighbors only</span></>:<><button className="secondary-button" disabled={!history.length||loading} onClick={previousPage}>← Previous</button><span>Page {page} · 25 nodes maximum</span><button disabled={!nextCursor||loading} onClick={nextPage}>Next →</button></>}</div>
    </section>
  </main>;
}
