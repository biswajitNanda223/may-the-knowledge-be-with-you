import type { Core } from "cytoscape";
import { GRAPH_VIEW } from "./graph-config";

const ROUTE_STEP_MS = 900;
const ROUTE_PAUSE_MS = 1_500;
const ROUTE_FIT_DURATION_MS = 700;
const ROUTE_CLASSES = "route-muted route-active route-current";

type Timer = ReturnType<typeof setTimeout>;

export function startRouteAnimation(
  graph: Core,
  requestedPaths: string[][],
): () => void {
  const paths = requestedPaths
    .map((path) => path.filter((id) => !graph.getElementById(id).empty()))
    .filter((path) => path.length > 0);

  if (paths.length === 0) return () => undefined;

  const timers: Timer[] = [];
  let routeElements = graph.collection();
  for (const id of paths.flat()) {
    routeElements = routeElements.union(graph.getElementById(id));
  }
  const cycleDuration = paths.reduce(
    (total, path) => total + path.length * ROUTE_STEP_MS + ROUTE_PAUSE_MS,
    0,
  );

  const clearTimers = () => {
    timers.forEach(clearTimeout);
    timers.length = 0;
  };

  const resetRoute = () => {
    graph
      .elements()
      .removeClass("route-active route-current")
      .addClass("route-muted");
  };

  const play = () => {
    clearTimers();
    resetRoute();
    graph.animate({
      fit: { eles: routeElements, padding: GRAPH_VIEW.routeFitPadding },
      duration: ROUTE_FIT_DURATION_MS,
      easing: "ease-in-out-cubic",
    });

    let routeStart = 0;
    for (const path of paths) {
      timers.push(setTimeout(resetRoute, routeStart));
      path.forEach((id, index) => {
        timers.push(
          setTimeout(
            () => {
              graph.elements().removeClass("route-current");
              graph
                .getElementById(id)
                .removeClass("route-muted")
                .addClass("route-active route-current");
            },
            routeStart + index * ROUTE_STEP_MS,
          ),
        );
      });
      routeStart += path.length * ROUTE_STEP_MS + ROUTE_PAUSE_MS;
    }
  };

  play();
  const interval = setInterval(play, cycleDuration);

  return () => {
    clearInterval(interval);
    clearTimers();
    graph.elements().removeClass(ROUTE_CLASSES);
  };
}
