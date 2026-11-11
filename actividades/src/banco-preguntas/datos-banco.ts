import {
  CuestionarioSemilla,
  DefinicionModoJuego,
  ImagenSemilla,
  PreguntaSemilla,
  SesionDemostracionSemilla,
} from './estructura-banco';

export const FECHA_SEMILLA = new Date('2026-10-18T12:00:00.000Z');

export const MODOS_JUEGO: DefinicionModoJuego[] = [
  {
    id: 'en-vivo',
    nombre: 'Sala en vivo',
    descripcion:
      'El docente abre una sala con código de 6 caracteres y dirige el ritmo pregunta por pregunta en tiempo real.',
    segundosPorPregunta: 20,
    permiteIndividual: false,
    mostrarExplicacionInmediata: false,
  },
  {
    id: 'practica',
    nombre: 'Práctica y estudio guiado',
    descripcion:
      'Resuelve preguntas académicas a tu propio ritmo con retroalimentación inmediata y registro de progreso personal.',
    segundosPorPregunta: 30,
    permiteIndividual: true,
    mostrarExplicacionInmediata: true,
  },
  {
    id: 'evaluacion',
    nombre: 'Evaluación diagnóstica',
    descripcion:
      'Modo de comprobación académica con validación estricta de resultados y calificación final por dominio temático.',
    segundosPorPregunta: 20,
    permiteIndividual: true,
    mostrarExplicacionInmediata: false,
  },
  {
    id: 'desafio',
    nombre: 'Desafío ágil contrarreloj',
    descripcion:
      'Ronda intensiva de resolución rápida sobre tableros Kanban, límites WIP y flujo continuo.',
    segundosPorPregunta: 15,
    permiteIndividual: true,
    mostrarExplicacionInmediata: true,
  },
];

/** Las preguntas, portadas y partidas de ejemplo viven en la base, no aquí. */
export const IMAGENES_BANCO: ImagenSemilla[] = [];
export const CUESTIONARIOS_BANCO: CuestionarioSemilla[] = [];
export const PREGUNTAS_KANBAN_ACADEMICAS: PreguntaSemilla[] = [];
export const SESIONES_DEMOSTRACION: SesionDemostracionSemilla[] = [];
