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
  return { id: crypto.randomUUID(), enunciado: '', respuestaCorrecta: null, imagenSimulada: false }
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

  function mover(indice: number, direccion: -1 | 1) {
    const destino = indice + direccion
    if (destino < 0 || destino >= borrador.preguntas.length) return
    const preguntas = [...borrador.preguntas]
    const [pregunta] = preguntas.splice(indice, 1)
    if (!pregunta) return
    preguntas.splice(destino, 0, pregunta)
    actualizar({ preguntas })
  }

  function eliminarPregunta(preguntaId: string) {
    actualizar({ preguntas: borrador.preguntas.filter((pregunta) => pregunta.id !== preguntaId) })
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
          respuestaCorrecta: pregunta.respuestaCorrecta === true,
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
      className="formulario"
      onSubmit={(evento) => {
        evento.preventDefault()
        void guardar()
      }}
    >
      <header className="encabezado-pagina">
        <div>
          <h1>{edicion ? 'Editar cuestionario' : 'Crear cuestionario'}</h1>
          <p>Cada pregunta es de verdadero o falso. La imagen es opcional.</p>
        </div>
      </header>
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
      <label className="campo-grupo">
        <span>Imagen de portada</span>
        <input
          className="campo"
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
          onChange={(evento) => {
            const archivo = evento.target.files?.[0]
            if (archivo) void cargarImagen(archivo, 'portada')
          }}
        />
      </label>
      {borrador.imagenUrl ? <img className="vista-imagen" src={borrador.imagenUrl} alt="Vista previa de la portada" /> : null}
      {borrador.imagenSimulada ? (
        <p className="aviso">Vista previa local. Los otros dispositivos la verán cuando la API de actividades devuelva una URL.</p>
      ) : null}
      {borrador.preguntas.map((pregunta, indice) => (
        <fieldset className="panel pregunta-editor" key={pregunta.id}>
          <legend>Pregunta {indice + 1}</legend>
          <label className="campo-grupo">
            <span>Enunciado</span>
            <textarea
              className="area"
              value={pregunta.enunciado}
              onChange={(evento) => actualizarPregunta(pregunta.id, { enunciado: evento.target.value })}
            />
          </label>
          <div className="opciones-vf" role="radiogroup" aria-label={`Respuesta correcta de la pregunta ${indice + 1}`}>
            <button
              className={pregunta.respuestaCorrecta === true ? 'opcion activa' : 'opcion'}
              type="button"
              onClick={() => actualizarPregunta(pregunta.id, { respuestaCorrecta: true })}
            >
              Verdadero
            </button>
            <button
              className={pregunta.respuestaCorrecta === false ? 'opcion activa' : 'opcion'}
              type="button"
              onClick={() => actualizarPregunta(pregunta.id, { respuestaCorrecta: false })}
            >
              Falso
            </button>
          </div>
          <label className="campo-grupo">
            <span>Imagen opcional</span>
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
              onChange={(evento) => {
                const archivo = evento.target.files?.[0]
                if (archivo) void cargarImagen(archivo, pregunta.id)
              }}
            />
          </label>
          {pregunta.imagenUrl ? <img className="vista-imagen" src={pregunta.imagenUrl} alt="" /> : null}
          {pregunta.imagenSimulada ? <p className="aviso">Imagen simulada en este navegador.</p> : null}
          <div className="acciones">
            <button className="boton-fantasma" type="button" onClick={() => mover(indice, -1)}>
              Subir
            </button>
            <button className="boton-fantasma" type="button" onClick={() => mover(indice, 1)}>
              Bajar
            </button>
            <button className="boton-peligro" type="button" onClick={() => setPreguntaPorBorrar(pregunta.id)}>
              Eliminar pregunta
            </button>
          </div>
        </fieldset>
      ))}
      <button className="boton-fantasma" type="button" onClick={() => actualizar({ preguntas: [...borrador.preguntas, preguntaVacia()] })}>
        Agregar pregunta
      </button>
      {errores.length > 0 ? (
        <ul className="lista-errores">
          {errores.map((error) => (
            <li key={error}>{error}</li>
          ))}
        </ul>
      ) : null}
      <div className="acciones">
        <button className="boton" type="submit" disabled={guardando}>
          Guardar cuestionario
        </button>
        <button className="boton-fantasma" type="button" onClick={() => (sucio ? setConfirmarSalida(true) : navegar('/mis-cuestionarios'))}>
          Cancelar
        </button>
      </div>
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
