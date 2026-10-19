import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { EstadoCarga, EstadoError } from '../componentes/Interfaz.tsx'
import { useServicios } from '../contexto/ProveedorServicios.tsx'
import { mensajeDe } from '../dominio/errores.ts'
import type { Cuestionario } from '../dominio/tipos.ts'

export function DetalleCuestionario() {
  const { id = '' } = useParams()
  const { actividades } = useServicios()
  const [cuestionario, setCuestionario] = useState<Cuestionario | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    let activo = true
    actividades
      .obtener(id)
      .then((dato) => {
        if (activo) setCuestionario(dato)
      })
      .catch((err: unknown) => {
        if (activo) setError(mensajeDe(err))
      })
      .finally(() => {
        if (activo) setCargando(false)
      })
    return () => {
      activo = false
    }
  }, [actividades, id])

  if (cargando) return <EstadoCarga />
  if (error && !cuestionario) return <EstadoError mensaje={error} />
  if (!cuestionario) return <EstadoError mensaje="No se encontró el cuestionario." />

  return (
    <article className="panel">
      {cuestionario.imagenUrl ? <img className="vista-imagen" src={cuestionario.imagenUrl} alt="" /> : null}
      <p className="insignia">Verdadero o falso</p>
      {cuestionario.esDemostracion ? <p className="etiqueta-demo">Datos de prueba</p> : null}
      <h1>{cuestionario.titulo}</h1>
      <p>{cuestionario.descripcion}</p>
      <p className="meta">
        {cuestionario.autorNombre} · {cuestionario.categoria} · {cuestionario.dificultad} · {cuestionario.preguntas.length}{' '}
        preguntas
      </p>
      <ol>
        {cuestionario.preguntas.map((pregunta) => (
          <li key={pregunta.id}>{pregunta.enunciado}</li>
        ))}
      </ol>
      <div className="acciones">
        <Link className="boton-fantasma" to="/descubrir">
          Volver
        </Link>
      </div>
    </article>
  )
}
