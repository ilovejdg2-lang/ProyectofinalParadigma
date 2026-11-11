import type { Participante, Pregunta } from '../dominio/tipos.ts'

/** Cuenta aciertos consecutivos al final de la secuencia de preguntas respondidas. */
export function rachaDe(participante: Participante | undefined, preguntas: Pregunta[]): number {
  if (!participante) return 0
  let racha = 0
  for (let i = preguntas.length - 1; i >= 0; i -= 1) {
    const pregunta = preguntas[i]
    if (!pregunta) continue
    const respuesta = participante.respuestas.find((item) => item.preguntaId === pregunta.id && item.aceptada)
    if (!respuesta) continue
    if (respuesta.puntos > 0) racha += 1
    else break
  }
  return racha
}
