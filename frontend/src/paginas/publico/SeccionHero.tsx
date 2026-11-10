import { RedParticulas } from './RedParticulas.tsx'
import { TarjetaAsistente } from './TarjetaAsistente.tsx'

function desplazar(id: string) {
  const nodo = document.getElementById(id)
  if (!nodo) return
  const reduce = typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  nodo.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' })
}

export function SeccionHero() {
  return (
    <section className="landing-portada" aria-labelledby="titulo-hero">
      <RedParticulas />
      <div className="landing-hero">
        <div className="landing-hero-copia">
          <h1 id="titulo-hero" className="landing-titulo">
            <span className="linea">Sabemos lo difícil que es</span>
            <span className="linea acento">administrar tu academia</span>
            <span className="linea">con herramientas que no</span>
            <span className="linea">se hablan entre sí</span>
          </h1>
          <p className="landing-bajada">
            Asistencia por un lado, actividades por otro, pagos en una hoja aparte. Tu equipo merece{' '}
            <strong>control académico</strong>, <strong>seguimiento operativo</strong> y{' '}
            <strong>visibilidad de pagos en un solo lugar</strong>.
          </p>
          <div className="landing-ctas">
            <button className="landing-primario" type="button" onClick={() => desplazar('registro')}>
              Quiero ProfeLink para mi academia <span className="flecha">→</span>
            </button>
            <button className="landing-secundario" type="button" onClick={() => desplazar('como-funciona')}>
              Ver Cómo Funciona
            </button>
          </div>
        </div>
        <TarjetaAsistente />
      </div>
    </section>
  )
}
