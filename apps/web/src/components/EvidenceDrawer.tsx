import { useState } from "react";
import type { GraphEdge, GraphNode } from "../types";
import { GraphCanvas } from "./GraphCanvas";
import { Icon } from "./Icon";

type DrawerMode = "normal" | "expanded" | "minimized";

type EvidenceDrawerProps = {
  nodes: GraphNode[];
  edges: GraphEdge[];
  trace: string;
  highlightedNodeIds: string[];
  animatedPaths: string[][];
  onClose: () => void;
};

export function EvidenceDrawer({
  nodes,
  edges,
  trace,
  highlightedNodeIds,
  animatedPaths,
  onClose,
}: EvidenceDrawerProps) {
  const [mode, setMode] = useState<DrawerMode>("normal");
  const toggleSize = () =>
    setMode((current) => (current === "expanded" ? "normal" : "expanded"));

  return (
    <>
      {mode !== "minimized" && (
        <button
          className="drawer-backdrop"
          aria-label="Close sources"
          onClick={onClose}
        />
      )}
      <aside className={`evidence-drawer open ${mode}`}>
        <div className="drawer-head">
          <div>
            <p className="eyebrow">Answer evidence</p>
            <h2>Sources</h2>
          </div>
          <div className="drawer-actions">
            <button
              type="button"
              className="icon-button"
              title="Minimize"
              onClick={() => setMode("minimized")}
              aria-label="Minimize sources"
            >
              <Icon name="minimize" />
            </button>
            <button
              type="button"
              className="icon-button"
              title={mode === "expanded" ? "Restore size" : "Expand"}
              onClick={toggleSize}
              aria-label={
                mode === "expanded" ? "Restore sources size" : "Expand sources"
              }
            >
              <Icon name="maximize" />
            </button>
            <button
              type="button"
              className="icon-button"
              title="Close"
              onClick={onClose}
              aria-label="Close sources"
            >
              <Icon name="close" />
            </button>
          </div>
        </div>
        <div className="drawer-stats">
          <span>{nodes.length} sources</span>
          <span>{edges.length} relationships</span>
          {animatedPaths.length > 0 && (
            <span className="highlight-key">
              <i /> Answer path
            </span>
          )}
        </div>
        <GraphCanvas
          nodes={nodes}
          edges={edges}
          highlightedNodeIds={highlightedNodeIds}
          animatedPaths={animatedPaths}
        />
        <code className="trace">
          {trace || "Ask a question to generate source evidence"}
        </code>
      </aside>
    </>
  );
}
