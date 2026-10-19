import type { OpcionRespuesta, Pregunta } from './tipos.ts'

export function opcionesDe(pregunta: Pick<Pregunta, 'id' | 'respuestaCorrecta' | 'opciones'>): OpcionRespuesta[] {
  if (pregunta.opciones && pregunta.opciones.length >= 2) {
    return pregunta.opciones.map((opcion) => ({ ...opcion }))
  }
  return [
    { id: `${pregunta.id}:verdadero`, texto: 'Verdadero', correcta: pregunta.respuestaCorrecta === true },
    { id: `${pregunta.id}:falso`, texto: 'Falso', correcta: pregunta.respuestaCorrecta === false },
  ]
}

export function textoCorrecto(pregunta: Pick<Pregunta, 'id' | 'respuestaCorrecta' | 'opciones'>): string {
  return opcionesDe(pregunta).find((opcion) => opcion.correcta)?.texto ?? 'Sin elegir'
}
