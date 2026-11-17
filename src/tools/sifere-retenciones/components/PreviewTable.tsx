import { Fragment, useState } from 'react';
import {
  formatCuit,
  formatFecha,
  formatMoneda,
  LETRAS,
  resolveCampos,
  TIPOS_COMPROBANTE,
  type CampoEditable,
  type Config,
  type Retencion,
  type Validacion,
} from '../domain/sifere';

interface Props {
  rows: Retencion[];
  config: Config;
  validaciones: Map<number, Validacion>;
  onEdit: (id: number, campo: CampoEditable, valor: string) => void;
  onReset: (id: number) => void;
}

function cuitVisible(cuit: string) {
  return /^\d{11}$/.test(cuit) ? formatCuit(cuit) : cuit || '—';
}

export function PreviewTable({ rows, config, validaciones, onEdit, onReset }: Props) {
  const [soloProblemas, setSoloProblemas] = useState(false);
  const visibles = soloProblemas
    ? rows.filter((r) => {
        const v = validaciones.get(r.id)!;
        return v.errores.length > 0 || v.advertencias.length > 0;
      })
    : rows;

  return (
    <div className="card tabla-card">
      <div className="tabla-header">
        <h2>Vista previa</h2>
        <label className="toggle">
          <input
            type="checkbox"
            checked={soloProblemas}
            onChange={(e) => setSoloProblemas(e.target.checked)}
          />
          Solo filas con errores o advertencias
        </label>
      </div>
      <div className="tabla-scroll">
        <table className="tabla">
          <thead>
            <tr>
              <th>Fila</th>
              <th>CUIT agente</th>
              <th>Fecha</th>
              <th>Comprobante (Excel)</th>
              <th>Sucursal</th>
              <th>Constancia</th>
              <th>Tipo</th>
              <th>Letra</th>
              <th>Comp. original</th>
              <th className="num">Importe</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {visibles.map((r) => {
              const v = validaciones.get(r.id)!;
              const c = resolveCampos(r, config);
              const editado = (campo: CampoEditable) => (r.overrides[campo] !== undefined ? 'editado' : '');
              const input = (campo: CampoEditable, ancho: number, maxLength: number) => (
                <input
                  className={`celda ${editado(campo)}`}
                  style={{ width: `${ancho}ch` }}
                  value={c[campo]}
                  maxLength={maxLength}
                  aria-label={`${campo} fila ${r.fila}`}
                  onChange={(e) => onEdit(r.id, campo, e.target.value.trim())}
                />
              );
              const clase = v.errores.length ? 'fila-error' : v.advertencias.length ? 'fila-advertencia' : '';
              return (
                <Fragment key={r.id}>
                  <tr className={clase}>
                    <td className="muted">{r.fila}</td>
                    <td className="mono">{cuitVisible(r.cuit)}</td>
                    <td className="mono">{r.fecha ? formatFecha(r.fecha) : r.fechaTexto || '—'}</td>
                    <td className="comprobante" title={r.comprobante}>
                      {r.comprobante}
                    </td>
                    <td>{input('sucursal', 7, 8)}</td>
                    <td>{input('constancia', 16, 24)}</td>
                    <td>
                      <select
                        className={`celda ${editado('tipo')}`}
                        value={c.tipo}
                        aria-label={`tipo fila ${r.fila}`}
                        onChange={(e) => onEdit(r.id, 'tipo', e.target.value)}
                      >
                        {Object.entries(TIPOS_COMPROBANTE).map(([k, nombre]) => (
                          <option key={k} value={k} title={nombre}>
                            {k}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <select
                        className={`celda ${editado('letra')}`}
                        value={c.letra}
                        aria-label={`letra fila ${r.fila}`}
                        onChange={(e) => onEdit(r.id, 'letra', e.target.value)}
                      >
                        {LETRAS.map((l) => (
                          <option key={l}>{l}</option>
                        ))}
                      </select>
                    </td>
                    <td>{input('comprobanteOriginal', 16, 24)}</td>
                    <td className="num mono">
                      {r.importeCentavos != null ? formatMoneda(r.importeCentavos) : r.importeTexto || '—'}
                    </td>
                    <td>
                      {Object.keys(r.overrides).length > 0 && (
                        <button
                          className="btn-link"
                          title="Volver a los valores calculados"
                          onClick={() => onReset(r.id)}
                        >
                          Restaurar
                        </button>
                      )}
                    </td>
                  </tr>
                  {(v.errores.length > 0 || v.advertencias.length > 0) && (
                    <tr className={`${clase} fila-mensajes`}>
                      <td />
                      <td colSpan={10}>
                        {v.errores.map((m) => (
                          <span key={m} className="msg msg-error">
                            {m}
                          </span>
                        ))}
                        {v.advertencias.map((m) => (
                          <span key={m} className="msg msg-advertencia">
                            {m}
                          </span>
                        ))}
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
            {visibles.length === 0 && (
              <tr>
                <td colSpan={11} className="muted vacio">
                  No hay filas con problemas.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <p className="muted chico">
        Tipos: {Object.entries(TIPOS_COMPROBANTE).map(([k, n]) => `${k} ${n}`).join(' · ')}
      </p>
    </div>
  );
}
