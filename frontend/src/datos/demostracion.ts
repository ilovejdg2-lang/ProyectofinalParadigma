import type { Cuestionario, DefinicionModo, Pregunta, ResumenResultado } from '../dominio/tipos.ts'

export const CORREO_DEMO = 'docente.demo@profelink.test'
export const CONTRASENA_DEMO = 'Demo-2026'
export const NOMBRE_DEMO = 'Docente de prueba'
export const ID_DEMO = 'perfil-demo'

export const MODOS_DEMOSTRACION: DefinicionModo[] = [
  {
    id: 'en-vivo',
    nombre: 'Sala en vivo',
    descripcion: 'El docente abre una sala con código de 6 caracteres y dirige el ritmo pregunta por pregunta en tiempo real.',
    segundosPorPregunta: 20,
    permiteIndividual: false,
    mostrarExplicacionInmediata: false,
  },
  {
    id: 'practica',
    nombre: 'Práctica y estudio guiado',
    descripcion: 'Resuelve preguntas académicas a tu propio ritmo con retroalimentación inmediata y registro de progreso personal.',
    segundosPorPregunta: 30,
    permiteIndividual: true,
    mostrarExplicacionInmediata: true,
  },
  {
    id: 'evaluacion',
    nombre: 'Evaluación diagnóstica',
    descripcion: 'Modo de comprobación académica con validación estricta de resultados y calificación final por dominio temático.',
    segundosPorPregunta: 20,
    permiteIndividual: true,
    mostrarExplicacionInmediata: false,
  },
  {
    id: 'desafio',
    nombre: 'Desafío ágil contrarreloj',
    descripcion: 'Ronda intensiva de resolución rápida sobre tableros Kanban, límites WIP y flujo continuo.',
    segundosPorPregunta: 15,
    permiteIndividual: true,
    mostrarExplicacionInmediata: true,
  },
]

/** El catálogo vive en la base. La simulación no trae copias de esos cuestionarios. */
export function cuestionariosDemostracion(): Cuestionario[] {
  return []
}

export function preguntasKanbanAcademicas(): Pregunta[] {
  return []
}

export function resultadosDemostracion(): ResumenResultado[] {
  return []
}
