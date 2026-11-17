import type { ComponentType } from 'react';
import SifereRetenciones from './sifere-retenciones/SifereRetenciones';

export interface Tool {
  /** Route segment: the tool is served at `#/{id}`. */
  id: string;
  title: string;
  description: string;
  component: ComponentType;
}

/** Available tools. To add one, create its folder under `src/tools/` and register it here. */
export const TOOLS: Tool[] = [
  {
    id: 'sifere-retenciones',
    title: 'Retenciones IIBB → SIFERE WEB',
    description:
      'Convierte un Excel de retenciones de Ingresos Brutos al archivo de importación de SIFERE WEB (Formato Nº 2).',
    component: SifereRetenciones,
  },
];

export function findTool(id: string): Tool | undefined {
  return TOOLS.find((t) => t.id === id);
}
