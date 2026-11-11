import { describe, expect, it } from 'vitest'
import { rachaDe } from '../juego/racha.ts'
import type { Participante, Pregunta } from '../dominio/tipos.ts'

const preguntas: Pregunta[] = [
  { id: 'p1', enunciado: '1', respuestaCorrecta: true, orden: 0 },
  { id: 'p2', enunciado: '2', respuestaCorrecta: true, orden: 1 },
  { id: 'p3', enunciado: '3', respuestaCorrecta: true, orden: 2 },
]

function participante(respuestas: Participante['respuestas']): Participante {
  return {
    id: 'x',
    perfilId: 'u1',
    nombre: 'Ana',
    conectado: true,
    puntaje: 0,
    aciertos: 0,
    respuestas,
  }
}

describe('rachaDe', () => {
  it('cuenta aciertos consecutivos al final', () => {
    const yo = participante([
      { preguntaId: 'p1', valor: true, aceptada: true, tardia: false, puntos: 100 },
      { preguntaId: 'p2', valor: true, aceptada: true, tardia: false, puntos: 100 },
      { preguntaId: 'p3', valor: true, aceptada: true, tardia: false, puntos: 100 },
    ])
    expect(rachaDe(yo, preguntas)).toBe(3)
  })

  it('rompe la racha con un error', () => {
    const yo = participante([
      { preguntaId: 'p1', valor: true, aceptada: true, tardia: false, puntos: 100 },
      { preguntaId: 'p2', valor: false, aceptada: true, tardia: false, puntos: 0 },
      { preguntaId: 'p3', valor: true, aceptada: true, tardia: false, puntos: 100 },
    ])
    expect(rachaDe(yo, preguntas)).toBe(1)
  })

  it('devuelve 0 sin participante', () => {
    expect(rachaDe(undefined, preguntas)).toBe(0)
  })
})
