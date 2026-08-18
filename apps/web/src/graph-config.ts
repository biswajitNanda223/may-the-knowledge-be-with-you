import type cytoscape from "cytoscape";

export const GRAPH_VIEW = {
  minZoom: 0.35,
  maxZoom: 2.4,
  wheelSensitivity: 0.18,
  fitPadding: 70,
  layoutFitPadding: 80,
  routeFitPadding: 110,
  zoomStep: 1.2,
} as const;

export const GRAPH_STYLES = [
  {
    selector: "node",
    style: {
      width: 72,
      height: 72,
      "background-color": "data(color)",
      "border-width": 4,
      "border-color": "#FFFFFF",
      label: "data(label)",
      color: "#FFFFFF",
      "font-family": "Inter, sans-serif",
      "font-weight": 650,
      "font-size": 9,
      "text-wrap": "ellipsis",
      "text-max-width": 58,
      "text-valign": "center",
      "text-halign": "center",
      "overlay-opacity": 0,
      "transition-property": "opacity, border-width, border-color",
      "transition-duration": "550ms",
      "transition-timing-function": "ease-in-out",
    },
  },
  {
    selector: "edge",
    style: {
      width: 1.25,
      "line-color": "#D8CFF0",
      "target-arrow-shape": "none",
      "curve-style": "unbundled-bezier",
      "control-point-distances": 18,
      "control-point-weights": 0.5,
      label: "",
      color: "#705F82",
      "font-family": "Inter, sans-serif",
      "font-size": 7,
      "text-background-color": "#FFFFFF",
      "text-background-opacity": 0.96,
      "text-background-padding": 3,
      "text-rotation": "autorotate",
      "overlay-opacity": 0,
      "transition-property": "opacity, width, line-color, target-arrow-color",
      "transition-duration": "550ms",
      "transition-timing-function": "ease-in-out",
    },
  },
  {
    selector: 'node[cited = "yes"]',
    style: { "border-width": 7, "border-color": "#F59E0B" },
  },
  {
    selector: "node:hover, node:selected",
    style: { "border-width": 7, "border-color": "#C4B5FD" },
  },
  {
    selector: "edge:selected",
    style: { label: "data(label)", width: 3, "line-color": "#8B5CF6" },
  },
  { selector: ".route-muted", style: { opacity: 0.1 } },
  { selector: ".route-active", style: { opacity: 1 } },
  {
    selector: "node.route-active",
    style: { "border-width": 7, "border-color": "#A78BFA" },
  },
  {
    selector: "edge.route-active",
    style: {
      label: "data(label)",
      width: 4,
      "line-color": "#8B5CF6",
      "target-arrow-color": "#7C3AED",
      "target-arrow-shape": "triangle",
      "arrow-scale": 0.75,
      "z-index": 10,
    },
  },
  {
    selector: "node.route-current",
    style: { "border-width": 10, "border-color": "#FFFFFF" },
  },
  {
    selector: "edge.route-current",
    style: { width: 7, "line-color": "#C4B5FD" },
  },
] as unknown as cytoscape.StylesheetCSS[];

export const GRAPH_LAYOUT: cytoscape.LayoutOptions = {
  name: "cose",
  animate: false,
  fit: true,
  padding: 100,
  randomize: true,
  avoidOverlap: true,
  nodeRepulsion: () => 11_500,
  idealEdgeLength: () => 145,
  edgeElasticity: () => 95,
  nestingFactor: 1.1,
  gravity: 0.22,
  numIter: 1_200,
};
