/* eslint-disable @typescript-eslint/require-await */
import { AsyncLocalStorage } from 'node:async_hooks';
import { InstantaneaPreguntas } from '../src/sesiones-juego/presentacion-sala';

export interface PreguntaMemoria {
  id: string;
  cuestionarioId: string;
  enunciado: string;
  orden: number;
  respuestaCorrecta: boolean;
  segundos: number | null;
  imagenUrl?: string;
  opciones: Array<{
    id: string;
    texto: string;
    orden: number;
    correcta: boolean;
  }>;
}

export interface CuestionarioMemoria {
  id: string;
  titulo: string;
  eliminadoEn: Date | null;
  preguntas: PreguntaMemoria[];
}

interface RespuestaMemoria {
  id: string;
  sesionId: string;
  participanteId: string;
  preguntaId: string;
  opcionId: string | null;
  valor: boolean | null;
  aceptada: boolean;
  tardia: boolean;
  puntos: number;
  respondidaEn: Date;
}

interface ResultadoMemoria {
  id: string;
  sesionId: string;
  participanteId: string;
  puntuacion: number;
  aciertos: number;
  incorrectas: number;
  finalizadoEn: Date;
}

interface ParticipanteMemoria {
  id: string;
  sesionId: string;
  perfilId: string;
  nombre: string;
  conectado: boolean;
  puntaje: number;
  aciertos: number;
  incorporadoEn: Date;
}

interface SesionMemoriaFila {
  id: string;
  codigo: string;
  cuestionarioId: string;
  titulo: string;
  anfitrionId: string;
  anfitrionNombre: string;
  estado: 'esperando' | 'pregunta' | 'cerrada' | 'finalizada';
  preguntaActual: number;
  segundos: number;
  cierraEn: Date | null;
  preguntasInstantanea: InstantaneaPreguntas | null;
  iniciadaEn: Date | null;
  finalizadaEn: Date | null;
  participantes: ParticipanteMemoria[];
}

function errorPrisma(codigo: string): Error {
  const error = new Error(codigo);
  (error as Error & { code: string }).code = codigo;
  return error;
}

interface ZonaTransaccion {
  id: symbol;
  deshacer: Array<() => void>;
}

export class SesionMemoria {
  cuestionarios: CuestionarioMemoria[] = [];
  sesiones: SesionMemoriaFila[] = [];
  respuestas: RespuestaMemoria[] = [];
  resultados: ResultadoMemoria[] = [];
  fallosCodigoRestantes = 0;
  fallarResultados = false;
  /** Cede el turno una vez, ya con el candado de la fila tomado. */
  ganchoTrasBloquear: (() => Promise<void>) | null = null;

  private readonly zonas = new AsyncLocalStorage<ZonaTransaccion>();
  private readonly candados = new Map<string, symbol>();
  private readonly colas = new Map<string, Array<() => void>>();

  readonly cuestionario = {
    findFirst: async ({
      where,
    }: {
      where: { id: string; eliminadoEn: null };
    }) => {
      const fila = this.cuestionarios.find(
        (item) => item.id === where.id && item.eliminadoEn === null,
      );
      return fila ? this.cuestionarioArbol(fila) : null;
    },
  };

  readonly sesionJuego = {
    create: async ({
      data,
    }: {
      data: Omit<
        SesionMemoriaFila,
        | 'cierraEn'
        | 'preguntasInstantanea'
        | 'iniciadaEn'
        | 'finalizadaEn'
        | 'participantes'
      >;
    }) => {
      if (this.fallosCodigoRestantes > 0) {
        this.fallosCodigoRestantes -= 1;
        throw errorPrisma('P2002');
      }
      if (this.sesiones.some((item) => item.codigo === data.codigo)) {
        throw errorPrisma('P2002');
      }
      const fila: SesionMemoriaFila = {
        ...data,
        cierraEn: null,
        preguntasInstantanea: null,
        iniciadaEn: null,
        finalizadaEn: null,
        participantes: [],
      };
      this.sesiones.push(fila);
      return this.arbol(fila);
    },
    findFirst: async ({ where }: { where: { codigo: string } }) => {
      const fila = this.sesiones.find((item) => item.codigo === where.codigo);
      return fila ? this.arbol(fila) : null;
    },
    findMany: async ({
      where,
    }: {
      where?: {
        estado?: string;
        OR?: Array<{
          anfitrionId?: string;
          participantes?: { some?: { perfilId?: string } };
        }>;
      };
    }) => {
      let lista = [...this.sesiones];
      if (where?.estado) {
        lista = lista.filter((item) => item.estado === where.estado);
      }
      if (where?.OR) {
        lista = lista.filter((sesion) =>
          where.OR?.some((clausula) => {
            if (
              clausula.anfitrionId &&
              clausula.anfitrionId === sesion.anfitrionId
            ) {
              return true;
            }
            const perfil = clausula.participantes?.some?.perfilId;
            return perfil
              ? sesion.participantes.some((item) => item.perfilId === perfil)
              : false;
          }),
        );
      }
      lista.sort(
        (a, b) =>
          (b.finalizadaEn?.getTime() ?? 0) - (a.finalizadaEn?.getTime() ?? 0),
      );
      return lista.map((fila) => this.arbol(fila));
    },
    updateMany: async ({
      where,
      data,
    }: {
      where: {
        id: string;
        estado: SesionMemoriaFila['estado'];
        preguntaActual?: number;
      };
      data: Partial<SesionMemoriaFila> & {
        estado: SesionMemoriaFila['estado'];
      };
    }) => {
      await this.adquirir(where.id);
      const fila = this.sesiones.find(
        (item) =>
          item.id === where.id &&
          item.estado === where.estado &&
          (where.preguntaActual === undefined ||
            item.preguntaActual === where.preguntaActual),
      );
      if (!fila) return { count: 0 };
      const previo = {
        estado: fila.estado,
        preguntaActual: fila.preguntaActual,
        segundos: fila.segundos,
        cierraEn: fila.cierraEn,
        preguntasInstantanea: fila.preguntasInstantanea,
        iniciadaEn: fila.iniciadaEn,
        finalizadaEn: fila.finalizadaEn,
      };
      this.anotar(() => Object.assign(fila, previo));
      Object.assign(fila, data);
      return { count: 1 };
    },
  };

