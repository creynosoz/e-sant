/**
 * Dominio SIFERE WEB — importación de Retenciones.
 * Funciones puras, sin dependencias de React ni del navegador.
 */
import { esJurisdiccionValida } from './jurisdicciones';

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

export interface Fecha {
  anio: number;
  mes: number; // 1-12
  dia: number; // 1-31
}

export const TIPOS_COMPROBANTE = {
  F: 'Factura',
  R: 'Recibo',
  D: 'Nota de Débito',
  C: 'Nota de Crédito',
  O: 'Otros',
  E: 'Factura Electrónica',
  H: 'Nota de Crédito Electrónica',
  I: 'Nota de Débito Electrónica',
} as const;
export type TipoComprobante = keyof typeof TIPOS_COMPROBANTE;

export const LETRAS = ['A', 'B', 'C', 'E', 'M', 'T'] as const;
export type Letra = (typeof LETRAS)[number];

/** Tipos de comprobante que admiten importe negativo. */
const TIPOS_NEGATIVOS: readonly string[] = ['C', 'H'];

/** Fila del Excel ya normalizada (ver io/readExcel.ts). */
export interface FilaExcel {
  /** Número de fila en la planilla (1 = encabezados). */
  fila: number;
  /** Solo dígitos. */
  cuit: string;
  fecha: Fecha | null;
  /** Valor original de la celda, para mostrar en errores. */
  fechaTexto: string;
  comprobante: string;
  importeCentavos: bigint | null;
  importeTexto: string;
}

/** Campos que el usuario puede editar por fila. Se guardan como texto tal cual se tipean. */
export interface CamposEditables {
  sucursal: string;
  constancia: string;
  tipo: string;
  letra: string;
  comprobanteOriginal: string;
}
export type CampoEditable = keyof CamposEditables;

export interface Retencion {
  id: number;
  fila: number;
  cuit: string;
  fecha: Fecha | null;
  fechaTexto: string;
  comprobante: string;
  importeCentavos: bigint | null;
  importeTexto: string;
  /** Valores inferidos del texto del comprobante. */
  derivados: Pick<CamposEditables, 'constancia' | 'tipo' | 'comprobanteOriginal'>;
  /** Valores editados a mano por el usuario (pisan derivados y defaults). */
  overrides: Partial<CamposEditables>;
}

export interface Config {
  jurisdiccion: number;
  sucursal: string;
  letra: string;
}

export interface Validacion {
  errores: string[];
  advertencias: string[];
}

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

// ---------------------------------------------------------------------------
// Helpers de texto
// ---------------------------------------------------------------------------

function normalizarTexto(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

/** Rellena con ceros a la izquierda; lanza si el valor no entra en el ancho. */
export function padCeros(valor: string, ancho: number, campo = 'Campo'): string {
  if (valor.length > ancho) {
    throw new ValidationError(`${campo}: "${valor}" excede ${ancho} caracteres`);
  }
  return valor.padStart(ancho, '0');
}

function sinCerosIzquierda(digitos: string): string {
  return digitos.replace(/^0+(?=\d)/, '');
}

// ---------------------------------------------------------------------------
// CUIT
// ---------------------------------------------------------------------------

export function normalizeCuit(valor: unknown): string {
  if (valor == null) return '';
  if (typeof valor === 'number') {
    return Number.isInteger(valor) ? String(valor) : String(valor).replace(/\D/g, '');
  }
  return String(valor).replace(/\D/g, '');
}

const PESOS_CUIT = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];

/** Verifica 11 dígitos y dígito verificador (módulo 11 AFIP/ARCA). */
export function validateCuit(cuit: string): boolean {
  if (!/^\d{11}$/.test(cuit)) return false;
  const digitos = [...cuit].map(Number);
  const suma = PESOS_CUIT.reduce((acc, peso, i) => acc + peso * digitos[i], 0);
  let esperado = 11 - (suma % 11);
  if (esperado === 11) esperado = 0;
  if (esperado === 10) return false;
  return esperado === digitos[10];
}

/** `30597355919` → `30-59735591-9` */
export function formatCuit(cuit: string): string {
  if (!/^\d{11}$/.test(cuit)) {
    throw new ValidationError(`CUIT inválido: "${cuit}"`);
  }
  return `${cuit.slice(0, 2)}-${cuit.slice(2, 10)}-${cuit.slice(10)}`;
}

