import { Link } from 'react-router-dom'
import { Buho } from '../../componentes/Buho.tsx'
import type { Tema } from '../../tema.ts'

export function CabeceraLanding({ tema, onAlternar }: { tema: Tema; onAlternar: () => void }) {
  return (
    <header className="landing-cabecera">
      <Link className="landing-marca" to="/" aria-label="ProfeLink, inicio">
        <span className="landing-logo">
          <Buho tamano={64} />
        </span>
        <span className="landing-nombre">
          <strong>ProfeLink</strong>
          <small>Plataforma para Academias Educativas</small>
        </span>
      </Link>
      <div className="landing-acciones">
        <button
          className="landing-tema"
          type="button"
          aria-label={tema === 'oscuro' ? 'Activar modo claro' : 'Activar modo oscuro'}
          onClick={onAlternar}
        >
          {tema === 'oscuro' ? <IconoSol /> : <IconoLuna />}
        </button>
        <Link className="landing-entrar" to="/iniciar-sesion">
          Iniciar Sesión
        </Link>
      </div>
    </header>
  )
}

function IconoSol() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="3.2" fill="none" stroke="currentColor" strokeWidth="1.7" />
      <path
        d="M12 3.5v1.8M12 18.7v1.8M3.5 12h1.8M18.7 12h1.8M6 6l1.3 1.3M16.7 16.7 18 18M18 6l-1.3 1.3M7.3 16.7 6 18"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  )
}

function IconoLuna() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M15.5 3.8a7.8 7.8 0 1 0 4.7 13.6A8.2 8.2 0 0 1 15.5 3.8z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
    </svg>
  )
}
