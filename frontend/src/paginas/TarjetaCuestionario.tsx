import { Link } from 'react-router-dom'
import { acentoDeDificultad, etiquetaDificultad } from '../dominio/filtros.ts'
import type { Cuestionario } from '../dominio/tipos.ts'

export function TarjetaCuestionario({ cuestionario }: { cuestionario: Cuestionario }) {
  return (
    <Link className={`descubrimiento acento-${acentoDeDificultad(cuestionario.dificultad)}`} to={`/cuestionarios/${cuestionario.id}`}>
      <div
        className="descubrimiento-portada"
        style={{ backgroundImage: cuestionario.imagenUrl ? `url("${cuestionario.imagenUrl.replaceAll('"', '')}")` : undefined }}
      >
        <span className="conjunto-cuenta">
          {cuestionario.preguntas.length} {cuestionario.preguntas.length === 1 ? 'pregunta' : 'preguntas'}
        </span>
      </div>
      <div className="descubrimiento-cuerpo">
        {cuestionario.esDemostracion ? <span className="etiqueta-demo">Datos de prueba</span> : null}
        <h2>{cuestionario.titulo}</h2>
        <p>
          <span className="nivel">{etiquetaDificultad(cuestionario.dificultad)}</span> · {cuestionario.autorNombre}
        </p>
      </div>
    </Link>
  )
}
