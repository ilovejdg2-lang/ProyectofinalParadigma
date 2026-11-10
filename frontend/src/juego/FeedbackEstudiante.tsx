import type { RespuestaParticipante } from '../dominio/tipos.ts'
import { Confeti } from './Confeti.tsx'
import { formatoPuntos, formatoSegundos } from './puntuacion.ts'

export function FeedbackEstudiante({
  respuesta,
  total,
  correcta,
}: {
  respuesta?: RespuestaParticipante
  total: number
  correcta: string
}) {
  if (!respuesta?.aceptada) {
    return (
      <section className="feedback-pantalla tiempo" role="status">
        <span className="feedback-icono" aria-hidden="true">⏱</span>
        <h2>¡Se acabó el tiempo!</h2>
        <p>No registraste una respuesta.</p>
        <p className="feedback-puntos">+0 puntos</p>
        <p>Total: {formatoPuntos(total)} puntos.</p>
      </section>
    )
  }
  if (respuesta.puntos > 0) {
    return (
      <section className="feedback-pantalla bien" role="status">
        <Confeti />
        <span className="feedback-icono" aria-hidden="true">✓</span>
        <h2>¡Correcto!</h2>
        <p className="feedback-puntos">+{formatoPuntos(respuesta.puntos)} puntos</p>
        {typeof respuesta.milisegundos === 'number' ? (
          <p>Respondiste en {formatoSegundos(respuesta.milisegundos)} segundos.</p>
        ) : null}
        <p>Total: {formatoPuntos(total)} puntos.</p>
      </section>
    )
  }
  return (
    <section className="feedback-pantalla mal" role="status">
      <span className="feedback-icono" aria-hidden="true">✕</span>
      <h2>¡Incorrecto!</h2>
      <p className="feedback-puntos">+0 puntos</p>
      <p>La respuesta correcta es {correcta}.</p>
      <p>Total: {formatoPuntos(total)} puntos.</p>
    </section>
  )
}
