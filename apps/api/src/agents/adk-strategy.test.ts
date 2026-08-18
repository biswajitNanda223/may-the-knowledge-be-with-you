import assert from "node:assert/strict";
import test from "node:test";
import { streamAdkText } from "./adk-event-stream.js";

async function collect(
  events: AsyncIterable<{ content?: { parts?: Array<{ text?: string }> } }>,
) {
  const chunks: string[] = [];
  for await (const chunk of streamAdkText(events)) chunks.push(chunk);
  return chunks;
}

test("streams text parts from ADK events", async () => {
  async function* events() {
    yield { content: { parts: [{ text: "hello " }, {}, { text: "world" }] } };
  }
  assert.deepEqual(await collect(events()), ["hello ", "world"]);
});

test("fails closed when ADK returns no text", async () => {
  async function* events() {
    yield { content: { parts: [] } };
  }
  await assert.rejects(() => collect(events()), /returned no text/);
});
