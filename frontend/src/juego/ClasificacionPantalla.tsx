import { useLayoutEffect, useRef, useState } from 'react'
import type { Participante } from '../dominio/tipos.ts'
import { Avatar, avatarVisible } from './avatares.tsx'
import { formatoPuntos } from './puntuacion.ts'
import { mensajesDeRonda } from './ronda.ts'

export function ClasificacionPantalla({
  participantes,
  preguntaId,
  perfilId,
}: {
  participantes: Participante[]
  preguntaId: string
  perfilId?: string
}) {
  const reducido =
    typeof window !== 'undefined' && typeof window.matchMedia === 'function'
      ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
      : false
  const { actual, previo } = mensajesDeRonda(participantes, preguntaId, perfilId)
  const firma = `${preguntaId}:${actual.map((item) => `${item.id}:${item.puntaje}`).join('|')}`
  const [orden, setOrden] = useState(actual)
  const datos = useRef({ actual, previo })
  datos.current = { actual, previo }
  const nodos = useRef(new Map<string, HTMLLIElement>())
  const cajas = useRef(new Map<string, DOMRect>())

  useLayoutEffect(() => {
    const { actual: ahora, previo: antes } = datos.current
    if (reducido) {
      setOrden(ahora)
      return
    }
    setOrden(antes)
    const id = window.requestAnimationFrame(() => setOrden(datos.current.actual))
    return () => window.cancelAnimationFrame(id)
  }, [firma, reducido])

  useLayoutEffect(() => {
    const anteriores = cajas.current
    const siguientes = new Map<string, DOMRect>()
    for (const [id, nodo] of nodos.current) {
      const caja = nodo.getBoundingClientRect()
      siguientes.set(id, caja)
      const antes = anteriores.get(id)
      if (!antes || reducido) continue
      const delta = antes.top - caja.top
      if (Math.abs(delta) < 2) continue
      nodo.animate(
        [{ transform: `translateY(${delta}px)` }, { transform: 'translateY(0)' }],
        { duration: 560, easing: 'cubic-bezier(.2,.8,.2,1)' },
      )
    }
    cajas.current = siguientes
  }, [orden, reducido])

  return (
    <section className="clasificacion-pantalla" aria-label="Clasificación">
      <h2>
        <span aria-hidden="true">🏆 </span>Clasificación
      </h2>
      <ol>
        {orden.map((participante) => {
          const puesto = actual.findIndex((item) => item.id === participante.id)
          const antes = previo.findIndex((item) => item.id === participante.id)
          const delta = antes - puesto
          return (
            <li
              className={`puesto-juego lugar-${Math.min(puesto + 1, 4)}${participante.perfilId === perfilId ? ' mio' : ''}`}
              key={participante.id}
              ref={(nodo) => {
                if (nodo) nodos.current.set(participante.id, nodo)
                else nodos.current.delete(participante.id)
              }}
            >
              <span className="puesto-numero">{puesto + 1}</span>
              <Avatar id={avatarVisible(participante.perfilId, participante.avatarId)} tamano={52} />
              <strong>{participante.nombre}</strong>
              <span className="puesto-puntos">{formatoPuntos(participante.puntaje)} pts</span>
              <span className={`puesto-delta${delta > 0 ? ' sube' : delta < 0 ? ' baja' : ''}`}>
                {delta > 0 ? `▲ ${delta}` : delta < 0 ? `▼ ${Math.abs(delta)}` : '—'}
              </span>
            </li>
          )
        })}
      </ol>
    </section>
  )
}
