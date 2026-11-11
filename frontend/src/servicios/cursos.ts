import { leerEntorno } from '../configuracion/entorno.ts'
import { ErrorServicio } from '../dominio/errores.ts'

export interface CursoDocente {
  id: string
  nombre: string
  estudiantes: number
}

export interface NotaEvaluacion {
  estudianteId: string
  nombre: string
  aciertos: number
  total: number
  nota: number
  notaMaxima: number
  aporte: number
  posicion: number
  puntaje: number
}

export interface EvaluacionCurso {
  codigo: string
  nombre: string
  cursoId: string | null
  cursoNombre: string | null
  fecha: string | null
  notaMaxima: number
  valorPorcentaje: number
  notaMinima: number
  participantes: number
  promedio: number | null
  notaAlta: number | null
  notaBaja: number | null
  aprobacion: number | null
  calificaciones: NotaEvaluacion[]
}

export interface EstudianteCurso {
  estudianteId: string
  nombre: string
}

export interface PerfilAsignable {
  id: string
  nombre: string
  correo: string
}

interface CursoLocal {
  token: string
  curso: CursoDocente
  alumnos: EstudianteCurso[]
}

const cursosLocales: CursoLocal[] = []

function raiz() {
  return leerEntorno().actividadesUrl.replace(/\/$/, '')
}

async function pedir<T>(token: string, ruta: string, metodo = 'GET', cuerpo?: unknown): Promise<T> {
  const respuesta = await fetch(`${raiz()}${ruta}`, {
    method: metodo,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(cuerpo === undefined ? {} : { 'Content-Type': 'application/json' }),
    },
    body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo),
  })
  if (respuesta.status === 403) throw new ErrorServicio('permiso', await texto(respuesta))
  if (respuesta.status === 404) throw new ErrorServicio('no-encontrado', await texto(respuesta))
  if (!respuesta.ok) throw new ErrorServicio('conexion', await texto(respuesta))
  return (await respuesta.json()) as T
}

async function texto(respuesta: Response) {
  const dato = (await respuesta.json().catch(() => null)) as { mensaje?: string } | null
  return dato?.mensaje || 'No se pudo completar la solicitud.'
}

export function cursosDisponibles() {
  // Misma regla que crearServicios: si hay URL de API, se usa la API real.
  return Boolean(leerEntorno().actividadesUrl && leerEntorno().authUrl)
}

export async function entrarAlCursoPredeterminado(token: string) {
  if (!cursosDisponibles() || !token) return
  try {
    await pedir(token, '/cursos/predeterminado', 'POST')
  } catch {
    // Si falla, la sala del curso por defecto vuelve a matricular al entrar.
  }
}

export async function listarCursos(token: string): Promise<CursoDocente[]> {
  if (!cursosDisponibles()) return cursosLocales.filter((item) => item.token === token).map((item) => item.curso)
  return pedir(token, '/cursos')
}

export async function listarMatriculas(token: string, cursoId: string): Promise<EstudianteCurso[]> {
  if (!cursosDisponibles()) {
    return cursosLocales.find((item) => item.token === token && item.curso.id === cursoId)?.alumnos ?? []
  }
  return pedir(token, `/cursos/${cursoId}/matriculas`)
}

export async function asignarEstudiante(
  token: string,
  cursoId: string,
  estudianteId: string,
  nombre: string,
): Promise<void> {
  if (!cursosDisponibles()) {
    const curso = cursosLocales.find((item) => item.token === token && item.curso.id === cursoId)
    if (!curso) throw new ErrorServicio('permiso', 'Ese curso no está asignado a tu cuenta.')
    if (!curso.alumnos.some((alumno) => alumno.estudianteId === estudianteId)) {
      curso.alumnos.push({ estudianteId, nombre })
      curso.curso.estudiantes = curso.alumnos.length
    }
    return
  }
  await pedir(token, `/cursos/${cursoId}/matriculas`, 'POST', { estudianteId, nombre })
}

export async function buscarEstudiante(token: string, correo: string): Promise<PerfilAsignable> {
  const auth = leerEntorno().authUrl.replace(/\/$/, '')
  const limpio = correo.trim().toLowerCase()
  if (!auth) return { id: limpio, nombre: limpio.split('@')[0] || 'Estudiante', correo: limpio }
  const respuesta = await fetch(`${auth}/perfiles/buscar?correo=${encodeURIComponent(correo.trim().toLowerCase())}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (respuesta.status === 404) throw new ErrorServicio('no-encontrado', 'No hay una cuenta con ese correo.')
  if (!respuesta.ok) throw new ErrorServicio('permiso', await texto(respuesta))
  return (await respuesta.json()) as PerfilAsignable
}

export async function crearCurso(token: string, nombre: string): Promise<CursoDocente> {
  if (!cursosDisponibles()) {
    const curso = { id: crypto.randomUUID(), nombre, estudiantes: 0 }
    cursosLocales.push({ token, curso, alumnos: [] })
    return curso
  }
  return pedir(token, '/cursos', 'POST', { nombre })
}

export async function evaluacionesDelCurso(token: string, cursoId: string): Promise<EvaluacionCurso[]> {
  if (!cursosDisponibles()) return []
  return pedir(token, `/cursos/${cursoId}/evaluaciones`)
}

export async function detalleEvaluacion(token: string, codigo: string): Promise<EvaluacionCurso> {
  return pedir(token, `/evaluaciones/${codigo}`)
}

export async function descargarNotas(token: string, codigo: string) {
  const respuesta = await fetch(`${raiz()}/evaluaciones/${codigo}/csv`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!respuesta.ok) throw new ErrorServicio('permiso', 'No se pudo exportar la evaluación.')
  const blob = await respuesta.blob()
  const url = URL.createObjectURL(blob)
  const enlace = document.createElement('a')
  enlace.href = url
  enlace.download = `evaluacion-${codigo}.csv`
  enlace.click()
  URL.revokeObjectURL(url)
}
