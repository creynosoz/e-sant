import { esJurisdiccionValida, JURISDICCION_DEFAULT } from './domain/jurisdicciones';

const CLAVE = 'sifere.jurisdiccion';

export function cargarJurisdiccion(): number {
  try {
    const valor = Number(localStorage.getItem(CLAVE));
    return esJurisdiccionValida(valor) ? valor : JURISDICCION_DEFAULT;
  } catch {
    return JURISDICCION_DEFAULT;
  }
}

export function guardarJurisdiccion(codigo: number): void {
  try {
    localStorage.setItem(CLAVE, String(codigo));
  } catch {
    // Almacenamiento no disponible (modo privado, bloqueado): se ignora.
  }
}
