import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { DetalleParticipante } from '../componentes/DetalleParticipante.tsx'
import { EstadoCarga, EstadoError } from '../componentes/Interfaz.tsx'
import { Podio } from '../componentes/Podio.tsx'
import { ControlesAudio } from '../juego/ControlesAudio.tsx'
import { FondoJuego } from '../juego/FondoJuego.tsx'
import { Avatar, avatarVisible } from '../juego/avatares.tsx'
import { useAutenticacion } from '../contexto/ProveedorAutenticacion.tsx'
import { useServicios } from '../contexto/ProveedorServicios.tsx'
import { mensajeDe } from '../dominio/errores.ts'
import { ordenarClasificacion } from '../dominio/filtros.ts'
import type { Participante, Pregunta, ResumenResultado } from '../dominio/tipos.ts'

function mismosUsuarios(a: string | undefined, b: string | undefined): boolean {
  if (!a || !b) return false
  if (a === b) return true
  const demos = new Set(['perfil-demo', 'perfil-demo-docente'])
  return demos.has(a) && demos.has(b)
}

export function Resultados() {
  const { codigo = '' } = useParams()
  const { sala, actividades } = useServicios()
  const { token, perfil } = useAutenticacion()
  const [resultado, setResultado] = useState<ResumenResultado | null>(null)
  const [preguntas, setPreguntas] = useState<Pregunta[]>([])
  const [seleccionadoId, setSeleccionadoId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  function cargar() {
    if (!token) return
    sala
      .obtenerResultado(token, codigo)
      .then(async (dato) => {
        setResultado(dato)
        setError(null)
        if (dato.preguntas && dato.preguntas.length > 0) {
          setPreguntas(dato.preguntas)
          return
        }
        if (!dato.cuestionarioId) {
          setPreguntas([])
          return
        }
        try {
          const cuestionario = await actividades.obtener(dato.cuestionarioId)
          setPreguntas(cuestionario.preguntas)
        } catch {
          setPreguntas([])
        }
      })
      .catch((err: unknown) => setError(mensajeDe(err)))
  }

  useEffect(() => {
    cargar()
  }, [codigo, sala, token, actividades])

  useEffect(() => {
    setSeleccionadoId(null)
  }, [codigo])

  if (error) return <EstadoError mensaje={error} onReintentar={cargar} />
  if (!resultado) return <EstadoCarga texto="Cargando resultados…" />

  const orden = ordenarClasificacion(resultado.participantes)
  const esAnfitrion = mismosUsuarios(perfil?.id, resultado.anfitrionId)
  const mio = orden.find((participante) => mismosUsuarios(participante.perfilId, perfil?.id))
  const puesto = mio ? orden.indexOf(mio) + 1 : null
  const visibles: Participante[] = esAnfitrion ? orden : mio ? [mio] : []
  const elegido =
    visibles.find((participante) => participante.id === seleccionadoId) ??
    visibles[0] ??
    null
  const puestoElegido = elegido ? orden.indexOf(elegido) + 1 : 0

  return (
    <section className="escenario">
      <FondoJuego />
      <ControlesAudio paisaje="victoria" />
      <header className="encabezado-pagina">
        <div>
          <h1>{resultado.titulo}</h1>
          <p>
            Clasificación de la sesión {resultado.codigo}. Cada acierto suma los puntos del cuestionario. Un error o una
            respuesta ausente vale 0. Si empatan, gana quien respondió más rápido.
          </p>
        </div>
      </header>
      {puesto && mio ? (
        <article className="panel">
          <p>Tu puesto: {puesto}</p>
          <p>
            {mio.puntaje} puntos · {mio.aciertos} aciertos
          </p>
        </article>
      ) : null}
      <Podio participantes={orden} perfilId={perfil?.id} />

      {visibles.length > 0 ? (
        <section className="panel detalle-resultados" aria-label="Detalle de respuestas">
          <header className="detalle-resultados-cabeza">
            <div>
              <h2>{esAnfitrion ? 'Detalle por participante' : 'Tu detalle de respuestas'}</h2>
              <p className="meta">
                {esAnfitrion
                  ? 'Elige a un estudiante para ver qué marcó en cada pregunta y dónde falló.'
                  : 'Revisa qué marcaste en cada pregunta y la respuesta correcta.'}
              </p>
            </div>
          </header>

          {esAnfitrion && visibles.length > 1 ? (
            <ul className="detalle-lista-participantes">
              {visibles.map((participante, indice) => (
                <li key={participante.id}>
                  <button
                    type="button"
                    className={`detalle-chip${elegido?.id === participante.id ? ' activo' : ''}`}
                    onClick={() => setSeleccionadoId(participante.id)}
                    aria-pressed={elegido?.id === participante.id}
                  >
                    <Avatar id={avatarVisible(participante.perfilId, participante.avatarId)} tamano={36} />
                    <span>
                      <strong>{participante.nombre}</strong>
                      <small>
                        #{indice + 1} · {participante.aciertos} aciertos
                      </small>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          ) : null}

          {elegido ? (
            <DetalleParticipante participante={elegido} preguntas={preguntas} puesto={puestoElegido} />
          ) : null}
        </section>
      ) : null}

      <div className="acciones">
        <Link className="boton" to="/">
          Volver al inicio
        </Link>
        <Link className="boton-fantasma" to="/historial">
          Ver historial
        </Link>
      </div>
    </section>
  )
}
