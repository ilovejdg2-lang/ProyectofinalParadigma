import { cuestionariosDemostracion } from '../datos/demostracion.ts'
import { ErrorServicio } from '../dominio/errores.ts'
import type { Cuestionario, Pregunta, ResultadoImagen } from '../dominio/tipos.ts'
import { validarImagen } from '../dominio/validacion.ts'
import type { ClienteAutenticacion } from './autenticacion.ts'
import type { Almacen } from './almacen.ts'

export interface EntradaCuestionario {
  id?: string
  titulo: string
  descripcion: string
  categoria: string
  etiquetas: string[]
  dificultad: Cuestionario['dificultad']
  imagenUrl?: string
  preguntas: Pregunta[]
}

export interface ClienteActividades {
  listar(): Promise<Cuestionario[]>
  obtener(id: string): Promise<Cuestionario>
  mios(token: string): Promise<Cuestionario[]>
  guardar(token: string, entrada: EntradaCuestionario): Promise<Cuestionario>
  eliminar(token: string, id: string): Promise<void>
  cargarImagen(token: string, archivo: File): Promise<ResultadoImagen>
}

const CLAVE = 'profelink.cuestionarios.v1'

function leer(almacen: Almacen): Cuestionario[] {
  const texto = almacen.leer(CLAVE)
  if (!texto) {
    const iniciales = cuestionariosDemostracion()
    almacen.escribir(CLAVE, JSON.stringify(iniciales))
    return iniciales
  }
  return JSON.parse(texto) as Cuestionario[]
}

function guardarLista(almacen: Almacen, lista: Cuestionario[]) {
  almacen.escribir(CLAVE, JSON.stringify(lista))
}

async function perfilDe(autenticacion: ClienteAutenticacion, token: string) {
  const sesion = await autenticacion.sesionActual(token)
  if (!sesion) throw new ErrorServicio('permiso', 'La sesión no es válida.')
  return sesion.perfil
}

export function crearActividadesSimuladas(
  almacen: Almacen,
  autenticacion: ClienteAutenticacion,
): ClienteActividades {
  return {
    async listar() {
      return leer(almacen)
    },
    async obtener(id) {
      const cuestionario = leer(almacen).find((item) => item.id === id)
      if (!cuestionario) throw new ErrorServicio('no-encontrado', 'No se encontró el cuestionario.')
      return cuestionario
    },
    async mios(token) {
      const perfil = await perfilDe(autenticacion, token)
      return leer(almacen).filter((item) => item.autorId === perfil.id)
    },
    async guardar(token, entrada) {
      const perfil = await perfilDe(autenticacion, token)
      const lista = leer(almacen)
      const ahora = new Date().toISOString()
      if (entrada.id) {
        const indice = lista.findIndex((item) => item.id === entrada.id)
        const actual = lista[indice]
        if (!actual) throw new ErrorServicio('no-encontrado', 'No se encontró el cuestionario.')
        if (actual.autorId !== perfil.id) {
          throw new ErrorServicio('permiso', 'Solo quien creó el cuestionario puede editarlo.')
        }
        const actualizado: Cuestionario = {
          ...actual,
          titulo: entrada.titulo.trim(),
          descripcion: entrada.descripcion.trim(),
          categoria: entrada.categoria,
          etiquetas: entrada.etiquetas,
          dificultad: entrada.dificultad,
          imagenUrl: entrada.imagenUrl,
          preguntas: entrada.preguntas,
          actualizadoEn: ahora,
        }
        lista[indice] = actualizado
        try {
          guardarLista(almacen, lista)
        } catch {
          throw new ErrorServicio('validacion', 'No se pudo guardar la portada. Prueba con una imagen más liviana.')
        }
        return actualizado
      }
      const creado: Cuestionario = {
        id: crypto.randomUUID(),
        titulo: entrada.titulo.trim(),
        descripcion: entrada.descripcion.trim(),
        categoria: entrada.categoria,
        etiquetas: entrada.etiquetas,
        dificultad: entrada.dificultad,
        autorId: perfil.id,
        autorNombre: perfil.nombre,
        imagenUrl: entrada.imagenUrl,
        preguntas: entrada.preguntas,
        esDemostracion: false,
        actualizadoEn: ahora,
      }
      lista.unshift(creado)
      try {
        guardarLista(almacen, lista)
      } catch {
        throw new ErrorServicio('validacion', 'No se pudo guardar la portada. Prueba con una imagen más liviana.')
      }
      return creado
    },
    async eliminar(token, id) {
      const perfil = await perfilDe(autenticacion, token)
      const lista = leer(almacen)
      const actual = lista.find((item) => item.id === id)
      if (!actual) throw new ErrorServicio('no-encontrado', 'No se encontró el cuestionario.')
      if (actual.autorId !== perfil.id) {
        throw new ErrorServicio('permiso', 'Solo quien creó el cuestionario puede eliminarlo.')
      }
      guardarLista(
        almacen,
        lista.filter((item) => item.id !== id),
      )
    },
    async cargarImagen(_token, archivo) {
      await perfilDe(autenticacion, _token)
      const error = validarImagen(archivo)
      if (error) throw new ErrorServicio('validacion', error)
      const url = await prepararImagen(archivo)
      return { url, origen: 'simulado' }
    },
  }
}

