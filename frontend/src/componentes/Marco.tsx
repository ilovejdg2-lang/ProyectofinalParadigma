import { useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { Buho } from './Buho.tsx'
import { useAutenticacion } from '../contexto/ProveedorAutenticacion.tsx'
import { useServicios } from '../contexto/ProveedorServicios.tsx'

const enlaces = [
  { to: '/', etiqueta: 'Inicio', fin: true },
  { to: '/descubrir', etiqueta: 'Descubrir' },
  { to: '/mis-cuestionarios', etiqueta: 'Mis cuestionarios' },
  { to: '/cuestionarios/nuevo', etiqueta: 'Crear cuestionario' },
  { to: '/unirse', etiqueta: 'Unirse a una partida' },
  { to: '/perfil', etiqueta: 'Perfil' },
]

export function Marco() {
  const { perfil, salir } = useAutenticacion()
  const { simulacion } = useServicios()
  const [abierta, setAbierta] = useState(false)
  const inicial = perfil?.nombre.slice(0, 1).toUpperCase() ?? 'P'

  return (
    <div className="aplicacion">
      <aside className={abierta ? 'barra abierta' : 'barra'}>
        <div className="marca">
          <span className="marca-icono">
            <Buho tamano={28} />
          </span>
          ProfeLink
        </div>
        <nav className="grupo-nav" aria-label="Principal">
          <p>JUEGO</p>
          {enlaces.map((enlace) => (
            <NavLink
              key={enlace.to}
              to={enlace.to}
              end={enlace.fin}
              className={({ isActive }) => (isActive ? 'enlace activo' : 'enlace')}
              onClick={() => setAbierta(false)}
            >
              {enlace.etiqueta}
            </NavLink>
          ))}
        </nav>
        <div className="usuario-barra">
          <span className="avatar" aria-hidden="true">
            {inicial}
          </span>
          <div>
            <strong>{perfil?.nombre}</strong>
            <small>{perfil?.correo}</small>
          </div>
        </div>
        <button className="boton-fantasma" type="button" onClick={() => void salir()}>
          Cerrar sesión
        </button>
      </aside>
      <main className="contenido">
        <button className="boton menu-movil" type="button" onClick={() => setAbierta((valor) => !valor)}>
          Menú
        </button>
        {simulacion ? (
          <p className="aviso">
            Los servicios de autenticación, actividades y tiempo real todavía se simulan en este navegador. La
            interfaz no está conectada a las API del equipo.
          </p>
        ) : null}
        <Outlet />
      </main>
    </div>
  )
}
