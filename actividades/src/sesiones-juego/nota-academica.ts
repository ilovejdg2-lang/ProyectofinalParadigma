import { esAcierto, type Seleccion } from './calificacion';
import type { PreguntaInstantanea } from './presentacion-sala';

/**
 * Política de la nota académica (método «aciertos»):
 * - La nota es el porcentaje de respuestas correctas sobre las preguntas de la
 *   instantánea, llevado a la nota máxima. La velocidad no la modifica.
 * - Una pregunta sin respuesta aceptada cuenta como incorrecta.
 * - Una respuesta rechazada por llegar fuera de plazo no cuenta como acierto.
 * - No existe anulación de preguntas: solo entran las de la instantánea.
 * - La nota se escribe una vez, al pasar la sesión a finalizada. Si el
 *   anfitrión no termina la partida, no hay calificación.
 * - Editar el cuestionario después no cambia las notas ya guardadas.
 * - Quien no está matriculado no entra a una partida ligada a un curso y no recibe nota.
 * - Paradigmas de Programación es el curso por defecto: cualquier cuenta queda matriculada ahí.
 * - Reconectar con la misma cuenta reutiliza al participante; no crea otra nota.
 */
export function notaDeAciertos(aciertos: number, total: number, notaMaxima: number): number {
  if (!(total > 0) || !(notaMaxima > 0)) return 0;
  const aciertosValidos = Math.min(total, Math.max(0, aciertos));
  return Math.round((aciertosValidos / total) * notaMaxima);
}

/** Puntos porcentuales de la nota final del curso, con un decimal. */
export function aportePorcentual(nota: number, notaMaxima: number, valorPorcentaje: number): number {
  if (!(notaMaxima > 0) || !(valorPorcentaje > 0)) return 0;
  const bruto = (Math.max(0, nota) / notaMaxima) * valorPorcentaje;
  return Math.round(bruto * 10) / 10;
}

export function aciertosAcademicos(
  preguntas: PreguntaInstantanea[],
  respuestas: Array<Seleccion & { preguntaId: string; aceptada?: boolean }>,
): number {
  const aceptadas = new Map(
    respuestas.filter((respuesta) => respuesta.aceptada !== false).map((respuesta) => [respuesta.preguntaId, respuesta]),
  );
  return preguntas.filter((pregunta) => {
    const respuesta = aceptadas.get(pregunta.id);
    if (!respuesta) return false;
    return esAcierto(pregunta, respuesta);
  }).length;
}
