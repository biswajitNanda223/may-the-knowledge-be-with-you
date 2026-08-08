import cytoscape, { type Core } from 'cytoscape';
import { useEffect, useRef, useState } from 'react';
import type { GraphEdge, GraphNode } from '../types';

export const nodeColors: Record<string, string> = { Entity:'#2878c7', Process:'#8057b3', BusinessRule:'#d84f64', System:'#239a78', Glossary:'#d59020', Relationship:'#e06f2e', Other:'#607d9d' };
export function getNodeKind(node: GraphNode) {
  const id=node.id.toUpperCase(), category=String(node.properties.category??'').toLowerCase();
  if(id.startsWith('BR-')||id.startsWith('BR_')||category.includes('rule'))return 'BusinessRule';
  if(id.startsWith('SYS')||category.includes('system')||category.includes('application'))return 'System';
  if(id.startsWith('PROC')||id.startsWith('PS-')||category.includes('process'))return 'Process';
  if(id.startsWith('GL-')||id.startsWith('TERM')||category.includes('glossary')||category.includes('term'))return 'Glossary';
  if(id.startsWith('REL')||category.includes('relationship'))return 'Relationship';
  if(id.startsWith('ENT')||category)return 'Entity'; return 'Other';
}

export function GraphCanvas({nodes,edges,onNode}:{nodes:GraphNode[];edges:GraphEdge[];onNode?:(id:string)=>void}) {
  const host=useRef<HTMLDivElement>(null), stage=useRef<HTMLDivElement>(null), graph=useRef<Core|null>(null);
  const[fullscreen,setFullscreen]=useState(false);
  useEffect(()=>{const changed=()=>{setFullscreen(document.fullscreenElement===stage.current);setTimeout(()=>{graph.current?.resize();graph.current?.fit(undefined,70)},80)};document.addEventListener('fullscreenchange',changed);return()=>document.removeEventListener('fullscreenchange',changed)},[]);
  useEffect(()=>{
    if(!host.current)return;graph.current?.destroy();graph.current=cytoscape({container:host.current,minZoom:.5,maxZoom:2.5,
      elements:[...nodes.map(node=>{const kind=getNodeKind(node);return{data:{id:node.id,label:node.name,kind,color:nodeColors[kind]}}}),...edges.map(edge=>({data:{id:edge.id,source:edge.source,target:edge.target,label:edge.type.replaceAll('_',' ')}}))],
      style:[{selector:'node',style:{width:108,height:108,'background-color':'data(color)','border-width':4,'border-color':'#ffffff','text-outline-width':0,label:'data(label)',color:'#ffffff','font-family':'Inter, sans-serif','font-weight':650,'font-size':10,'text-wrap':'wrap','text-max-width':84,'text-valign':'center','text-halign':'center','overlay-opacity':0,'shadow-blur':14,'shadow-color':'#5a7189','shadow-opacity':.24,'shadow-offset-y':4}},{selector:'edge',style:{width:1.5,'line-color':'#aab8c8','target-arrow-color':'#8798ab','target-arrow-shape':'triangle','arrow-scale':.8,'curve-style':'bezier',label:'data(label)',color:'#6d7f93','font-family':'Inter, sans-serif','font-size':7,'text-background-color':'#ffffff','text-background-opacity':.9,'text-background-padding':3,'text-rotation':'autorotate','overlay-opacity':0}},{selector:'node:hover',style:{'border-color':'#1b6fb8','border-width':4}},{selector:':selected',style:{'border-width':5,'border-color':'#173f67','shadow-opacity':.35}}] as unknown as cytoscape.StylesheetCSS[],
      layout:{name:'cose',animate:false,fit:true,padding:70,nodeRepulsion:()=>24000,idealEdgeLength:()=>175}});
    graph.current.on('tap','node',event=>onNode?.(event.target.id()));return()=>graph.current?.destroy();
  },[nodes,edges,onNode]);
  async function toggleFullscreen(){if(!stage.current)return;if(document.fullscreenElement===stage.current)await document.exitFullscreen();else await stage.current.requestFullscreen()}
  const zoom=(factor:number)=>graph.current?.zoom({level:(graph.current.zoom()??1)*factor,renderedPosition:{x:(host.current?.clientWidth??0)/2,y:(host.current?.clientHeight??0)/2}});
  return <div className={`graph-stage ${fullscreen?'is-fullscreen':''}`} ref={stage}>
    <div className="graph-legend" aria-label="Node color legend">{Object.entries(nodeColors).map(([kind,color])=><span key={kind}><i style={{background:color}}/>{kind==='BusinessRule'?'Rule':kind}</span>)}</div>
    <div className="graph-controls" aria-label="Graph controls"><button type="button" title="Zoom in" onClick={()=>zoom(1.2)}>+</button><button type="button" title="Zoom out" onClick={()=>zoom(1/1.2)}>−</button><button type="button" title="Fit graph" onClick={()=>graph.current?.fit(undefined,50)}>⌂</button><button type="button" title={fullscreen?'Exit fullscreen':'Open fullscreen'} onClick={toggleFullscreen}>{fullscreen?'⤢':'⛶'}</button></div>
    {fullscreen&&<div className="fullscreen-label">Fullscreen graph · Press Esc to exit</div>}
    {!nodes.length&&<div className="graph-empty"><span>◇</span><b>Graph evidence appears here</b><small>Ask a question or load ontology nodes</small></div>}
    <div className="graph-canvas" ref={host} aria-label="Interactive Neo4j ontology graph"/>
  </div>;
}
