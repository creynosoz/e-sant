import { describe, expect, it } from 'vitest';
import {
  buildArchivo,
  buildRecord,
  extractNumero,
  formatCuit,
  formatImporte,
  nombreArchivo,
  parseDecimalACentavos,
  parseFecha,
  parseImporte,
  parseRow,
  resumen,
  validateCuit,
  validateRetenciones,
  ValidationError,
  type Config,
} from './sifere';

const cfg: Config = { jurisdiccion: 921, sucursal: '00000', letra: 'A' };

function retencion(cuit: string, fecha: string, comprobante: string, importe: unknown, fila = 2) {
  return parseRow({
    fila,
    cuit,
    fecha: parseFecha(fecha),
    fechaTexto: fecha,
    comprobante,
    importeCentavos: parseImporte(importe),
    importeTexto: String(importe),
  });
}

const CASOS: [string, string, string, unknown, string][] = [
  [
    '30597355919', '04/09/2026', 'Orden de pago 00RETIB-00007921', 24000,
    '0192130-59735591-904/09/20260000000000000000000007921OA00000000000000007921000000024000,00',
  ],
  [
    '30999003156', '22/09/2026', 'Orden de pago 0000000000734021', '107438.02',
    '0192130-99900315-622/09/20260000000000000000000734021OA00000000000000734021000000107438,02',
  ],
  [
    '30663288497', '29/09/2026', 'Factura 000000072750', '56113.75',
    '0192130-66328849-729/09/20260000000000000000000072750FA00000000000000072750000000056113,75',
  ],
  [
    '30999007046', '29/09/2026', 'Orden de pago 0000200001181', 105000,
    '0192130-99900704-629/09/20260000000000000000200001181OA00000000000200001181000000105000,00',
  ],
];

const filasEjemplo = () => CASOS.map(([c, f, comp, imp], i) => retencion(c, f, comp, imp, i + 2));

describe('buildRecord — Formato Nº 2', () => {
  it.each(CASOS)('%s %s %s %s', (cuit, fecha, comp, importe, esperado) => {
    const linea = buildRecord(retencion(cuit, fecha, comp, importe), cfg);
    expect(linea).toBe(esperado);
    expect(linea).toHaveLength(90);
  });

  it('las filas de ejemplo no tienen errores ni advertencias', () => {
    for (const v of validateRetenciones(filasEjemplo(), cfg).values()) {
      expect(v.errores).toEqual([]);
      expect(v.advertencias).toEqual([]);
    }
  });

  it('respeta overrides por fila (sucursal + número)', () => {
    const r = retencion('30999007046', '29/09/2026', 'Orden de pago 0000200001181', 105000);
    r.overrides = { sucursal: '2', constancia: '1181', comprobanteOriginal: '1181' };
    const linea = buildRecord(r, cfg);
    expect(linea.slice(28, 33)).toBe('00002');
    expect(linea.slice(33, 53)).toBe('00000000000000001181');
    expect(linea).toHaveLength(90);
  });
});

describe('buildArchivo', () => {
  it('usa CRLF, termina con salto de línea y cada línea mide 90', () => {
    const archivo = buildArchivo(filasEjemplo(), cfg);
    expect(archivo.endsWith('\r\n')).toBe(true);
    expect(archivo.replace(/\r\n/g, '')).not.toMatch(/[\r\n]/);
    const lineas = archivo.split('\r\n');
    expect(lineas.pop()).toBe('');
    expect(lineas).toHaveLength(4);
    for (const l of lineas) expect(l).toHaveLength(90);
    expect(/^[\x20-\x7e\r\n]*$/.test(archivo)).toBe(true);
  });

  it('nombre con jurisdicción y período más frecuente', () => {
    expect(nombreArchivo(filasEjemplo(), cfg)).toBe('retenciones_sifere_921_202609.txt');
  });
});

describe('formatImporte', () => {
  it('formatea positivos con coma decimal y ceros a la izquierda', () => {
    expect(formatImporte(2400000, 'O')).toBe('000000024000,00');
    expect(formatImporte(5n, 'F')).toBe('000000000000,05');
  });

  it('negativo con tipo C o H → signo al inicio', () => {
    expect(formatImporte(-123456, 'C')).toBe('-00000001234,56');
    expect(formatImporte(-123456, 'H')).toBe('-00000001234,56');
  });

  it('negativo con tipo O → error de validación', () => {
    expect(() => formatImporte(-123456, 'O')).toThrow(ValidationError);
    const r = retencion('30597355919', '04/09/2026', 'Orden de pago 1', '-1234.56');
    expect(validateRetenciones([r], cfg).get(r.id)!.errores.join()).toMatch(/negativo/);
  });

  it('rechaza cero y lo que no entra en 15 caracteres', () => {
    expect(() => formatImporte(0, 'O')).toThrow(ValidationError);
    expect(formatImporte(99999999999999n, 'O')).toBe('999999999999,99');
    expect(() => formatImporte(100000000000000n, 'O')).toThrow(ValidationError);
  });
});

