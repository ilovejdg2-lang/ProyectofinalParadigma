import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CalendarDays,
  ChartNoAxesColumnIncreasing,
  CheckCircle2,
  EllipsisVertical,
  Gamepad2,
  GitBranch,
  GraduationCap,
  IdCard,
  Lightbulb,
  LockKeyhole,
  Mail,
  Medal,
  Pencil,
  ShieldCheck,
  Star,
  Target,
  TrendingUp,
  Trophy,
  UserRound,
  Users,
  Zap,
} from 'lucide-react'
import { EstadoError } from '../componentes/Interfaz.tsx'
import { useAutenticacion } from '../contexto/ProveedorAutenticacion.tsx'
import { useServicios } from '../contexto/ProveedorServicios.tsx'
import { mensajeDe } from '../dominio/errores.ts'
import type { Cuestionario, ProgresoUsuario, ResumenResultado } from '../dominio/tipos.ts'
import {
  analizarCuestionario,
  claveGithub,
  consejosDocente,
  consejosEstudiante,
  filasCuestionarios,
  formatearFecha,
  formatearNumero,
  iniciales,
  mejorPosicion,
  metricasDocente,
  normalizarGithub,
  partidasDelEstudiante,
  type AnalisisCuestionario,
  type Consejo,
  type FilaCuestionario,
  type FilaPartida,
} from './perfilMetricas.ts'

