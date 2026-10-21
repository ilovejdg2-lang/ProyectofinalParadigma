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
