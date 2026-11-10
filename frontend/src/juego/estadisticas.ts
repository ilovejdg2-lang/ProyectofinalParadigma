import { opcionesDe } from '../dominio/opciones.ts'
import type { Participante, Pregunta, RespuestaParticipante, Sala } from '../dominio/tipos.ts'

export interface BarraRespuesta {
  id: string
  texto: string
  cantidad: number
  porcentaje: number
  correcta: boolean
  tono: number
}

export interface ResumenPregunta {
  barras: BarraRespuesta[]
  correctas: number
  incorrectas: number
  sinRespuesta: number
  total: number
  respuestas: number
  porcentajeAciertos: number
  promedioMs: number | null
}

function eligio(respuesta: RespuestaParticipante, opcionId: string, preguntaId: string) {
  if (respuesta.opcionId) return respuesta.opcionId === opcionId
  if (opcionId === `${preguntaId}:verdadero`) return respuesta.valor === true
  if (opcionId === `${preguntaId}:falso`) return respuesta.valor === false
  return false
}

export function resumenDePregunta(sala: Pick<Sala, 'participantes' | 'elegibles'>, pregunta: Pregunta): ResumenPregunta {
  const ids = new Set(sala.elegibles?.length ? sala.elegibles : sala.participantes.map((item) => item.id))
  const personas = sala.participantes.filter((item) => ids.has(item.id))
  const respuestas = personas.flatMap((persona) =>
    persona.respuestas.filter((respuesta) => respuesta.preguntaId === pregunta.id && respuesta.aceptada),
  )
  const opciones = opcionesDe(pregunta)
  const total = personas.length
  const barras = opciones.map((opcion, tono) => {
    const cantidad = respuestas.filter((respuesta) => eligio(respuesta, opcion.id, pregunta.id)).length
    return {
      id: opcion.id,
      texto: opcion.texto,
      cantidad,
      porcentaje: total > 0 ? Math.round((cantidad / total) * 100) : 0,
      correcta: Boolean(opcion.correcta),
      tono,
    }
  })
  const correctas = respuestas.filter((respuesta) => respuesta.puntos > 0).length
  const incorrectas = respuestas.filter((respuesta) => respuesta.puntos === 0).length
  const tiempos = respuestas.map((respuesta) => respuesta.milisegundos).filter((valor): valor is number => typeof valor === 'number')
  return {
    barras,
    correctas,
    incorrectas,
    sinRespuesta: Math.max(0, total - respuestas.length),
    total,
    respuestas: respuestas.length,
    porcentajeAciertos: total > 0 ? Math.round((correctas / total) * 100) : 0,
    promedioMs: tiempos.length > 0 ? Math.round(tiempos.reduce((suma, valor) => suma + valor, 0) / tiempos.length) : null,
  }
}

export function cuentaRespuestas(participantes: Participante[], preguntaId: string, elegibles?: string[]) {
  const ids = new Set(elegibles?.length ? elegibles : participantes.map((item) => item.id))
  const personas = participantes.filter((item) => ids.has(item.id))
  const recibidas = personas.filter((item) =>
    item.respuestas.some((respuesta) => respuesta.preguntaId === preguntaId && respuesta.aceptada),
  ).length
  return { recibidas, esperadas: personas.length }
}
