import { useEffect, useState } from 'react'
import { useBlocker, useNavigate, useParams } from 'react-router-dom'
import { Dialogo } from '../componentes/Interfaz.tsx'
import { useAutenticacion } from '../contexto/ProveedorAutenticacion.tsx'
import { useServicios } from '../contexto/ProveedorServicios.tsx'
import { mensajeDe } from '../dominio/errores.ts'
import type { BorradorCuestionario, BorradorPregunta, Dificultad } from '../dominio/tipos.ts'
import { validarCuestionario } from '../dominio/validacion.ts'

const categorias = ['Paradigma funcional', 'Paradigma lógico', 'Orientado a objetos', 'Concurrente', 'General']

function preguntaVacia(): BorradorPregunta {
  return {
    id: crypto.randomUUID(),
    enunciado: '',
    respuestaCorrecta: null,
    opciones: [
      { id: crypto.randomUUID(), texto: 'Verdadero' },
      { id: crypto.randomUUID(), texto: 'Falso' },
    ],
    opcionCorrectaId: null,
    imagenSimulada: false,
  }
}

function borradorVacio(): BorradorCuestionario {
  return {
    titulo: '',
    descripcion: '',
    categoria: 'General',
    etiquetas: '',
    dificultad: 'medio',
    imagenSimulada: false,
    preguntas: [preguntaVacia()],
  }
}

