import { useMemo } from 'react'
import type { RespuestaParticipante } from '../dominio/tipos.ts'
import { Confeti } from './Confeti.tsx'
import { formatoPuntos, formatoSegundos } from './puntuacion.ts'

const MENSAJES_MAL = ['¡Casi!', 'Respuesta incorrecta', '¡Vamos por la siguiente!'] as const

export function FeedbackEstudiante({
  respuesta,
  total,
  correcta,
  racha = 0,
}: {
  respuesta?: RespuestaParticipante
  total: number
  correcta: string
  racha?: number
}) {
  const mensajeMal = useMemo(() => {
    const indice = Math.floor(Math.random() * MENSAJES_MAL.length)
    return MENSAJES_MAL[indice] ?? '¡Casi!'
  }, [respuesta?.preguntaId, respuesta?.puntos])

  if (!respuesta?.aceptada) {
    return (
      <section className="feedback-pantalla tiempo" role="status">
        <span className="feedback-icono" aria-hidden="true">
          ⏱
        </span>
        <h2>¡Se acabó el tiempo!</h2>
        <p>No registraste una respuesta.</p>
        <p className="feedback-puntos">+0 puntos</p>
        <p>Total: {formatoPuntos(total)} puntos.</p>
      </section>
    )
  }

  if (respuesta.puntos > 0) {
    const rachaAlta = racha >= 3
    return (
      <section className={`feedback-pantalla bien${rachaAlta ? ' racha' : ''}`} role="status">
        <Confeti modo="rafaga" />
        <span className="feedback-icono feedback-check" aria-hidden="true">
          ✓
        </span>
        <h2>{rachaAlta ? `¡Racha x${racha}!` : '¡Correcto!'}</h2>
        <p className="feedback-puntos feedback-puntos-pop">+{formatoPuntos(respuesta.puntos)} puntos</p>
        {typeof respuesta.milisegundos === 'number' ? (
          <p>Respondiste en {formatoSegundos(respuesta.milisegundos)} segundos.</p>
        ) : null}
        <p>Total: {formatoPuntos(total)} puntos.</p>
        {racha >= 2 ? <p className="feedback-racha">{racha} correctas seguidas</p> : null}
      </section>
    )
  }

  return (
    <section className="feedback-pantalla mal" role="status">
      <span className="feedback-icono feedback-x" aria-hidden="true">
        ✕
      </span>
      <h2>{mensajeMal}</h2>
      <p className="feedback-puntos">+0 puntos</p>
      <p>La respuesta correcta es {correcta}.</p>
      <p>Total: {formatoPuntos(total)} puntos.</p>
    </section>
  )
}
