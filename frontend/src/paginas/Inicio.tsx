import { Link } from 'react-router-dom'
import { useAutenticacion } from '../contexto/ProveedorAutenticacion.tsx'

export function Inicio() {
  const { perfil } = useAutenticacion()
  return (
    <>
      <section className="banner">
        <h1>Evaluaciones en vivo</h1>
        <p>
          Hola, {perfil?.nombre}. Descubre un cuestionario, ábrelo en una sala y juega verdadero o falso con el grupo.
        </p>
      </section>
      <div className="rejilla">
        <article className="panel">
          <h2>Descubrir</h2>
          <p className="meta">Explora cuestionarios de la clase y elige uno para jugar.</p>
          <Link className="boton" to="/descubrir">
            Ver catálogo
          </Link>
        </article>
        <article className="panel">
          <h2>Crear</h2>
          <p className="meta">Arma preguntas de verdadero o falso y adjunta una imagen si la necesitas.</p>
          <Link className="boton" to="/cuestionarios/nuevo">
            Nuevo cuestionario
          </Link>
        </article>
        <article className="panel">
          <h2>Unirse</h2>
          <p className="meta">Entra con el código que comparte el anfitrión. Tu nombre ya viene del perfil.</p>
          <Link className="boton" to="/unirse">
            Ir a la sala
          </Link>
        </article>
      </div>
    </>
  )
}
