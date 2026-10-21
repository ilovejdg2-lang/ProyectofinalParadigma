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

export interface RespuestaPublica {
  preguntaId: string;
  valor: boolean | null;
  opcionId?: string;
  aceptada: boolean;
  tardia: boolean;
  puntos: number;
}

export interface ParticipantePublico {
  id: string;
  perfilId: string;
  nombre: string;
  conectado: boolean;
  puntaje: number;
  aciertos: number;
  respuestas: RespuestaPublica[];
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

export interface FilaRespuesta {
  preguntaId: string;
  valor: boolean | null;
  opcionId: string | null;
  aceptada: boolean;
  tardia: boolean;
  puntos: number;
  respondidaEn?: Date | string;
}

export interface FilaParticipante {
  id: string;
  perfilId: string;
  nombre: string;
  conectado: boolean;
  puntaje: number;
  aciertos: number;
  incorporadoEn?: Date | string;
  respuestas?: FilaRespuesta[];
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
  finalizadaEn?: Date | string | null;
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

export function presentarSala(
  fila: FilaSesion,
  perfilId?: string,
): SalaPublica {
  const instantanea = leerInstantanea(fila.preguntasInstantanea);
  const preguntas = instantanea?.preguntas ?? enVivo(fila);
  const abierta =
    fila.estado === 'pregunta' ? preguntas[fila.preguntaActual]?.id : undefined;
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
        respuestas: [...(participante.respuestas ?? [])]
          .sort((a, b) => fechaRespuesta(a) - fechaRespuesta(b))
          .map((respuesta) =>
            presentarRespuesta(
              respuesta,
              participante.perfilId === perfilId,
              abierta,
            ),
          ),
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

function presentarRespuesta(
  respuesta: FilaRespuesta,
  propia: boolean,
  preguntaAbierta: string | undefined,
): RespuestaPublica {
  const ocultar = !propia && respuesta.preguntaId === preguntaAbierta;
  return {
    preguntaId: respuesta.preguntaId,
    valor: ocultar ? null : respuesta.valor,
    ...(!ocultar && respuesta.opcionId ? { opcionId: respuesta.opcionId } : {}),
    aceptada: respuesta.aceptada,
    tardia: respuesta.tardia,
    puntos: respuesta.puntos,
  };
}

function fecha(participante: FilaParticipante): number {
  if (!participante.incorporadoEn) return 0;
  return new Date(participante.incorporadoEn).getTime();
}

function fechaRespuesta(respuesta: FilaRespuesta): number {
  if (!respuesta.respondidaEn) return 0;
  return new Date(respuesta.respondidaEn).getTime();
}

export interface ResumenPublico {
  codigo: string;
  titulo: string;
  finalizadaEn: string;
  anfitrionId: string;
  participantes: ParticipantePublico[];
}

export function presentarResultado(fila: FilaSesion): ResumenPublico {
  const sala = presentarSala(fila);
  return {
    codigo: sala.codigo,
    titulo: sala.titulo,
    finalizadaEn: fila.finalizadaEn
      ? new Date(fila.finalizadaEn).toISOString()
      : new Date(0).toISOString(),
    anfitrionId: sala.anfitrionId,
    participantes: ordenarClasificacion(sala.participantes),
  };
}

export function ordenarClasificacion(
  participantes: ParticipantePublico[],
): ParticipantePublico[] {
  return [...participantes].sort(
    (a, b) =>
      b.puntaje - a.puntaje ||
      b.aciertos - a.aciertos ||
      a.nombre.localeCompare(b.nombre, 'es'),
  );
}
