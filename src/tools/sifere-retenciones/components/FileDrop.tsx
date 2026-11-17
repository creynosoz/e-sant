import { useRef, useState } from 'react';

interface Props {
  nombreArchivo: string | null;
  onFile: (file: File) => void;
}

export function FileDrop({ nombreArchivo, onFile }: Props) {
  const input = useRef<HTMLInputElement>(null);
  const [arrastrando, setArrastrando] = useState(false);

  return (
    <div
      className={`card drop ${arrastrando ? 'drop-activo' : ''}`}
      onDragOver={(e) => {
        e.preventDefault();
        setArrastrando(true);
      }}
      onDragLeave={() => setArrastrando(false)}
      onDrop={(e) => {
        e.preventDefault();
        setArrastrando(false);
        const file = e.dataTransfer.files[0];
        if (file) onFile(file);
      }}
      onClick={() => input.current?.click()}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          input.current?.click();
        }
      }}
    >
      <input
        ref={input}
        type="file"
        accept=".xlsx,.xls,.xlsm,.ods"
        hidden
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onFile(file);
          e.target.value = '';
        }}
      />
      <div className="drop-icono" aria-hidden>
        ⬆
      </div>
      {nombreArchivo ? (
        <>
          <strong>{nombreArchivo}</strong>
          <span className="muted">Arrastrá otro archivo o hacé clic para reemplazarlo</span>
        </>
      ) : (
        <>
          <strong>Arrastrá el Excel de retenciones acá</strong>
          <span className="muted">o hacé clic para elegirlo · columnas: Cuit | Fecha | Comprobante | Importe</span>
        </>
      )}
    </div>
  );
}
