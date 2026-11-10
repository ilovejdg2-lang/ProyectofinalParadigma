import { useEffect, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { guardarTema, leerTema, type Tema } from '../../tema.ts'
import { CabeceraLanding } from './CabeceraLanding.tsx'
import { PieLanding } from './PieLanding.tsx'
import { SeccionComoFunciona } from './SeccionComoFunciona.tsx'
import { SeccionHero } from './SeccionHero.tsx'
import { SeccionRegistro } from './SeccionRegistro.tsx'

function useTemaPublico() {
  const [tema, setTema] = useState<Tema>(() => leerTema())

  useEffect(() => {
    guardarTema(tema)
  }, [tema])

  return {
    tema,
    alternar() {
      setTema((actual) => (actual === 'claro' ? 'oscuro' : 'claro'))
    },
  }
}

export function LandingPublica() {
  const { tema, alternar } = useTemaPublico()
  return (
    <div className={`landing${tema === 'claro' ? ' claro' : ''}`}>
      <a className="landing-saltar" href="#contenido">
        Saltar al contenido
      </a>
      <CabeceraLanding tema={tema} onAlternar={alternar} />
      <main id="contenido">
        <SeccionHero />
        <SeccionRegistro />
        <SeccionComoFunciona />
      </main>
      <PieLanding />
    </div>
  )
}

export function MarcoPublico({ titulo, children }: { titulo: string; children: ReactNode }) {
  const { tema, alternar } = useTemaPublico()
  return (
    <div className={`landing${tema === 'claro' ? ' claro' : ''}`}>
      <a className="landing-saltar" href="#contenido">
        Saltar al contenido
      </a>
      <CabeceraLanding tema={tema} onAlternar={alternar} />
      <main className="landing-legal" id="contenido">
        <h1>{titulo}</h1>
        {children}
      </main>
      <PieLanding />
    </div>
  )
}

export function PaginaContacto() {
  return (
    <MarcoPublico titulo="Contacto">
      <p>
        ProfeLink no publica un buzón aparte del inicio de sesión. Con una cuenta activa, el aviso “Reportar un
        problema” de la barra guarda el reporte en este navegador, porque todavía no existe un servicio remoto de
        soporte.
      </p>
      <p>
        Si aún no tienes acceso, crea la academia en la portada o entra con tu correo. Desde ahí también puedes revisar
        la ayuda de salas, cuestionarios e historial.
      </p>
      <p className="landing-legal-acciones">
        <Link className="landing-primario" to="/iniciar-sesion">
          Iniciar Sesión
        </Link>
        <Link className="landing-secundario" to="/ayuda">
          Ver ayuda
        </Link>
      </p>
    </MarcoPublico>
  )
}

export function PaginaAyuda() {
  return (
    <MarcoPublico titulo="Ayuda">
      <h2>Cuenta</h2>
      <p>
        El registro de la portada pide correo, nombre, contraseña, país y teléfono. La contraseña solo se acepta si
        cumple los cinco requisitos. El servicio de autenticación guarda el nombre, el correo y la contraseña; el país
        y el teléfono se comprueban en el formulario y todavía no tienen un campo en la cuenta.
      </p>
      <p>Si olvidas la contraseña, en Iniciar Sesión está la recuperación por código.</p>
      <h2>Durante la clase</h2>
      <ul>
        <li>Estudiante: entra a Descubrir para repasar o a Unirse con el código de la sala.</li>
        <li>Docente: crea cuestionarios de opción múltiple y abre una sala en vivo con código y QR.</li>
        <li>El puntaje lo calcula el servicio: un punto por acierto y cero si la respuesta falla o no llega.</li>
        <li>El historial conserva las partidas terminadas.</li>
      </ul>
      <p>
        El rol de la cuenta lo resuelve la política de correo del servicio de autenticación. Un estudiante no ve las
        pantallas exclusivas de docentes.
      </p>
    </MarcoPublico>
  )
}

export function PaginaDocumentacion() {
  return (
    <MarcoPublico titulo="Documentación">
      <p>Estas son las rutas públicas y las áreas que se abren después de iniciar sesión.</p>
      <ul>
        <li>
          <Link to="/">Portada</Link> para presentar ProfeLink y registrar una academia.
        </li>
        <li>
          <Link to="/iniciar-sesion">Iniciar sesión</Link> y <Link to="/registro">registro de cuenta</Link> del acceso
          ya existente.
        </li>
        <li>Descubrir, historial y perfil quedan disponibles con la sesión iniciada.</li>
        <li>Mis cuestionarios, el editor y la sala del anfitrión solo se abren para docentes y administradores.</li>
        <li>Unirse y la partida usan el código que comparte quien dirige la sesión.</li>
      </ul>
      <p>
        La guía breve del flujo en vivo está en <Link to="/ayuda">Ayuda</Link>.
      </p>
    </MarcoPublico>
  )
}

export function PaginaPrivacidad() {
  return (
    <MarcoPublico titulo="Privacidad">
      <p>
        La cuenta guarda el nombre, el correo, la contraseña cifrada y el rol. El país y el teléfono del formulario
        público se validan en el navegador; el servicio de autenticación actual no los almacena.
      </p>
      <p>
        El token de la sesión se conserva en el almacenamiento de la pestaña. La preferencia de tema claro u oscuro se
        conserva en este navegador. Si la aplicación está en modo simulado, los perfiles de prueba también viven en el
        almacenamiento local y no salen del equipo.
      </p>
      <p>
        Una partida registra las respuestas necesarias para calcular el puntaje. El historial muestra esos resultados a
        quien participó y a quien dirigió la sesión.
      </p>
      <p>ProfeLink no vende esa información ni la usa para un perfil publicitario.</p>
    </MarcoPublico>
  )
}

export function PaginaTerminos() {
  return (
    <MarcoPublico titulo="Términos">
      <p>
        ProfeLink es la plataforma de evaluaciones y seguimiento académico de este proyecto. La cuenta es personal y el
        rol depende de la política de correo configurada en el servicio de autenticación.
      </p>
      <p>
        Quien crea un cuestionario es responsable del contenido de las preguntas. Las respuestas de una partida se usan
        para el puntaje y el historial de esa sesión.
      </p>
      <p>
        El registro de academia fundadora no cambia, por sí solo, los permisos de docente o estudiante. Esas pantallas
        siguen las rutas y los roles que ya existen.
      </p>
      <p>
        Puedes revisar el detalle del tratamiento de datos en <Link to="/privacidad">Privacidad</Link>.
      </p>
    </MarcoPublico>
  )
}
