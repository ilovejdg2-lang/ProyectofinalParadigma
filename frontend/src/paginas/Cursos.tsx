import { useEffect, useState, type FormEvent } from 'react'
import { useAutenticacion } from '../contexto/ProveedorAutenticacion.tsx'
import { mensajeDe } from '../dominio/errores.ts'
import {
  asignarEstudiante,
  buscarEstudiante,
  crearCurso,
  listarCursos,
  listarMatriculas,
  type CursoDocente,
  type EstudianteCurso,
} from '../servicios/cursos.ts'
import { primerNombre, saludoDelDia } from './cursoDatos.ts'

export function Cursos() {
  const { perfil, token } = useAutenticacion()
  const esDocente = perfil?.rol === 'teacher' || perfil?.rol === 'admin'
  const nombre = primerNombre(perfil?.nombre)
  const [cursos, setCursos] = useState<CursoDocente[]>([])
  const [alumnos, setAlumnos] = useState<Record<string, EstudianteCurso[]>>({})
  const [nombreCurso, setNombreCurso] = useState('')
  const [correos, setCorreos] = useState<Record<string, string>>({})
  const [error, setError] = useState<string | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)
  const [cargando, setCargando] = useState(true)

  async function cargar(sesion: string) {
    const lista = await listarCursos(sesion)
    setCursos(lista)
    if (!esDocente) {
      setAlumnos({})
      return
    }
    const grupos = await Promise.all(
      lista.map(async (curso) => [curso.id, await listarMatriculas(sesion, curso.id).catch(() => [])] as const),
    )
    setAlumnos(Object.fromEntries(grupos))
  }

  useEffect(() => {
    if (!token) return
    let activo = true
    cargar(token)
      .catch((err: unknown) => {
        if (activo) setError(mensajeDe(err))
      })
      .finally(() => {
        if (activo) setCargando(false)
      })
    return () => {
      activo = false
    }
  }, [esDocente, token])

  async function crear(evento: FormEvent) {
    evento.preventDefault()
    if (!token || nombreCurso.trim().length < 2) return
    setError(null)
    try {
      await crearCurso(token, nombreCurso.trim())
      setNombreCurso('')
      setAviso('Curso creado. Solo tú lo ves y puedes asignarle estudiantes.')
      await cargar(token)
    } catch (err) {
      setError(mensajeDe(err))
    }
  }

  async function asignar(cursoId: string) {
    if (!token) return
    const correo = (correos[cursoId] ?? '').trim().toLowerCase()
    if (!correo.includes('@')) {
      setError('Escribe el correo de la cuenta del estudiante.')
      return
    }
    setError(null)
    try {
      const estudiante = await buscarEstudiante(token, correo)
      await asignarEstudiante(token, cursoId, estudiante.id, estudiante.nombre)
      setCorreos((actual) => ({ ...actual, [cursoId]: '' }))
      setAviso(`${estudiante.nombre} quedó en el curso.`)
      await cargar(token)
    } catch (err) {
      setError(mensajeDe(err))
    }
  }

  return (
    <div className="panel-cursos">
      <header className="panel-cursos-saludo">
        <h1>
          {saludoDelDia()}, <span>{nombre}</span>!
        </h1>
        <p>
          {esDocente
            ? 'Crea tus cursos y asigna estudiantes. No ves los cursos de otros profesores.'
            : 'Aquí aparecen solo los cursos que un profesor te asignó. Los cuestionarios que creas son juego y no cuentan en la nota.'}
        </p>
      </header>

      <section className="panel-cursos-bloque" aria-labelledby="titulo-cursos">
        <h2 id="titulo-cursos">{esDocente ? 'Tus cursos' : 'Cursos asignados'}</h2>
        {cargando ? <p>Cargando cursos…</p> : null}
        {error ? <p className="error-texto" role="alert">{error}</p> : null}
        {aviso ? <p className="configurar-ayuda">{aviso}</p> : null}
        {!cargando && cursos.length === 0 ? (
          <p>{esDocente ? 'Todavía no has creado un curso.' : 'Ningún profesor te ha asignado un curso.'}</p>
        ) : null}
        <div className="cursos-lista">
          {cursos.map((curso) => (
            <article className="curso-fila" key={curso.id}>
              <header>
                <strong>{curso.nombre}</strong>
                <span>{curso.estudiantes} {curso.estudiantes === 1 ? 'estudiante' : 'estudiantes'}</span>
              </header>
              {esDocente ? (
                <>
                  <form
                    className="curso-asignar"
                    onSubmit={(evento) => {
                      evento.preventDefault()
                      void asignar(curso.id)
                    }}
                  >
                    <input
                      type="email"
                      value={correos[curso.id] ?? ''}
                      placeholder="correo del estudiante"
                      aria-label={`Correo para asignar a ${curso.nombre}`}
                      onChange={(evento) => setCorreos((actual) => ({ ...actual, [curso.id]: evento.target.value }))}
                    />
                    <button className="boton" type="submit">Asignar</button>
                  </form>
                  {(alumnos[curso.id] ?? []).length > 0 ? (
                    <ul className="curso-alumnos">
                      {(alumnos[curso.id] ?? []).map((alumno) => (
                        <li key={alumno.estudianteId}>{alumno.nombre}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="configurar-ayuda">Sin estudiantes asignados.</p>
                  )}
                </>
              ) : null}
            </article>
          ))}
        </div>
        {esDocente ? (
          <form className="cursos-nuevo" onSubmit={(evento) => void crear(evento)}>
            <input
              value={nombreCurso}
              onChange={(evento) => setNombreCurso(evento.target.value)}
              placeholder="Nombre del curso"
              aria-label="Nombre del curso"
              maxLength={80}
            />
            <button className="boton" type="submit">Crear curso</button>
          </form>
        ) : null}
      </section>
    </div>
  )
}
