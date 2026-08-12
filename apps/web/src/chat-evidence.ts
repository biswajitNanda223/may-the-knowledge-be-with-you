import type { GraphEdge, GraphNode } from './types';

export type EvidenceRoute = { elements: string[]; labels: string[] };
type Path = { nodes: string[]; edges: GraphEdge[] };
type Step = { node: string; edge: GraphEdge };

const stopWords = new Set([
  'which', 'what', 'where', 'when', 'who', 'why', 'how', 'does', 'that', 'this',
  'with', 'from', 'your', 'about', 'answer', 'govern', 'governs', 'business', 'rules',
]);

function rankStarts(question: string, nodes: GraphNode[], targets: string[]) {
  const terms = question.toLowerCase().split(/[^a-z0-9_-]+/)
    .filter(term => term.length > 2 && !stopWords.has(term));
  const score = (node: GraphNode) => {
    const text = `${node.id} ${node.name} ${Object.values(node.properties).join(' ')}`.toLowerCase();
    return terms.reduce((total, term) => total + Number(text.includes(term)), 0);
  };
  return nodes.filter(node => !targets.includes(node.id))
    .sort((left, right) => score(right) - score(left)).slice(0, 3);
}

function buildAdjacency(edges: GraphEdge[]) {
  const adjacency = new Map<string, Step[]>();
  const add = (from: string, step: Step) => adjacency.set(from, [...(adjacency.get(from) ?? []), step]);
  for (const edge of edges) {
    add(edge.source, { node: edge.target, edge });
    add(edge.target, { node: edge.source, edge });
  }
  return adjacency;
}

function shortestPath(start: string, target: string, adjacency: Map<string, Step[]>): Path | undefined {
  const queue = [start], seen = new Set(queue), previous = new Map<string, Step>();
  while (queue.length && !seen.has(target)) {
    const current = queue.shift()!;
    for (const next of adjacency.get(current) ?? []) {
      if (seen.has(next.node)) continue;
      seen.add(next.node); previous.set(next.node, { node: current, edge: next.edge }); queue.push(next.node);
    }
  }
  if (!seen.has(target)) return undefined;
  const path: Path = { nodes: [target], edges: [] };
  for (let cursor = target; cursor !== start;) {
    const step = previous.get(cursor);
    if (!step) return undefined;
    path.edges.unshift(step.edge); path.nodes.unshift(step.node); cursor = step.node;
  }
  return path;
}

function toRoute(path: Path, nodeById: Map<string, GraphNode>): EvidenceRoute {
  const route: EvidenceRoute = { elements: [], labels: [] };
  path.nodes.forEach((id, index) => {
    route.elements.push(id); route.labels.push(nodeById.get(id)?.name ?? id);
    const edge = path.edges[index];
    if (edge) { route.elements.push(edge.id); route.labels.push(edge.type.replaceAll('_', ' ').toLowerCase()); }
  });
  return route;
}

export function buildEvidenceRoutes(question: string, nodes: GraphNode[], edges: GraphEdge[], targets: string[]) {
  const starts = rankStarts(question, nodes, targets);
  const adjacency = buildAdjacency(edges);
  const nodeById = new Map(nodes.map(node => [node.id, node]));
  const routes: EvidenceRoute[] = [];
  for (const target of targets.slice(0, 4)) {
    const candidates = starts.map(start => shortestPath(start.id, target, adjacency))
      .filter((path): path is Path => Boolean(path));
    const best = candidates.sort((left, right) => left.edges.length - right.edges.length)[0];
    if (best) routes.push(toRoute(best, nodeById));
  }
  if (!routes.length && starts[0]) routes.push({ elements: [starts[0].id], labels: [starts[0].name] });
  return routes;
}
