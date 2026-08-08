import cytoscape, { type Core, type ElementDefinition } from 'cytoscape';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { GraphEdge, GraphNode } from '../types';

export const nodeColors: Record<string, string> = {
  Entity: '#6366F1', Process: '#9333EA', BusinessRule: '#E84D5B', System: '#00A884',
  Glossary: '#E99A24', Relationship: '#F2683A', Other: '#64748B',
};

export function getNodeKind(node: GraphNode) {
  const id = node.id.toUpperCase();
  const category = String(node.properties.category ?? '').toLowerCase();
  if (id.startsWith('BR-') || id.startsWith('BR_') || category.includes('rule')) return 'BusinessRule';
  if (id.startsWith('SYS') || category.includes('system') || category.includes('application')) return 'System';
  if (id.startsWith('PROC') || id.startsWith('PS-') || category.includes('process')) return 'Process';
  if (id.startsWith('GL-') || id.startsWith('TERM') || category.includes('glossary') || category.includes('term')) return 'Glossary';
  if (id.startsWith('REL') || category.includes('relationship')) return 'Relationship';
  if (id.startsWith('ENT') || category) return 'Entity';
  return 'Other';
}

type Props = {
  nodes: GraphNode[];
  edges: GraphEdge[];
  onNode?: (id: string) => void;
  highlightedNodeIds?: string[];
  animatedPaths?: string[][];
};

