import cytoscape, { type Core } from 'cytoscape';
import { useEffect, useRef } from 'react';
import type { GraphEdge, GraphNode } from '../types';

const colors: Record<string, string> = {
  Entity: '#4c8eda', ProcessStep: '#8b6fc5', BusinessRule: '#df6b72', System: '#42a88b', GlossaryTerm: '#d8a43b', OntologyNode: '#4c8eda'
};

export function GraphCanvas({ nodes, edges, onNode }: { nodes: GraphNode[]; edges: GraphEdge[]; onNode?: (id: string) => void }) {
  const host = useRef<HTMLDivElement>(null);
  const graph = useRef<Core | null>(null);
  useEffect(() => {
    if (!host.current) return;
    graph.current?.destroy();
    graph.current = cytoscape({
      container: host.current,
      elements: [
        ...nodes.map(node => ({ data: { id: node.id, label: node.name, kind: node.label, color: colors[node.label] ?? '#4c8eda' } })),
        ...edges.map(edge => ({ data: { id: edge.id, source: edge.source, target: edge.target, label: edge.type.replaceAll('_', ' ') } }))
      ],
      style: [
        { selector: 'node', style: { width: 54, height: 54, 'background-color': 'data(color)', 'border-width': 3, 'border-color': '#ffffff', 'text-outline-width': 0, label: 'data(label)', color: '#23344d', 'font-family': 'Inter, sans-serif', 'font-weight': 600, 'font-size': 10, 'text-wrap': 'wrap', 'text-max-width': 112, 'text-valign': 'bottom', 'text-margin-y': 10, 'overlay-opacity': 0, 'shadow-blur': 12, 'shadow-color': '#8aa1ba', 'shadow-opacity': .2, 'shadow-offset-y': 3 } },
        { selector: 'edge', style: { width: 1.5, 'line-color': '#aab8c8', 'target-arrow-color': '#8798ab', 'target-arrow-shape': 'triangle', 'arrow-scale': .8, 'curve-style': 'bezier', label: 'data(label)', color: '#6d7f93', 'font-family': 'Inter, sans-serif', 'font-size': 7, 'text-background-color': '#ffffff', 'text-background-opacity': .9, 'text-background-padding': 3, 'text-rotation': 'autorotate', 'overlay-opacity': 0 } },
        { selector: 'node:hover', style: { 'border-color': '#1b6fb8', 'border-width': 4 } },
        { selector: ':selected', style: { 'border-width': 5, 'border-color': '#173f67', 'shadow-opacity': .35 } }
      ] as unknown as cytoscape.StylesheetCSS[],
      layout: { name: 'cose', animate: false, fit: true, padding: 60, nodeRepulsion: () => 12000, idealEdgeLength: () => 120 }
    });
    graph.current.on('tap', 'node', event => onNode?.(event.target.id()));
    return () => graph.current?.destroy();
  }, [nodes, edges, onNode]);
  return <div className="graph-stage">
    <div className="graph-controls" aria-label="Graph controls">
      <button type="button" title="Zoom in" onClick={() => graph.current?.zoom({ level: (graph.current.zoom() ?? 1) * 1.2, renderedPosition: { x: (host.current?.clientWidth ?? 0) / 2, y: (host.current?.clientHeight ?? 0) / 2 } })}>+</button>
      <button type="button" title="Zoom out" onClick={() => graph.current?.zoom({ level: (graph.current.zoom() ?? 1) / 1.2, renderedPosition: { x: (host.current?.clientWidth ?? 0) / 2, y: (host.current?.clientHeight ?? 0) / 2 } })}>−</button>
      <button type="button" title="Fit graph" onClick={() => graph.current?.fit(undefined, 50)}>⌂</button>
    </div>
    {!nodes.length && <div className="graph-empty"><span>◇</span><b>Graph evidence appears here</b><small>Ask a question or load ontology nodes</small></div>}
    <div className="graph-canvas" ref={host} aria-label="Interactive Neo4j ontology graph" />
  </div>;
}
