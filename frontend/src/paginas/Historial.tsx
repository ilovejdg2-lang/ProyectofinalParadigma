import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { EstadoCarga, EstadoError, EstadoVacio } from '../componentes/Interfaz.tsx'
import { useAutenticacion } from '../contexto/ProveedorAutenticacion.tsx'
import { useServicios } from '../contexto/ProveedorServicios.tsx'
import { mensajeDe } from '../dominio/errores.ts'
import type { ResumenResultado } from '../dominio/tipos.ts'

export function Historial() {
  const { sala } = useServicios()
  const { token, perfil } = useAutenticacion()
  const [lista, setLista] = useState<ResumenResultado[]>([])
  const [error, setError] = useState<string | null>(null)
  const [cargando, setCargando] = useState(true)

  function cargar() {
    if (!token) return
    setCargando(true)
    sala
      .historial(token)
      .then((datos) => {
        setLista(datos)
        setError(null)
      })
      .catch((err: unknown) => setError(mensajeDe(err)))
      .finally(() => setCargando(false))
  }

  useEffect(() => {
    cargar()
  }, [sala, token])

  if (cargando) return <EstadoCarga />
  if (error) return <EstadoError mensaje={error} onReintentar={cargar} />
  if (lista.length === 0) {
    return <EstadoVacio titulo="No hay partidas terminadas" detalle="Cuando cierres una sesión, su clasificación quedará aquí." />
  }

  return (
    <section>
      <h1>Historial de resultados</h1>
      <div className="clasificacion">
        {lista.map((resultado) => {
          const mio = resultado.participantes.find((participante) => participante.perfilId === perfil?.id)
          return (
            <article className="puesto" key={resultado.codigo}>
              <span className="lugar">{resultado.participantes.length}</span>
              <div>
                <strong>{resultado.titulo}</strong>
                <p className="meta">
                  Código {resultado.codigo}
                  {mio ? ` · ${mio.puntaje} puntos` : ''}
                </p>
              </div>
              <Link to={`/resultados/${resultado.codigo}`}>Ver</Link>
            </article>
          )
        })}
      </div>
    </section>
  )
}
