import { useEffect } from 'react';
import { Home } from './home/Home';
import { hrefFor, useRoute } from './router';
import { findTool } from './tools/registry';

const SITE_NAME = 'e-sant';

export default function App() {
  const route = useRoute();
  const tool = route ? findTool(route) : undefined;
  const ToolComponent = tool?.component;

  useEffect(() => {
    document.title = tool ? `${tool.title} · ${SITE_NAME}` : SITE_NAME;
    window.scrollTo(0, 0);
  }, [route, tool]);

  return (
    <>
      <header className="topbar">
        <a className="topbar-brand" href={hrefFor('')}>
          {SITE_NAME}
        </a>
        {tool && <span className="muted">/ {tool.title}</span>}
      </header>

      {ToolComponent ? (
        <ToolComponent />
      ) : route ? (
        <div className="app">
          <div className="alert alert-error">
            No existe la página “{route}”. <a href={hrefFor('')}>Volver al inicio</a>
          </div>
        </div>
      ) : (
        <Home />
      )}
    </>
  );
}
