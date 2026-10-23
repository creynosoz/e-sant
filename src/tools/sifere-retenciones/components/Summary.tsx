import { formatCuit, formatMoneda, validateCuit, type Resumen } from '../domain/sifere';

interface Props {
  datos: Resumen;
  filasConError: number;
  filasConAdvertencia: number;
}

export function Summary({ datos, filasConError, filasConAdvertencia }: Props) {
  return (
    <section className="card resumen">
      <div className="kpis">
        <div className="kpi">
          <span className="kpi-label">Registros</span>
          <span className="kpi-valor">{datos.cantidad}</span>
        </div>
        <div className="kpi">
          <span className="kpi-label">Importe total</span>
          <span className="kpi-valor">{formatMoneda(datos.totalCentavos)}</span>
        </div>
        <div className={`kpi ${filasConError ? 'kpi-error' : 'kpi-ok'}`}>
          <span className="kpi-label">Filas con error</span>
          <span className="kpi-valor">{filasConError}</span>
        </div>
        <div className={`kpi ${filasConAdvertencia ? 'kpi-advertencia' : ''}`}>
          <span className="kpi-label">Advertencias</span>
          <span className="kpi-valor">{filasConAdvertencia}</span>
        </div>
      </div>
      <details>
        <summary>Total por CUIT agente ({datos.porCuit.length})</summary>
        <table className="tabla tabla-compacta">
          <thead>
            <tr>
              <th>CUIT agente</th>
              <th className="num">Retenciones</th>
              <th className="num">Total</th>
            </tr>
          </thead>
          <tbody>
            {datos.porCuit.map((c) => (
              <tr key={c.cuit}>
                <td className="mono">{validateCuit(c.cuit) ? formatCuit(c.cuit) : c.cuit || '—'}</td>
                <td className="num">{c.cantidad}</td>
                <td className="num mono">{formatMoneda(c.totalCentavos)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </section>
  );
}
