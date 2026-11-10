import { PreguntaInstantanea } from './presentacion-sala';

export interface Seleccion {
  opcionId: string | null;
  valor: boolean | null;
}

/** El instante exacto del plazo todavía es válido. Solo vence después. */
export function plazoVencido(
  cierraEn: Date | string | null | undefined,
  ahora: Date,
): boolean {
  if (!cierraEn) return false;
  return ahora.getTime() > new Date(cierraEn).getTime();
}

/** Un acierto vale los puntos del cuestionario. Por defecto es 1. El error vale 0. */
export function puntosPorAciertoDe(valor: unknown): number {
  const numero = typeof valor === 'number' ? valor : Number(valor);
  if (!Number.isInteger(numero) || numero < 1) return 1;
  return Math.min(100, numero);
}

export function puntosDeRespuesta(
  acierto: boolean,
  puntosPorAcierto: unknown = 1,
): number {
  if (!acierto) return 0;
  return puntosPorAciertoDe(puntosPorAcierto);
}

export function esAcierto(
  pregunta: PreguntaInstantanea,
  seleccion: Seleccion,
): boolean {
  if (seleccion.opcionId) {
    return pregunta.opciones.some(
      (opcion) => opcion.correcta && opcion.id === seleccion.opcionId,
    );
  }
  return seleccion.valor === pregunta.respuestaCorrecta;
}
