import type { Participante, Pregunta } from '../dominio/tipos.ts'
import { Avatar, avatarVisible } from '../juego/avatares.tsx'
import { filasDetalleParticipante, etiquetaEstado } from '../paginas/detalleRespuestas.ts'

export function DetalleParticipante({
  participante,
  preguntas,
  puesto,
}: {
  participante: Participante
  preguntas: Pregunta[]
  puesto: number
}) {
  const filas = filasDetalleParticipante(participante, preguntas)
  const fallos = filas.filter((fila) => fila.estado !== 'correcta').length

  return (
    <article className="detalle-participante" aria-label={`Detalle de ${participante.nombre}`}>
      <header className="detalle-participante-cabeza">
        <Avatar id={avatarVisible(participante.perfilId, participante.avatarId)} tamano={56} />
        <div>
          <h2>{participante.nombre}</h2>
          <p className="meta">
            Puesto {puesto} · {participante.puntaje} puntos · {participante.aciertos} aciertos
            {fallos > 0 ? ` · ${fallos} ${fallos === 1 ? 'fallo' : 'fallos'}` : ''}
          </p>
        </div>
      </header>
      <ol className="detalle-respuestas">
        {filas.map((fila, indice) => (
          <li className={`detalle-respuesta ${fila.estado}`} key={fila.preguntaId}>
            <div className="detalle-respuesta-tope">
              <span className="detalle-numero">P{indice + 1}</span>
              <strong>{fila.enunciado}</strong>
              <span className={`detalle-estado ${fila.estado}`}>{etiquetaEstado(fila.estado)}</span>
            </div>
            <dl className="detalle-respuesta-datos">
              <div>
                <dt>Marcó</dt>
                <dd>{fila.marcada}{fila.tardia ? ' (tardía)' : ''}</dd>
              </div>
              <div>
                <dt>Correcta</dt>
                <dd>{fila.correcta}</dd>
              </div>
              <div>
                <dt>Puntos</dt>
                <dd>{fila.puntos}</dd>
              </div>
            </dl>
          </li>
        ))}
      </ol>
    </article>
  )
}
