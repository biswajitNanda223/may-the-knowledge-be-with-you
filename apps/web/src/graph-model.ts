import type { ElementDefinition } from "cytoscape";
import type { GraphEdge, GraphNode } from "./types";

export type NodeKind =
  | "Entity"
  | "Process"
  | "BusinessRule"
  | "System"
  | "Glossary"
  | "Relationship"
  | "Other";

export const nodeColors: Record<NodeKind, string> = {
  Entity: "#6366F1",
  Process: "#9333EA",
  BusinessRule: "#E84D5B",
  System: "#00A884",
  Glossary: "#E99A24",
  Relationship: "#F2683A",
  Other: "#64748B",
};

export function getNodeKind(node: GraphNode): NodeKind {
  const id = node.id.toUpperCase();
  const category = String(node.properties.category ?? "").toLowerCase();

  if (
    id.startsWith("BR-") ||
    id.startsWith("BR_") ||
    category.includes("rule")
  ) {
    return "BusinessRule";
  }
  if (
    id.startsWith("SYS") ||
    category.includes("system") ||
    category.includes("application")
  ) {
    return "System";
  }
  if (
    id.startsWith("PROC") ||
    id.startsWith("PS-") ||
    category.includes("process")
  ) {
    return "Process";
  }
  if (
    id.startsWith("GL-") ||
    id.startsWith("TERM") ||
    category.includes("glossary") ||
    category.includes("term")
  ) {
    return "Glossary";
  }
  if (id.startsWith("REL") || category.includes("relationship")) {
    return "Relationship";
  }
  if (id.startsWith("ENT") || category) return "Entity";

  return "Other";
}

export function buildGraphElements(
  nodes: GraphNode[],
  edges: GraphEdge[],
  highlightedNodeIds: string[],
): ElementDefinition[] {
  const nodeIds = new Set(nodes.map((node) => node.id));
  const highlighted = new Set(highlightedNodeIds);
  const seenEdges = new Set<string>();

  const safeEdges = edges.filter((edge) => {
    const missingEndpoint =
      !nodeIds.has(edge.source) || !nodeIds.has(edge.target);
    if (missingEndpoint || edge.source === edge.target) return false;

    const key = `${edge.source}|${edge.target}|${edge.type}`;
    if (seenEdges.has(key)) return false;

    seenEdges.add(key);
    return true;
  });

  return [
    ...nodes.map((node) => ({
      data: {
        id: node.id,
        label: node.name,
        color: nodeColors[getNodeKind(node)],
        cited: highlighted.has(node.id) ? "yes" : "no",
      },
    })),
    ...safeEdges.map((edge) => ({
      data: {
        id: edge.id,
        source: edge.source,
        target: edge.target,
        label: edge.type.replaceAll("_", " "),
      },
    })),
  ];
}
