import { useEffect, useState } from "react";
import { API } from "../api";
type Run = {
  traceId: string;
  conversationId: string;
  model: string;
  status: "RUNNING" | "COMPLETED" | "FAILED";
  startedAt: string;
  durationMs?: number;
  questionChars: number;
  evidenceNodes: number;
  evidenceEdges: number;
  outputChunks: number;
  outputChars: number;
  error?: string;
};
type Snapshot = {
  generatedAt: string;
  scope: string;
  summary: {
    runs: number;
    running: number;
    completed: number;
    failed: number;
    averageDurationMs: number;
    totalOutputChars: number;
  };
  runs: Run[];
};
export function TelemetryPage() {
  const [data, setData] = useState<Snapshot>();
  const [error, setError] = useState("");
  useEffect(() => {
    let live = true;
    const load = async () => {
      try {
        const response = await fetch(`${API}/v1/telemetry/agent`);
        if (!response.ok)
          throw new Error(`Activity feed unavailable: ${response.status}`);
        const value = await response.json();
        if (live) {
          setData(value);
          setError("");
        }
      } catch (reason) {
        if (live)
          setError(
            reason instanceof Error ? reason.message : "Activity unavailable",
          );
      }
    };
    void load();
    const timer = setInterval(load, 3000);
    return () => {
      live = false;
      clearInterval(timer);
    };
  }, []);
  return (
    <main className="telemetry-page">
      <header className="page-title">
        <div>
          <p className="eyebrow">Workspace activity</p>
          <h1>Usage and performance</h1>
          <p className="muted">
            A privacy-conscious view of recent knowledge requests and service
            performance.
          </p>
        </div>
        <span className="activity-state">
          <i /> Live updates
        </span>
      </header>
      {error && <p className="error">{error}</p>}
      <section className="metric-grid">
        <article>
          <small>Total requests</small>
          <strong>{data?.summary.runs ?? "—"}</strong>
          <span>{data?.summary.running ?? 0} in progress</span>
        </article>
        <article>
          <small>Completed</small>
          <strong>{data?.summary.completed ?? "—"}</strong>
          <span>{data?.summary.failed ?? 0} unsuccessful</span>
        </article>
        <article>
          <small>Average response</small>
          <strong>{data ? `${data.summary.averageDurationMs}ms` : "—"}</strong>
          <span>End-to-end duration</span>
        </article>
        <article>
          <small>Response volume</small>
          <strong>{data?.summary.totalOutputChars ?? "—"}</strong>
          <span>Characters delivered</span>
        </article>
      </section>
      <section className="agent-runs panel">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Recent requests</p>
            <h2>Activity history</h2>
          </div>
          <p>No question text or credentials are stored here.</p>
        </div>
        <div className="run-table">
          <div className="run-row run-head">
            <span>Status</span>
            <span>Reference</span>
            <span>Model</span>
            <span>Sources</span>
            <span>Output</span>
            <span>Duration</span>
          </div>
          {data?.runs.length ? (
            data.runs.map((run) => (
              <div className="run-row" key={run.traceId}>
                <span className={`run-status ${run.status.toLowerCase()}`}>
                  {run.status.toLowerCase()}
                </span>
                <code title={run.traceId}>{run.traceId.slice(0, 8)}</code>
                <span>{run.model}</span>
                <span>
                  {run.evidenceNodes} nodes / {run.evidenceEdges} links
                </span>
                <span>{run.outputChars} chars</span>
                <span>
                  {run.durationMs == null
                    ? "In progress"
                    : `${run.durationMs}ms`}
                </span>
              </div>
            ))
          ) : (
            <p className="empty-table">
              New requests will appear here as they are completed.
            </p>
          )}
        </div>
      </section>
    </main>
  );
}