describe('parseImporte (half-up, sin floats)', () => {
  it.each<[unknown, bigint]>([
    [24000, 2400000n],
    ['107438.02', 10743802n],
    ['56113.75', 5611375n],
    [1.005, 101n],
    ['0.125', 13n],
    ['0.124', 12n],
    ['-1234.565', -123457n],
    ['107.438,02', 10743802n],
    ['1,234,567.89', 123456789n],
    ['  $ 100 ', 10000n],
  ])('%s → %s', (entrada, esperado) => {
    expect(parseImporte(entrada)).toBe(esperado);
  });

  it('textos inválidos → null', () => {
    expect(parseDecimalACentavos('abc')).toBeNull();
    expect(parseDecimalACentavos('')).toBeNull();
    expect(parseImporte(null)).toBeNull();
  });
});

describe('CUIT', () => {
  it('valida dígito verificador', () => {
    expect(validateCuit('30597355919')).toBe(true);
    expect(validateCuit('30999003156')).toBe(true);
    expect(validateCuit('30663288497')).toBe(true);
    expect(validateCuit('30999007046')).toBe(true);
    expect(validateCuit('30597355918')).toBe(false);
    expect(validateCuit('3059735591')).toBe(false);
  });

  it('formatea con guiones', () => {
    expect(formatCuit('30597355919')).toBe('30-59735591-9');
  });

  it('un CUIT inválido genera error en la fila', () => {
    const r = retencion('30597355918', '04/09/2026', 'Orden de pago 1', 100);
    expect(validateRetenciones([r], cfg).get(r.id)!.errores).toContain(
      'CUIT con dígito verificador inválido',
    );
  });
});

describe('extractNumero', () => {
  it.each([
    ['Orden de pago 00RETIB-00007921', 'O', '7921'],
    ['Orden de pago 0000000000734021', 'O', '734021'],
    ['Factura 000000072750', 'F', '72750'],
    ['Nota de crédito 0001-00000123', 'C', '100000123'],
    ['NOTA DE DEBITO 55', 'D', '55'],
    ['Recibo 0003', 'R', '3'],
    ['Liquidación 0000045', 'O', '45'],
  ])('%s', (texto, tipo, numero) => {
    expect(extractNumero(texto)).toEqual({ tipo, numero });
  });
});

describe('validaciones', () => {
  it('fecha inválida', () => {
    expect(parseFecha('31/02/2026')).toBeNull();
    const r = retencion('30597355919', '31/02/2026', 'Orden de pago 1', 100);
    expect(validateRetenciones([r], cfg).get(r.id)!.errores.join()).toMatch(/Fecha/);
  });

  it('constancia > 20 dígitos y sucursal > 5', () => {
    const r = retencion('30597355919', '04/09/2026', 'Orden de pago 1', 100);
    r.overrides = { constancia: '1'.repeat(21), sucursal: '123456' };
    const { errores } = validateRetenciones([r], cfg).get(r.id)!;
    expect(errores.join()).toMatch(/Constancia/);
    expect(errores.join()).toMatch(/Sucursal/);
  });

  it('advierte constancias duplicadas para el mismo CUIT', () => {
    const a = retencion('30597355919', '04/09/2026', 'Orden de pago 007921', 100, 2);
    const b = retencion('30597355919', '05/09/2026', 'Orden de pago 00RETIB-7921', 200, 3);
    const c = retencion('30999003156', '05/09/2026', 'Orden de pago 7921', 200, 4);
    const v = validateRetenciones([a, b, c], cfg);
    expect(v.get(2)!.advertencias).toHaveLength(1);
    expect(v.get(3)!.advertencias).toHaveLength(1);
    expect(v.get(4)!.advertencias).toHaveLength(0);
    expect(v.get(2)!.errores).toHaveLength(0);
  });
});

describe('resumen', () => {
  it('totaliza por CUIT', () => {
    const rows = [
      retencion('30597355919', '04/09/2026', 'Orden de pago 1', '0.10', 2),
      retencion('30597355919', '04/09/2026', 'Orden de pago 2', '0.20', 3),
      retencion('30999003156', '04/09/2026', 'Orden de pago 3', 5, 4),
    ];
    const res = resumen(rows);
    expect(res.cantidad).toBe(3);
    expect(res.totalCentavos).toBe(530n);
    expect(res.porCuit).toEqual([
      { cuit: '30999003156', cantidad: 1, totalCentavos: 500n },
      { cuit: '30597355919', cantidad: 2, totalCentavos: 30n },
    ]);
  });
});
