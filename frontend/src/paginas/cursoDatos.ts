export interface ActividadCurso {
  id: string
  titulo: string
  tipo: string
  valor: string
  estado: string
  detalle?: string
  columna: 'definir' | 'progreso' | 'listas'
  destacada?: boolean
}

export const ACTIVIDADES_CURSO: ActividadCurso[] = []

export const COLUMNAS_CURSO = [
  { id: 'definir' as const, titulo: '1. Por definir' },
  { id: 'progreso' as const, titulo: '2. En Progreso' },
  { id: 'listas' as const, titulo: '3. Completadas' },
]

export function saludoDelDia(fecha = new Date()) {
  const hora = fecha.getHours()
  if (hora < 12) return 'Buenos días'
  if (hora < 19) return 'Buenas tardes'
  return 'Buenas noches'
}

export function primerNombre(nombre: string | undefined) {
  const limpio = nombre?.trim().split(/\s+/)[0]
  return limpio || 'estudiante'
}
