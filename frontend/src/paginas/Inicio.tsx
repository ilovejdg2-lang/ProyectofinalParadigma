import { Link } from 'react-router-dom'
import { useAutenticacion } from '../contexto/ProveedorAutenticacion.tsx'

export function Inicio() {
  const { perfil } = useAutenticacion()
  const esDocente = perfil?.rol === 'teacher' || perfil?.rol === 'admin'

  return (
    <>
      <section className="banner">
        <h1>Evaluaciones en vivo</h1>
        <p>
          Hola, {perfil?.nombre}. {esDocente
            ? 'Descubre un cuestionario, ábrelo en una sala y dirige la sesión interactiva con el grupo.'
            : 'Explora cuestionarios para estudiar o ingresa a una sala en vivo con el código de tu profesor.'}
        </p>
      </section>
      <div className="rejilla">
        <article className="panel tarjeta-inicio acento-azul">
          <h2>Descubrir</h2>
          <p className="meta">Explora cuestionarios de la clase y prepárate para las evaluaciones.</p>
          <Link className="boton" to="/descubrir">
            Ver catálogo
          </Link>
        </article>

        {esDocente ? (
          <article className="panel tarjeta-inicio acento-naranja">
            <h2>Crear</h2>
            <p className="meta">Arma preguntas de verdadero o falso y adjunta una imagen si la necesitas.</p>
            <Link className="boton" to="/cuestionarios/nuevo">
              Nuevo cuestionario
            </Link>
          </article>
        ) : (
          <article className="panel tarjeta-inicio acento-naranja">
            <h2>Mi Historial</h2>
            <p className="meta">Consulta tus resultados y puntuaciones de partidas anteriores.</p>
            <Link className="boton" to="/historial">
              Ver resultados
            </Link>
          </article>
        )}

        <article className="panel tarjeta-inicio acento-verde">
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
