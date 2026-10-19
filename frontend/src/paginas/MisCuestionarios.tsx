import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Dialogo, EstadoCarga, EstadoError, EstadoVacio } from '../componentes/Interfaz.tsx'
import { useAutenticacion } from '../contexto/ProveedorAutenticacion.tsx'
import { useServicios } from '../contexto/ProveedorServicios.tsx'
import { mensajeDe } from '../dominio/errores.ts'
import type { Cuestionario } from '../dominio/tipos.ts'

export function MisCuestionarios() {
  const { actividades } = useServicios()
  const { token } = useAutenticacion()
  const navegar = useNavigate()
  const [lista, setLista] = useState<Cuestionario[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [pendiente, setPendiente] = useState<Cuestionario | null>(null)

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
      <div className="rejilla">
        {lista.map((cuestionario) => (
          <article className="tarjeta" key={cuestionario.id}>
            <div className="cuerpo-tarjeta">
              {cuestionario.esDemostracion ? <span className="etiqueta-demo">Datos de prueba</span> : null}
              <h2>{cuestionario.titulo}</h2>
              <p>{cuestionario.preguntas.length} preguntas</p>
              <div className="acciones">
                <button className="boton-fantasma" type="button" onClick={() => navegar(`/cuestionarios/${cuestionario.id}`)}>
                  Ver
                </button>
                <Link className="boton" to={`/cuestionarios/${cuestionario.id}/editar`}>
                  Editar
                </Link>
                <button className="boton-peligro" type="button" onClick={() => setPendiente(cuestionario)}>
                  Eliminar
                </button>
              </div>
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
