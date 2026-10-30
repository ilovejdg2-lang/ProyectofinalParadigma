import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { EstadoCarga, EstadoError, EstadoVacio } from '../componentes/Interfaz.tsx'
import { useAutenticacion } from '../contexto/ProveedorAutenticacion.tsx'
import { useServicios } from '../contexto/ProveedorServicios.tsx'
import { mensajeDe } from '../dominio/errores.ts'
import type { ProgresoUsuario, ResumenResultado } from '../dominio/tipos.ts'

function esMismoUsuario(a: string | undefined, b: string | undefined): boolean {
  if (!a || !b) return false
  if (a === b) return true
  const demos = new Set(['perfil-demo', 'perfil-demo-docente'])
  return demos.has(a) && demos.has(b)
}

export function Historial() {
  const { sala } = useServicios()
  const { token, perfil } = useAutenticacion()
  const [lista, setLista] = useState<ResumenResultado[]>([])
  const [progreso, setProgreso] = useState<ProgresoUsuario | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [cargando, setCargando] = useState(true)

  function cargar() {
    if (!token) return
    setCargando(true)
    Promise.all([sala.historial(token), sala.progreso(token).catch(() => null)])
      .then(([datos, avance]) => {
        setLista(datos)
        setProgreso(avance)
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
      {progreso ? (
        <section className="panel" aria-label="Progreso del usuario" style={{ marginBottom: '1.25rem' }}>
          <h2>Progreso de {progreso.nombre}</h2>
          <p className="meta">
            Partidas jugadas: <strong>{progreso.partidasJugadas}</strong> · Puntaje total:{' '}
            <strong>{progreso.puntajeTotal}</strong> · Precisión:{' '}
            <strong>{progreso.promedioPorcentaje}%</strong> · Dominio Kanban:{' '}
            <strong>{progreso.dominioKanban.porcentajeDominio}%</strong>
          </p>
          {progreso.progresoPorCategoria.length > 0 ? (
            <div className="fila" style={{ flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.5rem' }}>
              {progreso.progresoPorCategoria.map((item) => (
                <span className="etiqueta" key={item.categoria}>
                  {item.categoria}: {item.porcentajeDominio}% ({item.partidasCompletadas}{' '}
                  {item.partidasCompletadas === 1 ? 'partida' : 'partidas'})
                </span>
              ))}
            </div>
          ) : null}
        </section>
      ) : null}
      <div className="clasificacion">
        {lista.map((resultado) => {
          const mio = resultado.participantes.find((participante) => esMismoUsuario(participante.perfilId, perfil?.id))
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
