export type DificultadBanco = 'facil' | 'medio' | 'dificil';

export type ModoJuego = 'en-vivo' | 'practica' | 'evaluacion' | 'desafio';

export interface DefinicionModoJuego {
  id: ModoJuego;
  nombre: string;
  descripcion: string;
  segundosPorPregunta: number;
  permiteIndividual: boolean;
  mostrarExplicacionInmediata: boolean;
}

export interface ImagenSemilla {
  id: string;
  nombreArchivo: string;
  url: string;
  tipoMime: string;
  tamanoBytes: number;
}

export interface OpcionSemilla {
  id: string;
  texto: string;
  orden: number;
  correcta: boolean;
}

export interface PreguntaSemilla {
  id: string;
  enunciado: string;
  orden: number;
  respuestaCorrecta: boolean;
  segundos?: number | null;
  categoria?: string;
  subtema?: string;
  dificultad?: DificultadBanco;
  explicacion?: string;
  modoRecomendado?: ModoJuego;
  imagenId?: string;
  imagenUrl?: string;
  opciones: OpcionSemilla[];
}

export interface CuestionarioSemilla {
  id: string;
  titulo: string;
  descripcion: string;
  categoria: string;
  etiquetas: string[];
  dificultad: DificultadBanco;
  modo: ModoJuego;
  imagenId: string;
  imagenUrl: string;
  esDemostracion: boolean;
  preguntas: PreguntaSemilla[];
}

export interface RespuestaDemostracionSemilla {
  id: string;
  preguntaId: string;
  opcionId: string | null;
  valor: boolean | null;
  aceptada: boolean;
  tardia: boolean;
  puntos: number;
  respondidaEn: string;
}

export interface ParticipanteDemostracionSemilla {
  id: string;
  perfilId: string;
  nombre: string;
  conectado: boolean;
  puntaje: number;
  aciertos: number;
  incorporadoEn: string;
  respuestas: RespuestaDemostracionSemilla[];
}

export interface SesionDemostracionSemilla {
  id: string;
  codigo: string;
  cuestionarioId: string;
  titulo: string;
  modo: ModoJuego;
  anfitrionId: string;
  anfitrionNombre: string;
  estado: 'esperando' | 'pregunta' | 'cerrada' | 'finalizada';
  preguntaActual: number;
  segundos: number;
  iniciadaEn: string;
  finalizadaEn: string;
  participantes: ParticipanteDemostracionSemilla[];
}

export interface ProgresoCategoria {
  categoria: string;
  partidasCompletadas: number;
  aciertos: number;
  preguntasRespondidas: number;
  porcentajeDominio: number;
}

export interface ProgresoUsuario {
  usuarioId: string;
  nombre: string;
  partidasJugadas: number;
  partidasComoAnfitrion: number;
  puntajeTotal: number;
  totalAciertos: number;
  totalIncorrectas: number;
  totalPreguntasRespondidas: number;
  promedioPorcentaje: number;
  mejorPuntaje: number;
  modosJugados: ModoJuego[];
  cuestionariosCompletados: string[];
  dominioKanban: ProgresoCategoria;
  progresoPorCategoria: ProgresoCategoria[];
  actualizadoEn: string;
}

export function opcionesVerdaderoFalso(
  preguntaId: string,
  respuestaCorrecta: boolean,
): OpcionSemilla[] {
  return [
    {
      id: `${preguntaId}:verdadero`,
      texto: 'Verdadero',
      orden: 1,
      correcta: respuestaCorrecta,
    },
    {
      id: `${preguntaId}:falso`,
      texto: 'Falso',
      orden: 2,
      correcta: !respuestaCorrecta,
    },
  ];
}

export function crearPreguntaBanco(params: {
  id: string;
  orden: number;
  enunciado: string;
  respuestaCorrecta: boolean;
  segundos?: number | null;
  categoria?: string;
  subtema?: string;
  dificultad?: DificultadBanco;
  explicacion?: string;
  modoRecomendado?: ModoJuego;
  imagenId?: string;
  imagenUrl?: string;
  opciones?: OpcionSemilla[];
}): PreguntaSemilla {
  return {
    id: params.id,
    orden: params.orden,
    enunciado: params.enunciado,
    respuestaCorrecta: params.respuestaCorrecta,
    segundos: params.segundos ?? null,
    categoria: params.categoria,
    subtema: params.subtema,
    dificultad: params.dificultad,
    explicacion: params.explicacion,
    modoRecomendado: params.modoRecomendado,
    imagenId: params.imagenId,
    imagenUrl: params.imagenUrl,
    opciones:
      params.opciones ??
      opcionesVerdaderoFalso(params.id, params.respuestaCorrecta),
  };
}

