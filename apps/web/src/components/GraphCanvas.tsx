import cytoscape, { type Core, type ElementDefinition } from "cytoscape";
import { useEffect, useMemo, useRef, useState, type RefObject } from "react";
import { GRAPH_LAYOUT, GRAPH_STYLES, GRAPH_VIEW } from "../graph-config";
import { buildGraphElements, nodeColors } from "../graph-model";
import { startRouteAnimation } from "../graph-route-animation";
import type { GraphEdge, GraphNode } from "../types";

type GraphCanvasProps = {
  nodes: GraphNode[];
  edges: GraphEdge[];
  onNode?: (id: string) => void;
  highlightedNodeIds?: string[];
  animatedPaths?: string[][];
};

export function GraphCanvas({
  nodes,
  edges,
  onNode,
  highlightedNodeIds = [],
  animatedPaths = [],
}: GraphCanvasProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const elements = useMemo(
    () => buildGraphElements(nodes, edges, highlightedNodeIds),
    [nodes, edges, highlightedNodeIds],
  );
  const graphRef = useGraph(hostRef, elements, onNode);
  const fullscreen = useFullscreen(stageRef, graphRef);

  useGraphResize(hostRef, graphRef);
  useAnimatedRoutes(graphRef, elements, animatedPaths);

  const zoom = (factor: number) => {
    const graph = graphRef.current;
    if (!graph) return;

    graph.zoom({
      level: graph.zoom() * factor,
      renderedPosition: {
        x: (hostRef.current?.clientWidth ?? 0) / 2,
        y: (hostRef.current?.clientHeight ?? 0) / 2,
      },
    });
  };

  const fit = () => graphRef.current?.fit(undefined, GRAPH_VIEW.fitPadding);
  const toggleFullscreen = async () => {
    if (!stageRef.current) return;

    if (document.fullscreenElement === stageRef.current) {
      await document.exitFullscreen();
      return;
    }
    await stageRef.current.requestFullscreen();
  };

  return (
    <div
      className={`graph-stage ${fullscreen ? "is-fullscreen" : ""}`}
      ref={stageRef}
    >
      <GraphLegend />
      <GraphControls
        fullscreen={fullscreen}
        onZoomIn={() => zoom(GRAPH_VIEW.zoomStep)}
        onZoomOut={() => zoom(1 / GRAPH_VIEW.zoomStep)}
        onFit={fit}
        onToggleFullscreen={toggleFullscreen}
      />
      {fullscreen && (
        <div className="fullscreen-label">
          Fullscreen map · Press Esc to exit
        </div>
      )}
      {nodes.length === 0 && <EmptyGraph />}
      <div
        className="graph-canvas"
        ref={hostRef}
        aria-label="Interactive enterprise knowledge map"
      />
    </div>
  );
}

function useGraph(
  hostRef: RefObject<HTMLDivElement | null>,
  elements: ElementDefinition[],
  onNode?: (id: string) => void,
): RefObject<Core | null> {
  const graphRef = useRef<Core | null>(null);

  useEffect(() => {
    const container = hostRef.current;
    if (!container) return;

    graphRef.current?.destroy();
    const graph = cytoscape({
      container,
      elements,
      style: GRAPH_STYLES,
      layout: GRAPH_LAYOUT,
      minZoom: GRAPH_VIEW.minZoom,
      maxZoom: GRAPH_VIEW.maxZoom,
      wheelSensitivity: GRAPH_VIEW.wheelSensitivity,
    });
    graphRef.current = graph;

    graph.one("layoutstop", () =>
      graph.fit(undefined, GRAPH_VIEW.layoutFitPadding),
    );
    graph.on("tap", "node", (event) => onNode?.(event.target.id()));

    return () => {
      graph.destroy();
      if (graphRef.current === graph) graphRef.current = null;
    };
  }, [elements, hostRef, onNode]);

  return graphRef;
}

function useFullscreen(
  stageRef: RefObject<HTMLDivElement | null>,
  graphRef: RefObject<Core | null>,
): boolean {
  const [fullscreen, setFullscreen] = useState(false);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setFullscreen(document.fullscreenElement === stageRef.current);
      requestAnimationFrame(() => {
        graphRef.current?.resize();
        graphRef.current?.fit(undefined, GRAPH_VIEW.fitPadding);
      });
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () =>
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, [graphRef, stageRef]);

  return fullscreen;
}

function useGraphResize(
  hostRef: RefObject<HTMLDivElement | null>,
  graphRef: RefObject<Core | null>,
) {
  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    let frame = 0;
    const observer = new ResizeObserver(() => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => graphRef.current?.resize());
    });
    observer.observe(host);

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [graphRef, hostRef]);
}

function useAnimatedRoutes(
  graphRef: RefObject<Core | null>,
  elements: ElementDefinition[],
  animatedPaths: string[][],
) {
  const pathKey = animatedPaths.map((path) => path.join("|")).join("::");

  // The key tracks path contents without restarting for a new array identity.
  useEffect(() => {
    const graph = graphRef.current;
    if (!graph || animatedPaths.length === 0) return;

    return startRouteAnimation(graph, animatedPaths);
  }, [elements, graphRef, pathKey]);
}

function GraphLegend() {
  return (
    <div className="graph-legend" aria-label="Node color legend">
      {Object.entries(nodeColors).map(([kind, color]) => (
        <span key={kind}>
          <i style={{ background: color }} />
          {kind === "BusinessRule" ? "Rule" : kind}
        </span>
      ))}
    </div>
  );
}

type GraphControlsProps = {
  fullscreen: boolean;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFit: () => void;
  onToggleFullscreen: () => void;
};

function GraphControls({
  fullscreen,
  onZoomIn,
  onZoomOut,
  onFit,
  onToggleFullscreen,
}: GraphControlsProps) {
  return (
    <div className="graph-controls" aria-label="Graph controls">
      <button type="button" title="Zoom in" onClick={onZoomIn}>
        +
      </button>
      <button type="button" title="Zoom out" onClick={onZoomOut}>
        −
      </button>
      <button type="button" title="Fit map" onClick={onFit}>
        ⌂
      </button>
      <button
        type="button"
        title={fullscreen ? "Exit fullscreen" : "Open fullscreen"}
        onClick={onToggleFullscreen}
      >
        {fullscreen ? "↙" : "⛶"}
      </button>
    </div>
  );
}

function EmptyGraph() {
  return (
    <div className="graph-empty">
      <span>
        <img src="/knowledge-way-logo.png" alt="" />
      </span>
      <b>Your knowledge map will appear here</b>
      <small>Search the ontology or ask a question to begin.</small>
    </div>
  );
}
