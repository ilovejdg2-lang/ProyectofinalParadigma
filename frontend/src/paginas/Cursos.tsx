import { Link } from 'react-router-dom'
import { useAutenticacion } from '../contexto/ProveedorAutenticacion.tsx'
import { ACTIVIDAD_SIGUIENTE, primerNombre, saludoDelDia } from './cursoDatos.ts'
import { PortadaCurso } from './PortadaCurso.tsx'

export function Cursos() {
  const { perfil } = useAutenticacion()
  const nombre = primerNombre(perfil?.nombre)

  return (
    <div className="panel-cursos">
      <header className="panel-cursos-saludo">
        <h1>
          {saludoDelDia()}, <span>{nombre}</span>!
        </h1>
        <p>Aquí tienes un resumen de tus cursos y las actividades más importantes para hoy.</p>
      </header>

      <section className="panel-cursos-bloque" aria-labelledby="titulo-sigue">
        <h2 id="titulo-sigue">¿Qué sigue?</h2>
        <article className="sigue-tarjeta">
          <span className="sigue-icono" aria-hidden="true">
            <IconoReloj />
          </span>
          <div className="sigue-texto">
            <strong>{ACTIVIDAD_SIGUIENTE.titulo}</strong>
            <span>{ACTIVIDAD_SIGUIENTE.curso}</span>
            <small>{ACTIVIDAD_SIGUIENTE.aviso}</small>
            <div className="sigue-pildoras">
              <span className="pildora azul">{ACTIVIDAD_SIGUIENTE.vence}</span>
              <span className="pildora verde">{ACTIVIDAD_SIGUIENTE.valor}</span>
            </div>
          </div>
          <Link className="boton sigue-accion" to="/cursos/paradigmas#proyecto-final">
            Ver Actividad →
          </Link>
        </article>
      </section>

      <section className="panel-cursos-bloque" aria-labelledby="titulo-cursos">
        <h2 id="titulo-cursos">Tus Cursos</h2>
        <Link className="curso-portada-enlace" to="/cursos/paradigmas" aria-label="Paradigmas de Programación, actividades y materiales del curso">
          <PortadaCurso compacta />
        </Link>
      </section>
    </div>
  )
}

function IconoReloj() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <path d="M12 8v5l3 2" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}
