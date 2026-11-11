import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { CheckCircle2, ClipboardList, Gamepad2, GraduationCap } from 'lucide-react'
import { EstadoCarga, EstadoError } from '../componentes/Interfaz.tsx'
import { useAutenticacion } from '../contexto/ProveedorAutenticacion.tsx'
import { useServicios } from '../contexto/ProveedorServicios.tsx'
import { mensajeDe } from '../dominio/errores.ts'
import type { ConfiguracionSala, Cuestionario } from '../dominio/tipos.ts'
import { prepararPestanaSala, publicarSala } from '../juego/abrirSala.ts'
import { crearCurso, listarCursos, type CursoDocente } from '../servicios/cursos.ts'
import { notaDeAciertos, aporteDe } from './notaVisible.ts'

type Modo = 'practica' | 'evaluacion'

export function ConfigurarSesion() {
  const { id = '' } = useParams()
  const { actividades, sala } = useServicios()
  const { token, perfil } = useAutenticacion()
  const esDocente = perfil?.rol === 'teacher' || perfil?.rol === 'admin'
  const navegar = useNavigate()
  const [cuestionario, setCuestionario] = useState<Cuestionario | null>(null)
  const [cursos, setCursos] = useState<CursoDocente[]>([])
  const [modo, setModo] = useState<Modo>('practica')
  const [cursoId, setCursoId] = useState('')
  const [nombre, setNombre] = useState('')
  const [notaMaxima, setNotaMaxima] = useState(100)
  const [valor, setValor] = useState(10)
  const [notaMinima, setNotaMinima] = useState(70)
  const [minijuegos, setMinijuegos] = useState(true)
  const [cada, setCada] = useState(3)
  const [duracion, setDuracion] = useState(8)
  const [velocidad, setVelocidad] = useState(true)
  const [cursoNuevo, setCursoNuevo] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [cargando, setCargando] = useState(true)
  const [creando, setCreando] = useState(false)
  const [enlaceManual, setEnlaceManual] = useState<string | null>(null)

  useEffect(() => {
    let activo = true
    Promise.all([actividades.obtener(id), token ? listarCursos(token) : Promise.resolve([])])
      .then(([dato, lista]) => {
        if (!activo) return
        setCuestionario(dato)
        setNombre(dato.titulo)
        setCursos(lista)
        setCursoId(lista[0]?.id ?? '')
      })
      .catch((err: unknown) => {
        if (activo) setError(mensajeDe(err))
      })
      .finally(() => {
        if (activo) setCargando(false)
      })
    return () => {
      activo = false
    }
  }, [actividades, id, token])

  const preguntas = cuestionario?.preguntas.length ?? 0
  const ejemploAciertos = Math.round(preguntas * 0.8)
  const ejemploNota = notaDeAciertos(ejemploAciertos, preguntas, notaMaxima)
  const ejemploAporte = aporteDe(ejemploNota, notaMaxima, valor)
  const curso = cursos.find((item) => item.id === cursoId)

  async function agregarCurso() {
    if (!token || cursoNuevo.trim().length < 2) return
    try {
      const creado = await crearCurso(token, cursoNuevo.trim())
      setCursos((actual) => [...actual, creado].sort((a, b) => a.nombre.localeCompare(b.nombre)))
      setCursoId(creado.id)
      setCursoNuevo('')
      setError(null)
    } catch (err) {
      setError(mensajeDe(err))
    }
  }

  async function crearSala() {
    if (!token || !cuestionario) return
    if (preguntas < 1) {
      setError('El cuestionario no tiene preguntas evaluables.')
      return
    }
    if (esDocente && modo === 'evaluacion' && !cursoId) {
      setError('Elige el curso de la evaluación.')
      return
    }
    if (esDocente && modo === 'evaluacion' && (notaMaxima < 1 || valor < 1 || valor > 100 || notaMinima > notaMaxima)) {
      setError('Revisa la nota máxima, el porcentaje y la nota mínima.')
      return
    }
    const modoSala = esDocente ? modo : 'practica'
    const config: ConfiguracionSala = {
      modo: modoSala,
      cursoId: esDocente && modoSala === 'evaluacion' ? cursoId || undefined : undefined,
      nombreEvaluacion: modoSala === 'evaluacion' ? nombre.trim() || cuestionario.titulo : undefined,
      notaMaxima,
      valorPorcentaje: modoSala === 'evaluacion' ? valor : undefined,
      notaMinima,
      modalidad: modoSala === 'evaluacion' ? 'academico' : 'competitivo',
      minijuegosActivos: minijuegos,
      cadaPreguntas: cada,
      duracionMinijuego: duracion,
      velocidadActiva: modoSala === 'evaluacion' ? false : velocidad,
      tiposMinijuego: ['cofres', 'ruleta', 'estrellas', 'memoria', 'bomba'],
    }
    const ventana = prepararPestanaSala()
    setCreando(true)
    setEnlaceManual(null)
    try {
      const creada = await sala.crear(token, cuestionario.id, config)
      const publicada = publicarSala(ventana, creada.codigo)
      if (!publicada.abierta) setEnlaceManual(publicada.url)
    } catch (err) {
      if (ventana && !ventana.closed) ventana.close()
      setError(mensajeDe(err))
    } finally {
      setCreando(false)
    }
  }

  if (cargando) return <EstadoCarga />
  if (!cuestionario) return <EstadoError mensaje={error ?? 'No se encontró el cuestionario.'} />

  return (
    <form
      className="configurar-sesion"
      onSubmit={(evento) => {
        evento.preventDefault()
        void crearSala()
      }}
    >
      <header className="configurar-cabeza">
        <div>
          <h1>Configurar sesión</h1>
          <p>
            {esDocente
              ? 'Personaliza cómo quieres realizar este cuestionario con tus estudiantes.'
              : 'Esta partida es solo un juego. No cuenta en ningún curso ni genera nota.'}
          </p>
        </div>
        <p className="meta">{cuestionario.titulo}</p>
      </header>

      {esDocente ? (
        <div className="configurar-modos">
          <button type="button" className={modo === 'practica' ? 'modo-sesion activo' : 'modo-sesion'} aria-pressed={modo === 'practica'} onClick={() => setModo('practica')}>
            <Gamepad2 aria-hidden="true" />
            <strong>Partida de juego</strong>
            <span>Juega sin generar una calificación. Puede entrar cualquiera con el código.</span>
            {modo === 'practica' ? <CheckCircle2 className="modo-marca" aria-hidden="true" /> : null}
          </button>
          <button type="button" className={modo === 'evaluacion' ? 'modo-sesion activo evaluacion' : 'modo-sesion'} aria-pressed={modo === 'evaluacion'} onClick={() => { setModo('evaluacion'); setCursoId((actual) => actual || cursos[0]?.id || '') }}>
            <GraduationCap aria-hidden="true" />
            <strong>Evaluación calificada</strong>
            <span>Asigna el cuestionario a uno de tus cursos y califica a esos estudiantes.</span>
            {modo === 'evaluacion' ? <CheckCircle2 className="modo-marca" aria-hidden="true" /> : null}
          </button>
        </div>
      ) : (
        <p className="configurar-ayuda">Como estudiante, la sala queda en modo juego aunque el cuestionario exista en un curso.</p>
      )}

      {esDocente && modo === 'evaluacion' ? (
        <>
          <label className="configurar-campo">
            Curso
            <select value={cursoId} onChange={(evento) => setCursoId(evento.target.value)}>
              {cursos.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.nombre}
                </option>
              ))}
            </select>
          </label>
          <p className="configurar-ayuda">
            Solo entran los estudiantes asignados a este curso. Quien esté en otro curso no puede unirse a la evaluación.
          </p>
          <div className="configurar-nuevo-curso">
            <input value={cursoNuevo} onChange={(evento) => setCursoNuevo(evento.target.value)} placeholder="Nuevo curso" maxLength={80} aria-label="Nombre del curso nuevo" />
            <button className="boton" type="button" onClick={() => void agregarCurso()}>
              Crear curso
            </button>
          </div>
        </>
      ) : null}

      {modo === 'evaluacion' ? (
        <section className="configurar-notas" aria-labelledby="titulo-nota">
          <h2 id="titulo-nota">
            <ClipboardList aria-hidden="true" /> Configuración de calificación
          </h2>
          <p>La nota usa solo las respuestas correctas. La velocidad y los minijuegos no cambian la calificación.</p>
          <label>
            Nombre de la evaluación
            <input value={nombre} onChange={(evento) => setNombre(evento.target.value)} maxLength={80} required />
          </label>
          <div className="configurar-par">
            <label>
              Nota máxima
              <input type="number" min={1} max={1000} value={notaMaxima} onChange={(evento) => setNotaMaxima(Number(evento.target.value))} required />
            </label>
            <label>
              Valor en el curso (%)
              <input type="number" min={1} max={100} value={valor} onChange={(evento) => setValor(Number(evento.target.value))} required />
            </label>
            <label>
              Nota mínima de aprobación
              <input type="number" min={0} max={notaMaxima} value={notaMinima} onChange={(evento) => setNotaMinima(Number(evento.target.value))} required />
            </label>
          </div>
          <div className="configurar-ejemplo">
            <strong>Ejemplo de calificación</strong>
            <p>
              Con {ejemploAciertos} respuestas correctas de {preguntas} {preguntas === 1 ? 'pregunta' : 'preguntas'}:
            </p>
            <p>
              Nota obtenida <b>{ejemploNota} / {notaMaxima}</b>
            </p>
            <p>
              Aporte a la nota final <b>{ejemploAporte} puntos porcentuales</b>
            </p>
          </div>
        </section>
      ) : null}

      <section className="configurar-notas" aria-labelledby="titulo-minijuegos">
        <h2 id="titulo-minijuegos">Minijuegos</h2>
        <p>
          {modo === 'evaluacion'
            ? 'En una evaluación son pausas recreativas. No suman ni restan puntos de la nota.'
            : 'En la partida competitiva dan puntos, rachas y bonificación por responder rápido.'}
        </p>
        <label className="configurar-campo">
          <span>Minijuegos activados</span>
          <input type="checkbox" checked={minijuegos} onChange={(evento) => setMinijuegos(evento.target.checked)} />
        </label>
        <div className="configurar-par">
          <label>
            Cada cuántas preguntas
            <input type="number" min={1} max={20} value={cada} disabled={!minijuegos} onChange={(evento) => setCada(Number(evento.target.value))} />
          </label>
          <label>
            Duración (segundos)
            <input type="number" min={5} max={20} value={duracion} disabled={!minijuegos} onChange={(evento) => setDuracion(Number(evento.target.value))} />
          </label>
        </div>
        {modo === 'practica' ? (
          <label className="configurar-campo">
            <span>Bonificación por velocidad</span>
            <input type="checkbox" checked={velocidad} onChange={(evento) => setVelocidad(evento.target.checked)} />
          </label>
        ) : null}
      </section>

      <section className="configurar-resumen" aria-label="Opciones de la sesión">
        <h2>Opciones de la sesión</h2>
        <ul>
          <li>Cuestionario: {cuestionario.titulo}</li>
          <li>Tipo: {esDocente && modo === 'evaluacion' ? 'Evaluación académica' : 'Juego'}</li>
          <li>Minijuegos: {minijuegos ? `sí, cada ${cada} preguntas` : 'no'}</li>
          {modo === 'practica' ? <li>Velocidad: {velocidad ? 'suma puntos extra' : 'desactivada'}</li> : <li>Velocidad: no afecta la nota</li>}
          <li>Curso: {esDocente && modo === 'evaluacion' ? curso?.nombre ?? 'Ninguno' : 'No cuenta'}</li>
          <li>Preguntas: {preguntas}</li>
          <li>Tiempo: el de cada pregunta, o 20 segundos</li>
          {modo === 'evaluacion' ? <li>Valor académico: {valor}% de la nota, sobre {notaMaxima}</li> : null}
        </ul>
      </section>

      {error ? <p className="error-texto" role="alert">{error}</p> : null}
      {enlaceManual ? (
        <p>
          El navegador bloqueó la pestaña nueva. <a href={enlaceManual}>Abrir la sala</a>
        </p>
      ) : null}
      <div className="configurar-acciones">
        <button className="boton" type="button" onClick={() => navegar(-1)}>
          Volver
        </button>
        <button className="boton grande" type="submit" disabled={creando || preguntas < 1}>
          {creando ? 'Creando sala…' : 'Crear sala y continuar'}
        </button>
      </div>
    </form>
  )
}
