import { Crown } from 'lucide-react'
import { useEffect, useState } from 'react'
import { ordenarClasificacion } from '../dominio/filtros.ts'
import { audio } from '../juego/audio.ts'
import { Avatar, avatarVisible } from '../juego/avatares.tsx'
import { Confeti } from '../juego/Confeti.tsx'
import { formatoSegundos } from '../juego/puntuacion.ts'

interface PersonaPodio {
  id: string
  perfilId: string
  nombre: string
  avatarId?: string
  puntaje: number
  aciertos: number
  tiempoMs?: number
}

export function Podio({ participantes, perfilId }: { participantes: PersonaPodio[]; perfilId?: string }) {
  const orden = ordenarClasificacion(participantes)
  const cima = orden.slice(0, 3)
  const firma = cima.map((item) => `${item.id}:${item.puntaje}`).join('|')
  const [revelados, setRevelados] = useState(0)
  const [explosion, setExplosion] = useState(0)
  const reducido = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const ordenRevela = cima.length >= 3 ? [3, 2, 1] : cima.length === 2 ? [2, 1] : [1]

  const hayEmpate = orden.some((item, indice) => {
    const siguiente = orden[indice + 1]
    return Boolean(
      siguiente &&
        item.puntaje === siguiente.puntaje &&
        item.aciertos === siguiente.aciertos &&
        (item.tiempoMs ?? 0) === (siguiente.tiempoMs ?? 0),
    )
  })

  useEffect(() => {
    void audio.desbloquear()
    audio.efecto('fanfarria', 'podio-fanfarria')
    if (reducido) {
      setRevelados(ordenRevela.length)
      return
    }
    setRevelados(0)
    const timers = ordenRevela.map((lugar, indice) => {
      const delay = 350 + indice * 850
      return window.setTimeout(() => {
        setRevelados(indice + 1)
        if (lugar === 3) audio.efecto('podio-tercero', 'podio-3')
        else if (lugar === 2) audio.efecto('podio-segundo', 'podio-2')
        else {
          audio.efecto('podio-primero', 'podio-1')
          setExplosion((n) => n + 1)
        }
      }, delay)
    })
    return () => {
      for (const id of timers) window.clearTimeout(id)
    }
  }, [firma, reducido, ordenRevela.length])

  const mio = orden.find((item) => item.perfilId === perfilId)
  const puestoMio = mio ? orden.indexOf(mio) + 1 : null

  return (
    <div className="podio-bloque">
      <div className="podio-escenario">
        <Confeti modo="continuo" />
        {explosion > 0 ? <Confeti modo="explosion" rafagaId={explosion} /> : null}
        <ol className={`podio podio-n${cima.length}`} aria-label="Podio">
          {cima.map((participante, indice) => {
            const lugar = indice + 1
            const paso = ordenRevela.indexOf(lugar) + 1
            const mostrar = reducido || revelados >= paso
            return (
              <li
                className={`podio-puesto lugar-${lugar}${participante.perfilId === perfilId ? ' mio' : ''}${mostrar ? ' revelado' : ' oculto'}`}
                key={participante.id}
                aria-hidden={!mostrar}
              >
                <div className="podio-persona">
                  {lugar === 1 && mostrar ? (
                    <span className="podio-corona" aria-hidden="true">
                      <Crown size={28} />
                    </span>
                  ) : null}
                  <Avatar id={avatarVisible(participante.perfilId, participante.avatarId)} tamano={lugar === 1 ? 120 : 88} />
                  <strong>{participante.nombre}</strong>
                  <span>
                    {participante.puntaje} pts · {participante.aciertos} aciertos
                    {participante.tiempoMs ? ` · ${formatoSegundos(participante.tiempoMs)} s` : ''}
                  </span>
                </div>
                <div className="podio-base" aria-hidden="true">
                  {lugar}
                </div>
              </li>
            )
          })}
        </ol>
      </div>
      {puestoMio && mio && puestoMio > 3 ? (
        <article className="podio-tu-resultado" aria-live="polite">
          <p>
            Tu posición: <strong>#{puestoMio}</strong>
          </p>
          <p>
            {mio.puntaje} puntos · {mio.aciertos} aciertos
            {mio.tiempoMs ? ` · ${formatoSegundos(mio.tiempoMs)} s` : ''}
          </p>
        </article>
      ) : null}
      {hayEmpate ? (
        <p className="meta">Si empatan en puntos y en rapidez, el puesto lo define el nombre en orden alfabético.</p>
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
                {participante.tiempoMs ? ` · ${formatoSegundos(participante.tiempoMs)} s` : ''}
              </span>
            </li>
          ))}
        </ol>
      ) : null}
    </div>
  )
}
