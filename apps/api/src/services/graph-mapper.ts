import neo4j from "neo4j-driver";
import type { GraphEdge, GraphNode } from "../domain/graph.js";

function toNativeValue(value: unknown): unknown {
  return neo4j.isInt(value) ? value.toNumber() : value;
}

function toNativeProperties(
  properties: Record<string, unknown>,
): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(properties).map(([key, value]) => [
      key,
      toNativeValue(value),
    ]),
  );
}

export function mapNode(node: neo4j.Node): GraphNode {
  const id = String(node.properties.id ?? node.elementId);

  return {
    id,
    label: node.labels[0] ?? "Node",
    name: String(node.properties.name ?? id),
    properties: toNativeProperties(node.properties),
  };
}

export function mapRelationship(relationship: neo4j.Relationship): GraphEdge {
  return {
    id: relationship.elementId,
    source: String(
      relationship.properties.fromId ?? relationship.startNodeElementId,
    ),
    target: String(
      relationship.properties.toId ?? relationship.endNodeElementId,
    ),
    type: relationship.type,
    properties: toNativeProperties(relationship.properties),
  };
}

export function mapRelationshipBetween(
  relationship: neo4j.Relationship,
  left: neo4j.Node,
  leftNode: GraphNode,
  right: neo4j.Node,
  rightNode: GraphNode,
): GraphEdge {
  return {
    ...mapRelationship(relationship),
    source:
      relationship.startNodeElementId === left.elementId
        ? leftNode.id
        : rightNode.id,
    target:
      relationship.endNodeElementId === right.elementId
        ? rightNode.id
        : leftNode.id,
  };
}
