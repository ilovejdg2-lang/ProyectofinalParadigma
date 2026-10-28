import { useEffect, useState } from 'react'
import { flushSync } from 'react-dom'
import { NavLink, Outlet } from 'react-router-dom'
import { Buho } from './Buho.tsx'
import { ReporteProblema } from './ReporteProblema.tsx'
import { useAutenticacion } from '../contexto/ProveedorAutenticacion.tsx'
import { useServicios } from '../contexto/ProveedorServicios.tsx'

const curso = [
  { to: '/', etiqueta: 'Vista general', detalle: 'Evaluaciones en vivo', fin: true, icono: 'inicio' },
  { to: '/descubrir', etiqueta: 'Descubrir', detalle: 'Catálogo de cuestionarios', icono: 'buscar' },
  { to: '/mis-cuestionarios', etiqueta: 'Mis cuestionarios', detalle: 'Los que creaste', icono: 'lista' },
  { to: '/cuestionarios/nuevo', etiqueta: 'Crear cuestionario', detalle: 'Verdadero o falso', icono: 'mas' },
  { to: '/unirse', etiqueta: 'Unirse a una partida', detalle: 'Entrar con el código', icono: 'puerta' },
]

const progreso = [
  { to: '/historial', etiqueta: 'Historial', detalle: 'Partidas terminadas', icono: 'reloj' },
  { to: '/perfil', etiqueta: 'Perfil', detalle: 'Tu sesión actual', icono: 'persona' },
]

export function Marco() {
  const { perfil, salir } = useAutenticacion()
  const { simulacion } = useServicios()
  const [abierta, setAbierta] = useState(false)
  const [contraida, setContraida] = useState(false)
  const [claro, setClaro] = useState(() => localStorage.getItem('profelink.tema') === 'claro')
  const [reporte, setReporte] = useState(false)
  const inicial = perfil?.nombre.slice(0, 1).toUpperCase() ?? 'M'

  useEffect(() => {
    document.documentElement.dataset.tema = claro ? 'claro' : 'oscuro'
    localStorage.setItem('profelink.tema', claro ? 'claro' : 'oscuro')
  }, [claro])

  function cambiarTema() {
    const aplicar = () => {
      flushSync(() => setClaro((valor) => !valor))
    }
    if (typeof document.startViewTransition === 'function') document.startViewTransition(aplicar)
    else aplicar()
  }

  const esDocente = perfil?.rol === 'teacher' || perfil?.rol === 'admin'
  const rolEtiqueta = perfil?.rol === 'admin' ? 'Administrador' : esDocente ? 'Docente' : 'Estudiante'
  const enlacesCurso = curso.filter((enlace) => {
    if (!esDocente && (enlace.to === '/mis-cuestionarios' || enlace.to === '/cuestionarios/nuevo')) {
      return false
    }
    return true
  })

  return (
    <div className={`aplicacion${contraida ? ' contraida' : ''}${claro ? ' claro' : ''}`}>
      <header className="cabecera">
        <button className="cabecera-menu" type="button" aria-expanded={abierta} onClick={() => setAbierta((valor) => !valor)}>
          Menú
        </button>
        <div className="cabecera-marca">
          <span className="marca-icono">
            <Buho tamano={36} />
          </span>
          <strong>ProfeLink</strong>
        </div>
        <div className="cabecera-acciones">
          <span
            className="insignia-rol"
            style={{
              padding: '0.25rem 0.65rem',
              borderRadius: '9999px',
              fontSize: '0.75rem',
              fontWeight: 700,
              background: esDocente ? 'rgba(56, 189, 248, 0.15)' : 'rgba(52, 211, 153, 0.15)',
              color: esDocente ? '#38bdf8' : '#34d399',
              border: `1px solid ${esDocente ? 'rgba(56, 189, 248, 0.4)' : 'rgba(52, 211, 153, 0.4)'}`,
              display: 'inline-flex',
              alignItems: 'center',
            }}
          >
            {rolEtiqueta}
          </span>
          <button className="cabecera-icono" type="button" aria-label="Reportar un problema" onClick={() => setReporte(true)}>
            <Icono nombre="depurar" />
          </button>
          <button className="cabecera-icono" type="button" aria-label="Apariencia" aria-pressed={claro} onClick={cambiarTema}>
            <Icono nombre="tema" />
          </button>
          <NavLink className="avatar cabecera-avatar" to="/perfil" aria-label="Perfil" onClick={() => setAbierta(false)}>
            {inicial}
          </NavLink>
        </div>
      </header>
      <aside className={abierta ? 'barra abierta' : 'barra'}>
        <div className="curso-cabeza">
          <NavLink className="curso-casa" to="/" aria-label="Inicio" onClick={() => setAbierta(false)}>
            <Icono nombre="casa" />
          </NavLink>
          <div className="curso-textos">
            <strong>Paradigmas de Programación</strong>
            <small>{rolEtiqueta}</small>
          </div>
          <button
            className="curso-contraer"
            type="button"
            aria-label={contraida ? 'Expandir panel' : 'Contraer panel'}
            onClick={() => setContraida((valor) => !valor)}
          >
            <Icono nombre="chevron" />
          </button>
        </div>
        <nav className="grupo-nav" aria-label="Principal">
          <p>CURSO</p>
          {enlacesCurso.map((enlace) => (
            <NavLink
              key={enlace.to}
              to={enlace.to}
              end={enlace.fin}
              className={({ isActive }) => (isActive ? 'enlace activo' : 'enlace')}
              onClick={() => setAbierta(false)}
            >
              <Icono nombre={enlace.icono} />
              <span>{enlace.etiqueta}</span>
              <small>{enlace.detalle}</small>
            </NavLink>
          ))}
          <hr />
          <p>MI PROGRESO</p>
          {progreso.map((enlace) => (
            <NavLink
              key={enlace.to}
              to={enlace.to}
              className={({ isActive }) => (isActive ? 'enlace activo' : 'enlace')}
              onClick={() => setAbierta(false)}
            >
              <Icono nombre={enlace.icono} />
              <span>{enlace.etiqueta}</span>
              <small>{enlace.detalle}</small>
            </NavLink>
          ))}
        </nav>
        <button className="cerrar-sesion" type="button" onClick={() => void salir()}>
          Cerrar sesión
        </button>
      </aside>
      {abierta ? (
        <button className="cortina" type="button" aria-label="Cerrar menú" onClick={() => setAbierta(false)} />
      ) : null}
      <main className="contenido">
        {simulacion ? (
          <p className="aviso">
            Los servicios de autenticación, actividades y tiempo real todavía se simulan en este navegador. La
            interfaz no está conectada a las API del equipo.
          </p>
        ) : null}
        <Outlet />
      </main>
      <ReporteProblema abierto={reporte} onCerrar={() => setReporte(false)} />
    </div>
  )
}

