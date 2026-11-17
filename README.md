# Retenciones IIBB → SIFERE WEB

App web 100% client-side que toma un Excel de retenciones de Ingresos Brutos y genera el
archivo `.txt` de importación por lotes de **Retenciones para SIFERE WEB (Formato Nº 2)**.
Nada se sube a ningún servidor: el archivo se lee y procesa en el navegador.

## Uso

```bash
npm install
npm run dev      # http://localhost:5173
npm test         # tests unitarios (Vitest)
```

1. Arrastrá el Excel (o hacé clic para elegirlo).
2. Elegí la jurisdicción (se recuerda la última), sucursal y letra default.
3. Revisá la vista previa: sucursal, constancia, tipo, letra y comprobante original se pueden
   editar por fila (las celdas editadas quedan resaltadas; "Restaurar" vuelve a lo calculado).
4. Corregí los errores marcados en rojo y descargá el `.txt`
   (`retenciones_sifere_{jurisdiccion}_{aaaamm}.txt`).

## Excel de entrada

Primera hoja, fila 1 con encabezados (cualquier orden, sin importar mayúsculas/acentos):

| Cuit | Fecha | Comprobante | Importe |
|---|---|---|---|
| `30597355919` | fecha Excel o `dd/mm/aaaa` | `Orden de pago 00RETIB-00007921` | `24000` o `"107438.02"` |

Las filas vacías se ignoran.

## Formato de salida (Formato Nº 2)

Un registro por línea, 90 caracteres, ASCII, CRLF, sin encabezado:

| Pos. | Campo | Ejemplo |
|---|---|---|
| 1–2 | Tipo de registro | `01` |
| 3–5 | Jurisdicción | `921` |
| 6–18 | CUIT agente | `30-59735591-9` |
| 19–28 | Fecha | `04/09/2026` |
| 29–33 | Sucursal | `00000` |
| 34–53 | Nº constancia | `00000000000000007921` |
| 54 | Tipo comprobante | `O` (F, R, D, C, O, E, H, I) |
| 55 | Letra | `A` |
| 56–75 | Comprobante original | `00000000000000007921` |
| 76–90 | Importe | `000000024000,00` (negativo solo con C/H: `-00000001234,56`) |

Reglas por defecto: el número de constancia se toma del texto del comprobante (solo dígitos,
sin ceros a la izquierda); el tipo es `F` si empieza con "Factura", `C`/`D`/`R` para Nota de
crédito/débito/Recibo, y `O` en otro caso. Los importes se manejan en centavos con BigInt y
redondeo half-up (sin floats).

## Build estático

```bash
npm run build
```

Genera **un único archivo** `dist/index.html` con todo el JS y CSS embebido. Se puede:

- abrir con doble clic (funciona desde `file://`, sin servidor), o
- subir a cualquier hosting estático (GitHub Pages, Netlify, S3, un IIS interno, etc.).

`npm run preview` lo sirve localmente para probarlo.

## Estructura

El sitio (e-sant) es una home con tiles que lleva a cada herramienta. El ruteo es por hash
(`#/`, `#/sifere-retenciones`) para que funcione desde `file://` y en hosting estático.

- `src/App.tsx` — shell del sitio: barra superior y ruteo a la home o a una herramienta.
- `src/router.ts` — hook `useRoute()` sobre `location.hash`.
- `src/home/Home.tsx` — home con un tile por herramienta.
- `src/tools/registry.ts` — lista de herramientas `TOOLS` (id/ruta, título, descripción, componente).
  Para sumar una herramienta: crear `src/tools/<id>/` y registrarla acá.
- `src/tools/sifere-retenciones/` — conversor de retenciones a SIFERE WEB:
  - `SifereRetenciones.tsx` — pantalla principal.
  - `domain/sifere.ts` — dominio puro: parseo, validación (CUIT módulo 11, fechas, importes),
    armado de registros. `RecordFormat` permite agregar el Formato Nº 1 (79 caracteres)
    implementando la misma interfaz.
  - `domain/jurisdicciones.ts` — códigos 901–924.
  - `io/readExcel.ts` — lectura con SheetJS y normalización (serial de Excel → fecha,
    importes → centavos).
  - `components/` — UI React.
