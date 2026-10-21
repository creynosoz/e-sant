export interface Jurisdiccion {
  codigo: number;
  nombre: string;
}

export const JURISDICCIONES: readonly Jurisdiccion[] = [
  { codigo: 901, nombre: 'Ciudad Autónoma de Buenos Aires' },
  { codigo: 902, nombre: 'Buenos Aires' },
  { codigo: 903, nombre: 'Catamarca' },
  { codigo: 904, nombre: 'Córdoba' },
  { codigo: 905, nombre: 'Corrientes' },
  { codigo: 906, nombre: 'Chaco' },
  { codigo: 907, nombre: 'Chubut' },
  { codigo: 908, nombre: 'Entre Ríos' },
  { codigo: 909, nombre: 'Formosa' },
  { codigo: 910, nombre: 'Jujuy' },
  { codigo: 911, nombre: 'La Pampa' },
  { codigo: 912, nombre: 'La Rioja' },
  { codigo: 913, nombre: 'Mendoza' },
  { codigo: 914, nombre: 'Misiones' },
  { codigo: 915, nombre: 'Neuquén' },
  { codigo: 916, nombre: 'Río Negro' },
  { codigo: 917, nombre: 'Salta' },
  { codigo: 918, nombre: 'San Juan' },
  { codigo: 919, nombre: 'San Luis' },
  { codigo: 920, nombre: 'Santa Cruz' },
  { codigo: 921, nombre: 'Santa Fe' },
  { codigo: 922, nombre: 'Santiago del Estero' },
  { codigo: 923, nombre: 'Tierra del Fuego' },
  { codigo: 924, nombre: 'Tucumán' },
];

export const JURISDICCION_DEFAULT = 921;

export function esJurisdiccionValida(codigo: number): boolean {
  return JURISDICCIONES.some((j) => j.codigo === codigo);
}
