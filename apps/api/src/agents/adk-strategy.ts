import { InMemoryRunner, LlmAgent, StreamingMode } from '@google/adk';
import type { AgentInput, AgentStrategy } from './strategy.js';
import { streamAdkText } from './adk-event-stream.js';

export class AdkAgentStrategy implements AgentStrategy {
  private agent: LlmAgent;
  constructor(model: string) {
    this.agent = new LlmAgent({ name: 'enterprise_knowledge_agent', model, description: 'Answers only from supplied Neo4j evidence.', instruction: 'Use supplied evidence only. State when evidence is insufficient. Be concise and cite entity IDs in brackets.' });
  }
  async *stream(input: AgentInput) {
    const runner = new InMemoryRunner({ agent: this.agent, appName: 'mtkbwy' });
    const userId = 'web-user';
    const evidence = JSON.stringify({ nodes: input.evidence.nodes, edges: input.evidence.edges });
    const run = async function* (sessionId: string, streamingMode: StreamingMode) {
      await runner.sessionService.createSession({ appName: 'mtkbwy', userId, sessionId });
      const events = runner.runAsync({ userId, sessionId, runConfig: { streamingMode }, newMessage: { role: 'user', parts: [{ text: `Question: ${input.question}\nNeo4j evidence: ${evidence}` }] } });
      for await (const text of streamAdkText(events)) {
        if (streamingMode === StreamingMode.SSE) yield text;
        else for (const chunk of text.match(/\S+\s*/g) ?? [text]) yield chunk;
      }
    };
    try { yield* run(input.conversationId, StreamingMode.SSE); }
    catch (error) {
      if (!(error instanceof Error) || !error.message.startsWith('ADK model returned no text')) throw error;
      yield* run(`${input.conversationId}-retry`, StreamingMode.NONE);
    }
  }
}
