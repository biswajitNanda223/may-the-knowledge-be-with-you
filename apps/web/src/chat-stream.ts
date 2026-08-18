import { API } from "./api";
import type { GraphEdge, GraphNode } from "./types";

type Trace = {
  nodes: GraphNode[];
  edges: GraphEdge[];
  cypherId: string;
  elapsedMs: number;
  traceId: string;
};
type Handlers = {
  onToken: (answer: string) => void;
  onTrace: (trace: Trace) => void;
};

function parseFrame(frame: string) {
  const event = frame.match(/^event: (.+)$/m)?.[1];
  const raw = frame.match(/^data: (.+)$/m)?.[1];
  return raw ? { event, data: JSON.parse(raw) } : undefined;
}

export async function streamAnswer(question: string, handlers: Handlers) {
  const response = await fetch(`${API}/v1/chat`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ question }),
  });
  if (!response.ok || !response.body)
    throw new Error(`Request failed: ${response.status}`);
  const reader = response.body.getReader(),
    decoder = new TextDecoder();
  let buffer = "",
    answer = "",
    streamError = "";
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const frames = buffer.split("\n\n");
    buffer = frames.pop() ?? "";
    for (const rawFrame of frames) {
      const frame = parseFrame(rawFrame);
      if (frame?.event === "token")
        handlers.onToken((answer += frame.data.token));
      if (frame?.event === "trace") handlers.onTrace(frame.data);
      if (frame?.event === "error")
        streamError = frame.data.message ?? "Request could not be completed.";
    }
  }
  return streamError || answer;
}
