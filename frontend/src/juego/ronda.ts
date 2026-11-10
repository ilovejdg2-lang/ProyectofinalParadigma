import { ordenarClasificacion } from '../dominio/filtros.ts'
import type { Participante, Sala } from '../dominio/tipos.ts'

export type Paisaje = 'espera' | 'suspenso' | 'victoria' | 'silencio'

export function cuentaActiva(sala: Pick<Sala, 'estado' | 'preguntaActual' | 'abreEn'>, ahora: number) {
  if (sala.estado !== 'pregunta' || sala.preguntaActual !== 0 || !sala.abreEn) return false
  return new Date(sala.abreEn).getTime() > ahora
}

export function faseCuenta(abreEn: string, ahora: number): '3' | '2' | '1' | 'ya' | null {
  const falta = new Date(abreEn).getTime() - ahora
  if (falta <= 0) return null
  if (falta > 3_375) return '3'
  if (falta > 2_250) return '2'
  if (falta > 1_125) return '1'
  return 'ya'
}

export function paisajeDe(sala: Pick<Sala, 'estado' | 'preguntaActual' | 'abreEn'>, ahora: number, restante: number): Paisaje {
  if (sala.estado === 'esperando') return 'espera'
  if (sala.estado === 'clasificacion' || sala.estado === 'finalizada') return 'victoria'
  if (sala.estado === 'cerrada') return 'silencio'
  if (cuentaActiva(sala, ahora)) return 'silencio'
  if (sala.estado === 'pregunta' && restante <= 0) return 'silencio'
  if (sala.estado === 'pregunta') return 'suspenso'
  return 'silencio'
}

export function sinRonda<T extends Participante>(persona: T, preguntaId: string): T {
  const respuesta = persona.respuestas.find((item) => item.preguntaId === preguntaId)
  const puntos = respuesta?.puntos ?? 0
  return {
    ...persona,
    puntaje: Math.max(0, persona.puntaje - puntos),
    aciertos: Math.max(0, persona.aciertos - (puntos > 0 ? 1 : 0)),
  }
}

export function mensajesDeRonda(participantes: Participante[], preguntaId: string, perfilId?: string) {
  const actual = ordenarClasificacion(participantes)
  const previo = ordenarClasificacion(participantes.map((item) => sinRonda(item, preguntaId)))
  const puesto = actual.findIndex((item) => item.perfilId === perfilId) + 1
  const anterior = previo.findIndex((item) => item.perfilId === perfilId) + 1
  const yo = actual.find((item) => item.perfilId === perfilId)
  const respuesta = yo?.respuestas.find((item) => item.preguntaId === preguntaId)
  const mensajes: string[] = []
  if (respuesta && respuesta.puntos > 0) mensajes.push('¡Excelente respuesta!')
  if (puesto > 0 && anterior > 0 && puesto < anterior) mensajes.push('¡Subiste de posición!')
  if (puesto > 0 && puesto <= 3) mensajes.push('¡Estás entre los tres mejores!')
  const primero = actual[0]?.puntaje ?? 0
  const referencia = actual[Math.min(2, Math.max(0, actual.length - 1))]?.puntaje ?? 0
  if (actual.length >= 2 && primero - referencia <= 1) mensajes.push('¡La competencia está muy reñida!')
  return { mensajes, actual, previo }
}
