import { useMemo, useState } from 'react';
import {
  buildArchivo,
  buildRecord,
  nombreArchivo,
  parseRow,
  resumen,
  validateConfig,
  validateRetenciones,
  type CampoEditable,
  type Config,
  type Retencion,
} from './domain/sifere';
import { readExcel } from './io/readExcel';
import { cargarJurisdiccion, guardarJurisdiccion } from './storage';
import { FileDrop } from './components/FileDrop';
import { ConfigPanel } from './components/ConfigPanel';
import { PreviewTable } from './components/PreviewTable';
import { Summary } from './components/Summary';
import { RawView } from './components/RawView';

function descargar(contenido: string, nombre: string) {
  // El contenido es ASCII puro (validado), así que cada carácter es un byte.
  const bytes = Uint8Array.from(contenido, (c) => c.charCodeAt(0));
  const url = URL.createObjectURL(new Blob([bytes], { type: 'text/plain' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = nombre;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default function App() {
  const [config, setConfig] = useState<Config>(() => ({
    jurisdiccion: cargarJurisdiccion(),
    sucursal: '00000',
    letra: 'A',
  }));
  const [rows, setRows] = useState<Retencion[]>([]);
  const [nombreExcel, setNombreExcel] = useState<string | null>(null);
  const [errorCarga, setErrorCarga] = useState<string | null>(null);
  const [verRaw, setVerRaw] = useState(false);

  const validaciones = useMemo(() => validateRetenciones(rows, config), [rows, config]);
  const erroresConfig = useMemo(() => validateConfig(config), [config]);
  const filasConError = rows.filter((r) => validaciones.get(r.id)!.errores.length > 0).length;
  const filasConAdvertencia = rows.filter((r) => validaciones.get(r.id)!.advertencias.length > 0).length;
  const puedeDescargar = rows.length > 0 && filasConError === 0 && erroresConfig.length === 0;

  const lineas = useMemo(
    () =>
      rows.map((r) => {
        if (erroresConfig.length || validaciones.get(r.id)!.errores.length) return null;
        try {
          return buildRecord(r, config);
        } catch {
          return null;
        }
      }),
    [rows, config, validaciones, erroresConfig],
  );

  async function cargarArchivo(file: File) {
    setErrorCarga(null);
    try {
      const filas = readExcel(await file.arrayBuffer());
      if (filas.length === 0) throw new Error('El archivo no tiene filas de datos.');
      setRows(filas.map(parseRow));
      setNombreExcel(file.name);
    } catch (e) {
      setRows([]);
      setNombreExcel(null);
      setErrorCarga(e instanceof Error ? e.message : String(e));
    }
  }

  function cambiarConfig(nueva: Config) {
    if (nueva.jurisdiccion !== config.jurisdiccion) guardarJurisdiccion(nueva.jurisdiccion);
    setConfig(nueva);
  }

  function editarCampo(id: number, campo: CampoEditable, valor: string) {
    setRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, overrides: { ...r.overrides, [campo]: valor } } : r)),
    );
  }

  function restaurarFila(id: number) {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, overrides: {} } : r)));
  }

  return (
    <div className="app">
      <header className="header">
        <h1>Retenciones IIBB → SIFERE WEB</h1>
        <p className="muted">
          Genera el archivo de importación de retenciones (Formato Nº 2, 90 caracteres). Todo se
          procesa en este navegador: ningún dato sale de tu computadora.
        </p>
      </header>

      <section className="grid-top">
        <FileDrop nombreArchivo={nombreExcel} onFile={cargarArchivo} />
        <ConfigPanel config={config} errores={erroresConfig} onChange={cambiarConfig} />
      </section>

      {errorCarga && <div className="alert alert-error">{errorCarga}</div>}

      {rows.length > 0 && (
        <>
          <Summary
            datos={resumen(rows)}
            filasConError={filasConError}
            filasConAdvertencia={filasConAdvertencia}
          />

          <div className="actions">
            <button
              className="btn btn-primary"
              disabled={!puedeDescargar}
              onClick={() => descargar(buildArchivo(rows, config), nombreArchivo(rows, config))}
            >
              Descargar .txt
            </button>
            <span className="muted">
              {puedeDescargar
                ? nombreArchivo(rows, config)
                : `Corregí ${filasConError || 'los'} error${filasConError === 1 ? '' : 'es'} para habilitar la descarga`}
            </span>
            <label className="toggle">
              <input type="checkbox" checked={verRaw} onChange={(e) => setVerRaw(e.target.checked)} />
              Ver líneas generadas
            </label>
          </div>

          {verRaw && <RawView lineas={lineas} filas={rows.map((r) => r.fila)} />}

          <PreviewTable
            rows={rows}
            config={config}
            validaciones={validaciones}
            onEdit={editarCampo}
            onReset={restaurarFila}
          />
        </>
      )}

      <footer className="footer muted">
        Formato: SIFERE WEB — Importación de Retenciones, Formato Nº 2. Verificá siempre el
        archivo antes de presentarlo.
      </footer>
    </div>
  );
}
