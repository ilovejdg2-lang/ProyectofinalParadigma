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

export const ACTIVIDAD_SIGUIENTE = {
  titulo: 'Proyecto Final - Parte 2',
  curso: 'Programación 1',
  aviso: 'Fecha límite inminente',
  vence: 'Vence en 8 días',
  valor: 'Vale 15%',
}

export const ACTIVIDADES_CURSO: ActividadCurso[] = [
  {
    id: 'proyecto-final',
    titulo: 'Proyecto Final',
    tipo: 'Actividad',
    valor: 'Valor: 30%',
    estado: 'No Entregado',
    columna: 'progreso',
    destacada: true,
  },
  {
    id: 'lab-extra',
    titulo: 'Lab - Extra',
    tipo: 'Actividad',
    valor: 'Valor: 1%',
    estado: 'Calificado',
    detalle: '1 de 1',
    columna: 'listas',
    destacada: true,
  },
  { id: 'funciones-puras', titulo: 'Funciones puras', tipo: 'Práctica', valor: 'Valor: 5%', estado: 'Calificado', columna: 'listas' },
  { id: 'orden-superior', titulo: 'Orden superior', tipo: 'Práctica', valor: 'Valor: 5%', estado: 'Calificado', columna: 'listas' },
  { id: 'inmutabilidad', titulo: 'Inmutabilidad', tipo: 'Práctica', valor: 'Valor: 5%', estado: 'Calificado', columna: 'listas' },
  { id: 'hechos-reglas', titulo: 'Hechos y reglas', tipo: 'Práctica', valor: 'Valor: 5%', estado: 'Calificado', columna: 'listas' },
  { id: 'prolog', titulo: 'Prolog', tipo: 'Práctica', valor: 'Valor: 5%', estado: 'Calificado', columna: 'listas' },
  { id: 'objetos', titulo: 'Objetos', tipo: 'Práctica', valor: 'Valor: 5%', estado: 'Calificado', columna: 'listas' },
  { id: 'herencia', titulo: 'Herencia', tipo: 'Práctica', valor: 'Valor: 5%', estado: 'Calificado', columna: 'listas' },
  { id: 'encapsulamiento', titulo: 'Encapsulamiento', tipo: 'Práctica', valor: 'Valor: 5%', estado: 'Calificado', columna: 'listas' },
  { id: 'polimorfismo', titulo: 'Polimorfismo', tipo: 'Práctica', valor: 'Valor: 5%', estado: 'Calificado', columna: 'listas' },
  { id: 'wip', titulo: 'Límites WIP', tipo: 'Práctica', valor: 'Valor: 5%', estado: 'Calificado', columna: 'listas' },
  { id: 'little', titulo: 'Ley de Little', tipo: 'Práctica', valor: 'Valor: 5%', estado: 'Calificado', columna: 'listas' },
]

export const COLUMNAS_CURSO = [
  { id: 'definir' as const, titulo: '1. Por definir' },
  { id: 'progreso' as const, titulo: '2. En Progreso' },
  { id: 'listas' as const, titulo: '3. Completadas' },
]

export const MATERIALES_CURSO = [
  { id: 'demo-funcional', titulo: 'Paradigma funcional', detalle: 'Funciones puras, inmutabilidad y orden superior.' },
  { id: 'demo-logico', titulo: 'Paradigma lógico', detalle: 'Hechos, reglas y Prolog.' },
  { id: 'demo-objetos', titulo: 'Orientado a objetos', detalle: 'Estado, herencia, encapsulamiento y polimorfismo.' },
  { id: 'demo-kanban-fundamentos', titulo: 'Kanban', detalle: 'Flujo, WIP y el tablero de la clase.' },
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
