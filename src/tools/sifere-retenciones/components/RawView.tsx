import { FORMATO_RETENCIONES_2, type RecordFormat } from '../domain/sifere';

interface Props {
  lineas: (string | null)[];
  filas: number[];
  formato?: RecordFormat;
}

function regla(longitud: number) {
  let decenas = '';
  let unidades = '';
  for (let i = 1; i <= longitud; i++) {
    decenas += i % 10 === 0 ? String((i / 10) % 10) : ' ';
    unidades += String(i % 10);
  }
  return { decenas, unidades };
}

export function RawView({ lineas, filas, formato = FORMATO_RETENCIONES_2 }: Props) {
  const { decenas, unidades } = regla(formato.longitud);
  const prefijo = (s: string) => s.padStart(5, ' ') + ' │ ';

  return (
    <div className="card raw">
      <h2>Líneas generadas</h2>
      <div className="raw-leyenda">
        {formato.campos.map((c, i) => (
          <span key={c.nombre} className={`campo campo-${i % 2}`}>
            {c.nombre} <span className="muted">{c.desde}–{c.hasta}</span>
          </span>
        ))}
      </div>
      <div className="raw-scroll">
        <pre className="raw-pre">
          <span className="regla">{prefijo('') + decenas}</span>
          {'\n'}
          <span className="regla">{prefijo('') + unidades}</span>
          {'\n'}
          {lineas.map((linea, i) => (
            <span key={filas[i]}>
              <span className="regla">{prefijo(String(filas[i]))}</span>
              {linea === null ? (
                <span className="texto-error">(fila con errores — no se genera)</span>
              ) : (
                formato.campos.map((c, j) => (
                  <span key={c.nombre} className={`campo campo-${j % 2}`} title={c.nombre}>
                    {linea.slice(c.desde - 1, c.hasta)}
                  </span>
                ))
              )}
              {'\n'}
            </span>
          ))}
        </pre>
      </div>
    </div>
  );
}