function leerArchivo(archivo: File): Promise<string> {
  return new Promise((resolver, rechazar) => {
    const lector = new FileReader()
    lector.onload = () => resolver(String(lector.result))
    lector.onerror = () => rechazar(new ErrorServicio('validacion', 'No se pudo leer la imagen.'))
    lector.readAsDataURL(archivo)
  })
}

function prepararImagen(archivo: File): Promise<string> {
  return leerArchivo(archivo).then((dataUrl) => {
    if (archivo.type === 'image/svg+xml' || archivo.type === 'image/gif') return dataUrl
    return new Promise((resolver, rechazar) => {
      const imagen = new Image()
      imagen.onload = () => {
        const maximo = 1200
        const escala = Math.min(1, maximo / Math.max(imagen.width, imagen.height))
        const lienzo = document.createElement('canvas')
        lienzo.width = Math.max(1, Math.round(imagen.width * escala))
        lienzo.height = Math.max(1, Math.round(imagen.height * escala))
        const contexto = lienzo.getContext('2d')
        if (!contexto) {
          resolver(dataUrl)
          return
        }
        contexto.drawImage(imagen, 0, 0, lienzo.width, lienzo.height)
        resolver(lienzo.toDataURL('image/jpeg', 0.82))
      }
      imagen.onerror = () => rechazar(new ErrorServicio('validacion', 'No se pudo usar esa imagen.'))
      imagen.src = dataUrl
    })
  })
}

async function mensaje(respuesta: Response): Promise<string> {
  try {
    const cuerpo = (await respuesta.json()) as { mensaje?: string }
    return cuerpo.mensaje ?? 'La API de actividades rechazó la solicitud.'
  } catch {
    return 'La API de actividades no respondió correctamente.'
  }
}

export function crearActividadesHttp(baseUrl: string): ClienteActividades {
  const raiz = baseUrl.replace(/\/$/, '')
  const autorizacion = (token: string) => ({ Authorization: `Bearer ${token}` })

  return {
    async listar() {
      const respuesta = await fetch(`${raiz}/cuestionarios`)
      if (!respuesta.ok) throw new ErrorServicio('conexion', await mensaje(respuesta))
      return (await respuesta.json()) as Cuestionario[]
    },
    async obtener(id) {
      const respuesta = await fetch(`${raiz}/cuestionarios/${id}`)
      if (respuesta.status === 404) throw new ErrorServicio('no-encontrado', 'No se encontró el cuestionario.')
      if (!respuesta.ok) throw new ErrorServicio('conexion', await mensaje(respuesta))
      return (await respuesta.json()) as Cuestionario
    },
    async mios(token) {
      const respuesta = await fetch(`${raiz}/mis-cuestionarios`, { headers: autorizacion(token) })
      if (!respuesta.ok) throw new ErrorServicio('conexion', await mensaje(respuesta))
      return (await respuesta.json()) as Cuestionario[]
    },
    async guardar(token, entrada) {
      const esEdicion = Boolean(entrada.id)
      const respuesta = await fetch(esEdicion ? `${raiz}/cuestionarios/${entrada.id}` : `${raiz}/cuestionarios`, {
        method: esEdicion ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json', ...autorizacion(token) },
        body: JSON.stringify(entrada),
      })
      if (respuesta.status === 403) throw new ErrorServicio('permiso', await mensaje(respuesta))
      if (!respuesta.ok) throw new ErrorServicio('validacion', await mensaje(respuesta))
      return (await respuesta.json()) as Cuestionario
    },
    async eliminar(token, id) {
      const respuesta = await fetch(`${raiz}/cuestionarios/${id}`, {
        method: 'DELETE',
        headers: autorizacion(token),
      })
      if (respuesta.status === 403) throw new ErrorServicio('permiso', await mensaje(respuesta))
      if (!respuesta.ok) throw new ErrorServicio('conexion', await mensaje(respuesta))
    },
    async cargarImagen(token, archivo) {
      const error = validarImagen(archivo)
      if (error) throw new ErrorServicio('validacion', error)
      const formulario = new FormData()
      formulario.set('archivo', archivo)
      const respuesta = await fetch(`${raiz}/imagenes`, {
        method: 'POST',
        headers: autorizacion(token),
        body: formulario,
      })
      if (!respuesta.ok) throw new ErrorServicio('validacion', await mensaje(respuesta))
      const cuerpo = (await respuesta.json()) as { url: string }
      return { url: cuerpo.url, origen: 'remoto' }
    },
  }
}
