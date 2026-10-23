import { hrefFor } from '../router';
import { TOOLS } from '../tools/registry';

export function Home() {
  return (
    <div className="app">
      <header className="header">
        <h1>Herramientas</h1>
        <p className="muted">Elegí una herramienta para empezar.</p>
      </header>

      <nav className="tiles">
        {TOOLS.map((t) => (
          <a key={t.id} className="card tile" href={hrefFor(t.id)}>
            <h2>{t.title}</h2>
            <p className="muted">{t.description}</p>
          </a>
        ))}
      </nav>
    </div>
  );
}
