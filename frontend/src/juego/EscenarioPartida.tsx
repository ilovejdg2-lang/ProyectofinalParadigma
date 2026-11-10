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
  children,
  pie,
}: {
  fase: string
  preguntaActual: number
  total: number
  paisaje: Paisaje
  tension: boolean
  children: ReactNode
  pie?: ReactNode
}) {
  const ref = useRef<HTMLElement>(null)
  const { activa, alternar } = usePantallaCompleta(ref)

  useEffect(() => {
    audio.ambiente(paisaje, tension)
  }, [paisaje, tension])

  return (
    <section className="escenario-partida" ref={ref}>
      <FondoJuego />
      <header className="escenario-barra">
        <p className="escenario-fase">
          Pregunta {Math.min(total, preguntaActual + 1)} de {total}
        </p>
        <div className="escenario-progreso" aria-hidden="true">
          {Array.from({ length: total }, (_, indice) => (
            <span className={indice < preguntaActual ? 'hecha' : indice === preguntaActual ? 'actual' : ''} key={indice} />
          ))}
        </div>
        <p className="escenario-etiqueta">{fase}</p>
        <div className="escenario-utiles">
          <ControlesAudio paisaje={paisaje} tension={tension} />
          <button className="boton-fantasma" type="button" onClick={() => void alternar()}>
            {activa ? 'Salir de pantalla completa' : 'Pantalla completa'}
          </button>
        </div>
      </header>
      <div className="escenario-cuerpo">{children}</div>
      {pie ? <footer className="escenario-pie">{pie}</footer> : null}
    </section>
  )
}
