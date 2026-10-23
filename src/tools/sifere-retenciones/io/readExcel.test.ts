import { describe, expect, it } from 'vitest';
import * as XLSX from 'xlsx';
import { buildArchivo, parseRow } from '../domain/sifere';
import { ExcelError, fechaDesdeSerialExcel, readExcel } from './readExcel';

function libro(filas: unknown[][]): Uint8Array {
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(filas), 'Hoja1');
  return XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as Uint8Array;
}

describe('fechaDesdeSerialExcel', () => {
  it('convierte seriales a fecha calendario', () => {
    expect(fechaDesdeSerialExcel(46269)).toEqual({ anio: 2026, mes: 9, dia: 4 });
    expect(fechaDesdeSerialExcel(46269.75)).toEqual({ anio: 2026, mes: 9, dia: 4 });
    expect(fechaDesdeSerialExcel(61)).toEqual({ anio: 1900, mes: 3, dia: 1 });
    expect(fechaDesdeSerialExcel(0)).toBeNull();
  });
});

describe('readExcel', () => {
  it('lee, normaliza tipos, ignora filas vacías y genera el archivo esperado', () => {
    const data = libro([
      ['Cuit', 'Fecha', 'Comprobante', 'Importe'],
      [30597355919, 46269, 'Orden de pago 00RETIB-00007921', 24000],
      [null, null, null, null],
      ['30999003156', '22/09/2026', 'Orden de pago 0000000000734021', '107438.02'],
      [30663288497, 46294, 'Factura 000000072750', '56113.75'],
      [],
      ['30999007046', '29/09/2026', 'Orden de pago 0000200001181', 105000],
    ]);
    const filas = readExcel(data);
    expect(filas.map((f) => f.fila)).toEqual([2, 4, 5, 7]);
    expect(filas[0].fecha).toEqual({ anio: 2026, mes: 9, dia: 4 });
    expect(filas[1].importeCentavos).toBe(10743802n);

    const archivo = buildArchivo(filas.map(parseRow), {
      jurisdiccion: 921,
      sucursal: '00000',
      letra: 'A',
    });
    expect(archivo).toBe(
      [
        '0192130-59735591-904/09/20260000000000000000000007921OA00000000000000007921000000024000,00',
        '0192130-99900315-622/09/20260000000000000000000734021OA00000000000000734021000000107438,02',
        '0192130-66328849-729/09/20260000000000000000000072750FA00000000000000072750000000056113,75',
        '0192130-99900704-629/09/20260000000000000000200001181OA00000000000200001181000000105000,00',
      ].join('\r\n') + '\r\n',
    );
  });

  it('acepta encabezados en otro orden y con mayúsculas', () => {
    const filas = readExcel(
      libro([
        ['IMPORTE', 'comprobante', 'CUIT', 'fecha'],
        [100, 'Factura 1', '30-59735591-9', '01/10/2026'],
      ]),
    );
    expect(filas[0]).toMatchObject({
      cuit: '30597355919',
      importeCentavos: 10000n,
      comprobante: 'Factura 1',
      fecha: { anio: 2026, mes: 10, dia: 1 },
    });
  });

  it('informa columnas faltantes', () => {
    expect(() => readExcel(libro([['Cuit', 'Fecha'], [1, 2]]))).toThrow(ExcelError);
    expect(() => readExcel(libro([['Cuit', 'Fecha'], [1, 2]]))).toThrow(/Comprobante, Importe/);
  });
});
