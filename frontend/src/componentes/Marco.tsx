import { NavLink, Outlet } from 'react-router-dom'
import { Buho } from './Buho.tsx'

export function Marco() {
  return (
    <div className="aplicacion">
      <aside className="barra">
        <div className="marca">
          <span className="marca-icono">
            <Buho tamano={28} />
          </span>
          ProfeLink
        </div>
        <nav className="grupo-nav" aria-label="Principal">
          <p>JUEGO</p>
          <NavLink to="/" end className={({ isActive }) => (isActive ? 'enlace activo' : 'enlace')}>
            Inicio
          </NavLink>
        </nav>
      </aside>
      <main className="contenido">
        <Outlet />
      </main>
    </div>
  )
}
