import { describe, expect, it } from 'vitest'
import type { Participante, Pregunta } from '../dominio/tipos.ts'
import { filasDetalleParticipante } from '../paginas/detalleRespuestas.ts'

const preguntas: Pregunta[] = [
  {
    id: 'p1',
    enunciado: '¿Limitar WIP ayuda?',
    respuestaCorrecta: true,
    orden: 0,
    opciones: [
      { id: 'p1a', texto: 'Verdadero', correcta: true },
      { id: 'p1b', texto: 'Falso', correcta: false },
    ],
  },
  {
    id: 'p2',
    enunciado: 'Kanban es Push',
    respuestaCorrecta: false,
    orden: 1,
    opciones: [
      { id: 'p2a', texto: 'Verdadero', correcta: false },
      { id: 'p2b', texto: 'Falso', correcta: true },
    ],
  },
]

function participante(respuestas: Participante['respuestas']): Participante {
  return {
    id: 'part-1',
    perfilId: 'est-1',
    nombre: 'Luis',
    conectado: true,
    puntaje: respuestas.filter((item) => item.puntos > 0).length,
    aciertos: respuestas.filter((item) => item.puntos > 0).length,
    respuestas,
  }
}

describe('filasDetalleParticipante', () => {
  it('muestra qué marcó, la correcta y el fallo', () => {
    const filas = filasDetalleParticipante(
      participante([
        { preguntaId: 'p1', opcionId: 'p1a', valor: true, aceptada: true, tardia: false, puntos: 1 },
        { preguntaId: 'p2', opcionId: 'p2a', valor: true, aceptada: true, tardia: false, puntos: 0 },
      ]),
      preguntas,
    )

    expect(filas).toHaveLength(2)
    expect(filas[0]).toMatchObject({
      marcada: 'Verdadero',
      correcta: 'Verdadero',
      estado: 'correcta',
    })
    expect(filas[1]).toMatchObject({
      marcada: 'Verdadero',
      correcta: 'Falso',
      estado: 'incorrecta',
    })
  })

  it('marca preguntas sin respuesta', () => {
    const filas = filasDetalleParticipante(participante([]), preguntas)
    expect(filas[0]?.estado).toBe('sin-respuesta')
    expect(filas[0]?.marcada).toBe('Sin respuesta')
  })
})
