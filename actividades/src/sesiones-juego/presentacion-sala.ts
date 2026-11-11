import { fichasEstrellas, juegoDeInstantanea, semillaDe, tableroMemoria } from './minijuegos';

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
  /** Fin de la cuenta 3-2-1. Solo aplica a la primera pregunta. */
  abreEn?: string;
  /** Copia congelada al iniciar. El docente la edita en el cuestionario. */
  puntosPorAcierto?: number;
  juego?: import('./minijuegos').ConfigJuego;
}

export const MILISEGUNDOS_CUENTA = 4_500;

export interface RespuestaPublica {
  preguntaId: string;
  valor: boolean | null;
  opcionId?: string;
  aceptada: boolean;
  tardia: boolean;
  puntos: number;
  /** Milisegundos desde el inicio oficial. Solo cuando la pregunta ya se reveló. */
  milisegundos?: number;
}

export interface ParticipantePublico {
  id: string;
  perfilId: string;
  nombre: string;
  avatarId?: string;
  conectado: boolean;
  puntaje: number;
  aciertos: number;
  /** Milisegundos sumados de los aciertos. Menor tiempo queda más arriba. */
  tiempoMs: number;
  respuestas: RespuestaPublica[];
}

export interface SalaPublica {
  codigo: string;
  cuestionarioId: string;
  titulo: string;
  anfitrionId: string;
  anfitrionNombre: string;
  estado: 'esperando' | 'pregunta' | 'cerrada' | 'clasificacion' | 'minijuego' | 'finalizada';
  preguntaActual: number;
  segundos: number;
  puntosPorAcierto: number;
  iniciaEn: string | null;
  cierraEn: string | null;
  elegibles: string[];
  abreEn: string | null;
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
  juego?: {
    activo: boolean;
    modalidad: 'academico' | 'competitivo';
    tipo?: string;
    ronda: number;
    duracion: number;
    mio: { puntos: number; titulo: string; detalle: Record<string, unknown> } | null;
    fichas?: string[];
    cartas?: number;
  };
  evaluacion?: {
    cursoId: string;
    cursoNombre: string;
    nombre: string;
    notaMaxima: number;
    valorPorcentaje: number;
    notaMinima: number;
  };
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
  avatarId?: string | null;
  conectado: boolean;
  puntaje: number;
  aciertos: number;
  puntosMinijuegos?: number;
  bonificacionVelocidad?: number;
  tiempoMs?: number;
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
  iniciaEn?: Date | string | null;
  cierraEn: Date | string | null;
  elegibles?: string[];
  finalizadaEn?: Date | string | null;
  preguntasInstantanea?: unknown;
  modoAcademico?: string;
  cursoId?: string | null;
  cursoNombre?: string | null;
  nombreEvaluacion?: string | null;
  notaMaxima?: number;
  valorPorcentaje?: number;
  notaMinima?: number;
  modalidad?: string;
  minijuegosActivos?: boolean;
  tiposMinijuego?: string[];
  cadaPreguntas?: number;
  duracionMinijuego?: number;
  velocidadActiva?: boolean;
  cuestionario?: {
    eliminadoEn?: Date | string | null;
    puntosPorAcierto?: number;
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

export function abreEnDe(
  fila: Pick<FilaSesion, 'estado' | 'preguntaActual' | 'preguntasInstantanea'>,
): string | null {
  if (fila.estado !== 'pregunta' || fila.preguntaActual !== 0) return null;
  const instantanea = leerInstantanea(fila.preguntasInstantanea);
  if (!instantanea?.abreEn) return null;
  const fecha = new Date(instantanea.abreEn);
  if (Number.isNaN(fecha.getTime())) return null;
  return fecha.toISOString();
}

export function cuentaPendiente(
  fila: Pick<FilaSesion, 'estado' | 'preguntaActual' | 'preguntasInstantanea'>,
  ahora: Date,
): boolean {
  const abre = abreEnDe(fila);
  return Boolean(abre && ahora.getTime() < new Date(abre).getTime());
}

type Visibilidad = 'oculta' | 'abierta' | 'revelada';

/**
 * `esperando` no entrega enunciados ni soluciones: la sala todavía no juega.
 * En juego, el índice `preguntaActual` sigue apuntando dentro de `preguntas`
 * y la longitud sigue siendo el total, para el progreso del frontend.
 * Las casillas posteriores van vacías. La solución solo sale en preguntas
 * ya cerradas: las anteriores a la actual, o la actual si el estado es
 * `cerrada`, `clasificacion` o `finalizada`.
 */
function vistaJuego(fila: FilaSesion, perfilId?: string) {
  const juego = juegoDeInstantanea(fila.preguntasInstantanea);
  if (!juego) return undefined;
  const mio = perfilId
    ? juego.premios.find((premio) => premio.ronda === juego.ronda && premio.perfilId === perfilId)
    : undefined;
  const semilla = perfilId ? semillaDe(fila.id, juego.ronda, perfilId) : 0;
  const enJuego = fila.estado === 'minijuego';
  return {
    activo: enJuego,
    modalidad: juego.modalidad,
    tipo: enJuego ? juego.tipo : undefined,
    ronda: juego.ronda,
    duracion: juego.duracion,
    mio: mio ? { puntos: mio.puntos, titulo: mio.titulo, detalle: mio.detalle } : null,
    fichas: enJuego && juego.tipo === 'estrellas' && perfilId ? fichasEstrellas(semilla) : undefined,
    cartas: enJuego && juego.tipo === 'memoria' ? tableroMemoria(semilla).length : undefined,
  };
}

function visibilidad(fila: FilaSesion, indice: number): Visibilidad {
  if (fila.estado === 'esperando' || indice > fila.preguntaActual)
    return 'oculta';
  if (indice < fila.preguntaActual) return 'revelada';
  if (
    fila.estado === 'cerrada' ||
    fila.estado === 'clasificacion' ||
    fila.estado === 'finalizada' ||
    fila.estado === 'minijuego'
  ) {
    return 'revelada';
  }
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
    puntosPorAcierto: puntosDeSala(fila),
    iniciaEn: fila.iniciaEn ? new Date(fila.iniciaEn).toISOString() : null,
    cierraEn: fila.cierraEn ? new Date(fila.cierraEn).toISOString() : null,
    elegibles: fila.elegibles ?? [],
    abreEn: abreEnDe(fila),
    juego: vistaJuego(fila, perfilId),
    canal: 'remoto',
    ...(fila.modoAcademico === 'evaluacion' && fila.cursoId
      ? {
          evaluacion: {
            cursoId: fila.cursoId,
            cursoNombre: fila.cursoNombre ?? '',
            nombre: fila.nombreEvaluacion || fila.titulo,
            notaMaxima: fila.notaMaxima ?? 100,
            valorPorcentaje: fila.valorPorcentaje ?? 0,
            notaMinima: fila.notaMinima ?? 70,
          },
        }
      : {}),
    participantes: [...fila.participantes]
      .sort((a, b) => fecha(a) - fecha(b))
      .map((participante) => ({
        id: participante.id,
        perfilId: participante.perfilId,
        nombre: participante.nombre,
        avatarId: participante.avatarId ?? undefined,
        conectado: participante.conectado,
        puntaje: participante.puntaje,
        aciertos: participante.aciertos,
        tiempoMs: participante.tiempoMs ?? 0,
        respuestas: [...(participante.respuestas ?? [])]
          .sort((a, b) => fechaRespuesta(a) - fechaRespuesta(b))
          .map((respuesta) =>
            presentarRespuesta(
              respuesta,
              participante.perfilId === perfilId,
              abierta,
              fila.iniciaEn,
            ),
          ),
      })),
    preguntas: preguntas.map((pregunta, indice) =>
      presentarPregunta(pregunta, visibilidad(fila, indice)),
    ),
  };
}

export function puntosDeSala(fila: Pick<FilaSesion, 'preguntasInstantanea' | 'cuestionario'>): number {
  const instantanea = leerInstantanea(fila.preguntasInstantanea);
  const guardado = instantanea?.puntosPorAcierto ?? fila.cuestionario?.puntosPorAcierto;
  const numero = typeof guardado === 'number' ? guardado : Number(guardado);
  if (!Number.isInteger(numero) || numero < 1) return 1;
  return Math.min(100, numero);
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
  iniciaEn: Date | string | null | undefined,
): RespuestaPublica {
  const ocultar = !propia && respuesta.preguntaId === preguntaAbierta;
  const revelada = respuesta.preguntaId !== preguntaAbierta;
  const milisegundos =
    revelada && iniciaEn && respuesta.respondidaEn
      ? Math.max(
          0,
          new Date(respuesta.respondidaEn).getTime() -
            new Date(iniciaEn).getTime(),
        )
      : undefined;
  return {
    preguntaId: respuesta.preguntaId,
    valor: ocultar ? null : respuesta.valor,
    ...(!ocultar && respuesta.opcionId ? { opcionId: respuesta.opcionId } : {}),
    aceptada: respuesta.aceptada,
    tardia: respuesta.tardia,
    puntos: respuesta.puntos,
    ...(milisegundos === undefined ? {} : { milisegundos }),
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
  /** Preguntas reveladas de la partida, para el reporte del docente. */
  preguntas: SalaPublica['preguntas'];
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
    preguntas: sala.preguntas,
  };
}

export function ordenarClasificacion(
  participantes: ParticipantePublico[],
): ParticipantePublico[] {
  return [...participantes].sort(
    (a, b) =>
      b.puntaje - a.puntaje ||
      a.tiempoMs - b.tiempoMs ||
      b.aciertos - a.aciertos ||
      a.nombre.localeCompare(b.nombre, 'es') ||
      a.id.localeCompare(b.id),
  );
}
