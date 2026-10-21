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
  fallosCodigoRestantes = 0;
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
        'cierraEn' | 'preguntasInstantanea' | 'iniciadaEn' | 'participantes'
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
        participantes: [],
      };
      this.sesiones.push(fila);
      return this.arbol(fila);
    },
    findFirst: async ({ where }: { where: { codigo: string } }) => {
      const fila = this.sesiones.find((item) => item.codigo === where.codigo);
      return fila ? this.arbol(fila) : null;
    },
    updateMany: async ({
      where,
      data,
    }: {
      where: { id: string; estado: 'esperando' };
      data: Partial<SesionMemoriaFila> & {
        estado: SesionMemoriaFila['estado'];
      };
    }) => {
      await this.adquirir(where.id);
      const fila = this.sesiones.find(
        (item) => item.id === where.id && item.estado === where.estado,
      );
      if (!fila) return { count: 0 };
      const previo = {
        estado: fila.estado,
        preguntaActual: fila.preguntaActual,
        segundos: fila.segundos,
        cierraEn: fila.cierraEn,
        preguntasInstantanea: fila.preguntasInstantanea,
        iniciadaEn: fila.iniciadaEn,
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
      where: { sesionId_perfilId: { sesionId: string; perfilId: string } };
      data: { nombre: string; conectado: boolean };
    }) => {
      const fila = this.participantes().find(
        (item) =>
          item.sesionId === where.sesionId_perfilId.sesionId &&
          item.perfilId === where.sesionId_perfilId.perfilId,
      );
      if (!fila) throw errorPrisma('P2025');
      const antes = { nombre: fila.nombre, conectado: fila.conectado };
      this.anotar(() => Object.assign(fila, antes));
      Object.assign(fila, data);
      return fila;
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
      participantes: [...fila.participantes].sort(
        (a, b) => a.incorporadoEn.getTime() - b.incorporadoEn.getTime(),
      ),
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