export function EditorCuestionario() {
  const { id } = useParams()
  const edicion = Boolean(id)
  const { actividades } = useServicios()
  const { token, perfil } = useAutenticacion()
  const navegar = useNavigate()
  const [borrador, setBorrador] = useState<BorradorCuestionario>(borradorVacio)
  const [errores, setErrores] = useState<string[]>([])
  const [sucio, setSucio] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [cargando, setCargando] = useState(edicion)
  const [confirmarSalida, setConfirmarSalida] = useState(false)
  const [preguntaPorBorrar, setPreguntaPorBorrar] = useState<string | null>(null)
  const [preguntaAbierta, setPreguntaAbierta] = useState<string | null>(null)
  const [editandoInfo, setEditandoInfo] = useState(false)
  const [mostrandoTiempo, setMostrandoTiempo] = useState(false)
  const [arrastrando, setArrastrando] = useState<number | null>(null)
  const bloqueo = useBlocker(sucio && !guardando)

  useEffect(() => {
    if (!id) return
    let activo = true
    actividades
      .obtener(id)
      .then((cuestionario) => {
        if (!activo) return
        if (perfil && cuestionario.autorId !== perfil.id) {
          setErrores(['Solo quien creó el cuestionario puede editarlo.'])
          return
        }
        setBorrador({
          titulo: cuestionario.titulo,
          descripcion: cuestionario.descripcion,
          categoria: cuestionario.categoria,
          etiquetas: cuestionario.etiquetas.join(', '),
          dificultad: cuestionario.dificultad,
          imagenUrl: cuestionario.imagenUrl,
          imagenSimulada: false,
          preguntas: cuestionario.preguntas.map((pregunta) => ({
            id: pregunta.id,
            enunciado: pregunta.enunciado,
            respuestaCorrecta: pregunta.respuestaCorrecta,
            opciones: pregunta.opciones?.map((opcion) => ({ id: opcion.id, texto: opcion.texto })) ?? [
              { id: `${pregunta.id}:verdadero`, texto: 'Verdadero' },
              { id: `${pregunta.id}:falso`, texto: 'Falso' },
            ],
            opcionCorrectaId:
              pregunta.opciones?.find((opcion) => opcion.correcta)?.id ??
              (pregunta.respuestaCorrecta ? `${pregunta.id}:verdadero` : `${pregunta.id}:falso`),
            imagenUrl: pregunta.imagenUrl,
            imagenSimulada: false,
          })),
        })
      })
      .catch((error: unknown) => setErrores([mensajeDe(error)]))
      .finally(() => {
        if (activo) setCargando(false)
      })
    return () => {
      activo = false
    }
  }, [actividades, id, perfil])

  function actualizar(parcial: Partial<BorradorCuestionario>) {
    setBorrador((actual) => ({ ...actual, ...parcial }))
    setSucio(true)
  }

  function actualizarPregunta(preguntaId: string, parcial: Partial<BorradorPregunta>) {
    setBorrador((actual) => ({
      ...actual,
      preguntas: actual.preguntas.map((pregunta) => (pregunta.id === preguntaId ? { ...pregunta, ...parcial } : pregunta)),
    }))
    setSucio(true)
  }

  async function cargarImagen(archivo: File, destino: 'portada' | string) {
    if (!token) return
    try {
      const resultado = await actividades.cargarImagen(token, archivo)
      if (destino === 'portada') {
        actualizar({ imagenUrl: resultado.url, imagenSimulada: resultado.origen === 'simulado' })
      } else {
        actualizarPregunta(destino, { imagenUrl: resultado.url, imagenSimulada: resultado.origen === 'simulado' })
      }
    } catch (error) {
      setErrores([mensajeDe(error)])
    }
  }

  function eliminarPregunta(preguntaId: string) {
    actualizar({ preguntas: borrador.preguntas.filter((pregunta) => pregunta.id !== preguntaId) })
    if (preguntaAbierta === preguntaId) setPreguntaAbierta(null)
  }

  function duplicarPregunta(preguntaId: string) {
    const indice = borrador.preguntas.findIndex((pregunta) => pregunta.id === preguntaId)
    const origen = borrador.preguntas[indice]
    if (!origen) return
    const ids = new Map(origen.opciones.map((opcion) => [opcion.id, crypto.randomUUID()]))
    const copia: BorradorPregunta = {
      ...origen,
      id: crypto.randomUUID(),
      opciones: origen.opciones.map((opcion) => ({ ...opcion, id: ids.get(opcion.id) ?? crypto.randomUUID() })),
      opcionCorrectaId: origen.opcionCorrectaId ? (ids.get(origen.opcionCorrectaId) ?? null) : null,
    }
    const preguntas = [...borrador.preguntas]
    preguntas.splice(indice + 1, 0, copia)
    actualizar({ preguntas })
  }

  function cambiarOpcion(preguntaId: string, opcionId: string, texto: string) {
    setBorrador((actual) => ({
      ...actual,
      preguntas: actual.preguntas.map((pregunta) =>
        pregunta.id === preguntaId
          ? { ...pregunta, opciones: pregunta.opciones.map((opcion) => (opcion.id === opcionId ? { ...opcion, texto } : opcion)) }
          : pregunta,
      ),
    }))
    setSucio(true)
  }

  function agregarOpcion(preguntaId: string) {
    setBorrador((actual) => ({
      ...actual,
      preguntas: actual.preguntas.map((pregunta) =>
        pregunta.id === preguntaId && pregunta.opciones.length < 6
          ? { ...pregunta, opciones: [...pregunta.opciones, { id: crypto.randomUUID(), texto: `Respuesta ${pregunta.opciones.length + 1}` }] }
          : pregunta,
      ),
    }))
    setSucio(true)
  }

  function quitarOpcion(preguntaId: string, opcionId: string) {
    setBorrador((actual) => ({
      ...actual,
      preguntas: actual.preguntas.map((pregunta) => {
        if (pregunta.id !== preguntaId || pregunta.opciones.length <= 2) return pregunta
        return {
          ...pregunta,
          opciones: pregunta.opciones.filter((opcion) => opcion.id !== opcionId),
          opcionCorrectaId: pregunta.opcionCorrectaId === opcionId ? null : pregunta.opcionCorrectaId,
          respuestaCorrecta: pregunta.opcionCorrectaId === opcionId ? null : pregunta.respuestaCorrecta,
        }
      }),
    }))
    setSucio(true)
  }

  function soltarPregunta(indice: number) {
    if (arrastrando === null || arrastrando === indice) {
      setArrastrando(null)
      return
    }
    const preguntas = [...borrador.preguntas]
    const [pregunta] = preguntas.splice(arrastrando, 1)
    if (!pregunta) return
    preguntas.splice(indice, 0, pregunta)
    actualizar({ preguntas })
    setArrastrando(null)
  }

  function agregarPregunta() {
    const nueva = preguntaVacia()
    actualizar({ preguntas: [...borrador.preguntas, nueva] })
    setPreguntaAbierta(nueva.id)
  }

  async function guardar() {
    const validacion = validarCuestionario(borrador)
    setErrores(validacion)
    if (validacion.length > 0 || !token) return
    setGuardando(true)
    try {
      const guardado = await actividades.guardar(token, {
        id,
        titulo: borrador.titulo,
        descripcion: borrador.descripcion,
        categoria: borrador.categoria,
        etiquetas: borrador.etiquetas
          .split(',')
          .map((etiqueta) => etiqueta.trim())
          .filter(Boolean),
        dificultad: borrador.dificultad,
        imagenUrl: borrador.imagenUrl,
        preguntas: borrador.preguntas.map((pregunta, indice) => ({
          id: pregunta.id,
          enunciado: pregunta.enunciado.trim(),
          respuestaCorrecta: pregunta.opciones.find((opcion) => opcion.id === pregunta.opcionCorrectaId)?.texto.trim().toLowerCase() === 'verdadero',
          opciones: pregunta.opciones.map((opcion) => ({
            id: opcion.id,
            texto: opcion.texto.trim(),
            correcta: opcion.id === pregunta.opcionCorrectaId,
          })),
          imagenUrl: pregunta.imagenUrl,
          orden: indice + 1,
        })),
      })
      setSucio(false)
      navegar(`/cuestionarios/${guardado.id}`)
    } catch (error) {
      setErrores([mensajeDe(error)])
    } finally {
      setGuardando(false)
    }
  }

  if (cargando) return <p>Cargando cuestionario…</p>

  return (
    <form
      className="editor-conjunto"
      onSubmit={(evento) => {
        evento.preventDefault()
        void guardar()
      }}
    >
      <div className="editor-guardar">
        <button className="boton" type="submit" disabled={guardando}>
          Guardar cuestionario
        </button>
        <button className="boton-fantasma" type="button" onClick={() => (sucio ? setConfirmarSalida(true) : navegar('/mis-cuestionarios'))}>
          Cancelar
        </button>
      </div>
      <div className="editor-lienzo-conjunto">
        <aside className="editor-lateral">
          <label className="portada portada-editable editor-portada">
            <span
              className="fondo-portada"
              style={{ backgroundImage: borrador.imagenUrl ? `url("${borrador.imagenUrl.replaceAll('"', '')}")` : undefined }}
            />
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml,.jpg,.jpeg,.png,.webp,.gif,.svg"
              aria-label="Imagen de portada"
              onChange={(evento) => {
                const archivo = evento.target.files?.[0]
                evento.target.value = ''
                if (archivo) void cargarImagen(archivo, 'portada')
              }}
            />
            <span className="conjunto-cuenta">
              {borrador.preguntas.length} {borrador.preguntas.length === 1 ? 'pregunta' : 'preguntas'}
            </span>
          </label>
          <h1>{borrador.titulo.trim() || 'Sin título'}</h1>
          <p>{borrador.descripcion.trim() || 'Agrega una descripción.'}</p>
          <div className="editor-atajos">
            <button type="button" onClick={() => setEditandoInfo(true)}>
              <IconoLapiz />
              Editar información
            </button>
            <button type="button" onClick={() => setMostrandoTiempo(true)}>
              <IconoReloj />
              Límite de tiempo
            </button>
          </div>
          <button className="boton editor-agregar" type="button" onClick={agregarPregunta}>
            + Agregar pregunta
          </button>
          {borrador.imagenSimulada ? (
            <p className="aviso">Vista previa local. Los otros dispositivos la verán cuando la API de actividades devuelva una URL.</p>
          ) : null}
        </aside>
        <div className="editor-lista">
          {borrador.preguntas.map((pregunta, indice) => (
            <article
              className="fila-pregunta"
              key={pregunta.id}
              draggable
              onDragStart={() => setArrastrando(indice)}
              onDragOver={(evento) => evento.preventDefault()}
              onDrop={() => soltarPregunta(indice)}
            >
              <span className="asa" aria-hidden="true">
                <IconoAsa />
              </span>
              <button className="boton-editar-fila" type="button" onClick={() => setPreguntaAbierta(pregunta.id)}>
                <IconoLapiz /> Editar
              </button>
              <div className="fila-texto">
                <strong>Pregunta {indice + 1}</strong>
                <p>{pregunta.enunciado.trim() || 'Sin enunciado'}</p>
                <span className="meta">
                  {pregunta.opciones.find((opcion) => opcion.id === pregunta.opcionCorrectaId)?.texto ?? 'Sin elegir'}
                </span>
              </div>
              <button className="icono-fila" type="button" aria-label={`Eliminar pregunta ${indice + 1}`} onClick={() => setPreguntaPorBorrar(pregunta.id)}>
                <IconoBasura />
              </button>
              <button className="icono-fila" type="button" aria-label={`Duplicar pregunta ${indice + 1}`} onClick={() => duplicarPregunta(pregunta.id)}>
                <IconoCopiar />
              </button>
              <span className="tiempo-pregunta">
                <IconoReloj /> 20 segundos
              </span>
            </article>
          ))}
        </div>
      </div>
      {editandoInfo ? (
        <div className="modal-pregunta" role="dialog" aria-modal="true" aria-labelledby="titulo-info">
          <div className="panel pregunta-editor">
            <div className="editor-cabeza">
              <h2 id="titulo-info">Información del cuestionario</h2>
              <button className="boton" type="button" onClick={() => setEditandoInfo(false)}>
                Listo
              </button>
            </div>
            <label className="campo-grupo">
              <span>Título</span>
              <input className="campo" value={borrador.titulo} onChange={(evento) => actualizar({ titulo: evento.target.value })} />
            </label>
            <label className="campo-grupo">
              <span>Descripción</span>
              <textarea className="area" value={borrador.descripcion} onChange={(evento) => actualizar({ descripcion: evento.target.value })} />
            </label>
            <div className="fila">
              <label className="campo-grupo">
                <span>Categoría</span>
                <select className="seleccion" value={borrador.categoria} onChange={(evento) => actualizar({ categoria: evento.target.value })}>
                  {categorias.map((categoria) => (
                    <option key={categoria}>{categoria}</option>
                  ))}
                </select>
              </label>
              <label className="campo-grupo">
                <span>Dificultad</span>
                <select
                  className="seleccion"
                  value={borrador.dificultad}
                  onChange={(evento) => actualizar({ dificultad: evento.target.value as Dificultad })}
                >
                  <option value="facil">Fácil</option>
                  <option value="medio">Medio</option>
                  <option value="dificil">Difícil</option>
                </select>
              </label>
            </div>
            <label className="campo-grupo">
              <span>Etiquetas, separadas por coma</span>
              <input className="campo" value={borrador.etiquetas} onChange={(evento) => actualizar({ etiquetas: evento.target.value })} />
            </label>
          </div>
        </div>
      ) : null}
      {preguntaAbierta
        ? borrador.preguntas.map((pregunta, indice) =>
            pregunta.id === preguntaAbierta ? (
              <div className="modal-pregunta" key={pregunta.id} role="dialog" aria-modal="true" aria-labelledby="titulo-pregunta">
                <div className="panel pregunta-editor">
                  <div className="editor-cabeza">
                    <h2 id="titulo-pregunta">Pregunta {indice + 1}</h2>
                    <button className="boton" type="button" onClick={() => setPreguntaAbierta(null)}>
                      Listo
                    </button>
                  </div>
                  <div className="editor-lienzo">
                    <label className="zona-media">
                      <span>Imagen opcional</span>
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
                        onChange={(evento) => {
                          const archivo = evento.target.files?.[0]
                          if (archivo) void cargarImagen(archivo, pregunta.id)
                        }}
                      />
                      {pregunta.imagenUrl ? <img className="vista-imagen" src={pregunta.imagenUrl} alt="" /> : null}
                      {pregunta.imagenSimulada ? <p className="aviso">Imagen simulada en este navegador.</p> : null}
                    </label>
                    <textarea
                      className="enunciado-editor"
                      aria-label={`Enunciado de la pregunta ${indice + 1}`}
                      placeholder="Escribe la pregunta de verdadero o falso"
                      value={pregunta.enunciado}
                      onChange={(evento) => actualizarPregunta(pregunta.id, { enunciado: evento.target.value })}
                    />
                  </div>
                  <div className="respuestas-editor" role="radiogroup" aria-label={`Respuesta correcta de la pregunta ${indice + 1}`}>
                    {pregunta.opciones.map((opcion, numero) => (
                      <div
                        className={`respuesta-editor tono-${numero % 4}${pregunta.opcionCorrectaId === opcion.id ? ' activa' : ''}`}
                        key={opcion.id}
                      >
                        <input
                          aria-label={`Respuesta ${numero + 1} de la pregunta ${indice + 1}`}
                          value={opcion.texto}
                          onChange={(evento) => cambiarOpcion(pregunta.id, opcion.id, evento.target.value)}
                        />
                        <button
                          type="button"
                          onClick={() => actualizarPregunta(pregunta.id, { opcionCorrectaId: opcion.id })}
                        >
                          {pregunta.opcionCorrectaId === opcion.id ? 'Correcta' : 'Marcar'}
                        </button>
                        {pregunta.opciones.length > 2 ? (
                          <button type="button" aria-label={`Quitar respuesta ${numero + 1}`} onClick={() => quitarOpcion(pregunta.id, opcion.id)}>
                            Quitar
                          </button>
                        ) : null}
                      </div>
                    ))}
                  </div>
                  <button
                    className="boton"
                    type="button"
                    disabled={pregunta.opciones.length >= 6}
                    onClick={() => agregarOpcion(pregunta.id)}
                  >
                    Agregar respuesta
                  </button>
                </div>
              </div>
            ) : null,
          )
        : null}
      {errores.length > 0 ? (
        <ul className="lista-errores">
          {errores.map((error) => (
            <li key={error}>{error}</li>
          ))}
        </ul>
      ) : null}
      <Dialogo
        abierto={mostrandoTiempo}
        titulo="Límite de tiempo"
        mensaje="Cada pregunta dura 20 segundos. Ese tiempo lo marca la partida en vivo y es el mismo para todas."
        confirmar="Entendido"
        onConfirmar={() => setMostrandoTiempo(false)}
        onCancelar={() => setMostrandoTiempo(false)}
      />
      <Dialogo
        abierto={preguntaPorBorrar !== null}
        titulo="Eliminar pregunta"
        mensaje="La pregunta se quitará del cuestionario. Puedes deshacerlo si cancelas sin guardar."
        confirmar="Eliminar pregunta"
        peligro
        onConfirmar={() => {
          if (preguntaPorBorrar) eliminarPregunta(preguntaPorBorrar)
          setPreguntaPorBorrar(null)
        }}
        onCancelar={() => setPreguntaPorBorrar(null)}
      />
      <Dialogo
        abierto={confirmarSalida || bloqueo.state === 'blocked'}
        titulo="Hay cambios sin guardar"
        mensaje="Si sales ahora, se perderá lo que no hayas guardado."
        confirmar="Descartar cambios"
        peligro
        onConfirmar={() => {
          setSucio(false)
          setConfirmarSalida(false)
          if (bloqueo.state === 'blocked') bloqueo.proceed()
          else navegar('/mis-cuestionarios')
        }}
        onCancelar={() => {
          setConfirmarSalida(false)
          if (bloqueo.state === 'blocked') bloqueo.reset()
        }}
      />
    </form>
  )
}

function IconoLapiz() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 20h4l10.5-10.5a2.1 2.1 0 0 0-3-3L5 17v3z" />
      <path d="M13.5 6.5l3 3" />
    </svg>
  )
}

function IconoReloj() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="8" />
      <path d="M12 8v5l3 2" />
    </svg>
  )
}

function IconoAsa() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M8 7h.01M8 12h.01M8 17h.01M14 7h.01M14 12h.01M14 17h.01" />
    </svg>
  )
}

function IconoBasura() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M5 7h14" />
      <path d="M9 7V5h6v2" />
      <path d="M8 7l1 13h6l1-13" />
    </svg>
  )
}

function IconoCopiar() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="8" y="8" width="11" height="11" rx="2" />
      <path d="M6 16H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  )
}
