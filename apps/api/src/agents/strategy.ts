import type { Evidence } from "../domain/graph.js";
export type AgentInput = {
  question: string;
  evidence: Evidence;
  conversationId: string;
};
export interface AgentStrategy {
  stream(input: AgentInput): AsyncIterable<string>;
}
