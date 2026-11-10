import { Link } from 'react-router-dom'
import { Buho } from '../../componentes/Buho.tsx'

const soporte = [
  { to: '/contacto', etiqueta: 'Contacto' },
  { to: '/ayuda', etiqueta: 'Ayuda' },
  { to: '/documentacion', etiqueta: 'Documentación' },
]

const legal = [
  { to: '/privacidad', etiqueta: 'Privacidad' },
  { to: '/terminos', etiqueta: 'Términos' },
]

export function PieLanding() {
  return (
    <footer className="landing-pie">
      <div className="landing-pie-grid">
        <div className="landing-pie-marca">
          <div className="landing-pie-identidad">
            <span className="landing-logo">
              <Buho tamano={64} />
            </span>
            <div>
              <strong>ProfeLink</strong>
              <small>Gestión Académica</small>
            </div>
          </div>
          <p>Control académico y administrativo en un solo lugar.</p>
        </div>
        <nav aria-label="Soporte">
          <strong>Soporte</strong>
          <ul>
            {soporte.map((enlace) => (
              <li key={enlace.to}>
                <Link to={enlace.to}>
                  {enlace.to === '/contacto' ? <IconoSobre /> : null}
                  {enlace.etiqueta}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <nav aria-label="Legal">
          <strong>Legal</strong>
          <ul>
            {legal.map((enlace) => (
              <li key={enlace.to}>
                <Link to={enlace.to}>{enlace.etiqueta}</Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
      <p className="landing-copy">© 2026 ProfeLink. Todos los derechos reservados.</p>
    </footer>
  )
}

function IconoSobre() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="3.5" y="6" width="17" height="12" rx="2" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <path d="m4 7 8 6 8-6" fill="none" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  )
}
