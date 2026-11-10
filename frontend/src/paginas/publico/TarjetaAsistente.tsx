import { useRef, type PointerEvent } from 'react'

function prefiereQuieto() {
  return typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

export function TarjetaAsistente() {
  const escena = useRef<HTMLDivElement>(null)

  function inclinar(evento: PointerEvent<HTMLElement>) {
    if (prefiereQuieto()) return
    const rect = evento.currentTarget.getBoundingClientRect()
    const horizontal = (evento.clientX - rect.left) / rect.width - 0.5
    const vertical = (evento.clientY - rect.top) / rect.height - 0.5
    if (!escena.current) return
    escena.current.style.transform = `perspective(980px) rotateX(${(-vertical * 8).toFixed(2)}deg) rotateY(${(horizontal * 10).toFixed(2)}deg)`
  }

  function reposar() {
    if (escena.current) escena.current.style.transform = ''
  }

  return (
    <aside
      className="asistente"
      aria-label="Link, asistente de gestión académica"
      onPointerMove={inclinar}
      onPointerLeave={reposar}
    >
      <div className="asistente-escena" ref={escena}>
        <div className="widget-barras" aria-hidden="true">
          <i className="grafico-barra roja" />
          <i className="grafico-barra verde" />
          <i className="grafico-barra azul" />
        </div>
        <div className="asistente-tarjeta">
          <div className="orbita">
            <span className="anillo-punteado" />
            <span className="anillo-solido" />
            <span className="circulo-buho">
              <img src="/buho.png" alt="Búho Link con lentes y un bombillo" width={280} height={280} />
            </span>
            <span className="punto-verde" />
          </div>
          <div className="burbuja">
            <span className="burbuja-pico" aria-hidden="true" />
            <strong>
              ¡Hola! Soy <span>Link</span>
            </strong>
            <p>Tu asistente de gestión académica</p>
            <p className="burbuja-cita">“Tu academia merece una plataforma pensada para su operación real”</p>
          </div>
        </div>
        <div className="widget-ok" aria-hidden="true">
          <svg viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="1.8" />
            <path d="M8 12.2 10.8 15 16 9.2" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </div>
    </aside>
  )
}
