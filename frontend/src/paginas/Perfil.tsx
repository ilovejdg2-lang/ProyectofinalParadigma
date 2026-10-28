import { useState, type FormEvent } from 'react'
import { useAutenticacion } from '../contexto/ProveedorAutenticacion.tsx'
import { useServicios } from '../contexto/ProveedorServicios.tsx'
import { mensajeDe } from '../dominio/errores.ts'

export function Perfil() {
  const { autenticacion } = useServicios()
  const { perfil, token, salir } = useAutenticacion()
  const esDocente = perfil?.rol === 'teacher' || perfil?.rol === 'admin'
  const rolEtiqueta = perfil?.rol === 'admin' ? 'Administrador' : esDocente ? 'Docente' : 'Estudiante'

  const [contrasenaActual, setContrasenaActual] = useState('')
  const [nuevaContrasena, setNuevaContrasena] = useState('')
  const [confirmarContrasena, setConfirmarContrasena] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [mensajeExito, setMensajeExito] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function manejarCambioPassword(evento: FormEvent) {
    evento.preventDefault()
    setError(null)
    setMensajeExito(null)

    if (!contrasenaActual) {
      setError('Debes ingresar tu contraseña actual.')
      return
    }
    if (nuevaContrasena.length < 8) {
      setError('La nueva contraseña debe tener al menos 8 caracteres.')
      return
    }
    if (nuevaContrasena !== confirmarContrasena) {
      setError('La nueva contraseña y su confirmación no coinciden.')
      return
    }
    if (!token) {
      setError('No hay una sesión activa para realizar esta acción.')
      return
    }

    setGuardando(true)
    try {
      await autenticacion.cambiarContrasena(token, contrasenaActual, nuevaContrasena)
      setMensajeExito('¡Contraseña actualizada correctamente!')
      setContrasenaActual('')
      setNuevaContrasena('')
      setConfirmarContrasena('')
    } catch (err) {
      setError(mensajeDe(err))
    } finally {
      setGuardando(false)
    }
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
      {/* Tarjeta de información institucional y rol */}
      <section
        style={{
          background: 'var(--panel)',
          border: '1px solid var(--borde)',
          borderRadius: 'var(--radio)',
          padding: '1.75rem',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
        }}
      >
        <div>
          <h1 style={{ margin: '0 0 0.5rem', fontSize: '1.6rem' }}>Perfil de Usuario</h1>
          <p style={{ margin: '0 0 1.5rem', color: 'var(--suave)', fontSize: '0.92rem' }}>
            Información de tu identidad y credenciales en ProfeLink.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <span style={{ fontSize: '0.82rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Nombre completo
              </span>
              <p style={{ margin: '0.2rem 0 0', fontSize: '1.2rem', fontWeight: 'bold' }}>{perfil?.nombre}</p>
            </div>

            <div>
              <span style={{ fontSize: '0.82rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Correo electrónico
              </span>
              <p style={{ margin: '0.2rem 0 0', color: '#e2e8f0', fontFamily: 'var(--mono)' }}>{perfil?.correo}</p>
            </div>

            <div>
              <span style={{ fontSize: '0.82rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Rol institucional
              </span>
              <div style={{ marginTop: '0.35rem' }}>
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    padding: '0.35rem 0.85rem',
                    borderRadius: '9999px',
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    background: esDocente ? 'rgba(56, 189, 248, 0.15)' : 'rgba(52, 211, 153, 0.15)',
                    color: esDocente ? '#38bdf8' : '#34d399',
                    border: `1px solid ${esDocente ? 'rgba(56, 189, 248, 0.4)' : 'rgba(52, 211, 153, 0.4)'}`,
                  }}
                >
                  <span
                    style={{
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      background: esDocente ? '#38bdf8' : '#34d399',
                    }}
                  />
                  {rolEtiqueta} ({perfil?.rol ?? 'student'})
                </span>
              </div>
            </div>

            <div>
              <span style={{ fontSize: '0.82rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Permisos del sistema
              </span>
              <p style={{ margin: '0.3rem 0 0', fontSize: '0.88rem', color: '#cbd5e1', lineHeight: '1.5' }}>
                {esDocente
                  ? '✅ Diseñar cuestionarios, crear y editar preguntas V/F, iniciar salas de juego en vivo y moderar tableros de resultados.'
                  : '✅ Descubrir actividades públicas, ingresar a salas en vivo mediante PIN numérico, responder en tiempo real y consultar tu historial personal.'}
              </p>
            </div>
          </div>
        </div>

        <div style={{ marginTop: '2rem', paddingTop: '1.25rem', borderTop: '1px solid var(--borde)' }}>
          <p style={{ margin: '0 0 1rem', fontSize: '0.8rem', color: 'var(--suave)' }}>
            Autenticado criptográficamente con tokens RS256 emitidos por <code>auth-service</code>.
          </p>
          <button className="boton-peligro" type="button" onClick={() => void salir()}>
            Cerrar sesión
          </button>
        </div>
      </section>

      {/* Tarjeta de Seguridad y Cambio de Contraseña */}
      <section
        style={{
          background: 'var(--panel)',
          border: '1px solid var(--borde)',
          borderRadius: 'var(--radio)',
          padding: '1.75rem',
        }}
      >
        <h2 style={{ margin: '0 0 0.5rem', fontSize: '1.4rem' }}>Seguridad de la Cuenta</h2>
        <p style={{ margin: '0 0 1.5rem', color: 'var(--suave)', fontSize: '0.92rem' }}>
          Actualiza tu contraseña periódicamente. Se verificará tu clave actual antes de aplicar el cambio.
        </p>

        {mensajeExito && (
          <div
            style={{
              padding: '0.85rem 1rem',
              marginBottom: '1.2rem',
              borderRadius: '10px',
              background: 'rgba(52, 211, 153, 0.15)',
              border: '1px solid rgba(52, 211, 153, 0.35)',
              color: '#34d399',
              fontSize: '0.9rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}
          >
            <span>✓</span> {mensajeExito}
          </div>
        )}

        {error && (
          <div
            style={{
              padding: '0.85rem 1rem',
              marginBottom: '1.2rem',
              borderRadius: '10px',
              background: 'rgba(244, 63, 94, 0.15)',
              border: '1px solid rgba(244, 63, 94, 0.35)',
              color: '#f87171',
              fontSize: '0.9rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}
          >
            <span>⚠</span> {error}
          </div>
        )}

        <form onSubmit={(e) => void manejarCambioPassword(e)} style={{ display: 'grid', gap: '1.1rem' }}>
          <div>
            <label
              htmlFor="contrasena-actual"
              style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.88rem', color: '#cbd5e1' }}
            >
              Contraseña actual
            </label>
            <input
              id="contrasena-actual"
              type="password"
              className="campo"
              placeholder="Ingresa tu clave actual"
              value={contrasenaActual}
              onChange={(e) => setContrasenaActual(e.target.value)}
              required
            />
          </div>

          <div>
            <label
              htmlFor="nueva-contrasena"
              style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.88rem', color: '#cbd5e1' }}
            >
              Nueva contraseña
            </label>
            <input
              id="nueva-contrasena"
              type="password"
              className="campo"
              placeholder="Mínimo 8 caracteres"
              value={nuevaContrasena}
              onChange={(e) => setNuevaContrasena(e.target.value)}
              minLength={8}
              required
            />
            <span style={{ fontSize: '0.78rem', color: 'var(--suave)', marginTop: '0.25rem', display: 'block' }}>
              Debe contener al menos 8 caracteres.
            </span>
          </div>

          <div>
            <label
              htmlFor="confirmar-contrasena"
              style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.88rem', color: '#cbd5e1' }}
            >
              Confirmar nueva contraseña
            </label>
            <input
              id="confirmar-contrasena"
              type="password"
              className="campo"
              placeholder="Repite la nueva clave"
              value={confirmarContrasena}
              onChange={(e) => setConfirmarContrasena(e.target.value)}
              minLength={8}
              required
            />
          </div>

          <div style={{ marginTop: '0.5rem' }}>
            <button className="boton" type="submit" disabled={guardando} style={{ width: '100%' }}>
              {guardando ? 'Actualizando contraseña...' : 'Cambiar Contraseña'}
            </button>
          </div>
        </form>
      </section>
    </div>
  )
}