  readonly $queryRaw = async (consulta: {
    strings: readonly string[];
    values: unknown[];
  }) => {
    const texto = consulta.strings.join(' ');
    if (!texto.includes('FOR UPDATE')) return [];
    const valor = consulta.values[0];
    const codigo = (typeof valor === 'string' ? valor : '')
      .trim()
      .toUpperCase();
    const sesion = this.sesiones.find((item) => item.codigo === codigo);
    if (!sesion) return [];
    await this.adquirir(sesion.id);
    return [{ id: sesion.id }];
  };

  readonly participante = {
    create: async ({
      data,
    }: {
      data: {
        id: string;
        sesionId: string;
        perfilId: string;
        nombre: string;
        conectado: boolean;
      };
    }) => {
      const ocupado = this.participantes().some(
        (item) =>
          item.sesionId === data.sesionId && item.perfilId === data.perfilId,
      );
      if (ocupado) throw errorPrisma('P2002');
      const sesion = this.exigirSesion(data.sesionId);
      const nuevo: ParticipanteMemoria = {
        ...data,
        puntaje: 0,
        aciertos: 0,
        incorporadoEn: new Date(),
      };
      sesion.participantes.push(nuevo);
      this.anotar(() => {
        sesion.participantes = sesion.participantes.filter(
          (item) => item.id !== nuevo.id,
        );
      });
      return data;
    },
    update: async ({
      where,
      data,
    }: {
      where:
        | { id: string }
        | { sesionId_perfilId: { sesionId: string; perfilId: string } };
      data: Partial<
        Pick<
          ParticipanteMemoria,
          'nombre' | 'conectado' | 'puntaje' | 'aciertos'
        >
      >;
    }) => {
      const fila = this.participantes().find((item) =>
        'id' in where
          ? item.id === where.id
          : item.sesionId === where.sesionId_perfilId.sesionId &&
            item.perfilId === where.sesionId_perfilId.perfilId,
      );
      if (!fila) throw errorPrisma('P2025');
      const antes = {
        nombre: fila.nombre,
        conectado: fila.conectado,
        puntaje: fila.puntaje,
        aciertos: fila.aciertos,
      };
      this.anotar(() => Object.assign(fila, antes));
      Object.assign(fila, data);
      return fila;
    },
  };

  readonly respuesta = {
    findMany: async ({
      where,
    }: {
      where: {
        sesionId?: string;
        preguntaId?: string;
        participanteId?: string;
        aceptada?: boolean;
      };
    }) =>
      this.respuestas.filter(
        (item) =>
          (where.sesionId === undefined || item.sesionId === where.sesionId) &&
          (where.preguntaId === undefined ||
            item.preguntaId === where.preguntaId) &&
          (where.participanteId === undefined ||
            item.participanteId === where.participanteId) &&
          (where.aceptada === undefined || item.aceptada === where.aceptada),
      ),
    create: async ({
      data,
    }: {
      data: Omit<
        RespuestaMemoria,
        'respondidaEn' | 'puntos' | 'tardia' | 'aceptada'
      > & {
        aceptada?: boolean;
        tardia?: boolean;
        puntos?: number;
      };
    }) => {
      const ocupado = this.respuestas.some(
        (item) =>
          item.participanteId === data.participanteId &&
          item.preguntaId === data.preguntaId,
      );
      if (ocupado) throw errorPrisma('P2002');
      const fila: RespuestaMemoria = {
        ...data,
        aceptada: data.aceptada ?? true,
        tardia: data.tardia ?? false,
        puntos: data.puntos ?? 0,
        respondidaEn: new Date(),
      };
      this.respuestas.push(fila);
      this.anotar(() => {
        this.respuestas = this.respuestas.filter((item) => item.id !== fila.id);
      });
      return fila;
    },
    update: async ({
      where,
      data,
    }: {
      where: { id: string };
      data: { puntos: number };
    }) => {
      const fila = this.respuestas.find((item) => item.id === where.id);
      if (!fila) throw errorPrisma('P2025');
      const antes = fila.puntos;
      this.anotar(() => {
        fila.puntos = antes;
      });
      fila.puntos = data.puntos;
      return fila;
    },
  };

