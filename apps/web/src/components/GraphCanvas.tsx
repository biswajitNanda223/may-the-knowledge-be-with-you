import cytoscape, { type Core } from 'cytoscape';
import { useEffect, useRef } from 'react';
import type { GraphEdge, GraphNode } from '../types';
const colors: Record<string, string> = { Entity: '#5b8def', ProcessStep: '#a78bfa', BusinessRule: '#fb7185', System: '#34d399', GlossaryTerm: '#fbbf24' };
export function GraphCanvas({ nodes, edges, onNode }: { nodes: GraphNode[]; edges: GraphEdge[]; onNode?: (id: string) => void }) {
  const host = useRef<HTMLDivElement>(null); const graph = useRef<Core | null>(null);
  useEffect(() => {
    if (!host.current) return;
    graph.current?.destroy(); graph.current = cytoscape({ container: host.current,
      elements: [...nodes.map(n => ({ data: { id: n.id, label: n.name, kind: n.label, color: colors[n.label] ?? '#60a5fa' } })), ...edges.map(e => ({ data: { id: e.id, source: e.source, target: e.target, label: e.type } }))],
      style: [{ selector: 'node', style: { 'background-color': 'data(color)', label: 'data(label)', color: '#dbeafe', 'font-size': 10, 'text-wrap': 'wrap', 'text-max-width': 100, 'text-valign': 'bottom', 'text-margin-y': 7 } }, { selector: 'edge', style: { width: 1.5, 'line-color': '#52627a', 'target-arrow-color': '#52627a', 'target-arrow-shape': 'triangle', 'curve-style': 'bezier', label: 'data(label)', color: '#93a4bd', 'font-size': 7 } }, { selector: ':selected', style: { 'border-width': 3, 'border-color': '#fff' } }] as unknown as cytoscape.StylesheetCSS[],
      layout: { name: 'cose', animate: false, nodeRepulsion: () => 8000 }
    });
    graph.current.on('tap', 'node', e => onNode?.(e.target.id())); return () => graph.current?.destroy();
  }, [nodes, edges, onNode]);
  return <div className="graph-canvas" ref={host} aria-label="Interactive ontology graph" />;
}
