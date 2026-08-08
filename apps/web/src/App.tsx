import { useEffect, useState, type MouseEvent } from 'react';
import { ChatPage } from './pages/ChatPage';
import { ExplorerPage } from './pages/ExplorerPage';
import { OperationsPage } from './pages/OperationsPage';
import { TelemetryPage } from './pages/TelemetryPage';

const pages = { '/': ChatPage, '/explorer': ExplorerPage, '/operations': OperationsPage, '/telemetry': TelemetryPage } as const;
const navigation = [
  ['/', 'Chat + Evidence'],
  ['/explorer', 'Graph Explorer'],
  ['/operations', 'Architecture'],
  ['/telemetry', 'ADK Telemetry']
] as const;

export default function App() {
  const [path, setPath] = useState(window.location.pathname as keyof typeof pages);
  useEffect(() => {
    const onPopState = () => setPath(window.location.pathname as keyof typeof pages);
    addEventListener('popstate', onPopState);
    return () => removeEventListener('popstate', onPopState);
  }, []);
  const go = (next: keyof typeof pages) => (event: MouseEvent) => {
    event.preventDefault(); history.pushState({}, '', next); setPath(next);
  };
  const Page = pages[path] ?? ChatPage;
  return <div className="app-shell">
    <header className="app-header">
      <a className="brand" href="/" onClick={go('/')} aria-label="ARMY home">
        <span className="brand-mark">A</span><span><b>ARMY</b><small>Enterprise Knowledge</small></span>
      </a>
      <nav aria-label="Primary navigation">
        {navigation.map(([href, label], index) => <a key={href} className={path === href ? 'active' : ''} href={href} onClick={go(href)}><span>0{index + 1}</span>{label}</a>)}
      </nav>
      <span className="status"><i /> System online</span>
    </header>
    <Page />
  </div>;
}
