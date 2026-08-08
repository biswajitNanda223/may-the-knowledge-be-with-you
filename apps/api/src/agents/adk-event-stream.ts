type AdkEvent = { content?: { parts?: Array<{ text?: string }> }; errorMessage?: string };

export async function* streamAdkText(events: AsyncIterable<AdkEvent>) {
  let emitted = false;
  for await (const event of events) {
    if (event.errorMessage) throw new Error(event.errorMessage);
    for (const part of event.content?.parts ?? []) {
      if (part.text) {
        emitted = true;
        yield part.text;
      }
    }
  }
  if (!emitted) throw new Error('ADK model returned no text. Verify Gemini API credentials, quota, and safety settings.');
}
