import { useEffect, useState, type FormEvent } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { Buho } from '../componentes/Buho.tsx'
import { Particulas } from '../componentes/Particulas.tsx'
import { useAutenticacion } from '../contexto/ProveedorAutenticacion.tsx'
import { useServicios } from '../contexto/ProveedorServicios.tsx'
import { CONTRASENA_DEMO, CORREO_DEMO } from '../datos/demostracion.ts'
import { mensajeDe } from '../dominio/errores.ts'
import { codigoDeInvitacion } from '../componentes/CodigoQr.tsx'
import { validarAcceso } from '../dominio/validacion.ts'
import { guardarTema, leerTema, type Tema } from '../tema.ts'
import { esEntradaDirecta, leerEspacio, limpiarEspacio } from './espacio.ts'

export function InicioSesion() {
  return <FormularioAcceso registro={false} />
}

export function Registro() {
  return <FormularioAcceso registro />
}

function FormularioAcceso({ registro }: { registro: boolean }) {
  const { autenticacion, simulacion } = useServicios()
  const { perfil, entrar } = useAutenticacion()
  const navegar = useNavigate()
  const ubicacion = useLocation()
  const desdeEstado = (ubicacion.state as { desde?: string } | null)?.desde
  const partidaUrl = new URLSearchParams(ubicacion.search).get('partida') ?? ''
  const codigoEnQuery = /^[A-Za-z0-9]{4,12}$/.test(partidaUrl) ? partidaUrl : null
  const destino = codigoDeInvitacion(desdeEstado ?? '')
    ? desdeEstado!
    : codigoEnQuery
      ? `/partida/${codigoEnQuery}`
      : desdeEstado && desdeEstado.startsWith('/')
        ? desdeEstado
        : '/'
  const codigoInvitacion = codigoDeInvitacion(destino)
  const [nombre, setNombre] = useState('')
  const [correo, setCorreo] = useState('')
  const [contrasena, setContrasena] = useState('')
  const [verContrasena, setVerContrasena] = useState(false)
  const [errores, setErrores] = useState<string[]>([])
  const [enviando, setEnviando] = useState(false)
  const [recuperar, setRecuperar] = useState(false)
  const [tema, setTema] = useState<Tema>(() => leerTema())

  useEffect(() => {
    guardarTema(tema)
  }, [tema])

  if (perfil) {
    if (esEntradaDirecta(destino)) return <Navigate to={destino} replace />
    const espacio = leerEspacio()
    if (!espacio) return <Navigate to="/elegir" replace />
    const casa = espacio === 'cursos' ? '/cursos' : '/'
    return <Navigate to={destino === '/' ? casa : destino} replace />
  }

  async function enviar(evento: FormEvent) {
    evento.preventDefault()
    const validacion = validarAcceso({ nombre, correo, contrasena, registro })
    setErrores(validacion)
    if (validacion.length > 0) return
    setEnviando(true)
    try {
      const sesion = registro
        ? await autenticacion.registrar({ nombre, correo, contrasena })
        : await autenticacion.iniciarSesion(correo, contrasena)
      limpiarEspacio()
      entrar(sesion)
      navegar(esEntradaDirecta(destino) ? destino : '/elegir', { replace: true })
    } catch (error) {
      setErrores([mensajeDe(error)])
    } finally {
      setEnviando(false)
    }
  }

  return (
    <main className={`acceso${tema === 'claro' ? ' claro' : ''}`}>
      <button
        className="acceso-tema"
        type="button"
        aria-label={tema === 'oscuro' ? 'Activar modo claro' : 'Activar modo oscuro'}
        onClick={() => setTema((actual) => (actual === 'claro' ? 'oscuro' : 'claro'))}
      >
        {tema === 'oscuro' ? 'Modo claro' : 'Modo oscuro'}
      </button>
      <section className="acceso-panel">
        <form className="acceso-formulario" onSubmit={(evento) => void enviar(evento)}>
          <div className="acceso-marca">
            <span className="acceso-logo">
              <Buho tamano={72} />
            </span>
            <strong>ProfeLink</strong>
            <p>Tu lugar seguro para aprender</p>
          </div>
          <h1>{registro ? 'Crea tu cuenta' : 'Bienvenido de vuelta'}</h1>
          <p className="acceso-ayuda">
            {codigoInvitacion
              ? registro
                ? `Crea tu cuenta para entrar a la partida ${codigoInvitacion}. No necesitas escribir el código.`
                : `Inicia sesión para entrar a la partida ${codigoInvitacion}. No necesitas escribir el código.`
              : registro
                ? 'Registra tu perfil para crear cuestionarios y jugar.'
                : 'Inicia sesión para acceder a tu cuenta'}
          </p>
          {registro ? (
            <label className="acceso-campo">
              <span>Nombre</span>
              <input value={nombre} onChange={(evento) => setNombre(evento.target.value)} />
            </label>
          ) : null}
          <label className="acceso-campo">
            <span>Correo electrónico</span>
            <span className="acceso-input">
              <IconoSobre />
              <input type="email" value={correo} onChange={(evento) => setCorreo(evento.target.value)} />
            </span>
          </label>
          <label className="acceso-campo">
            <span>Contraseña</span>
            <span className="acceso-input">
              <IconoCandado />
              <input
                type={verContrasena ? 'text' : 'password'}
                value={contrasena}
                onChange={(evento) => setContrasena(evento.target.value)}
              />
              <button
                className="acceso-ojo"
                type="button"
                aria-label={verContrasena ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                onClick={() => setVerContrasena((valor) => !valor)}
              >
                <IconoOjo />
              </button>
            </span>
          </label>
          {errores.length > 0 ? (
            <ul className="lista-errores acceso-errores">
              {errores.map((error) => (
                <li key={error}>{error}</li>
              ))}
            </ul>
          ) : null}
          <button className="acceso-enviar" type="submit" disabled={enviando}>
            {registro ? 'Crear cuenta' : 'Iniciar Sesión'}
          </button>
          {registro ? null : (
            <button className="acceso-olvido" type="button" onClick={() => setRecuperar(true)}>
              ¿Olvidaste tu contraseña?
            </button>
          )}
          <p className="acceso-cambio">
            {registro ? (
              <Link to="/iniciar-sesion" state={{ desde: destino }}>Ya tengo cuenta</Link>
            ) : (
              <>
                ¿Aún no tienes cuenta? <Link to="/registro" state={{ desde: destino }}>Crea tu cuenta gratis →</Link>
              </>
            )}
          </p>
          {simulacion ? (
            <p className="etiqueta-demo">
              Cuenta de prueba: {CORREO_DEMO} / {CONTRASENA_DEMO}
            </p>
          ) : null}
        </form>
      </section>
      <aside className="acceso-hero" aria-hidden="true">
        <Particulas densidad={32} />
        <div className="acceso-burbuja">
          <span className="acceso-avatar">
            <Buho tamano={168} />
          </span>
          <div className="acceso-globo">
            <strong>
              ¡Muy bien! <span>¡Empecemos!</span>
            </strong>
            <p>Listo para ayudarte con la clase.</p>
          </div>
        </div>
      </aside>
      <DialogoRecuperacion
        abierto={recuperar}
        correoInicial={correo}
        onCerrar={() => setRecuperar(false)}
      />
    </main>
  )
}

function DialogoRecuperacion({
  abierto,
  correoInicial,
  onCerrar,
}: {
  abierto: boolean
  correoInicial: string
  onCerrar: () => void
}) {
  const { autenticacion } = useServicios()
  const [paso, setPaso] = useState<'correo' | 'codigo'>('correo')
  const [correo, setCorreo] = useState(correoInicial)
  const [codigo, setCodigo] = useState('')
  const [nueva, setNueva] = useState('')
  const [confirmar, setConfirmar] = useState('')
  const [mensaje, setMensaje] = useState('')
  const [error, setError] = useState('')
  const [enviando, setEnviando] = useState(false)

  useEffect(() => {
    if (!abierto) return
    setPaso('correo')
    setCorreo(correoInicial)
    setCodigo('')
    setNueva('')
    setConfirmar('')
    setMensaje('')
    setError('')
    setEnviando(false)
  }, [abierto, correoInicial])

  useEffect(() => {
    if (!abierto) return
    function alTeclado(evento: KeyboardEvent) {
      if (evento.key === 'Escape') onCerrar()
    }
    window.addEventListener('keydown', alTeclado)
    return () => window.removeEventListener('keydown', alTeclado)
  }, [abierto, onCerrar])

  if (!abierto) return null

  async function solicitar(evento: FormEvent) {
    evento.preventDefault()
    const correoLimpio = correo.trim().toLowerCase()
    if (!correoLimpio.includes('@')) {
      setError('Escribe un correo válido.')
      return
    }
    setEnviando(true)
    setError('')
    try {
      const respuesta = await autenticacion.solicitarRecuperacion(correoLimpio)
      setMensaje(respuesta.mensaje)
      if (respuesta.codigo) setCodigo(respuesta.codigo)
      setPaso('codigo')
    } catch (err) {
      setError(mensajeDe(err))
    } finally {
      setEnviando(false)
    }
  }

  async function restablecer(evento: FormEvent) {
    evento.preventDefault()
    if (!codigo.trim()) {
      setError('Escribe el código de recuperación.')
      return
    }
    if (nueva.length < 8) {
      setError('La nueva contraseña debe tener al menos 8 caracteres.')
      return
    }
    if (nueva !== confirmar) {
      setError('Las contraseñas no coinciden.')
      return
    }
    setEnviando(true)
    setError('')
    try {
      await autenticacion.restablecerContrasena(codigo.trim(), nueva)
      onCerrar()
    } catch (err) {
      setError(mensajeDe(err))
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="dialogo" role="dialog" aria-modal="true" aria-labelledby="titulo-recuperacion">
      <div className="panel">
        <h2 id="titulo-recuperacion">Recuperar contraseña</h2>
        {paso === 'correo' ? (
          <form className="acceso-formulario" onSubmit={(evento) => void solicitar(evento)}>
            <p className="acceso-ayuda">Te daremos un código para definir una nueva contraseña.</p>
            <label className="acceso-campo">
              <span>Correo electrónico</span>
              <input
                type="email"
                value={correo}
                onChange={(evento) => setCorreo(evento.target.value)}
                autoFocus
              />
            </label>
            {error ? <p className="lista-errores">{error}</p> : null}
            <div className="acciones">
              <button className="boton-fantasma" type="button" onClick={onCerrar}>
                Volver
              </button>
              <button className="boton" type="submit" disabled={enviando}>
                Continuar
              </button>
            </div>
          </form>
        ) : (
          <form className="acceso-formulario" onSubmit={(evento) => void restablecer(evento)}>
            <p className="acceso-ayuda">{mensaje}</p>
            <label className="acceso-campo">
              <span>Código de recuperación</span>
              <input value={codigo} onChange={(evento) => setCodigo(evento.target.value)} autoFocus />
            </label>
            <label className="acceso-campo">
              <span>Nueva contraseña</span>
              <input
                type="password"
                value={nueva}
                onChange={(evento) => setNueva(evento.target.value)}
              />
            </label>
            <label className="acceso-campo">
              <span>Confirmar contraseña</span>
              <input
                type="password"
                value={confirmar}
                onChange={(evento) => setConfirmar(evento.target.value)}
              />
            </label>
            {error ? <p className="lista-errores">{error}</p> : null}
            <div className="acciones">
              <button className="boton-fantasma" type="button" onClick={() => setPaso('correo')}>
                Volver
              </button>
              <button className="boton" type="submit" disabled={enviando}>
                Guardar contraseña
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}

function IconoSobre() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="3" y="5" width="18" height="14" rx="2" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <path d="M4 7l8 6 8-6" fill="none" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  )
}

function IconoCandado() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="5" y="10" width="14" height="10" rx="2" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3" fill="none" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  )
}

function IconoOjo() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M2 12s4-6 10-6 10 6 10 6-4 6-10 6S2 12 2 12z" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="12" cy="12" r="2.5" fill="none" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  )
}
