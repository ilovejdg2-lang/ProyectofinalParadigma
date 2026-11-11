import { Link } from 'react-router-dom'
import { Particulas } from '../componentes/Particulas.tsx'
import { useAutenticacion } from '../contexto/ProveedorAutenticacion.tsx'

export function Inicio() {
  const { perfil } = useAutenticacion()
  const esDocente = perfil?.rol === 'teacher' || perfil?.rol === 'admin'

  return (
    <>
      <section className="banner">
        <Particulas />
        <h1>Evaluaciones en vivo</h1>
        <p>
          Hola, {perfil?.nombre}. {esDocente
            ? 'Descubre un cuestionario, ábrelo en una sala y dirige la sesión interactiva con el grupo.'
            : 'Puedes crear un cuestionario y abrir una sala. Esa partida es solo un juego y no cuenta en ningún curso.'}
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

        <article className="panel tarjeta-inicio acento-naranja">
          <h2>Crear</h2>
          <p className="meta">
            {esDocente
              ? 'Arma preguntas de verdadero o falso, o con varias respuestas, y adjunta una imagen si la necesitas.'
              : 'Arma tu cuestionario y ábrelo en una sala. Queda como juego: no genera nota de curso.'}
          </p>
          <Link className="boton" to="/cuestionarios/nuevo">
            Nuevo cuestionario
          </Link>
        </article>

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
