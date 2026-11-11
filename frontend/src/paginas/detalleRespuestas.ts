import type { Participante, Pregunta, RespuestaParticipante } from '../dominio/tipos.ts'

export type EstadoDetalle = 'correcta' | 'incorrecta' | 'sin-respuesta'

export interface FilaDetalleRespuesta {
  preguntaId: string
  orden: number
  enunciado: string
  marcada: string
  correcta: string
  estado: EstadoDetalle
  puntos: number
  tardia: boolean
}

function textoVerdaderoFalso(valor: boolean | null | undefined): string {
  if (valor === true) return 'Verdadero'
  if (valor === false) return 'Falso'
  return 'Sin respuesta'
}

function textoOpcion(pregunta: Pregunta | undefined, opcionId: string | undefined): string | null {
  if (!pregunta || !opcionId) return null
  return pregunta.opciones?.find((opcion) => opcion.id === opcionId)?.texto ?? null
}

function respuestaCorrectaTexto(pregunta: Pregunta): string {
  const correcta = pregunta.opciones?.find((opcion) => opcion.correcta)
  if (correcta) return correcta.texto
  return textoVerdaderoFalso(pregunta.respuestaCorrecta)
}

function respuestaMarcadaTexto(pregunta: Pregunta | undefined, respuesta: RespuestaParticipante | undefined): string {
  if (!respuesta?.aceptada) return 'Sin respuesta'
  const porOpcion = textoOpcion(pregunta, respuesta.opcionId)
  if (porOpcion) return porOpcion
  if (respuesta.valor === true || respuesta.valor === false) return textoVerdaderoFalso(respuesta.valor)
  return 'Respuesta registrada'
}

function estadoDe(respuesta: RespuestaParticipante | undefined): EstadoDetalle {
  if (!respuesta?.aceptada) return 'sin-respuesta'
  return respuesta.puntos > 0 ? 'correcta' : 'incorrecta'
}

export function filasDetalleParticipante(
  participante: Participante,
  preguntas: Pregunta[],
): FilaDetalleRespuesta[] {
  const ordenadas = [...preguntas].sort((a, b) => a.orden - b.orden)

  if (ordenadas.length === 0) {
    return participante.respuestas.map((respuesta, indice) => ({
      preguntaId: respuesta.preguntaId,
      orden: indice,
      enunciado: `Pregunta ${indice + 1}`,
      marcada: respuestaMarcadaTexto(undefined, respuesta),
      correcta: '—',
      estado: estadoDe(respuesta),
      puntos: respuesta.puntos,
      tardia: respuesta.tardia,
    }))
  }

  return ordenadas.map((pregunta) => {
    const respuesta = participante.respuestas.find(
      (item) => item.preguntaId === pregunta.id && item.aceptada,
    )
    return {
      preguntaId: pregunta.id,
      orden: pregunta.orden,
      enunciado: pregunta.enunciado || `Pregunta ${pregunta.orden + 1}`,
      marcada: respuestaMarcadaTexto(pregunta, respuesta),
      correcta: respuestaCorrectaTexto(pregunta),
      estado: estadoDe(respuesta),
      puntos: respuesta?.puntos ?? 0,
      tardia: Boolean(respuesta?.tardia),
    }
  })
}

export function etiquetaEstado(estado: EstadoDetalle): string {
  if (estado === 'correcta') return 'Correcta'
  if (estado === 'incorrecta') return 'Incorrecta'
  return 'Sin respuesta'
}
