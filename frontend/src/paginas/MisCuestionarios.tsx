import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Dialogo, EstadoCarga, EstadoError, EstadoVacio } from '../componentes/Interfaz.tsx'
import { useAutenticacion } from '../contexto/ProveedorAutenticacion.tsx'
import { useServicios } from '../contexto/ProveedorServicios.tsx'
import { mensajeDe } from '../dominio/errores.ts'
import { acentoDeDificultad, etiquetaDificultad } from '../dominio/filtros.ts'
import type { Cuestionario } from '../dominio/tipos.ts'

function textoEditado(iso: string): string {
  const fecha = new Date(iso)
  const minutos = Math.floor((Date.now() - fecha.getTime()) / 60000)
  if (Number.isNaN(minutos)) return 'Editado recientemente'
  if (minutos < 1) return 'Editado ahora'
  if (minutos < 60) return `Editado hace ${minutos} min`
  const horas = Math.floor(minutos / 60)
  if (horas < 24) return horas === 1 ? 'Editado hace 1 hora' : `Editado hace ${horas} horas`
  const dias = Math.floor(horas / 24)
  if (dias < 30) return dias === 1 ? 'Editado hace 1 día' : `Editado hace ${dias} días`
  const meses = Math.floor(dias / 30)
  if (meses < 12) return meses === 1 ? 'Editado hace 1 mes' : `Editado hace ${meses} meses`
  const anos = Math.floor(meses / 12)
  return anos === 1 ? 'Editado hace 1 año' : `Editado hace ${anos} años`
}

export function MisCuestionarios() {
  const { actividades, sala } = useServicios()
  const { token } = useAutenticacion()
  const navegar = useNavigate()
  const [lista, setLista] = useState<Cuestionario[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [pendiente, setPendiente] = useState<Cuestionario | null>(null)
  const [menu, setMenu] = useState<string | null>(null)
  const [abriendo, setAbriendo] = useState<string | null>(null)

  function cargar() {
    if (!token) return
    setCargando(true)
    actividades
      .mios(token)
      .then((datos) => {
        setLista(datos)
        setError(null)
      })
      .catch((err: unknown) => setError(mensajeDe(err)))
      .finally(() => setCargando(false))
  }

  useEffect(() => {
    cargar()
  }, [actividades, token])

  async function anfitrion(id: string) {
    if (!token) return
    setAbriendo(id)
    try {
      const creada = await sala.crear(token, id)
      navegar(`/sala/${creada.codigo}`)
    } catch (err) {
      setError(mensajeDe(err))
      setAbriendo(null)
    }
  }

  async function eliminar() {
    if (!token || !pendiente) return
    try {
      await actividades.eliminar(token, pendiente.id)
      setPendiente(null)
      cargar()
    } catch (err) {
      setError(mensajeDe(err))
      setPendiente(null)
    }
  }

  return (
    <>
      <header className="encabezado-pagina">
        <div>
          <h1>Mis cuestionarios</h1>
          <p>Solo puedes editar y eliminar los que creaste.</p>
        </div>
        <Link className="boton" to="/cuestionarios/nuevo">
          Crear cuestionario
        </Link>
      </header>
      {cargando ? <EstadoCarga /> : null}
      {error ? <EstadoError mensaje={error} onReintentar={cargar} /> : null}
      {!cargando && !error && lista.length === 0 ? (
        <EstadoVacio titulo="Todavía no tienes cuestionarios" detalle="Crea el primero para usarlo en clase." />
      ) : null}
      <div className="rejilla rejilla-mios">
        {lista.map((cuestionario) => (
          <article className={`conjunto acento-${acentoDeDificultad(cuestionario.dificultad)}`} key={cuestionario.id}>
            <div
              className="conjunto-portada"
              style={{ backgroundImage: cuestionario.imagenUrl ? `url("${cuestionario.imagenUrl.replaceAll('"', '')}")` : undefined }}
            >
              <span className="conjunto-cuenta">
                {cuestionario.preguntas.length} {cuestionario.preguntas.length === 1 ? 'pregunta' : 'preguntas'}
              </span>
            </div>
            <div className="conjunto-cuerpo">
              {cuestionario.esDemostracion ? <span className="etiqueta-demo">Datos de prueba</span> : null}
              <h2>{cuestionario.titulo}</h2>
              <p className="conjunto-dato">{etiquetaDificultad(cuestionario.dificultad)}</p>
              <p className="conjunto-fecha">{textoEditado(cuestionario.actualizadoEn)}</p>
            </div>
            <div className="conjunto-iconos">
              <Link to={`/cuestionarios/${cuestionario.id}/editar`} aria-label={`Editar ${cuestionario.titulo}`}>
                <IconoLapiz />
              </Link>
              <button type="button" aria-label={`Eliminar ${cuestionario.titulo}`} onClick={() => setPendiente(cuestionario)}>
                <IconoBasura />
              </button>
              <div className="conjunto-mas">
                <button
                  type="button"
                  aria-label={`Más opciones de ${cuestionario.titulo}`}
                  aria-expanded={menu === cuestionario.id}
                  onClick={() => setMenu(menu === cuestionario.id ? null : cuestionario.id)}
                >
                  <IconoPuntos />
                </button>
                {menu === cuestionario.id ? (
                  <div className="conjunto-menu">
                    <button type="button" onClick={() => navegar(`/cuestionarios/${cuestionario.id}`)}>
                      Ver detalle
                    </button>
                  </div>
                ) : null}
              </div>
            </div>
            <div className="conjunto-jugar">
              <button type="button" className="conjunto-solo" onClick={() => navegar(`/cuestionarios/${cuestionario.id}`)}>
                <IconoPersona /> Solo
              </button>
              <button
                type="button"
                className="conjunto-anfitrion"
                disabled={abriendo === cuestionario.id}
                onClick={() => void anfitrion(cuestionario.id)}
              >
                <IconoPlay /> {abriendo === cuestionario.id ? 'Abriendo…' : 'Anfitrión'}
              </button>
            </div>
          </article>
        ))}
      </div>
      <Dialogo
        abierto={pendiente !== null}
        titulo="Eliminar cuestionario"
        mensaje={`Se eliminará «${pendiente?.titulo ?? ''}». Esta acción no se puede deshacer.`}
        confirmar="Eliminar"
        peligro
        onConfirmar={() => void eliminar()}
        onCancelar={() => setPendiente(null)}
      />
    </>
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

function IconoBasura() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M5 7h14" />
      <path d="M9 7V5h6v2" />
      <path d="M8 7l1 13h6l1-13" />
    </svg>
  )
}

function IconoPuntos() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="6" cy="12" r="1.4" />
      <circle cx="12" cy="12" r="1.4" />
      <circle cx="18" cy="12" r="1.4" />
    </svg>
  )
}

function IconoPersona() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="8" r="3" />
      <path d="M6 19c1.2-3 3.2-4.5 6-4.5S16.8 16 18 19" />
    </svg>
  )
}

function IconoPlay() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M8 5.5v13l11-6.5-11-6.5z" />
    </svg>
  )
}