export function Perfil() {
  const navegar = useNavigate()
  const { autenticacion, sala, actividades } = useServicios()
  const { perfil, token, entrar } = useAutenticacion()
  const esDocente = perfil?.rol === 'teacher' || perfil?.rol === 'admin'
  const [historial, setHistorial] = useState<ResumenResultado[]>([])
  const [progreso, setProgreso] = useState<ProgresoUsuario | null>(null)
  const [cuestionarios, setCuestionarios] = useState<Cuestionario[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editar, setEditar] = useState(false)
  const [clave, setClave] = useState(false)
  const [github, setGithub] = useState(false)
  const [githubActual, setGithubActual] = useState('')
  const [analisis, setAnalisis] = useState<AnalisisCuestionario | null>(null)
  const [menu, setMenu] = useState<string | null>(null)
  const carga = useRef(0)

  function cargar() {
    if (!token || !perfil) return
    const id = ++carga.current
    setCargando(true)
    setError(null)
    const tareas: Promise<unknown>[] = [
      sala.historial(token),
      sala.progreso(token).catch(() => null),
    ]
    if (esDocente) tareas.push(actividades.mios(token))
    Promise.all(tareas)
      .then((valores) => {
        if (id !== carga.current) return
        setHistorial(valores[0] as ResumenResultado[])
        setProgreso(valores[1] as ProgresoUsuario | null)
        setCuestionarios(esDocente ? (valores[2] as Cuestionario[]) : [])
      })
      .catch((err: unknown) => {
        if (id !== carga.current) return
        setError(mensajeDe(err))
      })
      .finally(() => {
        if (id === carga.current) setCargando(false)
      })
  }

  useEffect(() => {
    cargar()
  }, [actividades, esDocente, perfil?.id, sala, token])

  useEffect(() => {
    if (!perfil) return
    setGithubActual(localStorage.getItem(claveGithub(perfil.id)) ?? '')
  }, [perfil])

  if (!perfil || !token) return null

  const filas = partidasDelEstudiante(historial, perfil.id)
  const mejor = mejorPosicion(filas)
  const promedio = progreso && progreso.partidasJugadas > 0
    ? Math.round(progreso.puntajeTotal / progreso.partidasJugadas)
    : null
  const docencia = metricasDocente(cuestionarios, historial, perfil.id)
  const recientes = filasCuestionarios(cuestionarios, historial, perfil.id)
  const consejos = error
    ? [{ texto: 'No se pudieron calcular recomendaciones porque faltó la actividad.', general: true }]
    : esDocente
      ? consejosDocente(cuestionarios, historial, perfil.id)
      : consejosEstudiante(progreso, filas)
  const cifra = (valor: string) => (cargando ? '…' : error ? '—' : valor)
  const rol = perfil.rol === 'admin' ? 'Administrador' : esDocente ? 'Profesor' : 'Estudiante'

  return (
    <div className="perfil-pagina">
      <header className="perfil-encabezado">
        <button className="perfil-volver" type="button" onClick={() => navegar(-1)}>
          <ArrowLeft size={16} aria-hidden="true" /> Volver
        </button>
        <div>
          <h1>Mi Perfil</h1>
          <p>
            {esDocente
              ? 'Gestiona tu información, seguridad y revisa tu rendimiento como docente.'
              : 'Gestiona tu información, seguridad y revisa tu rendimiento.'}
          </p>
        </div>
      </header>

      <div className="perfil-superior">
        <section className="perfil-card perfil-personal">
          <div className="perfil-card-cabeza">
            <h2><span className="perfil-ico verde"><UserRound size={18} aria-hidden="true" /></span> Información Personal</h2>
            <button className="perfil-boton-suave" type="button" onClick={() => setEditar(true)}>
              <Pencil size={15} aria-hidden="true" /> Editar Perfil
            </button>
          </div>
          <div className="perfil-identidad">
            <span className="perfil-avatar" aria-hidden="true">{iniciales(perfil.nombre)}</span>
            <div>
              <strong>{perfil.nombre}</strong>
              <p>
                <span className={esDocente ? 'perfil-badge profe' : 'perfil-badge estudiante'}>
                  {esDocente ? <GraduationCap size={13} aria-hidden="true" /> : <UserRound size={13} aria-hidden="true" />}
                  {rol}
                </span>
                <span>Cédula: No registrada</span>
              </p>
            </div>
          </div>
          <div className="perfil-datos">
            <Dato icono={<Mail size={16} aria-hidden="true" />} etiqueta="Correo institucional" valor={correoLegible(perfil.correo)} />
            <Dato icono={<IdCard size={16} aria-hidden="true" />} etiqueta="Cédula" valor="No registrada" />
            <Dato
              icono={<CalendarDays size={16} aria-hidden="true" />}
              etiqueta="Miembro desde"
              valor={perfil.creadoEn ? formatearFecha(perfil.creadoEn) : 'No registrada'}
            />
          </div>
        </section>

        <div className="perfil-lateral">
          <section className="perfil-card">
            <h2><span className="perfil-ico morado"><ShieldCheck size={18} aria-hidden="true" /></span> Seguridad de la Cuenta</h2>
            <p className="perfil-sub">Mantén tu cuenta protegida.</p>
            <button className="perfil-boton-clave" type="button" onClick={() => setClave(true)}>
              <LockKeyhole size={16} aria-hidden="true" /> Cambiar Contraseña
            </button>
          </section>
          <section className="perfil-card">
            <h2><span className="perfil-ico gris"><GitBranch size={18} aria-hidden="true" /></span> GitHub</h2>
            <p className={githubActual ? 'perfil-github' : 'perfil-github vacio'}>{githubActual || 'No configurado'}</p>
            <button className="perfil-boton-suave" type="button" onClick={() => setGithub(true)}>
              <Pencil size={15} aria-hidden="true" /> Editar GitHub
            </button>
          </section>
        </div>
      </div>

      <section className="perfil-card perfil-resumen">
        <div className="perfil-card-cabeza">
          <div>
            <h2>
              <span className="perfil-ico azul">
                {esDocente ? <ChartNoAxesColumnIncreasing size={18} aria-hidden="true" /> : <Trophy size={18} aria-hidden="true" />}
              </span>
              {esDocente ? 'Resumen de Actividad' : 'Resumen de Rendimiento'}
            </h2>
            <p className="perfil-sub">
              {esDocente ? 'Tu actividad como profesor en ProfeLink.' : 'Tu desempeño general en ProfeLink.'}
            </p>
          </div>
        </div>
        {error ? <EstadoError mensaje={error} onReintentar={cargar} /> : null}
        <div className="perfil-metricas">
          {esDocente ? (
            <>
              <Metrica icono={<BookOpen size={22} aria-hidden="true" />} etiqueta="Cuestionarios creados" valor={cifra(formatearNumero(docencia.cuestionarios))} tono="oro" />
              <Metrica icono={<Trophy size={22} aria-hidden="true" />} etiqueta="Partidas finalizadas" valor={cifra(formatearNumero(docencia.partidas))} tono="azul" />
              <Metrica icono={<Users size={22} aria-hidden="true" />} etiqueta="Participaciones" valor={cifra(formatearNumero(docencia.participaciones))} tono="verde" />
              <Metrica icono={<Target size={22} aria-hidden="true" />} etiqueta="Promedio de aciertos" valor={cifra(docencia.porcentaje === null ? 'Sin datos' : `${docencia.porcentaje}%`)} tono="morado" />
            </>
          ) : (
            <>
              <Metrica icono={<Gamepad2 size={22} aria-hidden="true" />} etiqueta="Partidas jugadas" valor={cifra(formatearNumero(progreso?.partidasJugadas ?? filas.length))} tono="oro" />
              <Metrica icono={<Star size={22} aria-hidden="true" />} etiqueta="Puntos totales" valor={cifra(formatearNumero(progreso?.puntajeTotal ?? 0))} tono="azul" />
              <Metrica icono={<Target size={22} aria-hidden="true" />} etiqueta="Promedio por partida" valor={cifra(promedio === null ? 'Sin datos' : `${formatearNumero(promedio)} pts`)} tono="oro" />
              <Metrica icono={<Medal size={22} aria-hidden="true" />} etiqueta="Mejor posición" valor={cifra(mejor === null ? 'Sin datos' : `${mejor}.º`)} tono="morado" />
            </>
          )}
          <Recomendaciones titulo={esDocente ? 'Recomendaciones de Mejora' : '¿Qué puedes mejorar?'} consejos={consejos} />
        </div>
      </section>

      {esDocente ? (
        <section className="perfil-card">
          <div className="perfil-card-cabeza">
            <div>
              <h2><span className="perfil-ico morado"><BookOpen size={18} aria-hidden="true" /></span> Cuestionarios Recientes</h2>
              <p className="perfil-sub">Detalle de los últimos cuestionarios que has creado.</p>
            </div>
            <Link className="perfil-boton-suave" to="/mis-cuestionarios">Ver todos <ArrowRight size={15} aria-hidden="true" /></Link>
          </div>
          {cargando ? <p className="perfil-sub">Cargando cuestionarios…</p> : null}
          {!cargando && !error && recientes.length === 0 ? (
            <p className="perfil-vacio">Todavía no has creado cuestionarios. Cuando lo hagas, aparecerán aquí con sus partidas reales.</p>
          ) : null}
          {recientes.length > 0 ? (
            <>
              <div className="perfil-tabla-envoltorio">
                <table className="perfil-tabla">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Título</th>
                      <th>Actualizado</th>
                      <th>Jugadores</th>
                      <th>Partidas</th>
                      <th>Estado</th>
                      <th>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recientes.map((fila, indice) => (
                      <tr key={fila.id}>
                        <td>{indice + 1}</td>
                        <td><BookOpen size={16} aria-hidden="true" /> {fila.titulo}</td>
                        <td>{fila.fecha}</td>
                        <td><Users size={14} aria-hidden="true" /> {fila.jugadores}</td>
                        <td><Gamepad2 size={14} aria-hidden="true" /> {fila.partidas}</td>
                        <td><span className={`perfil-estado ${fila.tono}`}>{fila.estado}</span></td>
                        <td>
                          <MenuAcciones
                            abierto={menu === fila.id}
                            onAlternar={() => setMenu(menu === fila.id ? null : fila.id)}
                            fila={fila}
                            onAnalizar={() => {
                              const cuestionario = cuestionarios.find((item) => item.id === fila.id)
                              if (cuestionario) setAnalisis(analizarCuestionario(cuestionario, historial, perfil.id))
                              setMenu(null)
                            }}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="perfil-fichas">
                {recientes.map((fila, indice) => (
                  <article className="perfil-ficha" key={fila.id}>
                    <header>
                      <strong>{indice + 1}. {fila.titulo}</strong>
                      <span className={`perfil-estado ${fila.tono}`}>{fila.estado}</span>
                    </header>
                    <p>{fila.fecha}</p>
                    <p>{fila.jugadores} {fila.jugadores === 1 ? 'jugador' : 'jugadores'} · {fila.partidas} {fila.partidas === 1 ? 'partida' : 'partidas'}</p>
                    <MenuAcciones
                      abierto={menu === fila.id}
                      onAlternar={() => setMenu(menu === fila.id ? null : fila.id)}
                      fila={fila}
                      onAnalizar={() => {
                        const cuestionario = cuestionarios.find((item) => item.id === fila.id)
                        if (cuestionario) setAnalisis(analizarCuestionario(cuestionario, historial, perfil.id))
                        setMenu(null)
                      }}
                    />
                  </article>
                ))}
              </div>
            </>
          ) : null}
        </section>
      ) : (
        <section className="perfil-card">
          <div className="perfil-card-cabeza">
            <div>
              <h2><span className="perfil-ico azul"><Gamepad2 size={18} aria-hidden="true" /></span> Partidas Jugadas</h2>
              <p className="perfil-sub">Detalle de tus partidas más recientes.</p>
            </div>
            <Link className="perfil-boton-suave" to="/historial">Ver historial completo <ArrowRight size={15} aria-hidden="true" /></Link>
          </div>
          {cargando ? <p className="perfil-sub">Cargando partidas…</p> : null}
          {!cargando && !error && filas.length === 0 ? (
            <p className="perfil-vacio">Todavía no tienes partidas finalizadas. Cuando juegues, el puesto y los puntos saldrán de la clasificación real.</p>
          ) : null}
          {filas.length > 0 ? <TablaPartidas filas={filas.slice(0, 8)} /> : null}
        </section>
      )}

      {editar ? (
        <Dialogo titulo="Editar perfil" onCerrar={() => setEditar(false)}>
          <FormularioNombre
            nombre={perfil.nombre}
            onCancelar={() => setEditar(false)}
            onGuardar={async (nombre) => {
              const sesion = await autenticacion.actualizarPerfil(token, nombre)
              entrar(sesion)
            }}
          />
        </Dialogo>
      ) : null}
      {clave ? (
        <Dialogo titulo="Cambiar contraseña" onCerrar={() => setClave(false)}>
          <FormularioClave
            onCancelar={() => setClave(false)}
            onGuardar={(actual, nueva) => autenticacion.cambiarContrasena(token, actual, nueva)}
          />
        </Dialogo>
      ) : null}
      {github ? (
        <Dialogo titulo="Editar GitHub" onCerrar={() => setGithub(false)}>
          <FormularioGithub
            actual={githubActual}
            onCancelar={() => setGithub(false)}
            onGuardar={(url) => {
              if (url) localStorage.setItem(claveGithub(perfil.id), url)
              else localStorage.removeItem(claveGithub(perfil.id))
              setGithubActual(url)
            }}
          />
        </Dialogo>
      ) : null}
      {analisis ? (
        <Dialogo titulo="Análisis del cuestionario" onCerrar={() => setAnalisis(null)}>
          <div className="perfil-analisis">
            <h3>{analisis.titulo}</h3>
            <p>Sesiones finalizadas: {analisis.sesiones}</p>
            <p>Estudiantes distintos: {analisis.participantes}</p>
            <p>Puntaje promedio: {analisis.puntajePromedio === null ? 'Sin datos' : `${analisis.puntajePromedio} pts`}</p>
            <p>Respuestas correctas: {analisis.porcentajeAciertos === null ? 'Sin datos' : `${analisis.porcentajeAciertos}%`}</p>
            <p>Más errores: {analisis.masErrores ?? 'Sin respuestas registradas'}</p>
            <p>Más aciertos: {analisis.masAciertos ?? 'Sin respuestas registradas'}</p>
            <p className="perfil-sub">El tiempo promedio no se muestra porque el historial no guarda una duración consolidada.</p>
          </div>
        </Dialogo>
      ) : null}
    </div>
  )
}

function correoLegible(correo: string) {
  const corte = correo.indexOf('@')
  if (corte < 1) return correo
  return (
    <>
      {correo.slice(0, corte)}
      <wbr />
      {correo.slice(corte)}
    </>
  )
}

function Dato({ icono, etiqueta, valor }: { icono: ReactNode; etiqueta: string; valor: ReactNode }) {
  return (
    <article className="perfil-dato">
      <span>{icono}</span>
      <div>
        <small>{etiqueta}</small>
        <strong>{valor}</strong>
      </div>
    </article>
  )
}

function Metrica({ icono, etiqueta, valor, tono }: { icono: ReactNode; etiqueta: string; valor: string; tono: string }) {
  return (
    <article className={`perfil-metrica ${tono}`}>
      <span>{icono}</span>
      <small>{etiqueta}</small>
      <strong>{valor}</strong>
    </article>
  )
}

function Recomendaciones({ titulo, consejos }: { titulo: string; consejos: Consejo[] }) {
  const iconos = [CheckCircle2, TrendingUp, Zap]
  return (
    <aside className="perfil-consejos">
      <h3><Lightbulb size={16} aria-hidden="true" /> {titulo}</h3>
      <ul>
        {consejos.map((consejo, indice) => {
          const Icono = iconos[indice] ?? CheckCircle2
          return (
            <li key={consejo.texto}>
              <Icono size={15} aria-hidden="true" />
              <span>{consejo.texto}{consejo.general ? ' Sugerencia general.' : ''}</span>
            </li>
          )
        })}
      </ul>
    </aside>
  )
}

function TablaPartidas({ filas }: { filas: FilaPartida[] }) {
  return (
    <>
      <div className="perfil-tabla-envoltorio">
        <table className="perfil-tabla">
          <thead>
            <tr>
              <th>#</th>
              <th>Cuestionario</th>
              <th>Fecha</th>
              <th>Posición</th>
              <th>Puntos</th>
              <th>Participantes</th>
              <th>Resultado</th>
            </tr>
          </thead>
          <tbody>
            {filas.map((fila, indice) => (
              <tr key={fila.codigo}>
                <td>{indice + 1}</td>
                <td>{fila.titulo}</td>
                <td>{fila.fecha}</td>
                <td><span className="perfil-puesto">{fila.posicion}.º</span></td>
                <td>{formatearNumero(fila.puntos)} pts</td>
                <td><Users size={14} aria-hidden="true" /> {fila.participantes}</td>
                <td><span className={`perfil-estado ${tonoResultado(fila.resultado)}`}>{fila.resultado}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="perfil-fichas">
        {filas.map((fila) => (
          <article className="perfil-ficha" key={fila.codigo}>
            <header>
              <strong>{fila.titulo}</strong>
              <span className={`perfil-estado ${tonoResultado(fila.resultado)}`}>{fila.resultado}</span>
            </header>
            <p>{fila.fecha}</p>
            <p>{fila.posicion}.º · {formatearNumero(fila.puntos)} pts · {fila.participantes} participantes</p>
            <Link to={`/resultados/${fila.codigo}`}>Ver resultado</Link>
          </article>
        ))}
      </div>
    </>
  )
}

function tonoResultado(resultado: FilaPartida['resultado']) {
  if (resultado === 'Excelente') return 'verde'
  if (resultado === 'Muy bien') return 'azul'
  if (resultado === 'Bueno') return 'morado'
  return 'rojo'
}

function MenuAcciones({
  abierto,
  onAlternar,
  fila,
  onAnalizar,
}: {
  abierto: boolean
  onAlternar: () => void
  fila: FilaCuestionario
  onAnalizar: () => void
}) {
  return (
    <div className="perfil-menu">
      <button className="perfil-boton-suave" type="button" aria-expanded={abierto} aria-label={`Acciones de ${fila.titulo}`} onClick={onAlternar}>
        <EllipsisVertical size={16} aria-hidden="true" />
      </button>
      {abierto ? (
        <div className="perfil-menu-lista" role="menu">
          <Link role="menuitem" to={`/cuestionarios/${fila.id}`}>Ver cuestionario</Link>
          <Link role="menuitem" to={`/cuestionarios/${fila.id}/editar`}>Editar</Link>
          {fila.ultimoCodigo ? <Link role="menuitem" to={`/resultados/${fila.ultimoCodigo}`}>Ver resultados</Link> : null}
          <button role="menuitem" type="button" onClick={onAnalizar}>Ver análisis</button>
        </div>
      ) : null}
    </div>
  )
}

function Dialogo({ titulo, onCerrar, children }: { titulo: string; onCerrar: () => void; children: ReactNode }) {
  useEffect(() => {
    function alTeclado(evento: KeyboardEvent) {
      if (evento.key === 'Escape') onCerrar()
    }
    window.addEventListener('keydown', alTeclado)
    return () => window.removeEventListener('keydown', alTeclado)
  }, [onCerrar])

  return (
    <div className="perfil-cortina" role="presentation" onClick={onCerrar}>
      <div className="perfil-dialogo" role="dialog" aria-modal="true" aria-label={titulo} onClick={(evento) => evento.stopPropagation()}>
        <header>
          <h2>{titulo}</h2>
          <button type="button" onClick={onCerrar} aria-label="Cerrar">×</button>
        </header>
        {children}
      </div>
    </div>
  )
}

function FormularioNombre({
  nombre,
  onCancelar,
  onGuardar,
}: {
  nombre: string
  onCancelar: () => void
  onGuardar: (nombre: string) => Promise<void>
}) {
  const [valor, setValor] = useState(nombre)
  const [error, setError] = useState<string | null>(null)
  const [ocupado, setOcupado] = useState(false)

  async function enviar(evento: FormEvent) {
    evento.preventDefault()
    if (valor.trim().length < 3) {
      setError('El nombre necesita al menos 3 caracteres.')
      return
    }
    setOcupado(true)
    try {
      await onGuardar(valor.trim())
      onCancelar()
    } catch (err) {
      setError(mensajeDe(err))
    } finally {
      setOcupado(false)
    }
  }

  return (
    <form className="perfil-form" onSubmit={(evento) => void enviar(evento)}>
      <label>
        Nombre
        <input value={valor} onChange={(evento) => setValor(evento.target.value)} />
      </label>
      <p className="perfil-sub">El correo, el rol y la cédula no se pueden cambiar desde aquí.</p>
      {error ? <p className="perfil-error" role="alert">{error}</p> : null}
      <div className="perfil-form-acciones">
        <button className="perfil-boton-suave" type="button" onClick={onCancelar}>Cancelar</button>
        <button className="perfil-boton-clave" type="submit" disabled={ocupado}>{ocupado ? 'Guardando…' : 'Guardar cambios'}</button>
      </div>
    </form>
  )
}

function FormularioClave({
  onCancelar,
  onGuardar,
}: {
  onCancelar: () => void
  onGuardar: (actual: string, nueva: string) => Promise<void>
}) {
  const [actual, setActual] = useState('')
  const [nueva, setNueva] = useState('')
  const [confirmar, setConfirmar] = useState('')
  const [ver, setVer] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [exito, setExito] = useState<string | null>(null)
  const [ocupado, setOcupado] = useState(false)

  async function enviar(evento: FormEvent) {
    evento.preventDefault()
    setError(null)
    setExito(null)
    if (!actual) {
      setError('Debes ingresar tu contraseña actual.')
      return
    }
    if (nueva.length < 8) {
      setError('La nueva contraseña debe tener al menos 8 caracteres.')
      return
    }
    if (nueva !== confirmar) {
      setError('La nueva contraseña y su confirmación no coinciden.')
      return
    }
    setOcupado(true)
    try {
      await onGuardar(actual, nueva)
      setExito('Contraseña actualizada.')
      setActual('')
      setNueva('')
      setConfirmar('')
    } catch (err) {
      setError(mensajeDe(err))
    } finally {
      setOcupado(false)
    }
  }

  return (
    <form className="perfil-form" onSubmit={(evento) => void enviar(evento)}>
      <label>Contraseña actual <input type={ver ? 'text' : 'password'} value={actual} onChange={(evento) => setActual(evento.target.value)} /></label>
      <label>Nueva contraseña <input type={ver ? 'text' : 'password'} value={nueva} onChange={(evento) => setNueva(evento.target.value)} /></label>
      <label>Confirmar nueva contraseña <input type={ver ? 'text' : 'password'} value={confirmar} onChange={(evento) => setConfirmar(evento.target.value)} /></label>
      <button className="perfil-boton-suave" type="button" onClick={() => setVer((valor) => !valor)}>
        {ver ? 'Ocultar contraseñas' : 'Mostrar contraseñas'}
      </button>
      {error ? <p className="perfil-error" role="alert">{error}</p> : null}
      {exito ? <p className="perfil-ok" role="status">{exito}</p> : null}
      <div className="perfil-form-acciones">
        <button className="perfil-boton-suave" type="button" onClick={onCancelar}>Cancelar</button>
        <button className="perfil-boton-clave" type="submit" disabled={ocupado}>{ocupado ? 'Actualizando…' : 'Guardar contraseña'}</button>
      </div>
    </form>
  )
}

function FormularioGithub({
  actual,
  onCancelar,
  onGuardar,
}: {
  actual: string
  onCancelar: () => void
  onGuardar: (url: string) => void
}) {
  const [valor, setValor] = useState(actual)
  const [error, setError] = useState<string | null>(null)

  function enviar(evento: FormEvent) {
    evento.preventDefault()
    const normalizado = normalizarGithub(valor)
    if (normalizado === null) {
      setError('Escribe una URL de GitHub, por ejemplo https://github.com/tu-usuario.')
      return
    }
    onGuardar(normalizado)
    onCancelar()
  }

  return (
    <form className="perfil-form" onSubmit={enviar}>
      <label>
        URL del perfil
        <input value={valor} placeholder="https://github.com/usuario" onChange={(evento) => setValor(evento.target.value)} />
      </label>
      <p className="perfil-sub">Se guarda en este navegador. ProfeLink todavía no tiene un campo de GitHub en la cuenta.</p>
      {error ? <p className="perfil-error" role="alert">{error}</p> : null}
      <div className="perfil-form-acciones">
        <button className="perfil-boton-suave" type="button" onClick={onCancelar}>Cancelar</button>
        <button className="perfil-boton-clave" type="submit">Guardar GitHub</button>
      </div>
    </form>
  )
}
