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

/** 500 por acertar y hasta 500 más por responder antes de que se agote el plazo. */
export function puntosDeRespuesta(
  acierto: boolean,
  transcurridoMs: number,
  limiteMs: number,
): number {
  if (!acierto) return 0;
  if (!(limiteMs > 0)) return 500;
  const razon = Math.min(
    1,
    Math.max(0, transcurridoMs / limiteMs),
  );
  const bruto = 500 + 500 * (1 - razon);
  return Math.min(1000, Math.max(500, Math.round(bruto)));
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
