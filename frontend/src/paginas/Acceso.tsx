import { useState, type FormEvent } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { Buho } from '../componentes/Buho.tsx'
import { Dialogo } from '../componentes/Interfaz.tsx'
import { useAutenticacion } from '../contexto/ProveedorAutenticacion.tsx'
import { useServicios } from '../contexto/ProveedorServicios.tsx'
import { CONTRASENA_DEMO, CORREO_DEMO } from '../datos/demostracion.ts'
import { mensajeDe } from '../dominio/errores.ts'
import { validarAcceso } from '../dominio/validacion.ts'

export function InicioSesion() {
  return <FormularioAcceso registro={false} />
}

export function Registro() {
  return <FormularioAcceso registro />
}

function FormularioAcceso({ registro }: { registro: boolean }) {
  const { autenticacion } = useServicios()
  const { perfil, entrar } = useAutenticacion()
  const navegar = useNavigate()
  const ubicacion = useLocation()
  const destino = (ubicacion.state as { desde?: string } | null)?.desde ?? '/'
  const [nombre, setNombre] = useState('')
  const [correo, setCorreo] = useState('')
  const [contrasena, setContrasena] = useState('')
  const [verContrasena, setVerContrasena] = useState(false)
  const [errores, setErrores] = useState<string[]>([])
  const [enviando, setEnviando] = useState(false)
  const [recuperar, setRecuperar] = useState(false)

  if (perfil) return <Navigate to={destino} replace />

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
      entrar(sesion)
      navegar(destino, { replace: true })
    } catch (error) {
      setErrores([mensajeDe(error)])
    } finally {
      setEnviando(false)
    }
  }

  return (
    <main className="acceso">
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
            {registro ? 'Registra tu perfil para crear cuestionarios y jugar.' : 'Inicia sesión para acceder a tu cuenta'}
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
              <Link to="/iniciar-sesion">Ya tengo cuenta</Link>
            ) : (
              <>
                ¿Aún no tienes cuenta? <Link to="/registro">Crea tu cuenta gratis →</Link>
              </>
            )}
          </p>
          <p className="etiqueta-demo">
            Cuenta de prueba: {CORREO_DEMO} / {CONTRASENA_DEMO}
          </p>
        </form>
      </section>
      <aside className="acceso-hero" aria-hidden="true">
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
      <Dialogo
        abierto={recuperar}
        titulo="Recuperar contraseña"
        mensaje="La recuperación la hará el servicio de autenticación cuando esté conectado. Esta pantalla no guarda ni cambia contraseñas."
        confirmar="Entendido"
        onConfirmar={() => setRecuperar(false)}
        onCancelar={() => setRecuperar(false)}
      />
    </main>
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
