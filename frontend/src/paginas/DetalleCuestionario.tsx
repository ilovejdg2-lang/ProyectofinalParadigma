import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { EstadoCarga, EstadoError } from '../componentes/Interfaz.tsx'
import { useAutenticacion } from '../contexto/ProveedorAutenticacion.tsx'
import { useServicios } from '../contexto/ProveedorServicios.tsx'
import { mensajeDe } from '../dominio/errores.ts'
import { acentoDeDificultad, etiquetaDificultad } from '../dominio/filtros.ts'
import type { Cuestionario } from '../dominio/tipos.ts'

export function DetalleCuestionario() {
  const { id = '' } = useParams()
  const { actividades, sala } = useServicios()
  const { token, perfil } = useAutenticacion()
  const esDocente = perfil?.rol === 'teacher' || perfil?.rol === 'admin'
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

  return (
    <div className={`descubrir-detalle acento-${acentoDeDificultad(cuestionario.dificultad)}`}>
      <aside className="descubrir-ficha">
        <div
          className="descubrimiento-portada"
          style={{ backgroundImage: cuestionario.imagenUrl ? `url("${cuestionario.imagenUrl.replaceAll('"', '')}")` : undefined }}
        >
          <span className="conjunto-cuenta">
            {cuestionario.preguntas.length} {cuestionario.preguntas.length === 1 ? 'pregunta' : 'preguntas'}
          </span>
        </div>
        <h1>{cuestionario.titulo}</h1>
        <p className="meta">{cuestionario.autorNombre}</p>
        <p>
          <span className="nivel">{etiquetaDificultad(cuestionario.dificultad)}</span> · {cuestionario.categoria}
        </p>
        {cuestionario.esDemostracion ? <p className="etiqueta-demo">Datos de prueba</p> : null}
        <p>{cuestionario.descripcion || 'Este cuestionario no tiene descripción.'}</p>
        {error ? <p className="error-texto">{error}</p> : null}
        {esDocente ? (
          <button className="conjunto-anfitrion" type="button" onClick={() => void iniciar()} disabled={abriendo}>
            {abriendo ? 'Abriendo…' : 'Juego anfitrión'}
          </button>
        ) : (
          <Link className="conjunto-anfitrion" to="/unirse" style={{ textAlign: 'center', textDecoration: 'none' }}>
            Unirse a partida con código
          </Link>
        )}
        <Link className="boton-fantasma" to="/descubrir">
          Volver
        </Link>
      </aside>
      <div className="vista-preguntas">
        {cuestionario.preguntas.map((pregunta, indice) => (
          <article className="vista-pregunta" key={pregunta.id}>
            <div>
              <strong>Pregunta {indice + 1}</strong>
              <p>{pregunta.enunciado}</p>
            </div>
            {pregunta.imagenUrl ? <img src={pregunta.imagenUrl} alt="" /> : null}
            <span className="tiempo-pregunta">20 segundos</span>
          </article>
        ))}
      </div>
    </div>
  )
}
