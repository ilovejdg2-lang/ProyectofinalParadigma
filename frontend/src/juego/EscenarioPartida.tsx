import { useEffect, useRef, type ReactNode } from 'react'
import { ControlesAudio } from './ControlesAudio.tsx'
import { FondoJuego } from './FondoJuego.tsx'
import type { Paisaje } from './ronda.ts'
import { audio } from './audio.ts'
import { usePantallaCompleta } from './usePantallaCompleta.ts'

export function EscenarioPartida({
  fase,
  preguntaActual,
  total,
  paisaje,
  tension,
  codigo,
  anfitrion,
  children,
  pie,
}: {
  fase: string
  preguntaActual: number
  total: number
  paisaje: Paisaje
  tension: boolean
  codigo?: string
  anfitrion?: string
  children: ReactNode
  pie?: ReactNode
}) {
  const ref = useRef<HTMLElement>(null)
  const preguntaPrev = useRef<number | null>(null)
  const { activa, alternar } = usePantallaCompleta(ref)

  useEffect(() => {
    if (preguntaPrev.current === null) {
      preguntaPrev.current = preguntaActual
      return
    }
    if (preguntaPrev.current !== preguntaActual && fase === 'Pregunta') {
      audio.efecto('transicion', `transicion-${preguntaActual}`)
    }
    preguntaPrev.current = preguntaActual
  }, [preguntaActual, fase])

  useEffect(() => () => audio.liberar(), [])

  const enPodio = fase === 'Podio'

  return (
    <section className={`escenario-partida${enPodio ? ' en-podio' : ''}`} ref={ref}>
      <FondoJuego />
      <header className="escenario-barra">
        <div className="escenario-meta">
          <p className="escenario-fase">
            {enPodio ? 'Partida terminada' : `Pregunta ${Math.min(total, preguntaActual + 1)} de ${total}`}
          </p>
          {!enPodio ? <p className="escenario-etiqueta">{fase}</p> : null}
          {codigo ? (
            <p className="escenario-codigo" data-testid="codigo-sala">
              {anfitrion ? <span>{anfitrion}</span> : null}
              <strong>{codigo}</strong>
            </p>
          ) : null}
        </div>
        {!enPodio ? (
          <div className="escenario-progreso" aria-hidden="true">
            {Array.from({ length: total }, (_, indice) => (
              <span className={indice < preguntaActual ? 'hecha' : indice === preguntaActual ? 'actual' : ''} key={indice} />
            ))}
          </div>
        ) : null}
        <div className="escenario-utiles">
          <ControlesAudio paisaje={paisaje} tension={tension} />
          <button className="boton-fantasma" type="button" onClick={() => void alternar()}>
            {activa ? 'Salir de pantalla completa' : 'Pantalla completa'}
          </button>
        </div>
      </header>
      <div className={`escenario-cuerpo${fase === 'Pregunta' ? ' entra-pregunta' : ''}`} key={`${fase}-${preguntaActual}`}>
        {children}
      </div>
      {pie ? <footer className="escenario-pie">{pie}</footer> : null}
    </section>
  )
}