// ---------------------------------------------------------------------------
// Fechas
// ---------------------------------------------------------------------------

export function crearFecha(anio: number, mes: number, dia: number): Fecha | null {
  if (![anio, mes, dia].every(Number.isInteger)) return null;
  if (anio < 1900 || anio > 9999 || mes < 1 || mes > 12 || dia < 1) return null;
  const diasDelMes = new Date(Date.UTC(anio, mes, 0)).getUTCDate();
  if (dia > diasDelMes) return null;
  return { anio, mes, dia };
}

/** Acepta `dd/mm/aaaa` (también `-` o `.` como separador) o un objeto Date. */
export function parseFecha(valor: unknown): Fecha | null {
  if (valor instanceof Date) {
    if (Number.isNaN(valor.getTime())) return null;
    return crearFecha(valor.getFullYear(), valor.getMonth() + 1, valor.getDate());
  }
  if (typeof valor !== 'string') return null;
  const m = valor.trim().match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/);
  if (!m) return null;
  return crearFecha(Number(m[3]), Number(m[2]), Number(m[1]));
}

export function formatFecha(f: Fecha): string {
  const dd = String(f.dia).padStart(2, '0');
  const mm = String(f.mes).padStart(2, '0');
  return `${dd}/${mm}/${String(f.anio).padStart(4, '0')}`;
}

export function periodo(f: Fecha): string {
  return `${f.anio}${String(f.mes).padStart(2, '0')}`;
}

// ---------------------------------------------------------------------------
// Importes (siempre en centavos, BigInt)
// ---------------------------------------------------------------------------

/**
 * Convierte un texto decimal a centavos con redondeo half-up (alejándose del cero),
 * sin pasar por floats. Acepta `107438.02`, `107438,02`, `1.234.567,89`, `1,234,567.89`.
 */
export function parseDecimalACentavos(texto: string): bigint | null {
  let s = texto.trim().replace(/[\s$]/g, '');
  if (s === '') return null;

  const ultimaComa = s.lastIndexOf(',');
  const ultimoPunto = s.lastIndexOf('.');
  if (ultimaComa >= 0 && ultimoPunto >= 0) {
    // El separador que aparece último es el decimal; el otro es de miles.
    const decimal = ultimaComa > ultimoPunto ? ',' : '.';
    const miles = decimal === ',' ? '.' : ',';
    s = s.split(miles).join('').replace(decimal, '.');
  } else if (ultimaComa >= 0) {
    s = s.split(',').length > 2 ? s.split(',').join('') : s.replace(',', '.');
  } else if (s.split('.').length > 2) {
    s = s.split('.').join('');
  }

  const m = s.match(/^([+-]?)(\d*)(?:\.(\d*))?$/);
  if (!m || (m[2] === '' && (m[3] ?? '') === '')) return null;
  const negativo = m[1] === '-';
  const entero = m[2] === '' ? '0' : m[2];
  const fraccion = m[3] ?? '';

  let centavos = BigInt(entero) * 100n + BigInt((fraccion + '00').slice(0, 2));
  if (fraccion.length > 2 && fraccion[2] >= '5') centavos += 1n;
  return negativo ? -centavos : centavos;
}

/** Importe desde una celda: número o texto. Devuelve centavos o null si no es un importe. */
export function parseImporte(valor: unknown): bigint | null {
  if (typeof valor === 'number') {
    if (!Number.isFinite(valor)) return null;
    // String() da la representación decimal más corta (lo que se ve en Excel).
    const texto = String(valor);
    return parseDecimalACentavos(/e/i.test(texto) ? valor.toFixed(10) : texto);
  }
  if (typeof valor === 'bigint') return valor * 100n;
  if (typeof valor === 'string') return parseDecimalACentavos(valor);
  return null;
}

/** Devuelve un mensaje de error, o null si el importe es válido para el tipo dado. */
export function validateImporte(centavos: bigint, tipo: string): string | null {
  if (centavos === 0n) return 'El importe no puede ser cero';
  if (centavos < 0n && !TIPOS_NEGATIVOS.includes(tipo)) {
    return `Importe negativo solo permitido con tipo C o H (tipo actual: ${tipo || 'vacío'})`;
  }
  if (formatImporteSinValidar(centavos).length > 15) {
    return 'El importe no entra en 15 caracteres';
  }
  return null;
}

