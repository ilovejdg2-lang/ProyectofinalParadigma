import { Link } from 'react-router-dom'
import type { Cuestionario } from '../dominio/tipos.ts'

export function TarjetaCuestionario({ cuestionario }: { cuestionario: Cuestionario }) {
  return (
    <article className="tarjeta">
      <div className="portada" style={{ backgroundImage: cuestionario.imagenUrl ? `url(${cuestionario.imagenUrl})` : undefined }}>
        <span className="insignia">{cuestionario.preguntas.length} preguntas</span>
      </div>
      <div className="cuerpo-tarjeta">
        <span className="insignia">Verdadero o falso</span>
        {cuestionario.esDemostracion ? <span className="etiqueta-demo">Datos de prueba</span> : null}
        <h2>{cuestionario.titulo}</h2>
        <p>{cuestionario.descripcion}</p>
        <p className="meta">
          {cuestionario.autorNombre} · {cuestionario.categoria} · {cuestionario.dificultad}
        </p>
        <div className="acciones">
          <Link className="boton-fantasma" to={`/cuestionarios/${cuestionario.id}`}>
            Ver detalles
          </Link>
          <Link className="boton" to={`/cuestionarios/${cuestionario.id}`}>
            Seleccionar
          </Link>
        </div>
      </div>
    </article>
  )
}