export function GraphCanvas({ nodes, edges, onNode, highlightedNodeIds = [], animatedPaths = [] }: Props) {
  const host = useRef<HTMLDivElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const graph = useRef<Core | null>(null);
  const [fullscreen, setFullscreen] = useState(false);

  const elements = useMemo<ElementDefinition[]>(() => {
    const nodeIds = new Set(nodes.map(node => node.id));
    const highlighted = new Set(highlightedNodeIds);
    const seenEdges = new Set<string>();
    const safeEdges = edges.filter(edge => {
      if (!nodeIds.has(edge.source) || !nodeIds.has(edge.target) || edge.source === edge.target) return false;
      const key = `${edge.source}|${edge.target}|${edge.type}`;
      if (seenEdges.has(key)) return false;
      seenEdges.add(key);
      return true;
    });
    return [
      ...nodes.map(node => {
        const kind = getNodeKind(node);
        return { data: { id: node.id, label: node.name, color: nodeColors[kind], cited: highlighted.has(node.id) ? 'yes' : 'no' } };
      }),
      ...safeEdges.map(edge => ({ data: { id: edge.id, source: edge.source, target: edge.target, label: edge.type.replaceAll('_', ' ') } })),
    ];
  }, [nodes, edges, highlightedNodeIds.join('|')]);

  useEffect(() => {
    const changed = () => {
      setFullscreen(document.fullscreenElement === stage.current);
      requestAnimationFrame(() => { graph.current?.resize(); graph.current?.fit(undefined, 70); });
    };
    document.addEventListener('fullscreenchange', changed);
    return () => document.removeEventListener('fullscreenchange', changed);
  }, []);

  useEffect(() => {
    if (!host.current) return;
    graph.current?.destroy();
    const cy = cytoscape({
      container: host.current,
      minZoom: 0.35,
      maxZoom: 2.4,
      wheelSensitivity: 0.18,
      elements,
      style: [
        { selector: 'node', style: { width: 72, height: 72, 'background-color': 'data(color)', 'border-width': 4, 'border-color': '#FFFFFF', label: 'data(label)', color: '#FFFFFF', 'font-family': 'Inter, sans-serif', 'font-weight': 650, 'font-size': 9, 'text-wrap': 'ellipsis', 'text-max-width': 58, 'text-valign': 'center', 'text-halign': 'center', 'overlay-opacity': 0, 'transition-property': 'opacity, border-width, border-color', 'transition-duration': '550ms', 'transition-timing-function': 'ease-in-out' } },
        { selector: 'edge', style: { width: 1.25, 'line-color': '#D8CFF0', 'target-arrow-shape': 'none', 'curve-style': 'unbundled-bezier', 'control-point-distances': 18, 'control-point-weights': 0.5, label: '', color: '#705F82', 'font-family': 'Inter, sans-serif', 'font-size': 7, 'text-background-color': '#FFFFFF', 'text-background-opacity': 0.96, 'text-background-padding': 3, 'text-rotation': 'autorotate', 'overlay-opacity': 0, 'transition-property': 'opacity, width, line-color, target-arrow-color', 'transition-duration': '550ms', 'transition-timing-function': 'ease-in-out' } },
        { selector: 'node[cited = "yes"]', style: { 'border-width': 7, 'border-color': '#F59E0B' } },
        { selector: 'node:hover, node:selected', style: { 'border-width': 7, 'border-color': '#C4B5FD' } },
        { selector: 'edge:selected', style: { label: 'data(label)', width: 3, 'line-color': '#8B5CF6' } },
        { selector: '.route-muted', style: { opacity: 0.1 } },
        { selector: '.route-active', style: { opacity: 1 } },
        { selector: 'node.route-active', style: { 'border-width': 7, 'border-color': '#A78BFA' } },
        { selector: 'edge.route-active', style: { label: 'data(label)', width: 4, 'line-color': '#8B5CF6', 'target-arrow-color': '#7C3AED', 'target-arrow-shape': 'triangle', 'arrow-scale': 0.75, 'z-index': 10 } },
        { selector: 'node.route-current', style: { 'border-width': 10, 'border-color': '#FFFFFF' } },
        { selector: 'edge.route-current', style: { width: 7, 'line-color': '#C4B5FD' } },
      ] as unknown as cytoscape.StylesheetCSS[],
      layout: { name: 'cose', animate: false, fit: true, padding: 100, randomize: true, avoidOverlap: true, nodeRepulsion: () => 11500, idealEdgeLength: () => 145, edgeElasticity: () => 95, nestingFactor: 1.1, gravity: 0.22, numIter: 1200 },
    });
    graph.current = cy;
    cy.one('layoutstop', () => cy.fit(undefined, 80));
    cy.on('tap', 'node', event => onNode?.(event.target.id()));
    return () => { cy.destroy(); if (graph.current === cy) graph.current = null; };
  }, [elements, onNode]);

  useEffect(() => {
    if (!host.current) return;
    let frame = 0;
    const observer = new ResizeObserver(() => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => graph.current?.resize());
    });
    observer.observe(host.current);
    return () => { cancelAnimationFrame(frame); observer.disconnect(); };
  }, []);

  useEffect(() => {
    const cy = graph.current;
    const paths = animatedPaths.map(path => path.filter(id => !cy?.getElementById(id).empty())).filter(path => path.length);
    if (!cy || !paths.length) return;
    const timers: Array<ReturnType<typeof setTimeout>> = [];
    let routeElements = cy.collection();
    paths.flat().forEach(id => { routeElements = routeElements.union(cy.getElementById(id)); });
    const stepMs = 900;
    const routePauseMs = 1500;
    const cycleMs = paths.reduce((total, path) => total + path.length * stepMs + routePauseMs, 0);
    const play = () => {
      timers.forEach(clearTimeout);
      timers.length = 0;
      cy.elements().removeClass('route-active route-current').addClass('route-muted');
      cy.animate({ fit: { eles: routeElements, padding: 110 }, duration: 700, easing: 'ease-in-out-cubic' });
      let offset = 0;
      paths.forEach(path => {
        timers.push(setTimeout(() => cy.elements().removeClass('route-active route-current').addClass('route-muted'), offset));
        path.forEach((id, index) => timers.push(setTimeout(() => {
          cy.elements().removeClass('route-current');
          cy.getElementById(id).removeClass('route-muted').addClass('route-active route-current');
        }, offset + index * stepMs)));
        offset += path.length * stepMs + routePauseMs;
      });
    };
    play();
    const interval = setInterval(play, cycleMs);
    return () => { clearInterval(interval); timers.forEach(clearTimeout); cy.elements().removeClass('route-muted route-active route-current'); };
  }, [elements, animatedPaths.map(path => path.join('|')).join('::')]);

  async function toggleFullscreen() {
    if (!stage.current) return;
    if (document.fullscreenElement === stage.current) await document.exitFullscreen();
    else await stage.current.requestFullscreen();
  }
  const zoom = (factor: number) => graph.current?.zoom({ level: (graph.current.zoom() ?? 1) * factor, renderedPosition: { x: (host.current?.clientWidth ?? 0) / 2, y: (host.current?.clientHeight ?? 0) / 2 } });

  return <div className={`graph-stage ${fullscreen ? 'is-fullscreen' : ''}`} ref={stage}>
    <div className="graph-legend" aria-label="Node color legend">{Object.entries(nodeColors).map(([kind, color]) => <span key={kind}><i style={{ background: color }}/>{kind === 'BusinessRule' ? 'Rule' : kind}</span>)}</div>
    <div className="graph-controls" aria-label="Graph controls"><button type="button" title="Zoom in" onClick={() => zoom(1.2)}>+</button><button type="button" title="Zoom out" onClick={() => zoom(1 / 1.2)}>−</button><button type="button" title="Fit map" onClick={() => graph.current?.fit(undefined, 70)}>⌂</button><button type="button" title={fullscreen ? 'Exit fullscreen' : 'Open fullscreen'} onClick={toggleFullscreen}>{fullscreen ? '↙' : '⛶'}</button></div>
    {fullscreen && <div className="fullscreen-label">Fullscreen map · Press Esc to exit</div>}
    {!nodes.length && <div className="graph-empty"><span><img src="/knowledge-way-logo.png" alt=""/></span><b>Your knowledge map will appear here</b><small>Search the ontology or ask a question to begin.</small></div>}
    <div className="graph-canvas" ref={host} aria-label="Interactive enterprise knowledge map"/>
  </div>;
}
