import type { AgentInput, AgentStrategy } from "./strategy.js";
export class MockAgentStrategy implements AgentStrategy {
  async *stream({ question, evidence }: AgentInput) {
    const names =
      evidence.nodes
        .slice(0, 8)
        .map((n) => n.name)
        .join(", ") || "no matching ontology nodes";
    const text = `Question: ${question}\n\nEvidence found in Neo4j: ${names}. Open evidence graph to inspect exact nodes and relationships used for this answer.`;
    for (const token of text.split(/(?<=\s)/)) yield token;
  }
}
