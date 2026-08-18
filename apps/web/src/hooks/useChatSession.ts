import { useMemo, useState, type FormEvent } from "react";
import { buildEvidenceRoutes } from "../chat-evidence";
import { streamAnswer } from "../chat-stream";
import type { GraphEdge, GraphNode } from "../types";

const DEFAULT_QUESTION = "Which business rules govern a project?";

export function useChatSession() {
  const [question, setQuestion] = useState(DEFAULT_QUESTION);
  const [submittedQuestion, setSubmittedQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [nodes, setNodes] = useState<GraphNode[]>([]);
  const [edges, setEdges] = useState<GraphEdge[]>([]);
  const [trace, setTrace] = useState("");
  const [busy, setBusy] = useState(false);

  const citedNodeIds = useMemo(
    () =>
      Array.from(
        answer.matchAll(/\[([A-Za-z0-9_-]+)\]/g),
        (match) => match[1],
      ).filter((id) => nodes.some((node) => node.id === id)),
    [answer, nodes],
  );

  const animatedPaths = useMemo(
    () =>
      buildEvidenceRoutes(submittedQuestion, nodes, edges, citedNodeIds).map(
        (route) => route.elements,
      ),
    [submittedQuestion, nodes, edges, citedNodeIds],
  );

  async function submit(event: FormEvent) {
    event.preventDefault();

    const submitted = question.trim();
    if (!submitted || busy) return;

    setSubmittedQuestion(submitted);
    setQuestion("");
    setAnswer("");
    setNodes([]);
    setEdges([]);
    setTrace("");
    setBusy(true);

    try {
      const finalAnswer = await streamAnswer(submitted, {
        onToken: setAnswer,
        onTrace: (data) => {
          setNodes(data.nodes);
          setEdges(data.edges);
          setTrace(`${data.cypherId} · ${data.elapsedMs}ms · ${data.traceId}`);
        },
      });
      setAnswer(finalAnswer);
    } catch (error) {
      setAnswer(error instanceof Error ? error.message : "Request failed");
    } finally {
      setBusy(false);
    }
  }

  return {
    question,
    setQuestion,
    submittedQuestion,
    answer,
    nodes,
    edges,
    trace,
    busy,
    citedNodeIds,
    animatedPaths,
    submit,
  };
}
