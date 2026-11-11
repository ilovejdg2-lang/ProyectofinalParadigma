import { Link } from 'react-router-dom'
import { useAutenticacion } from '../contexto/ProveedorAutenticacion.tsx'
import { primerNombre, saludoDelDia } from './cursoDatos.ts'
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

      <section className="panel-cursos-bloque" aria-labelledby="titulo-cursos">
        <h2 id="titulo-cursos">Tus Cursos</h2>
        <Link className="curso-portada-enlace" to="/cursos/paradigmas" aria-label="Paradigmas de Programación, actividades y materiales del curso">
          <PortadaCurso compacta />
        </Link>
      </section>
    </div>
  )
}
