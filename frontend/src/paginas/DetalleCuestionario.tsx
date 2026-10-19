import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { EstadoCarga, EstadoError } from '../componentes/Interfaz.tsx'
import { useAutenticacion } from '../contexto/ProveedorAutenticacion.tsx'
import { useServicios } from '../contexto/ProveedorServicios.tsx'
import { mensajeDe } from '../dominio/errores.ts'
import type { Cuestionario } from '../dominio/tipos.ts'

export function DetalleCuestionario() {
  const { id = '' } = useParams()
  const { actividades, sala } = useServicios()
  const { token, perfil } = useAutenticacion()
  const navegar = useNavigate()
  const [cuestionario, setCuestionario] = useState<Cuestionario | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [cargando, setCargando] = useState(true)
  const [abriendo, setAbriendo] = useState(false)

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

  async function iniciar() {
    if (!token) return
    setAbriendo(true)
    try {
      const creada = await sala.crear(token, id)
      navegar(`/sala/${creada.codigo}`)
    } catch (err) {
      setError(mensajeDe(err))
    } finally {
      setAbriendo(false)
    }
  }

  if (cargando) return <EstadoCarga />
  if (error && !cuestionario) return <EstadoError mensaje={error} />
  if (!cuestionario) return <EstadoError mensaje="No se encontró el cuestionario." />
  const propio = perfil?.id === cuestionario.autorId

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
      {error ? <p className="error-texto">{error}</p> : null}
      <div className="acciones">
        <button className="boton" type="button" onClick={() => void iniciar()} disabled={abriendo}>
          Iniciar partida
        </button>
        {propio ? (
          <Link className="boton-fantasma" to={`/cuestionarios/${cuestionario.id}/editar`}>
            Editar
          </Link>
        ) : null}
        <Link className="boton-fantasma" to="/descubrir">
          Volver
        </Link>
      </div>
    </article>
  )
}
