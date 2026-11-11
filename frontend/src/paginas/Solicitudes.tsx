import { useEffect, useState } from 'react'
import { EstadoCarga, EstadoError, EstadoVacio } from '../componentes/Interfaz.tsx'
import { useAutenticacion } from '../contexto/ProveedorAutenticacion.tsx'
import { useServicios } from '../contexto/ProveedorServicios.tsx'
import { mensajeDe } from '../dominio/errores.ts'
import type { SolicitudProfesor } from '../servicios/autenticacion.ts'

export function Solicitudes() {
  const { autenticacion } = useServicios()
  const { token, perfil } = useAutenticacion()
  const [lista, setLista] = useState<SolicitudProfesor[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [aceptando, setAceptando] = useState<string | null>(null)

  function cargar() {
    if (!token) return
    setCargando(true)
    autenticacion
      .listarProfesoresPendientes(token)
      .then((pendientes) => {
        setLista(pendientes)
        setError(null)
      })
      .catch((err: unknown) => setError(mensajeDe(err)))
      .finally(() => setCargando(false))
  }

  useEffect(() => {
    cargar()
  }, [autenticacion, token])

  async function aceptar(id: string) {
    if (!token) return
    setAceptando(id)
    try {
      await autenticacion.aceptarProfesor(token, id)
      setLista((actual) => actual.filter((item) => item.id !== id))
    } catch (err) {
      setError(mensajeDe(err))
    } finally {
      setAceptando(null)
    }
  }

  if (perfil?.rol !== 'admin') {
    return <p>Solo un administrador puede aceptar cuentas de profesor.</p>
  }
  if (cargando) return <EstadoCarga texto="Cargando solicitudes…" />
  if (error) return <EstadoError mensaje={error} onReintentar={cargar} />

  return (
    <section className="pagina">
      <header className="pagina-cabeza">
        <h1>Solicitudes de profesor</h1>
        <p>Estas cuentas eligieron profesor y esperan tu aceptación para poder entrar.</p>
      </header>
      {lista.length === 0 ? (
        <EstadoVacio titulo="No hay profesores esperando." />
      ) : (
        <ul className="cursos-lista">
          {lista.map((solicitud) => (
            <li className="curso-fila" key={solicitud.id}>
              <div>
                <strong>{solicitud.nombre}</strong>
                <p>{solicitud.correo}</p>
              </div>
              <button className="boton" type="button" disabled={aceptando === solicitud.id} onClick={() => void aceptar(solicitud.id)}>
                {aceptando === solicitud.id ? 'Aceptando…' : 'Aceptar'}
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
