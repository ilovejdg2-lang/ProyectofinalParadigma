export interface OpcionInstantanea {
  id: string;
  texto: string;
  orden: number;
  correcta: boolean;
}

export interface PreguntaInstantanea {
  id: string;
  enunciado: string;
  orden: number;
  respuestaCorrecta: boolean;
  segundos: number | null;
  imagenUrl?: string;
  opciones: OpcionInstantanea[];
}

export interface InstantaneaPreguntas {
  version: 1;
  preguntas: PreguntaInstantanea[];
}

export interface ParticipantePublico {
  id: string;
  perfilId: string;
  nombre: string;
  conectado: boolean;
  puntaje: number;
  aciertos: number;
  respuestas: [];
}

export interface SalaPublica {
  codigo: string;
  cuestionarioId: string;
  titulo: string;
  anfitrionId: string;
  anfitrionNombre: string;
  estado: 'esperando' | 'pregunta' | 'cerrada' | 'finalizada';
  preguntaActual: number;
  segundos: number;
  cierraEn: string | null;
  participantes: ParticipantePublico[];
  preguntas: Array<{
    id: string;
    enunciado: string;
    orden: number;
    imagenUrl?: string;
    respuestaCorrecta?: boolean;
    opciones: Array<{ id: string; texto: string; correcta?: boolean }>;
  }>;
  canal: 'remoto';
}

interface FilaOpcion {
  id: string;
  texto: string;
  orden: number;
  correcta: boolean;
}

export interface FilaPregunta {
  id: string;
  enunciado: string;
  orden: number;
  respuestaCorrecta: boolean;
  segundos: number | null;
  imagen?: { url: string } | null;
  opciones: FilaOpcion[];
}

export interface FilaParticipante {
  id: string;
  perfilId: string;
  nombre: string;
  conectado: boolean;
  puntaje: number;
  aciertos: number;
  incorporadoEn?: Date | string;
}

export interface FilaSesion {
  id: string;
  codigo: string;
  cuestionarioId: string;
  titulo: string;
  anfitrionId: string;
  anfitrionNombre: string;
  estado: SalaPublica['estado'];
  preguntaActual: number;
  segundos: number;
  cierraEn: Date | string | null;
  preguntasInstantanea?: unknown;
  cuestionario?: {
    eliminadoEn?: Date | string | null;
    preguntas: FilaPregunta[];
  } | null;
  participantes: FilaParticipante[];
}

export function instantaneaDe(preguntas: FilaPregunta[]): InstantaneaPreguntas {
  return {
    version: 1,
    preguntas: [...preguntas]
      .sort((a, b) => a.orden - b.orden)
      .map((pregunta) => ({
        id: pregunta.id,
        enunciado: pregunta.enunciado,
        orden: pregunta.orden,
        respuestaCorrecta: pregunta.respuestaCorrecta,
        segundos: pregunta.segundos,
        ...(pregunta.imagen?.url ? { imagenUrl: pregunta.imagen.url } : {}),
        opciones: [...pregunta.opciones]
          .sort((a, b) => a.orden - b.orden)
          .map((opcion) => ({
            id: opcion.id,
            texto: opcion.texto,
            orden: opcion.orden,
            correcta: opcion.correcta,
          })),
      })),
  };
}

export function leerInstantanea(valor: unknown): InstantaneaPreguntas | null {
  if (!valor || typeof valor !== 'object') return null;
  const candidato = valor as InstantaneaPreguntas;
  if (candidato.version !== 1 || !Array.isArray(candidato.preguntas))
    return null;
  return candidato;
}

type Visibilidad = 'oculta' | 'abierta' | 'revelada';

/**
 * `esperando` no entrega enunciados ni soluciones: la sala todavía no juega.
 * En juego, el índice `preguntaActual` sigue apuntando dentro de `preguntas`
 * y la longitud sigue siendo el total, para el progreso del frontend.
 * Las casillas posteriores van vacías. La solución solo sale en preguntas
 * ya cerradas: las anteriores a la actual, o la actual si el estado es
 * `cerrada` o `finalizada`.
 */
function visibilidad(fila: FilaSesion, indice: number): Visibilidad {
  if (fila.estado === 'esperando' || indice > fila.preguntaActual)
    return 'oculta';
  if (indice < fila.preguntaActual) return 'revelada';
  if (fila.estado === 'cerrada' || fila.estado === 'finalizada')
    return 'revelada';
  return 'abierta';
}

export function presentarSala(fila: FilaSesion): SalaPublica {
  const instantanea = leerInstantanea(fila.preguntasInstantanea);
  const preguntas = instantanea?.preguntas ?? enVivo(fila);
  return {
    codigo: fila.codigo,
    cuestionarioId: fila.cuestionarioId,
    titulo: fila.titulo,
    anfitrionId: fila.anfitrionId,
    anfitrionNombre: fila.anfitrionNombre,
    estado: fila.estado,
    preguntaActual: fila.preguntaActual,
    segundos: fila.segundos,
    cierraEn: fila.cierraEn ? new Date(fila.cierraEn).toISOString() : null,
    canal: 'remoto',
    participantes: [...fila.participantes]
      .sort((a, b) => fecha(a) - fecha(b))
      .map((participante) => ({
        id: participante.id,
        perfilId: participante.perfilId,
        nombre: participante.nombre,
        conectado: participante.conectado,
        puntaje: participante.puntaje,
        aciertos: participante.aciertos,
        respuestas: [],
      })),
    preguntas: preguntas.map((pregunta, indice) =>
      presentarPregunta(pregunta, visibilidad(fila, indice)),
    ),
  };
}

function enVivo(fila: FilaSesion): PreguntaInstantanea[] {
  return instantaneaDe(fila.cuestionario?.preguntas ?? []).preguntas;
}

function presentarPregunta(
  pregunta: PreguntaInstantanea,
  modo: Visibilidad,
): SalaPublica['preguntas'][number] {
  if (modo === 'oculta') {
    return {
      id: pregunta.id,
      enunciado: '',
      orden: pregunta.orden,
      opciones: [],
    };
  }
  const revelar = modo === 'revelada';
  return {
    id: pregunta.id,
    enunciado: pregunta.enunciado,
    orden: pregunta.orden,
    ...(pregunta.imagenUrl ? { imagenUrl: pregunta.imagenUrl } : {}),
    ...(revelar ? { respuestaCorrecta: pregunta.respuestaCorrecta } : {}),
    opciones: pregunta.opciones.map((opcion) =>
      revelar
        ? { id: opcion.id, texto: opcion.texto, correcta: opcion.correcta }
        : { id: opcion.id, texto: opcion.texto },
    ),
  };
}

function fecha(participante: FilaParticipante): number {
  if (!participante.incorporadoEn) return 0;
  return new Date(participante.incorporadoEn).getTime();
}
