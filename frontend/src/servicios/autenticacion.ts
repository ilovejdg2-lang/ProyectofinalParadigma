import { ErrorServicio } from '../dominio/errores.ts'
import type { Perfil, Sesion } from '../dominio/tipos.ts'
import { CONTRASENA_DEMO, CORREO_DEMO, ID_DEMO, NOMBRE_DEMO } from '../datos/demostracion.ts'
import type { Almacen } from './almacen.ts'

export interface RegistroPerfil {
  nombre: string
  correo: string
  contrasena: string
  rol?: 'teacher' | 'student'
}

export interface SolicitudRecuperacion {
  mensaje: string
  codigo?: string
}

export interface RegistroPendiente {
  pendiente: true
  mensaje: string
}

export interface SolicitudProfesor {
  id: string
  nombre: string
  correo: string
}

export interface ClienteAutenticacion {
  registrar(datos: RegistroPerfil): Promise<Sesion | RegistroPendiente>
  listarProfesoresPendientes(token: string): Promise<SolicitudProfesor[]>
  aceptarProfesor(token: string, id: string): Promise<void>
  iniciarSesion(correo: string, contrasena: string): Promise<Sesion>
  cerrarSesion(token: string): Promise<void>
  sesionActual(token: string): Promise<Sesion | null>
  cambiarContrasena(token: string, actual: string, nueva: string): Promise<void>
  actualizarPerfil(token: string, nombre: string): Promise<Sesion>
  solicitarRecuperacion(correo: string): Promise<SolicitudRecuperacion>
  restablecerContrasena(codigo: string, nueva: string): Promise<void>
}

interface UsuarioGuardado extends Perfil {
  contrasena: string
  estado?: 'pendiente' | 'activo'
}

interface EstadoAuth {
  usuarios: UsuarioGuardado[]
  sesiones: { token: string; perfilId: string }[]
  recuperaciones: { codigo: string; perfilId: string; expira: number }[]
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
      ],
      sesiones: [],
      recuperaciones: [],
    }
    almacen.escribir(CLAVE, JSON.stringify(inicial))
    return inicial
  }
  const estado = JSON.parse(texto) as EstadoAuth
  if (!Array.isArray(estado.recuperaciones)) estado.recuperaciones = []
  return estado
}

function guardar(almacen: Almacen, estado: EstadoAuth) {
  almacen.escribir(CLAVE, JSON.stringify(estado))
}

function sesionDe(estado: EstadoAuth, token: string): Sesion | null {
  const sesion = estado.sesiones.find((item) => item.token === token)
  const usuario = estado.usuarios.find((item) => item.id === sesion?.perfilId)
  if (!sesion || !usuario) return null
  return { token, perfil: { id: usuario.id, nombre: usuario.nombre, correo: usuario.correo, rol: usuario.rol ?? (usuario.correo.endsWith('@una.cr') ? 'teacher' : 'student'), creadoEn: usuario.creadoEn } }
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
        rol: datos.rol ?? (correo.endsWith('@una.cr') ? 'teacher' : 'student'),
        estado: datos.rol === 'teacher' ? 'pendiente' : 'activo',
        creadoEn: new Date().toISOString(),
      }
      estado.usuarios.push(usuario)
      if (usuario.estado === 'pendiente') {
        guardar(almacen, estado)
        return {
          pendiente: true,
          mensaje: 'Tu cuenta de profesor quedó creada. Un administrador tiene que aceptarla antes de que puedas entrar.',
        }
      }
      const token = crearId()
      estado.sesiones.push({ token, perfilId: usuario.id })
      guardar(almacen, estado)
      return sesionDe(estado, token)!
    },
    async iniciarSesion(correo, contrasena) {
      const estado = leer(almacen)
      const usuario = estado.usuarios.find((item) => item.correo === correo.trim().toLowerCase())
      if (!usuario || usuario.contrasena !== contrasena) {
        throw new ErrorServicio('credenciales', 'Correo o contraseña incorrectos.')
      }
      if (usuario.estado === 'pendiente') {
        throw new ErrorServicio('credenciales', 'Tu cuenta de profesor espera la aceptación de un administrador.')
      }
      const token = crearId()
      estado.sesiones.push({ token, perfilId: usuario.id })
      guardar(almacen, estado)
      return sesionDe(estado, token)!
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
    async actualizarPerfil(token, nombre) {
      const estado = leer(almacen)
      const sesion = estado.sesiones.find((item) => item.token === token)
      const usuario = estado.usuarios.find((item) => item.id === sesion?.perfilId)
      const limpio = nombre.trim()
      if (!usuario) throw new ErrorServicio('permiso', 'La sesión no es válida.')
      if (limpio.length < 3) throw new ErrorServicio('validacion', 'El nombre necesita al menos 3 caracteres.')
      usuario.nombre = limpio
      guardar(almacen, estado)
      return { token, perfil: { id: usuario.id, nombre: usuario.nombre, correo: usuario.correo, rol: usuario.rol, creadoEn: usuario.creadoEn } }
    },
    async listarProfesoresPendientes(token) {
      const sesion = sesionDe(leer(almacen), token)
      if (!sesion) throw new ErrorServicio('permiso', 'La sesión no es válida.')
      if (sesion.perfil.rol !== 'admin') throw new ErrorServicio('permiso', 'Solo un administrador puede ver las solicitudes.')
      return leer(almacen).usuarios
        .filter((usuario) => usuario.rol === 'teacher' && usuario.estado === 'pendiente')
        .map((usuario) => ({ id: usuario.id, nombre: usuario.nombre, correo: usuario.correo }))
    },
    async aceptarProfesor(token, id) {
      const sesion = sesionDe(leer(almacen), token)
      if (!sesion) throw new ErrorServicio('permiso', 'La sesión no es válida.')
      if (sesion.perfil.rol !== 'admin') throw new ErrorServicio('permiso', 'Solo un administrador puede aceptar profesores.')
      const estado = leer(almacen)
      const usuario = estado.usuarios.find((item) => item.id === id && item.estado === 'pendiente')
      if (!usuario) throw new ErrorServicio('no-encontrado', 'No hay una solicitud de profesor con ese identificador.')
      usuario.estado = 'activo'
      guardar(almacen, estado)
    },
    async solicitarRecuperacion(correo) {
      const estado = leer(almacen)
      const usuario = estado.usuarios.find((item) => item.correo === correo.trim().toLowerCase())
      const mensaje =
        'Si el correo está registrado, usa el código de recuperación para definir una nueva contraseña.'
      if (!usuario) return { mensaje }
      const codigo = crearId().replace(/-/g, '').slice(0, 12)
      estado.recuperaciones = estado.recuperaciones.filter((item) => item.perfilId !== usuario.id)
      estado.recuperaciones.push({
        codigo,
        perfilId: usuario.id,
        expira: Date.now() + 30 * 60 * 1000,
      })
      guardar(almacen, estado)
      return { mensaje, codigo }
    },
    async restablecerContrasena(codigo, nueva) {
      const estado = leer(almacen)
      const recuperacion = estado.recuperaciones.find((item) => item.codigo === codigo.trim())
      if (!recuperacion || recuperacion.expira < Date.now()) {
        throw new ErrorServicio('validacion', 'El código de recuperación no es válido o ha expirado.')
      }
      if (nueva.length < 8) {
        throw new ErrorServicio('validacion', 'La nueva contraseña debe tener al menos 8 caracteres.')
      }
      const usuario = estado.usuarios.find((item) => item.id === recuperacion.perfilId)
      if (!usuario) {
        throw new ErrorServicio('validacion', 'El código de recuperación no es válido o ha expirado.')
      }
      usuario.contrasena = nueva
      estado.sesiones = estado.sesiones.filter((item) => item.perfilId !== usuario.id)
      estado.recuperaciones = estado.recuperaciones.filter((item) => item.codigo !== recuperacion.codigo)
      guardar(almacen, estado)
    },
  }
}

