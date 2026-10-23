import { JURISDICCIONES } from '../domain/jurisdicciones';
import { LETRAS, type Config } from '../domain/sifere';

interface Props {
  config: Config;
  errores: string[];
  onChange: (config: Config) => void;
}

export function ConfigPanel({ config, errores, onChange }: Props) {
  return (
    <div className="card config">
      <h2>Configuración</h2>
      <label>
        Jurisdicción
        <select
          value={config.jurisdiccion}
          onChange={(e) => onChange({ ...config, jurisdiccion: Number(e.target.value) })}
        >
          {JURISDICCIONES.map((j) => (
            <option key={j.codigo} value={j.codigo}>
              {j.codigo} — {j.nombre}
            </option>
          ))}
        </select>
      </label>
      <div className="config-fila">
        <label>
          Sucursal default
          <input
            value={config.sucursal}
            inputMode="numeric"
            maxLength={5}
            onChange={(e) => onChange({ ...config, sucursal: e.target.value.trim() })}
          />
        </label>
        <label>
          Letra default
          <select value={config.letra} onChange={(e) => onChange({ ...config, letra: e.target.value })}>
            {LETRAS.map((l) => (
              <option key={l}>{l}</option>
            ))}
          </select>
        </label>
      </div>
      {errores.map((e) => (
        <p key={e} className="texto-error">
          {e}
        </p>
      ))}
      <p className="muted chico">
        Los defaults se aplican a las filas que no editaste a mano.
      </p>
    </div>
  );
}
