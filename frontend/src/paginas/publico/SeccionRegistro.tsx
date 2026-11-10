import { useId, useState, type FormEvent, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAutenticacion } from '../../contexto/ProveedorAutenticacion.tsx'
import { useServicios } from '../../contexto/ProveedorServicios.tsx'
import { mensajeDe } from '../../dominio/errores.ts'
import {
  PAISES,
  buscarPais,
  evaluarContrasena,
  validarRegistroLanding,
} from './registro.ts'
import { useRevelar } from './revelar.ts'
import { limpiarEspacio } from '../espacio.ts'

export function SeccionRegistro() {
  const { autenticacion } = useServicios()
  const { entrar } = useAutenticacion()
  const navegar = useNavigate()
  const tituloId = useId()
  const copia = useRevelar<HTMLDivElement>()
  const formulario = useRevelar<HTMLFormElement>()
  const [correo, setCorreo] = useState('')
  const [nombre, setNombre] = useState('')
  const [contrasena, setContrasena] = useState('')
  const [confirmar, setConfirmar] = useState('')
  const [pais, setPais] = useState('')
  const [telefono, setTelefono] = useState('')
  const [verClave, setVerClave] = useState(false)
  const [verConfirmacion, setVerConfirmacion] = useState(false)
  const [errores, setErrores] = useState<Record<string, string>>({})
  const [errorServicio, setErrorServicio] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [confirmacion, setConfirmacion] = useState('')
  const fuerza = evaluarContrasena(contrasena)
  const paisActual = buscarPais(pais)

  async function enviar(evento: FormEvent) {
    evento.preventDefault()
    if (enviando || confirmacion) return
    const validacion = validarRegistroLanding({ correo, nombre, contrasena, confirmar, pais, telefono })
    setErrores(validacion)
    setErrorServicio('')
    if (Object.keys(validacion).length > 0) return

    setEnviando(true)
    try {
      // País y teléfono se validan aquí. El servicio actual solo guarda nombre, correo y contraseña.
      const sesion = await autenticacion.registrar({
        nombre: nombre.trim(),
        correo: correo.trim(),
        contrasena,
      })
      setConfirmacion('Cuenta creada. Entrando a tu academia…')
      const reduce =
        typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
      if (!reduce) await new Promise((resolver) => window.setTimeout(resolver, 400))
      limpiarEspacio()
      entrar(sesion)
      navegar('/elegir', { replace: true })
    } catch (error) {
      setErrorServicio(mensajeDe(error))
    } finally {
      setEnviando(false)
    }
  }

  return (
    <section className="landing-registro" id="registro" aria-labelledby={tituloId}>
      <div className="landing-registro-copia revelar" ref={copia}>
        <h2 id={tituloId} className="landing-titulo registro">
          <span className="linea">Sabemos que tu</span>
          <span className="linea">
            academia <span className="acento">merece</span>
          </span>
          <span className="linea acento">algo mejor</span>
        </h2>
        <p>
          Estamos construyendo ProfeLink junto a academias reales. Tu feedback da forma a la plataforma y, como
          academia fundadora, las herramientas premium serán gratuitas para ti con descuentos exclusivos de por vida.
        </p>
        <ul className="landing-beneficios">
          <li>Tu feedback define las funcionalidades</li>
          <li>Herramientas premium gratuitas para academias fundadoras</li>
          <li>Soporte dedicado para tu academia</li>
        </ul>
      </div>

      <form className="landing-formulario revelar" ref={formulario} onSubmit={(evento) => void enviar(evento)} noValidate aria-busy={enviando}>
        <header className="landing-formulario-cabeza">
          <h3>Registra tu academia</h3>
          <p>Academia Fundadora — Acceso Gratuito</p>
        </header>

        <Campo id="reg-correo" etiqueta="Email" error={errores.correo}>
          <span className="landing-control">
            <input
              id="reg-correo"
              type="email"
              autoComplete="email"
              value={correo}
              aria-invalid={Boolean(errores.correo)}
              onChange={(evento) => setCorreo(evento.target.value)}
            />
          </span>
        </Campo>

        <Campo id="reg-nombre" etiqueta="Nombre Completo" error={errores.nombre}>
          <span className="landing-control">
            <input
              id="reg-nombre"
              autoComplete="name"
              value={nombre}
              aria-invalid={Boolean(errores.nombre)}
              onChange={(evento) => setNombre(evento.target.value)}
            />
          </span>
        </Campo>

        <Campo id="reg-clave" etiqueta="Contraseña" error={errores.contrasena}>
          <span className="landing-control">
            <input
              id="reg-clave"
              type={verClave ? 'text' : 'password'}
              autoComplete="new-password"
              value={contrasena}
              aria-invalid={Boolean(errores.contrasena)}
              aria-describedby="requisitos-contrasena"
              onChange={(evento) => setContrasena(evento.target.value)}
            />
            <button
              className="landing-ojo"
              type="button"
              aria-label={verClave ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              onClick={() => setVerClave((valor) => !valor)}
            >
              <IconoOjo />
            </button>
          </span>
          {contrasena.length > 0 ? <div className="fortaleza">
            <div
              className="fortaleza-pista"
              role="meter"
              aria-valuemin={0}
              aria-valuemax={5}
              aria-valuenow={fuerza.cumplidos}
              aria-label="Fortaleza de la contraseña"
            >
              <span data-nivel={fuerza.etiqueta || 'vacia'} style={{ width: `${(fuerza.cumplidos / 5) * 100}%` }} />
            </div>
            <span className={`fortaleza-etiqueta ${nivelFortaleza(fuerza.etiqueta)}`.trim()}>{fuerza.etiqueta}</span>
          </div> : null}
          <ul className="requisitos" id="requisitos-contrasena">
            {fuerza.requisitos.map((requisito) => (
              <li key={requisito.id} data-ok={requisito.ok ? 'si' : 'no'}>
                <span className="req-marca" aria-hidden="true" />
                {requisito.texto}
              </li>
            ))}
          </ul>
        </Campo>

        <Campo id="reg-confirmar" etiqueta="Confirmar Contraseña" error={errores.confirmar}>
          <span className="landing-control">
            <input
              id="reg-confirmar"
              type={verConfirmacion ? 'text' : 'password'}
              autoComplete="new-password"
              placeholder="Repite tu contraseña"
              value={confirmar}
              aria-invalid={Boolean(errores.confirmar)}
              onChange={(evento) => setConfirmar(evento.target.value)}
            />
            <button
              className="landing-ojo"
              type="button"
              aria-label={verConfirmacion ? 'Ocultar confirmación' : 'Mostrar confirmación'}
              onClick={() => setVerConfirmacion((valor) => !valor)}
            >
              <IconoOjo />
            </button>
          </span>
        </Campo>

        <div className="landing-fila">
          <Campo id="reg-pais" etiqueta="País" error={errores.pais}>
            <span className="landing-control">
              <select
                id="reg-pais"
                value={pais}
                autoComplete="country"
                aria-invalid={Boolean(errores.pais)}
                onChange={(evento) => setPais(evento.target.value)}
              >
                <option value="">Selecciona un país</option>
                {PAISES.map((item) => (
                  <option key={item.codigo} value={item.codigo}>
                    {item.nombre}
                  </option>
                ))}
              </select>
            </span>
          </Campo>
          <Campo id="reg-telefono" etiqueta="Teléfono" error={errores.telefono}>
            <span className="landing-control telefono">
              <span className="tel-prefijo">{paisActual ? `+${paisActual.prefijo}` : '+'}</span>
              <input
                id="reg-telefono"
                type="tel"
                inputMode="tel"
                autoComplete="tel-national"
                placeholder={paisActual ? '8888-8888' : 'Número local'}
                value={telefono}
                aria-invalid={Boolean(errores.telefono)}
                onChange={(evento) => setTelefono(evento.target.value)}
              />
            </span>
          </Campo>
        </div>

        {errorServicio ? (
          <p className="landing-error-servicio" role="alert">
            {errorServicio}
          </p>
        ) : null}
        {confirmacion ? (
          <p className="landing-confirmacion" role="status">
            {confirmacion}
          </p>
        ) : null}

        <button className="landing-enviar" type="submit" disabled={enviando || Boolean(confirmacion)}>
          {enviando ? 'Creando tu academia…' : confirmacion ? 'Listo' : <>Unirme a ProfeLink <span className="flecha">→</span></>}
        </button>
      </form>
    </section>
  )
}

function nivelFortaleza(etiqueta: '' | 'Débil' | 'Media' | 'Fuerte') {
  if (etiqueta === 'Débil') return 'debil'
  if (etiqueta === 'Media') return 'media'
  if (etiqueta === 'Fuerte') return 'fuerte'
  return ''
}

function Campo({
  id,
  etiqueta,
  error,
  children,
}: {
  id: string
  etiqueta: string
  error?: string
  children: ReactNode
}) {
  return (
    <div className="landing-campo">
      <label htmlFor={id}>
        {etiqueta} <span aria-hidden="true">*</span>
      </label>
      {children}
      {error ? (
        <p className="landing-error" id={`${id}-error`} role="alert">
          {error}
        </p>
      ) : null}
    </div>
  )
}

function IconoOjo() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M2.5 12S6.2 6.5 12 6.5 21.5 12 21.5 12 17.8 17.5 12 17.5 2.5 12 2.5 12z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <circle cx="12" cy="12" r="2.4" fill="none" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  )
}