function esSesion(cuerpo: Sesion | Perfil): cuerpo is Sesion {
  return 'perfil' in cuerpo
}

function sesionDesde(token: string, cuerpo: Sesion | Perfil): Sesion {
  if (esSesion(cuerpo)) return cuerpo
  return { token, perfil: cuerpo }
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
      const cuerpo = (await respuesta.json()) as Sesion | RegistroPendiente
      return cuerpo
    },
    async listarProfesoresPendientes(token) {
      const respuesta = await fetch(`${raiz}/profesores/pendientes`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!respuesta.ok) throw new ErrorServicio('permiso', await leerMensaje(respuesta))
      return (await respuesta.json()) as SolicitudProfesor[]
    },
    async aceptarProfesor(token, id) {
      const respuesta = await fetch(`${raiz}/profesores/${id}/aceptar`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!respuesta.ok) throw new ErrorServicio('permiso', await leerMensaje(respuesta))
    },
    async iniciarSesion(correo, contrasena) {
      let respuesta: Response
      try {
        respuesta = await fetch(`${raiz}/sesiones`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ correo, contrasena }),
        })
      } catch {
        throw new ErrorServicio('conexion', 'No se pudo conectar con el servicio de autenticación.')
      }
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
      const opciones = {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          contrasenaActual: actual,
          nuevaContrasena: nueva,
        }),
      }
      let respuesta = await fetch(`${raiz}/perfiles/password`, opciones)
      if (respuesta.status === 404) respuesta = await fetch(`${raiz}/api/v1/auth/change-password`, opciones)
      if (!respuesta.ok) throw new ErrorServicio('validacion', await leerMensaje(respuesta))
    },
    async actualizarPerfil(token, nombre) {
      const opciones = {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ nombre }),
      }
      let respuesta = await fetch(`${raiz}/perfiles/actual`, opciones)
      if (respuesta.status === 404) respuesta = await fetch(`${raiz}/api/v1/auth/me`, opciones)
      if (!respuesta.ok) throw new ErrorServicio('validacion', await leerMensaje(respuesta))
      return sesionDesde(token, (await respuesta.json()) as Sesion | Perfil)
    },
    async solicitarRecuperacion(correo) {
      let respuesta: Response
      try {
        respuesta = await fetch(`${raiz}/recuperacion`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ correo }),
        })
      } catch {
        throw new ErrorServicio('conexion', 'No se pudo conectar con el servicio de autenticación.')
      }
      if (!respuesta.ok) throw new ErrorServicio('validacion', await leerMensaje(respuesta))
      return (await respuesta.json()) as SolicitudRecuperacion
    },
    async restablecerContrasena(codigo, nueva) {
      let respuesta: Response
      try {
        respuesta = await fetch(`${raiz}/recuperacion/restablecer`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ codigo, nuevaContrasena: nueva }),
        })
      } catch {
        throw new ErrorServicio('conexion', 'No se pudo conectar con el servicio de autenticación.')
      }
      if (!respuesta.ok) throw new ErrorServicio('validacion', await leerMensaje(respuesta))
    },
  }
}