  readonly resultado = {
    createMany: async ({
      data,
    }: {
      data: Array<
        Omit<ResultadoMemoria, 'finalizadoEn'> & { finalizadoEn?: Date }
      >;
    }) => {
      if (this.fallarResultados) throw errorPrisma('P2002');
      for (const item of data) {
        const ocupado = this.resultados.some(
          (existente) =>
            existente.participanteId === item.participanteId ||
            (existente.sesionId === item.sesionId &&
              existente.participanteId === item.participanteId),
        );
        if (ocupado) throw errorPrisma('P2002');
      }
      const creados = data.map((item) => ({
        ...item,
        finalizadoEn: item.finalizadoEn ?? new Date(),
      }));
      this.resultados.push(...creados);
      this.anotar(() => {
        const ids = new Set(creados.map((item) => item.id));
        this.resultados = this.resultados.filter((item) => !ids.has(item.id));
      });
      return { count: creados.length };
    },
  };

  $transaction<T>(operacion: (tx: this) => Promise<T>): Promise<T> {
    const zona: ZonaTransaccion = { id: Symbol('tx'), deshacer: [] };
    return this.zonas.run(zona, async () => {
      try {
        return await operacion(this);
      } catch (error) {
        for (const deshacer of [...zona.deshacer].reverse()) deshacer();
        throw error;
      } finally {
        this.soltar(zona.id);
      }
    });
  }

  private anotar(deshacer: () => void): void {
    this.zonas.getStore()?.deshacer.push(deshacer);
  }

  private async adquirir(sesionId: string): Promise<void> {
    const dueno = this.zonas.getStore()?.id;
    if (!dueno) return;
    for (;;) {
      const titular = this.candados.get(sesionId);
      if (!titular || titular === dueno) {
        const primera = titular !== dueno;
        this.candados.set(sesionId, dueno);
        if (primera && this.ganchoTrasBloquear) {
          const gancho = this.ganchoTrasBloquear;
          this.ganchoTrasBloquear = null;
          await gancho();
        }
        return;
      }
      await new Promise<void>((resolve) => {
        const cola = this.colas.get(sesionId) ?? [];
        cola.push(resolve);
        this.colas.set(sesionId, cola);
      });
    }
  }

  private soltar(dueno: symbol): void {
    for (const [sesionId, titular] of this.candados) {
      if (titular !== dueno) continue;
      this.candados.delete(sesionId);
      const siguiente = this.colas.get(sesionId)?.shift();
      siguiente?.();
    }
  }

  private participantes(): ParticipanteMemoria[] {
    return this.sesiones.flatMap((sesion) => sesion.participantes);
  }

  private exigirSesion(id: string): SesionMemoriaFila {
    const fila = this.sesiones.find((item) => item.id === id);
    if (!fila) throw errorPrisma('P2025');
    return fila;
  }

  private cuestionarioArbol(fila: CuestionarioMemoria) {
    return {
      ...fila,
      preguntas: fila.preguntas.map((pregunta) => ({
        ...pregunta,
        imagen: pregunta.imagenUrl ? { url: pregunta.imagenUrl } : null,
        opciones: [...pregunta.opciones].sort((a, b) => a.orden - b.orden),
      })),
    };
  }

  private arbol(fila: SesionMemoriaFila) {
    const cuestionario = this.cuestionarios.find(
      (item) => item.id === fila.cuestionarioId,
    );
    return {
      ...fila,
      participantes: [...fila.participantes]
        .sort((a, b) => a.incorporadoEn.getTime() - b.incorporadoEn.getTime())
        .map((participante) => ({
          ...participante,
          respuestas: this.respuestas
            .filter((respuesta) => respuesta.participanteId === participante.id)
            .sort(
              (a, b) => a.respondidaEn.getTime() - b.respondidaEn.getTime(),
            ),
        })),
      cuestionario: cuestionario ? this.cuestionarioArbol(cuestionario) : null,
    };
  }
}

export function cuestionarioValido(id = 'quiz-1'): CuestionarioMemoria {
  return {
    id,
    titulo: 'Paradigma en vivo',
    eliminadoEn: null,
    preguntas: [
      {
        id: 'p1',
        cuestionarioId: id,
        enunciado: 'Una función pura no tiene efectos externos.',
        orden: 1,
        respuestaCorrecta: true,
        segundos: 15,
        opciones: [
          { id: 'p1a', texto: 'Verdadero', orden: 1, correcta: true },
          { id: 'p1b', texto: 'Falso', orden: 2, correcta: false },
        ],
      },
      {
        id: 'p2',
        cuestionarioId: id,
        enunciado: 'La herencia copia cada método a mano.',
        orden: 2,
        respuestaCorrecta: false,
        segundos: null,
        opciones: [
          { id: 'p2a', texto: 'Sí', orden: 1, correcta: false },
          { id: 'p2b', texto: 'No', orden: 2, correcta: true },
        ],
      },
    ],
  };
}
