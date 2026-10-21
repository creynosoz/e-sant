import * as XLSX from 'xlsx';
import {
  crearFecha,
  normalizeCuit,
  parseFecha,
  parseImporte,
  type Fecha,
  type FilaExcel,
} from '../domain/sifere';

const COLUMNAS = ['cuit', 'fecha', 'comprobante', 'importe'] as const;
type Columna = (typeof COLUMNAS)[number];

export class ExcelError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ExcelError';
  }
}

function normalizarEncabezado(valor: unknown): string {
  return String(valor ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim()
    .toLowerCase();
}

/** Serial de Excel (sistema 1900) → fecha calendario, sin pasar por zona horaria local. */
export function fechaDesdeSerialExcel(serial: number): Fecha | null {
  if (!Number.isFinite(serial) || serial < 1) return null;
  // Epoch 30/12/1899 absorbe el falso 29/02/1900 de Excel para fechas desde 01/03/1900.
  const d = new Date(Date.UTC(1899, 11, 30) + Math.floor(serial) * 86_400_000);
  return crearFecha(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate());
}

function leerFecha(valor: unknown): Fecha | null {
  if (typeof valor === 'number') return fechaDesdeSerialExcel(valor);
  return parseFecha(valor);
}

function texto(valor: unknown): string {
  return valor == null ? '' : String(valor).trim();
}

function esVacio(valor: unknown): boolean {
  return valor == null || (typeof valor === 'string' && valor.trim() === '');
}

/**
 * Lee la primera hoja del Excel. Fila 1 = encabezados `Cuit | Fecha | Comprobante | Importe`
 * (en cualquier orden, sin distinguir mayúsculas ni acentos). Ignora filas vacías.
 */
export function readExcel(data: ArrayBuffer | Uint8Array): FilaExcel[] {
  let wb: XLSX.WorkBook;
  try {
    wb = XLSX.read(data, { type: 'array', cellDates: false });
  } catch {
    throw new ExcelError('No se pudo leer el archivo. ¿Es un Excel válido (.xlsx / .xls)?');
  }
  const nombreHoja = wb.SheetNames[0];
  const hoja = nombreHoja ? wb.Sheets[nombreHoja] : undefined;
  if (!hoja || !hoja['!ref']) throw new ExcelError('La primera hoja está vacía.');

  const filaInicial = XLSX.utils.decode_range(hoja['!ref']).s.r + 1; // 1-based
  const matriz = XLSX.utils.sheet_to_json<unknown[]>(hoja, {
    header: 1,
    raw: true,
    defval: null,
    blankrows: true,
  });

  const encabezados = (matriz[0] ?? []).map(normalizarEncabezado);
  const indices = {} as Record<Columna, number>;
  const faltantes: string[] = [];
  for (const col of COLUMNAS) {
    const i = encabezados.indexOf(col);
    if (i < 0) faltantes.push(col[0].toUpperCase() + col.slice(1));
    indices[col] = i;
  }
  if (faltantes.length) {
    throw new ExcelError(
      `Faltan columnas en la fila 1: ${faltantes.join(', ')}. Se esperan: Cuit | Fecha | Comprobante | Importe.`,
    );
  }

  const filas: FilaExcel[] = [];
  matriz.slice(1).forEach((celdas, i) => {
    const valor = (col: Columna) => celdas?.[indices[col]] ?? null;
    if (COLUMNAS.every((col) => esVacio(valor(col)))) return;
    filas.push({
      fila: filaInicial + 1 + i,
      cuit: normalizeCuit(valor('cuit')),
      fecha: leerFecha(valor('fecha')),
      fechaTexto: texto(valor('fecha')),
      comprobante: texto(valor('comprobante')),
      importeCentavos: parseImporte(valor('importe')),
      importeTexto: texto(valor('importe')),
    });
  });
  return filas;
}
