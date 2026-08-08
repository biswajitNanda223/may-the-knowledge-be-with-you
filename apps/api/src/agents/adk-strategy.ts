import { InMemoryRunner, LlmAgent } from '@google/adk';
import type { AgentInput, AgentStrategy } from './strategy.js';

export class AdkAgentStrategy implements AgentStrategy {
  private agent: LlmAgent;
  constructor(model: string) {
    this.agent = new LlmAgent({ name: 'enterprise_knowledge_agent', model, description: 'Answers only from supplied Neo4j evidence.', instruction: 'Use supplied evidence only. State when evidence is insufficient. Be concise and cite entity IDs in brackets.' });
  }
  async *stream(input: AgentInput) {
    const runner = new InMemoryRunner({ agent: this.agent, appName: 'mtkbwy' });
    const userId = 'web-user';
    await runner.sessionService.createSession({ appName: 'mtkbwy', userId, sessionId: input.conversationId });
    const evidence = JSON.stringify({ nodes: input.evidence.nodes, edges: input.evidence.edges });
    const events = runner.runAsync({ userId, sessionId: input.conversationId, newMessage: { role: 'user', parts: [{ text: `Question: ${input.question}\nNeo4j evidence: ${evidence}` }] } });
    for await (const event of events) for (const part of event.content?.parts ?? []) if ('text' in part && part.text) yield part.text;
  }
}

