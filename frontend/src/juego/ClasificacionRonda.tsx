import type { Participante } from '../dominio/tipos.ts'
import { Avatar, avatarVisible } from './avatares.tsx'
import { mensajesDeRonda } from './ronda.ts'

export function ClasificacionRonda({
  participantes,
  preguntaId,
  perfilId,
}: {
  participantes: Participante[]
  preguntaId: string
  perfilId?: string
}) {
  const { mensajes, actual, previo } = mensajesDeRonda(participantes, preguntaId, perfilId)
  return (
    <section className="clasificacion-ronda" aria-label="Clasificación de la ronda">
      {mensajes.length > 0 ? (
        <ul className="mensajes-ronda">
          {mensajes.map((mensaje) => (
            <li key={mensaje}>{mensaje}</li>
          ))}
        </ul>
      ) : null}
      <h2>Ranking en vivo</h2>
      <ol className="puestos-ronda">
        {actual.map((participante, indice) => {
          const antes = previo.findIndex((item) => item.id === participante.id)
          const subio = antes > indice
          return (
            <li className={`puesto-juego lugar-${Math.min(indice + 1, 3)}${participante.perfilId === perfilId ? ' mio' : ''}`} key={participante.id}>
              <span>{indice + 1}</span>
              <Avatar id={avatarVisible(participante.perfilId, participante.avatarId)} tamano={36} />
              <strong>{participante.nombre}</strong>
              <span>
                {participante.puntaje} pts{subio ? ' · subió' : ''}
              </span>
            </li>
          )
        })}
      </ol>
    </section>
  )
}
