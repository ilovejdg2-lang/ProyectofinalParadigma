import { useEffect, useState, type FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useAutenticacion } from '../contexto/ProveedorAutenticacion.tsx'
import { evaluacionesDelCurso, type EvaluacionCurso } from '../servicios/cursos.ts'
import {
  ACTIVIDADES_CURSO,
  COLUMNAS_CURSO,
  MATERIALES_CURSO,
  type ActividadCurso,
} from './cursoDatos.ts'
import { PortadaCurso } from './PortadaCurso.tsx'

type Seccion = 'actividades' | 'asistencia' | 'materiales'
type Vista = 'tablero' | 'lista'

const ASISTENCIA = [
  { fecha: 'Semana 1', estado: 'Presente' },
  { fecha: 'Semana 2', estado: 'Presente' },
  { fecha: 'Semana 3', estado: 'Ausente' },
  { fecha: 'Semana 4', estado: 'Presente' },
]

export function VistaCurso() {
  const { seccion: seccionRuta } = useParams()
  const [pestana, setPestana] = useState<Seccion>('actividades')
  const [vista, setVista] = useState<Vista>('tablero')
  const [comentario, setComentario] = useState('')
  const [publicado, setPublicado] = useState('')

  if (seccionRuta === 'calificaciones') return <Calificaciones />
  if (seccionRuta === 'voz') {
    return (
      <VozCurso
        comentario={comentario}
        publicado={publicado}
        onComentario={setComentario}
        onPublicar={(evento) => {
          evento.preventDefault()
          const texto = comentario.trim()
          if (!texto) return
          setPublicado(texto)
          setComentario('')
        }}
      />
    )
  }

  return (
    <div className="vista-curso">
      <CabeceraCurso />
      <div className="curso-pestanas" role="tablist" aria-label="Contenido del curso">
        <button type="button" role="tab" aria-selected={pestana === 'actividades'} className={pestana === 'actividades' ? 'activa' : ''} onClick={() => setPestana('actividades')}>
          <IconoBarras /> Actividades
        </button>
        <button type="button" role="tab" aria-selected={pestana === 'asistencia'} className={pestana === 'asistencia' ? 'activa' : ''} onClick={() => setPestana('asistencia')}>
          <IconoCalendario /> Asistencia
        </button>
        <button type="button" role="tab" aria-selected={pestana === 'materiales'} className={pestana === 'materiales' ? 'activa' : ''} onClick={() => setPestana('materiales')}>
          <IconoCaja /> Materiales
        </button>
      </div>

      {pestana === 'actividades' ? (
        <section className="curso-actividades" aria-labelledby="titulo-actividades">
          <div className="curso-actividades-cabeza">
            <div>
              <h2 id="titulo-actividades">Actividades</h2>
              <p>Esta es una pizarra con 3 pasos simples para que visualices el progreso de las actividades de tu curso.</p>
            </div>
            <div className="curso-vista" role="group" aria-label="Forma de ver las actividades">
              <button type="button" className={vista === 'tablero' ? 'activa' : ''} aria-pressed={vista === 'tablero'} onClick={() => setVista('tablero')}>
                <IconoTablero /> Tablero
              </button>
              <button type="button" className={vista === 'lista' ? 'activa' : ''} aria-pressed={vista === 'lista'} onClick={() => setVista('lista')}>
                <IconoLista /> Lista
              </button>
            </div>
          </div>
          {vista === 'tablero' ? <Tablero /> : <Lista />}
        </section>
      ) : null}

      {pestana === 'asistencia' ? (
        <section className="curso-panel-simple" aria-labelledby="titulo-asistencia">
          <h2 id="titulo-asistencia">Asistencia</h2>
          <ul className="curso-asistencia">
            {ASISTENCIA.map((fila) => (
              <li key={fila.fecha}>
                <span>{fila.fecha}</span>
                <strong className={fila.estado === 'Presente' ? 'ok' : 'no'}>{fila.estado}</strong>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {pestana === 'materiales' ? (
        <section className="curso-panel-simple" aria-labelledby="titulo-materiales">
          <h2 id="titulo-materiales">Materiales</h2>
          <div className="curso-materiales">
            {MATERIALES_CURSO.map((item) => (
              <article key={item.id}>
                <h3>{item.titulo}</h3>
                <p>{item.detalle}</p>
                <Link to={`/cuestionarios/${item.id}`}>Abrir material</Link>
              </article>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  )
}

function IconoBarras() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M5 19V9M12 19V5M19 19v-7" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}

function IconoCalendario() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="4" y="6" width="16" height="14" rx="2" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <path d="M8 4v4M16 4v4M4 10h16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}

function IconoCaja() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 8l8-4 8 4-8 4zM4 8v8l8 4 8-4V8" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
    </svg>
  )
}

function IconoTablero() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="4" y="4" width="6" height="6" rx="1" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <rect x="14" y="4" width="6" height="6" rx="1" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <rect x="4" y="14" width="6" height="6" rx="1" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <rect x="14" y="14" width="6" height="6" rx="1" fill="none" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  )
}

function IconoLista() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M9 7h10M9 12h10M9 17h10M5 7h.01M5 12h.01M5 17h.01" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}

function CabeceraCurso() {
  return (
    <header className="curso-hero">
      <PortadaCurso />
      <div className="curso-hero-texto">
        <span className="curso-hero-icono" aria-hidden="true">
          <svg viewBox="0 0 24 24">
            <path d="M5 5h9a2 2 0 0 1 2 2v12H7a2 2 0 0 1-2-2z" fill="none" stroke="currentColor" strokeWidth="1.8" />
            <path d="M8 9h5M8 13h5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        </span>
        <div>
          <h1>Paradigmas de Programación</h1>
          <p>Actividades y Materiales del curso</p>
        </div>
      </div>
    </header>
  )
}

function Tablero() {
  return (
    <div className="curso-tablero">
      {COLUMNAS_CURSO.map((columna) => {
        const items = ACTIVIDADES_CURSO.filter((item) => item.columna === columna.id)
        const mostradas = items.some((item) => item.destacada) ? items.filter((item) => item.destacada) : items
        return (
          <section key={columna.id} className={columna.id} aria-labelledby={`columna-${columna.id}`}>
            <header>
              <h3 id={`columna-${columna.id}`}>{columna.titulo}</h3>
              <span>{items.length}</span>
            </header>
            {items.length === 0 ? <p className="curso-vacio">Nada en este paso.</p> : null}
            <div className="curso-columna-lista">
              {mostradas.map((item) => (
                <TarjetaActividad key={item.id} item={item} />
              ))}
            </div>
          </section>
        )
      })}
    </div>
  )
}

function Lista() {
  return (
    <ul className="curso-lista-actividades">
      {ACTIVIDADES_CURSO.map((item) => (
        <li key={item.id} id={item.id}>
          <strong>{item.titulo}</strong>
          <span>{item.tipo}</span>
          <span>{item.valor}</span>
          <span>{item.estado}</span>
        </li>
      ))}
    </ul>
  )
}

function TarjetaActividad({ item }: { item: ActividadCurso }) {
  const pendiente = item.estado === 'No Entregado'
  return (
    <article className={pendiente ? 'actividad-curso pendiente' : 'actividad-curso lista'} id={item.id}>
      <strong>{item.titulo}</strong>
      <span className="actividad-tipo">{item.tipo}</span>
      <p>{item.valor}</p>
      <div className="actividad-estado">
        <p className={pendiente ? 'estado-pildora peligro' : 'estado-pildora ok'}>
          <span aria-hidden="true">{pendiente ? '×' : '✓'}</span>
          {item.estado}
        </p>
        {item.detalle ? <small>{item.detalle}</small> : null}
      </div>
    </article>
  )
}

function Calificaciones() {
  const { token, perfil } = useAutenticacion()
  const docente = perfil?.rol === 'teacher' || perfil?.rol === 'admin'
  const [evaluaciones, setEvaluaciones] = useState<EvaluacionCurso[]>([])

  useEffect(() => {
    if (!token) return
    let activo = true
    evaluacionesDelCurso(token, 'curso-paradigmas')
      .then((lista) => {
        if (activo) setEvaluaciones(lista)
      })
      .catch(() => {
        if (activo) setEvaluaciones([])
      })
    return () => {
      activo = false
    }
  }, [token])

  return (
    <div className="vista-curso">
      <CabeceraCurso />
      <section className="curso-panel-simple" aria-labelledby="titulo-eval">
        <h2 id="titulo-eval">{docente ? 'Evaluaciones del curso' : 'Mis calificaciones'}</h2>
        {evaluaciones.length === 0 ? <p>Todavía no hay una evaluación cerrada en este curso.</p> : null}
        <ul className="curso-notas">
          {evaluaciones.map((item) => {
            const propia = item.calificaciones[0]
            return (
              <li key={item.codigo}>
                <strong>{item.nombre}</strong>
                <span>{item.valorPorcentaje}%</span>
                <span>{docente ? `Promedio ${item.promedio ?? '—'}` : propia ? `${propia.nota}/${propia.notaMaxima}` : 'Sin nota'}</span>
                <Link to={`/evaluaciones/${item.codigo}`}>Ver</Link>
              </li>
            )
          })}
        </ul>
      </section>
      <section className="curso-panel-simple" aria-labelledby="titulo-notas">
        <h2 id="titulo-notas">Actividades del tablero</h2>
        <ul className="curso-notas">
          {ACTIVIDADES_CURSO.map((item) => (
            <li key={item.id}>
              <strong>{item.titulo}</strong>
              <span>{item.valor.replace('Valor: ', '')}</span>
              <span>{item.estado}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}

function VozCurso({
  comentario,
  publicado,
  onComentario,
  onPublicar,
}: {
  comentario: string
  publicado: string
  onComentario: (valor: string) => void
  onPublicar: (evento: FormEvent) => void
}) {
  return (
    <div className="vista-curso">
      <CabeceraCurso />
      <section className="curso-panel-simple" aria-labelledby="titulo-voz">
        <h2 id="titulo-voz">Tu voz en el curso</h2>
        <p>Comparte tu experiencia de forma anónima. El comentario se queda en esta sesión.</p>
        <form onSubmit={onPublicar}>
          <label htmlFor="voz-curso">Tu comentario</label>
          <textarea id="voz-curso" value={comentario} onChange={(evento) => onComentario(evento.target.value)} rows={4} />
          <button className="boton" type="submit">Publicar</button>
        </form>
        {publicado ? <p className="curso-publicado">Publicado en esta sesión: {publicado}</p> : null}
      </section>
    </div>
  )
}
