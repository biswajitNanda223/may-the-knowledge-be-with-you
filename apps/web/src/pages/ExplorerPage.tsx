import { type FormEvent, useCallback, useEffect, useState } from "react";
import type React from "react";
import { getGraph, getNeighbors } from "../api";
import {
  getNodeKind,
  GraphCanvas,
  nodeColors,
} from "../components/GraphCanvas";
import type { GraphEdge, GraphNode } from "../types";

export function ExplorerPage() {
  const [nodes, setNodes] = useState<GraphNode[]>([]),
    [edges, setEdges] = useState<GraphEdge[]>([]);
  const [requestCursor, setRequestCursor] = useState<string | null>(null),
    [nextCursor, setNextCursor] = useState<string | null>(null),
    [history, setHistory] = useState<Array<string | null>>([]);
  const [search, setSearch] = useState(""),
    [error, setError] = useState(""),
    [selected, setSelected] = useState<GraphNode | null>(null);
  const [page, setPage] = useState(1),
    [loading, setLoading] = useState(false),
    [detailsOpen, setDetailsOpen] = useState(true),
    [compact, setCompact] = useState(false);

  const loadPage = useCallback(
    async (cursor: string | null, reset = false) => {
      setLoading(true);
      try {
        const params = new URLSearchParams({ limit: "25" });
        if (cursor) params.set("cursor", cursor);
        if (search.trim()) params.set("search", search.trim());
        const data = await getGraph(params);
        setNodes(data.nodes);
        setEdges(data.edges);
        setRequestCursor(cursor);
        setNextCursor(data.nextCursor);
        setSelected(null);
        setError("");
        if (reset) {
          setHistory([]);
          setPage(1);
        }
      } catch (reason) {
        setError(
          reason instanceof Error ? reason.message : "Graph request failed",
        );
      } finally {
        setLoading(false);
      }
    },
    [search],
  );
  useEffect(() => {
    void loadPage(null, true);
  }, []);
  const isolateNode = useCallback(
    async (id: string) => {
      setLoading(true);
      try {
        const clicked = nodes.find((node) => node.id === id),
          data = await getNeighbors(id),
          focus =
            data.nodes.find((node) => node.id === id) ??
            clicked ??
            data.nodes[0] ??
            null;
        setNodes(data.nodes);
        setEdges(data.edges);
        setSelected(focus);
        setDetailsOpen(true);
        setError("");
      } catch (reason) {
        setError(
          reason instanceof Error ? reason.message : "Node expansion failed",
        );
      } finally {
        setLoading(false);
      }
    },
    [nodes],
  );
  function submit(event: FormEvent) {
    event.preventDefault();
    void loadPage(null, true);
  }
  function nextPage() {
    if (!nextCursor) return;
    setHistory((value) => [...value, requestCursor]);
    setPage((value) => value + 1);
    void loadPage(nextCursor);
  }
  function previousPage() {
    if (!history.length) return;
    const previous = history[history.length - 1];
    setHistory((value) => value.slice(0, -1));
    setPage((value) => Math.max(1, value - 1));
    void loadPage(previous);
  }
  const activeKind = selected ? getNodeKind(selected) : null,
    incoming = selected
      ? edges.filter((edge) => edge.target === selected.id).length
      : 0,
    outgoing = selected
      ? edges.filter((edge) => edge.source === selected.id).length
      : 0;

  return (
    <main className="explorer">
      <header className="page-title">
        <div>
          <p className="eyebrow">Enterprise knowledge</p>
          <h1>Knowledge map</h1>
          <p className="muted">
            Explore every concept and relationship in one connected workspace.
          </p>
        </div>
        <div className="stats">
          <span>
            <b>{nodes.length}</b> nodes
          </span>
          <span>
            <b>{edges.length}</b> links
          </span>
        </div>
      </header>
      <form className="map-search" onSubmit={submit}>
        <input
          aria-label="Search knowledge map"
          placeholder="Search entities, rules, systems, or processes"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        <button disabled={loading}>Search map</button>
      </form>
      {error && <p className="error">{error}</p>}
      <section className={`panel explorer-graph ${compact ? "compact" : ""}`}>
        <div className="map-panel-head">
          <div>
            <strong>Ontology</strong>
            <span>
              {selected
                ? `Focused on ${selected.name}`
                : `Page ${page} of the knowledge graph`}
            </span>
          </div>
          <div className="map-view-actions">
            <button
              className="secondary-button"
              type="button"
              onClick={() => setCompact((value) => !value)}
            >
              {compact ? "Maximize view" : "Minimize view"}
            </button>
            {selected && (
              <button
                className="secondary-button"
                type="button"
                onClick={() => setDetailsOpen((value) => !value)}
              >
                {detailsOpen ? "Hide details" : "Show details"}
              </button>
            )}
          </div>
        </div>
        <div className="map-canvas-wrap">
          <GraphCanvas nodes={nodes} edges={edges} onNode={isolateNode} />
          {loading && <div className="graph-loading">Updating map…</div>}
          {selected && detailsOpen && (
            <aside
              className="node-detail-card"
              style={
                {
                  "--node-color": nodeColors[activeKind!],
                } as React.CSSProperties
              }
            >
              <button
                className="detail-close"
                onClick={() => setDetailsOpen(false)}
                aria-label="Minimize node details"
              >
                −
              </button>
              <div className="node-detail-title">
                <i />
                <div>
                  <small>
                    {activeKind === "BusinessRule" ? "Rule" : activeKind}
                  </small>
                  <h2>{selected.name}</h2>
                  <code>{selected.id}</code>
                </div>
              </div>
              <div className="node-counts">
                <span>
                  <b>{incoming}</b> incoming
                </span>
                <span>
                  <b>{outgoing}</b> outgoing
                </span>
              </div>
              <div className="node-properties">
                {Object.entries(selected.properties)
                  .slice(0, 5)
                  .map(([key, value]) => (
                    <div key={key}>
                      <span>{key.replace(/([A-Z])/g, " $1")}</span>
                      <p>{String(value)}</p>
                    </div>
                  ))}
              </div>
            </aside>
          )}
        </div>
        <footer className="map-pagination">
          {selected ? (
            <>
              <button
                className="secondary-button"
                onClick={() => loadPage(requestCursor)}
              >
                ← Back to page {page}
              </button>
              <span>
                Showing the selected node and its direct relationships
              </span>
            </>
          ) : (
            <>
              <button
                className="secondary-button"
                disabled={!history.length || loading}
                onClick={previousPage}
              >
                ← Previous
              </button>
              <span>Page {page} · up to 25 nodes</span>
              <button disabled={!nextCursor || loading} onClick={nextPage}>
                Next →
              </button>
            </>
          )}
        </footer>
      </section>
    </main>
  );
}
