import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { EstadoCarga, EstadoError } from '../componentes/Interfaz.tsx'
import { useAutenticacion } from '../contexto/ProveedorAutenticacion.tsx'
import { mensajeDe } from '../dominio/errores.ts'
import { descargarNotas, detalleEvaluacion, type EvaluacionCurso } from '../servicios/cursos.ts'

export function ResultadoEvaluacion() {
  const { codigo = '' } = useParams()
  const { token, perfil } = useAutenticacion()
  const docente = perfil?.rol === 'teacher' || perfil?.rol === 'admin'
  const [dato, setDato] = useState<EvaluacionCurso | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!token) return
    let activo = true
    detalleEvaluacion(token, codigo)
      .then((fila) => {
        if (activo) setDato(fila)
      })
      .catch((err: unknown) => {
        if (activo) setError(mensajeDe(err))
      })
    return () => {
      activo = false
    }
  }, [codigo, token])

  if (error) return <EstadoError mensaje={error} />
  if (!dato) return <EstadoCarga />

  const fecha = dato.fecha ? new Date(dato.fecha).toLocaleString() : 'Sin cerrar'

  return (
    <section className="resultado-evaluacion">
      <header>
        <h1>Resultados de la evaluación</h1>
        <p>
          {dato.nombre} · {dato.cursoNombre ?? 'Curso'} · {fecha}
        </p>
      </header>
      {docente ? (
        <ul className="resultado-resumen">
          <li><span>Participantes</span><strong>{dato.participantes}</strong></li>
          <li><span>Promedio</span><strong>{dato.promedio ?? '—'}</strong></li>
          <li><span>Nota más alta</span><strong>{dato.notaAlta ?? '—'}</strong></li>
          <li><span>Nota más baja</span><strong>{dato.notaBaja ?? '—'}</strong></li>
          <li><span>Aprobación</span><strong>{dato.aprobacion === null ? '—' : `${dato.aprobacion}%`}</strong></li>
        </ul>
      ) : null}
      <div className="tabla-evaluacion">
        <table>
          <thead>
            <tr>
              <th>Estudiante</th>
              <th>Aciertos</th>
              <th>Nota</th>
              <th>Aporte</th>
              <th>Posición</th>
            </tr>
          </thead>
          <tbody>
            {dato.calificaciones.map((nota) => (
              <tr key={nota.estudianteId}>
                <td>{nota.nombre}</td>
                <td>{nota.aciertos}/{nota.total}</td>
                <td>{nota.nota}/{nota.notaMaxima}</td>
                <td>{nota.aporte}%</td>
                <td>{nota.posicion}.º</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="configurar-acciones">
        {docente && token ? (
          <button className="boton" type="button" onClick={() => void descargarNotas(token, dato.codigo).catch((err: unknown) => setError(mensajeDe(err)))}>
            Exportar CSV
          </button>
        ) : null}
        <Link className="boton" to={`/resultados/${dato.codigo}`}>Ver podio</Link>
        <Link className="boton-fantasma" to="/cursos/paradigmas/calificaciones">Volver al curso</Link>
      </div>
      <p className="meta">El aporte son puntos de la nota final del curso. La posición es la del podio, no la de la nota.</p>
    </section>
  )
}
