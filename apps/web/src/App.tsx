import { useEffect, useState, type MouseEvent } from "react";
import { ChatPage } from "./pages/ChatPage";
import { ExplorerPage } from "./pages/ExplorerPage";
import { OperationsPage } from "./pages/OperationsPage";
import { TelemetryPage } from "./pages/TelemetryPage";
import { Icon, type IconName } from "./components/Icon";

const pages = {
  "/": ChatPage,
  "/explorer": ExplorerPage,
  "/operations": OperationsPage,
  "/telemetry": TelemetryPage,
} as const;
const navigation = [
  ["/", "Ask", "ask"],
  ["/explorer", "Knowledge map", "map"],
  ["/operations", "Sources", "source"],
  ["/telemetry", "Activity", "activity"],
] as const;

export default function App() {
  const [path, setPath] = useState(
    window.location.pathname as keyof typeof pages,
  );
  useEffect(() => {
    const onPopState = () =>
      setPath(window.location.pathname as keyof typeof pages);
    addEventListener("popstate", onPopState);
    return () => removeEventListener("popstate", onPopState);
  }, []);
  const go = (next: keyof typeof pages) => (event: MouseEvent) => {
    event.preventDefault();
    history.pushState({}, "", next);
    setPath(next);
  };
  const Page = pages[path] ?? ChatPage;
  return (
    <div className="app-shell">
      <header className="app-header">
        <a
          className="brand"
          href="/"
          onClick={go("/")}
          aria-label="Knowledge Way home"
        >
          <span className="brand-mark">
            <img src="/knowledge-way-logo.png" alt="" />
          </span>
          <span>
            <b>Knowledge Way</b>
            <small>Enterprise intelligence</small>
          </span>
        </a>
        <nav aria-label="Primary navigation">
          {navigation.map(([href, label, icon]) => (
            <a
              key={href}
              className={path === href ? "active" : ""}
              href={href}
              onClick={go(href)}
            >
              <Icon name={icon as IconName} />
              {label}
            </a>
          ))}
        </nav>
        <span className="workspace-badge">Enterprise workspace</span>
      </header>
      <Page />
    </div>
  );
}
