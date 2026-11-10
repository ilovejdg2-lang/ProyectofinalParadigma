import { describe, expect, it } from 'vitest'
import type { Cuestionario, ResumenResultado } from '../dominio/tipos.ts'
import {
  consejosDocente,
  filasCuestionarios,
  metricasDocente,
  normalizarGithub,
  partidasDelEstudiante,
} from '../paginas/perfilMetricas.ts'

const cuestionario: Cuestionario = {
  id: 'quiz-1',
  titulo: 'Fundamentos',
  descripcion: '',
  categoria: 'Programación',
  etiquetas: [],
  dificultad: 'facil',
  autorId: 'profe',
  autorNombre: 'Profe',
  preguntas: [{ id: 'p1', enunciado: '¿2 + 2 = 4?', respuestaCorrecta: true, orden: 1 }],
  esDemostracion: false,
  actualizadoEn: '2026-11-09T12:00:00.000Z',
}

function resultado(parcial: Partial<ResumenResultado>): ResumenResultado {
  return {
    codigo: 'ABC123',
    titulo: 'Fundamentos',
    finalizadaEn: '2026-11-09T18:00:00.000Z',
    anfitrionId: 'profe',
    participantes: [],
    ...parcial,
  }
}

describe('métricas del perfil', () => {
  it('enlaza partidas por título cuando el resultado no trae el id del cuestionario', () => {
    const filas = filasCuestionarios([cuestionario], [resultado({})], 'profe')
    expect(filas[0]?.estado).toBe('Finalizada')
    expect(filas[0]?.partidas).toBe(1)
    expect(filas[0]?.ultimoCodigo).toBe('ABC123')
  })

  it('calcula participaciones y aciertos solo con respuestas aceptadas', () => {
    const historial = [resultado({
      participantes: [{
        id: 'a',
        perfilId: 'est',
        nombre: 'Ana',
        conectado: true,
        puntaje: 1,
        aciertos: 1,
        respuestas: [
          { preguntaId: 'p1', valor: true, aceptada: true, tardia: false, puntos: 1 },
          { preguntaId: 'p2', valor: false, aceptada: false, tardia: true, puntos: 0 },
        ],
      }],
    })]
    expect(metricasDocente([cuestionario], historial, 'profe')).toMatchObject({
      cuestionarios: 1,
      partidas: 1,
      participaciones: 1,
      porcentaje: 100,
    })
  })

  it('un docente sin cuestionarios recibe sugerencias generales', () => {
    const consejos = consejosDocente([], [], 'profe')
    expect(consejos).toHaveLength(3)
    expect(consejos.every((item) => item.general)).toBe(true)
  })

  it('ordena el puesto del estudiante según el puntaje', () => {
    const historial = [resultado({
      anfitrionId: 'otro',
      participantes: [
        { id: 'a', perfilId: 'est', nombre: 'Ana', conectado: true, puntaje: 4, aciertos: 4, respuestas: [] },
        { id: 'b', perfilId: 'yo', nombre: 'Yo', conectado: true, puntaje: 9, aciertos: 9, respuestas: [] },
      ],
    })]
    const filas = partidasDelEstudiante(historial, 'yo')
    expect(filas[0]).toMatchObject({ posicion: 1, resultado: 'Excelente', puntos: 9 })
  })

  it('solo acepta perfiles de GitHub', () => {
    expect(normalizarGithub('')).toBe('')
    expect(normalizarGithub('https://github.com/Maria-Dev')).toBe('https://github.com/Maria-Dev')
    expect(normalizarGithub('https://gitlab.com/maria')).toBeNull()
  })
})
