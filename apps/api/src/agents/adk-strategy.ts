import { InMemoryRunner, LlmAgent, StreamingMode } from "@google/adk";
import type { AgentInput, AgentStrategy } from "./strategy.js";
import { streamAdkText } from "./adk-event-stream.js";

const APP_NAME = "mtkbwy";
const WEB_USER_ID = "web-user";
const NO_TEXT_ERROR_PREFIX = "ADK model returned no text";

function buildGroundedPrompt(input: AgentInput): string {
  const evidence = JSON.stringify({
    nodes: input.evidence.nodes,
    edges: input.evidence.edges,
  });

  return `Question: ${input.question}\nNeo4j evidence: ${evidence}`;
}

function isNoTextError(error: unknown): error is Error {
  return (
    error instanceof Error && error.message.startsWith(NO_TEXT_ERROR_PREFIX)
  );
}

export class AdkAgentStrategy implements AgentStrategy {
  private readonly agent: LlmAgent;

  constructor(model: string) {
    this.agent = new LlmAgent({
      name: "enterprise_knowledge_agent",
      model,
      description: "Answers only from supplied Neo4j evidence.",
      instruction:
        "Use supplied evidence only. State when evidence is insufficient. Be concise and cite entity IDs in brackets.",
    });
  }

  async *stream(input: AgentInput): AsyncGenerator<string> {
    const runner = new InMemoryRunner({
      agent: this.agent,
      appName: APP_NAME,
    });

    try {
      yield* this.streamAttempt(
        runner,
        input,
        input.conversationId,
        StreamingMode.SSE,
      );
    } catch (error) {
      if (!isNoTextError(error)) throw error;

      yield* this.streamAttempt(
        runner,
        input,
        `${input.conversationId}-retry`,
        StreamingMode.NONE,
      );
    }
  }

  private async *streamAttempt(
    runner: InMemoryRunner,
    input: AgentInput,
    sessionId: string,
    streamingMode: StreamingMode,
  ): AsyncGenerator<string> {
    await runner.sessionService.createSession({
      appName: APP_NAME,
      userId: WEB_USER_ID,
      sessionId,
    });

    const events = runner.runAsync({
      userId: WEB_USER_ID,
      sessionId,
      runConfig: { streamingMode },
      newMessage: {
        role: "user",
        parts: [{ text: buildGroundedPrompt(input) }],
      },
    });

    for await (const text of streamAdkText(events)) {
      if (streamingMode === StreamingMode.SSE) {
        yield text;
        continue;
      }

      yield* text.match(/\S+\s*/g) ?? [text];
    }
  }
}
