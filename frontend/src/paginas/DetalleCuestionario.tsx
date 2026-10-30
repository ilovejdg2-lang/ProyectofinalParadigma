import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { EstadoCarga, EstadoError } from '../componentes/Interfaz.tsx'
import { useAutenticacion } from '../contexto/ProveedorAutenticacion.tsx'
import { useServicios } from '../contexto/ProveedorServicios.tsx'
import { mensajeDe } from '../dominio/errores.ts'
import { acentoDeDificultad, etiquetaDificultad } from '../dominio/filtros.ts'
import type { Cuestionario, ModoJuego, OpcionRespuesta, Pregunta } from '../dominio/tipos.ts'

const etiquetasModo: Record<ModoJuego, string> = {
  'en-vivo': 'En vivo',
  practica: 'Práctica',
  evaluacion: 'Evaluación',
  desafio: 'Desafío',
}

function opcionesDePregunta(pregunta: Pregunta): OpcionRespuesta[] {
  if (pregunta.opciones && pregunta.opciones.length >= 2) return pregunta.opciones
  return [
    { id: `${pregunta.id}:verdadero`, texto: 'Verdadero', correcta: pregunta.respuestaCorrecta },
    { id: `${pregunta.id}:falso`, texto: 'Falso', correcta: !pregunta.respuestaCorrecta },
  ]
}

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
  const [practicando, setPracticando] = useState(false)
  const [modoSeleccionado, setModoSeleccionado] = useState<ModoJuego>('practica')
  const [selecciones, setSelecciones] = useState<Record<string, string>>({})
  const [guardandoPartida, setGuardandoPartida] = useState(false)

  useEffect(() => {
    let activo = true
    actividades
      .obtener(id)
      .then((dato) => {
        if (activo) {
          setCuestionario(dato)
          if (dato.modo) setModoSeleccionado(dato.modo)
        }
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

  function elegirOpcion(preguntaId: string, opcionId: string) {
    setSelecciones((actual) => ({ ...actual, [preguntaId]: opcionId }))
    setError(null)
  }

  async function finalizarPractica() {
    if (!token || !cuestionario) return
    const respuestas = cuestionario.preguntas
      .filter((pregunta) => Boolean(selecciones[pregunta.id]))
      .map((pregunta) => ({
        preguntaId: pregunta.id,
        opcionId: selecciones[pregunta.id],
      }))
    if (respuestas.length === 0) {
      setError('Responde al menos una pregunta antes de guardar la partida.')
      return
    }
    setGuardandoPartida(true)
    try {
      const guardado = await sala.guardarPartida(token, {
        cuestionarioId: cuestionario.id,
        modo: modoSeleccionado,
        respuestas,
      })
      navegar(`/resultados/${guardado.codigo}`)
    } catch (err) {
      setError(mensajeDe(err))
    } finally {
      setGuardandoPartida(false)
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
          {cuestionario.modo ? ` · ${etiquetasModo[cuestionario.modo]}` : ''}
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
        <button
          className="boton"
          type="button"
          onClick={() => {
            setPracticando((actual) => !actual)
            setError(null)
          }}
        >
          {practicando ? 'Cerrar práctica' : 'Practicar cuestionario'}
        </button>
        {practicando ? (
          <button className="boton" type="button" onClick={() => void finalizarPractica()} disabled={guardandoPartida}>
            {guardandoPartida ? 'Guardando…' : 'Guardar partida'}
          </button>
        ) : null}
        <Link className="boton-fantasma" to="/descubrir">
          Volver
        </Link>
      </aside>
      <div className="vista-preguntas">
        {cuestionario.preguntas.map((pregunta, indice) => {
          const opciones = opcionesDePregunta(pregunta)
          const elegida = selecciones[pregunta.id]
          return (
            <article className="vista-pregunta" key={pregunta.id}>
              <div>
                <strong>Pregunta {indice + 1}</strong>
                <p>{pregunta.enunciado}</p>
                {practicando ? (
                  <div className="fila" role="group" aria-label={`Opciones de la pregunta ${indice + 1}`}>
                    {opciones.map((opcion) => (
                      <button
                        key={opcion.id}
                        type="button"
                        className={elegida === opcion.id ? 'boton' : 'boton-fantasma'}
                        onClick={() => elegirOpcion(pregunta.id, opcion.id)}
                      >
                        {opcion.texto}
                      </button>
                    ))}
                  </div>
                ) : null}
                {practicando && elegida && pregunta.explicacion ? (
                  <p className="meta">{pregunta.explicacion}</p>
                ) : null}
              </div>
              {pregunta.imagenUrl ? <img src={pregunta.imagenUrl} alt="" /> : null}
              <span className="tiempo-pregunta">{pregunta.segundos ?? 20} segundos</span>
            </article>
          )
        })}
      </div>
    </div>
  )
}
