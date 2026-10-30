import { ErrorServicio } from '../dominio/errores.ts'
import type { Perfil, Sesion } from '../dominio/tipos.ts'
import { CONTRASENA_DEMO, CORREO_DEMO, ID_DEMO, NOMBRE_DEMO } from '../datos/demostracion.ts'
import type { Almacen } from './almacen.ts'

export interface RegistroPerfil {
  nombre: string
  correo: string
  contrasena: string
}

export interface ClienteAutenticacion {
  registrar(datos: RegistroPerfil): Promise<Sesion>
  iniciarSesion(correo: string, contrasena: string): Promise<Sesion>
  cerrarSesion(token: string): Promise<void>
  sesionActual(token: string): Promise<Sesion | null>
  cambiarContrasena(token: string, actual: string, nueva: string): Promise<void>
}

interface UsuarioGuardado extends Perfil {
  contrasena: string
}

interface EstadoAuth {
  usuarios: UsuarioGuardado[]
  sesiones: { token: string; perfilId: string }[]
}

const CLAVE = 'profelink.auth.v1'

function crearId(): string {
  return crypto.randomUUID()
}

function leer(almacen: Almacen): EstadoAuth {
  const texto = almacen.leer(CLAVE)
  if (!texto) {
    const inicial: EstadoAuth = {
      usuarios: [
        {
          id: ID_DEMO,
          nombre: NOMBRE_DEMO,
          correo: CORREO_DEMO,
          contrasena: CONTRASENA_DEMO,
          rol: 'teacher',
        },
        {
          id: 'perfil-fatima-una',
          nombre: 'Fátima Carrillo García',
          correo: 'fatima.carrillo.garcia@est.una.ac.cr',
          contrasena: 'F1T3M12107',
          rol: 'student',
        },
      ],
      sesiones: [],
    }
    almacen.escribir(CLAVE, JSON.stringify(inicial))
    return inicial
  }
  return JSON.parse(texto) as EstadoAuth
}

function guardar(almacen: Almacen, estado: EstadoAuth) {
  almacen.escribir(CLAVE, JSON.stringify(estado))
}

function sesionDe(estado: EstadoAuth, token: string): Sesion | null {
  const sesion = estado.sesiones.find((item) => item.token === token)
  const usuario = estado.usuarios.find((item) => item.id === sesion?.perfilId)
  if (!sesion || !usuario) return null
  return { token, perfil: { id: usuario.id, nombre: usuario.nombre, correo: usuario.correo, rol: usuario.rol ?? (usuario.correo.endsWith('@una.cr') ? 'teacher' : 'student') } }
}

export function crearAutenticacionSimulada(almacen: Almacen): ClienteAutenticacion {
  return {
    async registrar(datos) {
      const estado = leer(almacen)
      const correo = datos.correo.trim().toLowerCase()
      if (estado.usuarios.some((usuario) => usuario.correo === correo)) {
        throw new ErrorServicio('validacion', 'Ya existe un perfil con ese correo.')
      }
      const usuario: UsuarioGuardado = {
        id: crearId(),
        nombre: datos.nombre.trim(),
        correo,
        contrasena: datos.contrasena,
      }
      const token = crearId()
      estado.usuarios.push(usuario)
      estado.sesiones.push({ token, perfilId: usuario.id })
      guardar(almacen, estado)
      return { token, perfil: { id: usuario.id, nombre: usuario.nombre, correo: usuario.correo } }
    },
    async iniciarSesion(correo, contrasena) {
      const estado = leer(almacen)
      const usuario = estado.usuarios.find((item) => item.correo === correo.trim().toLowerCase())
      if (!usuario || usuario.contrasena !== contrasena) {
        throw new ErrorServicio('credenciales', 'Correo o contraseña incorrectos.')
      }
      const token = crearId()
      estado.sesiones.push({ token, perfilId: usuario.id })
      guardar(almacen, estado)
      return { token, perfil: { id: usuario.id, nombre: usuario.nombre, correo: usuario.correo } }
    },
    async cerrarSesion(token) {
      const estado = leer(almacen)
      estado.sesiones = estado.sesiones.filter((item) => item.token !== token)
      guardar(almacen, estado)
    },
    async sesionActual(token) {
      return sesionDe(leer(almacen), token)
    },
    async cambiarContrasena(token, actual, nueva) {
      const estado = leer(almacen)
      const sesion = estado.sesiones.find((item) => item.token === token)
      const usuario = estado.usuarios.find((item) => item.id === sesion?.perfilId)
      if (!usuario || usuario.contrasena !== actual) {
        throw new ErrorServicio('validacion', 'La contraseña actual es incorrecta.')
      }
      if (nueva.length < 8) {
        throw new ErrorServicio('validacion', 'La nueva contraseña debe tener al menos 8 caracteres.')
      }
      usuario.contrasena = nueva
      guardar(almacen, estado)
    },
  }
}

async function leerMensaje(respuesta: Response): Promise<string> {
  try {
    const cuerpo = (await respuesta.json()) as { mensaje?: string; message?: string | string[] }
    const texto = Array.isArray(cuerpo.message) ? cuerpo.message[0] : cuerpo.message
    return cuerpo.mensaje ?? texto ?? 'El servicio de autenticación rechazó la solicitud.'
  } catch {
    return 'El servicio de autenticación no respondió correctamente.'
  }
}

export function crearAutenticacionHttp(baseUrl: string): ClienteAutenticacion {
  const raiz = baseUrl.replace(/\/$/, '')
  return {
    async registrar(datos) {
      const respuesta = await fetch(`${raiz}/perfiles`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(datos),
      })
      if (!respuesta.ok) throw new ErrorServicio('validacion', await leerMensaje(respuesta))
      return (await respuesta.json()) as Sesion
    },
    async iniciarSesion(correo, contrasena) {
      const respuesta = await fetch(`${raiz}/sesiones`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ correo, contrasena }),
      })
      if (!respuesta.ok) throw new ErrorServicio('credenciales', await leerMensaje(respuesta))
      return (await respuesta.json()) as Sesion
    },
    async cerrarSesion(token) {
      const respuesta = await fetch(`${raiz}/sesiones/actual`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!respuesta.ok) throw new ErrorServicio('conexion', await leerMensaje(respuesta))
    },
    async sesionActual(token) {
      const respuesta = await fetch(`${raiz}/sesiones/actual`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (respuesta.status === 401) return null
      if (!respuesta.ok) throw new ErrorServicio('conexion', await leerMensaje(respuesta))
      return (await respuesta.json()) as Sesion
    },
    async cambiarContrasena(token, actual, nueva) {
      const respuesta = await fetch(`${raiz}/perfiles/password`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          contrasenaActual: actual,
          nuevaContrasena: nueva,
        }),
      })
      if (!respuesta.ok) throw new ErrorServicio('validacion', await leerMensaje(respuesta))
    },
  }
}