function Icono({ nombre }: { nombre: string }) {
  const trazo = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }
  return (
    <svg className="icono-nav" viewBox="0 0 24 24" aria-hidden="true">
      {nombre === 'casa' ? <path {...trazo} d="M4 11l8-7 8 7v8a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1z" /> : null}
      {nombre === 'inicio' ? <path {...trazo} d="M5 5h9a2 2 0 0 1 2 2v12H7a2 2 0 0 1-2-2zM8 9h5M8 13h5" /> : null}
      {nombre === 'buscar' ? (
        <>
          <circle {...trazo} cx="11" cy="11" r="6" />
          <path {...trazo} d="M16 16l4 4" />
        </>
      ) : null}
      {nombre === 'lista' ? <path {...trazo} d="M8 7h11M8 12h11M8 17h11M5 7h.01M5 12h.01M5 17h.01" /> : null}
      {nombre === 'mas' ? <path {...trazo} d="M12 5v14M5 12h14" /> : null}
      {nombre === 'puerta' ? <path {...trazo} d="M5 20V6a1 1 0 0 1 1-1h8v16H6a1 1 0 0 1-1-1zM14 12h.01M16 8l3 2v10" /> : null}
      {nombre === 'reloj' ? (
        <>
          <circle {...trazo} cx="12" cy="12" r="7" />
          <path {...trazo} d="M12 9v4l2 2" />
        </>
      ) : null}
      {nombre === 'persona' ? (
        <>
          <circle {...trazo} cx="12" cy="9" r="3" />
          <path {...trazo} d="M6 19c1.5-3 3.5-4 6-4s4.5 1 6 4" />
        </>
      ) : null}
      {nombre === 'chevron' ? <path {...trazo} d="M14 6l-6 6 6 6" /> : null}
      {nombre === 'depurar' ? (
        <>
          <circle {...trazo} cx="12" cy="13" r="5" />
          <path {...trazo} d="M12 8V5M9 3h6M5 13H3M21 13h-2M7 18l-2 2M17 18l2 2" />
        </>
      ) : null}
      {nombre === 'tema' ? (
        <>
          <circle {...trazo} cx="12" cy="12" r="4" />
          <path {...trazo} d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5L19 19M19 5l-1.5 1.5M6.5 17.5L5 19" />
        </>
      ) : null}
    </svg>
  )
}
