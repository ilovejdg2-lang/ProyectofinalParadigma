import { ordenarClasificacion } from '../dominio/filtros.ts'
import { Avatar, avatarVisible } from '../juego/avatares.tsx'
import { Confeti } from '../juego/Confeti.tsx'

interface PersonaPodio {
  id: string
  perfilId: string
  nombre: string
  avatarId?: string
  puntaje: number
  aciertos: number
}

export function Podio({ participantes, perfilId }: { participantes: PersonaPodio[]; perfilId?: string }) {
  const orden = ordenarClasificacion(participantes)
  const cima = orden.slice(0, 3)
  const hayEmpate = orden.some((item, indice) => {
    const siguiente = orden[indice + 1]
    return Boolean(siguiente && item.puntaje === siguiente.puntaje && item.aciertos === siguiente.aciertos)
  })

  return (
    <div className="podio-bloque">
      <Confeti />
      <ol className={`podio podio-n${cima.length}`} aria-label="Podio">
        {cima.map((participante, indice) => (
          <li
            className={`podio-puesto lugar-${indice + 1}${participante.perfilId === perfilId ? ' mio' : ''}`}
            key={participante.id}
          >
            <div className="podio-persona">
              <Avatar id={avatarVisible(participante.perfilId, participante.avatarId)} tamano={indice === 0 ? 120 : 88} />
              <strong>{participante.nombre}</strong>
              <span>
                {participante.puntaje} pts · {participante.aciertos} aciertos
              </span>
            </div>
            <div className="podio-base" aria-hidden="true">
              {indice + 1}
            </div>
          </li>
        ))}
      </ol>
      {hayEmpate ? (
        <p className="meta">Si empatan en puntos y aciertos, el puesto lo define el nombre en orden alfabético.</p>
      ) : null}
      {orden.length > 3 ? (
        <ol className="clasificacion-completa" aria-label="Clasificación completa">
          {orden.map((participante, indice) => (
            <li className={participante.perfilId === perfilId ? 'mio' : ''} key={participante.id}>
              <span>{indice + 1}</span>
              <Avatar id={avatarVisible(participante.perfilId, participante.avatarId)} tamano={36} />
              <strong>{participante.nombre}</strong>
              <span>
                {participante.puntaje} pts · {participante.aciertos} aciertos
              </span>
            </li>
          ))}
        </ol>
      ) : null}
    </div>
  )
}