function formatImporteSinValidar(centavos: bigint): string {
  const negativo = centavos < 0n;
  const abs = negativo ? -centavos : centavos;
  const cuerpo = `${abs / 100n},${String(abs % 100n).padStart(2, '0')}`;
  return negativo ? '-' + cuerpo.padStart(14, '0') : cuerpo.padStart(15, '0');
}

/**
 * Importe en formato SIFERE: 15 caracteres, coma decimal, ceros a la izquierda.
 * `2400000` → `000000024000,00`; `-123456` (tipo C) → `-00000001234,56`.
 * Lanza ValidationError si el importe no es válido para el tipo.
 */
export function formatImporte(centavos: bigint | number, tipo: string): string {
  if (typeof centavos === 'number' && !Number.isInteger(centavos)) {
    throw new ValidationError('El importe debe expresarse en centavos enteros');
  }
  const c = BigInt(centavos);
  const error = validateImporte(c, tipo);
  if (error) throw new ValidationError(error);
  return formatImporteSinValidar(c);
}

/** Formato para mostrar en pantalla: `$ 107.438,02`. */
export function formatMoneda(centavos: bigint): string {
  const negativo = centavos < 0n;
  const abs = negativo ? -centavos : centavos;
  const entero = String(abs / 100n).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${negativo ? '-' : ''}$ ${entero},${String(abs % 100n).padStart(2, '0')}`;
}

// ---------------------------------------------------------------------------
// Comprobante
// ---------------------------------------------------------------------------

const DESCRIPCIONES: readonly { prefijo: string; tipo: TipoComprobante }[] = [
  { prefijo: 'orden de pago', tipo: 'O' },
  { prefijo: 'factura', tipo: 'F' },
  { prefijo: 'nota de credito', tipo: 'C' },
  { prefijo: 'nota de debito', tipo: 'D' },
  { prefijo: 'recibo', tipo: 'R' },
];

export interface NumeroExtraido {
  tipo: TipoComprobante;
  /** Número como entero, sin ceros a la izquierda ('' si no hay dígitos). */
  numero: string;
}

/**
 * Separa la descripción del número del comprobante.
 * `Orden de pago 00RETIB-00007921` → { tipo: 'O', numero: '7921' }.
 */
export function extractNumero(texto: string): NumeroExtraido {
  const normalizado = normalizarTexto(texto);
  const desc = DESCRIPCIONES.find((d) => normalizado.startsWith(d.prefijo));
  // Sin descripción conocida: se usa el último bloque del texto.
  const resto = desc ? normalizado.slice(desc.prefijo.length) : (normalizado.split(' ').pop() ?? '');
  const digitos = resto.replace(/\D/g, '');
  return {
    tipo: desc?.tipo ?? 'O',
    numero: digitos ? sinCerosIzquierda(digitos) : '',
  };
}

// ---------------------------------------------------------------------------
// Filas
// ---------------------------------------------------------------------------

export function parseRow(fila: FilaExcel): Retencion {
  const { tipo, numero } = extractNumero(fila.comprobante);
  return {
    id: fila.fila,
    fila: fila.fila,
    cuit: fila.cuit,
    fecha: fila.fecha,
    fechaTexto: fila.fechaTexto,
    comprobante: fila.comprobante,
    importeCentavos: fila.importeCentavos,
    importeTexto: fila.importeTexto,
    derivados: { constancia: numero, tipo, comprobanteOriginal: numero },
    overrides: {},
  };
}

/** Valores efectivos de los campos editables: override > derivado > default global. */
export function resolveCampos(r: Retencion, cfg: Config): CamposEditables {
  return {
    sucursal: r.overrides.sucursal ?? cfg.sucursal,
    constancia: r.overrides.constancia ?? r.derivados.constancia,
    tipo: r.overrides.tipo ?? r.derivados.tipo,
    letra: r.overrides.letra ?? cfg.letra,
    comprobanteOriginal: r.overrides.comprobanteOriginal ?? r.derivados.comprobanteOriginal,
  };
}

// ---------------------------------------------------------------------------
// Formatos de registro
// ---------------------------------------------------------------------------

export interface CampoFormato {
  nombre: string;
  desde: number; // 1-based, inclusive
  hasta: number;
}

/**
 * Formato de registro de importación. Hoy solo existe el Formato Nº 2 (90 caracteres);
 * el Formato Nº 1 (79) se agrega implementando esta misma interfaz.
 */
export interface RecordFormat {
  id: string;
  nombre: string;
  longitud: number;
  campos: readonly CampoFormato[];
  /** Arma la línea. Asume una retención válida; lanza ValidationError si algo no entra. */
  build(r: Retencion, cfg: Config): string;
}

export const FORMATO_RETENCIONES_2: RecordFormat = {
  id: 'retenciones-2',
  nombre: 'Retenciones — Formato Nº 2',
  longitud: 90,
  campos: [
    { nombre: 'Tipo de registro', desde: 1, hasta: 2 },
    { nombre: 'Jurisdicción', desde: 3, hasta: 5 },
    { nombre: 'CUIT agente', desde: 6, hasta: 18 },
    { nombre: 'Fecha', desde: 19, hasta: 28 },
    { nombre: 'Sucursal', desde: 29, hasta: 33 },
    { nombre: 'Constancia', desde: 34, hasta: 53 },
    { nombre: 'Tipo comp.', desde: 54, hasta: 54 },
    { nombre: 'Letra', desde: 55, hasta: 55 },
    { nombre: 'Comp. original', desde: 56, hasta: 75 },
    { nombre: 'Importe', desde: 76, hasta: 90 },
  ],
  build(r, cfg) {
    const c = resolveCampos(r, cfg);
    if (!r.fecha) throw new ValidationError('Fecha inválida');
    if (r.importeCentavos == null) throw new ValidationError('Importe inválido');
    return (
      '01' +
      padCeros(String(cfg.jurisdiccion), 3, 'Jurisdicción') +
      formatCuit(r.cuit) +
      formatFecha(r.fecha) +
      padCeros(c.sucursal, 5, 'Sucursal') +
      padCeros(c.constancia, 20, 'Constancia') +
      c.tipo +
      c.letra +
      padCeros(c.comprobanteOriginal.toUpperCase(), 20, 'Comprobante original') +
      formatImporte(r.importeCentavos, c.tipo)
    );
  },
};

export function buildRecord(
  r: Retencion,
  cfg: Config,
  formato: RecordFormat = FORMATO_RETENCIONES_2,
): string {
  const linea = formato.build(r, cfg);
  if (linea.length !== formato.longitud) {
    throw new ValidationError(
      `Fila ${r.fila}: el registro mide ${linea.length} caracteres (se esperaban ${formato.longitud})`,
    );
  }
  return linea;
}

/** Contenido completo del archivo: CRLF y salto de línea final. */
export function buildArchivo(
  rows: readonly Retencion[],
  cfg: Config,
  formato: RecordFormat = FORMATO_RETENCIONES_2,
): string {
  return rows.map((r) => buildRecord(r, cfg, formato) + '\r\n').join('');
}

// ---------------------------------------------------------------------------
// Validación
// ---------------------------------------------------------------------------

export function validateConfig(cfg: Config): string[] {
  const errores: string[] = [];
  if (!esJurisdiccionValida(cfg.jurisdiccion)) errores.push('Jurisdicción inválida');
  if (!/^\d{1,5}$/.test(cfg.sucursal)) errores.push('Sucursal default: hasta 5 dígitos');
  if (!(LETRAS as readonly string[]).includes(cfg.letra)) errores.push('Letra default inválida');
  return errores;
}

export function validateRetencion(r: Retencion, cfg: Config): Validacion {
  const errores: string[] = [];
  const c = resolveCampos(r, cfg);

  if (!/^\d{11}$/.test(r.cuit)) errores.push('El CUIT debe tener 11 dígitos');
  else if (!validateCuit(r.cuit)) errores.push('CUIT con dígito verificador inválido');

  if (!r.fecha) errores.push(`Fecha inválida${r.fechaTexto ? ` ("${r.fechaTexto}")` : ''}`);

  if (!/^\d{1,5}$/.test(c.sucursal)) errores.push('Sucursal: de 1 a 5 dígitos');

  if (c.constancia === '') errores.push('No se encontró número de constancia en el comprobante');
  else if (!/^\d+$/.test(c.constancia)) errores.push('Constancia: solo dígitos');
  else if (c.constancia.length > 20) errores.push('Constancia: máximo 20 dígitos');

  if (!(c.tipo in TIPOS_COMPROBANTE)) errores.push(`Tipo de comprobante inválido ("${c.tipo}")`);
  if (!(LETRAS as readonly string[]).includes(c.letra)) errores.push(`Letra inválida ("${c.letra}")`);

  if (c.comprobanteOriginal === '') errores.push('Comprobante original vacío');
  else if (!/^[0-9A-Za-z]+$/.test(c.comprobanteOriginal)) {
    errores.push('Comprobante original: solo letras y números');
  } else if (c.comprobanteOriginal.length > 20) {
    errores.push('Comprobante original: máximo 20 caracteres');
  }

  if (r.importeCentavos == null) {
    errores.push(`Importe inválido${r.importeTexto ? ` ("${r.importeTexto}")` : ''}`);
  } else {
    const error = validateImporte(r.importeCentavos, c.tipo);
    if (error) errores.push(error);
  }

  return { errores, advertencias: [] };
}

/** Valida todas las filas y agrega advertencias de constancias duplicadas por CUIT. */
export function validateRetenciones(
  rows: readonly Retencion[],
  cfg: Config,
): Map<number, Validacion> {
  const resultado = new Map<number, Validacion>();
  const porClave = new Map<string, Retencion[]>();

  for (const r of rows) {
    resultado.set(r.id, validateRetencion(r, cfg));
    const { constancia } = resolveCampos(r, cfg);
    if (!/^\d+$/.test(constancia)) continue;
    const clave = `${r.cuit}|${sinCerosIzquierda(constancia)}`;
    porClave.set(clave, [...(porClave.get(clave) ?? []), r]);
  }

  for (const grupo of porClave.values()) {
    if (grupo.length < 2) continue;
    const filas = grupo.map((r) => r.fila).join(', ');
    for (const r of grupo) {
      resultado.get(r.id)!.advertencias.push(`Constancia duplicada para el mismo CUIT (filas ${filas})`);
    }
  }
  return resultado;
}

// ---------------------------------------------------------------------------
// Resumen y nombre de archivo
// ---------------------------------------------------------------------------

export interface Resumen {
  cantidad: number;
  totalCentavos: bigint;
  porCuit: { cuit: string; cantidad: number; totalCentavos: bigint }[];
}

export function resumen(rows: readonly Retencion[]): Resumen {
  const porCuit = new Map<string, { cuit: string; cantidad: number; totalCentavos: bigint }>();
  let totalCentavos = 0n;
  for (const r of rows) {
    const importe = r.importeCentavos ?? 0n;
    totalCentavos += importe;
    const acc = porCuit.get(r.cuit) ?? { cuit: r.cuit, cantidad: 0, totalCentavos: 0n };
    acc.cantidad += 1;
    acc.totalCentavos += importe;
    porCuit.set(r.cuit, acc);
  }
  return {
    cantidad: rows.length,
    totalCentavos,
    porCuit: [...porCuit.values()].sort((a, b) =>
      a.totalCentavos === b.totalCentavos ? 0 : a.totalCentavos > b.totalCentavos ? -1 : 1,
    ),
  };
}

/** Período (aaaamm) que más se repite; ante empate, el más reciente. */
export function periodoMasFrecuente(rows: readonly Retencion[]): string | null {
  const cuenta = new Map<string, number>();
  for (const r of rows) {
    if (r.fecha) cuenta.set(periodo(r.fecha), (cuenta.get(periodo(r.fecha)) ?? 0) + 1);
  }
  let mejor: string | null = null;
  for (const [p, n] of cuenta) {
    const nMejor = mejor ? cuenta.get(mejor)! : 0;
    if (n > nMejor || (n === nMejor && mejor !== null && p > mejor)) mejor = p;
  }
  return mejor;
}

export function nombreArchivo(rows: readonly Retencion[], cfg: Config): string {
  return `retenciones_sifere_${cfg.jurisdiccion}_${periodoMasFrecuente(rows) ?? 'sinperiodo'}.txt`;
}
