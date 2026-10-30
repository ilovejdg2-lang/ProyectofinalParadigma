import { AsyncLocalStorage } from 'node:async_hooks';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { AUTOR_DEMOSTRACION } from '../autenticacion/identidad-externa';
import {
  CUESTIONARIOS_BANCO,
  FECHA_SEMILLA,
  IMAGENES_BANCO,
  SESIONES_DEMOSTRACION,
} from '../banco-preguntas/datos-banco';
import { InstantaneaPreguntas } from '../sesiones-juego/presentacion-sala';

export interface ImagenFilaLocal {
  id: string;
  nombreArchivo: string;
  url: string;
  tipoMime: string;
  tamanoBytes: number;
  creadoEn?: Date;
}

export interface CuestionarioFilaLocal {
  id: string;
  autorId: string;
  autorNombre: string;
  titulo: string;
  descripcion: string;
  categoria: string;
  etiquetas: string[];
  dificultad: 'facil' | 'medio' | 'dificil';
  esDemostracion: boolean;
  imagenId: string | null;
  creadoEn: Date;
  actualizadoEn: Date;
  eliminadoEn: Date | null;
}

export interface PreguntaFilaLocal {
  id: string;
  cuestionarioId: string;
  enunciado: string;
  orden: number;
  respuestaCorrecta: boolean;
  segundos: number | null;
  imagenId: string | null;
}

export interface OpcionFilaLocal {
  id: string;
  preguntaId: string;
  texto: string;
  orden: number;
  correcta: boolean;
}

export interface ParticipanteFilaLocal {
  id: string;
  sesionId: string;
  perfilId: string;
  nombre: string;
  conectado: boolean;
  puntaje: number;
  aciertos: number;
  incorporadoEn: Date;
}

export interface RespuestaFilaLocal {
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

export interface ResultadoFilaLocal {
  id: string;
  sesionId: string;
  participanteId: string;
  puntuacion: number;
  aciertos: number;
  incorrectas: number;
  finalizadoEn: Date;
}

export interface SesionFilaLocal {
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
  creadoEn: Date;
  iniciadaEn: Date | null;
  finalizadaEn: Date | null;
}

interface EstadoSerializado {
  imagenes: ImagenFilaLocal[];
  cuestionarios: CuestionarioFilaLocal[];
  preguntas: PreguntaFilaLocal[];
  opciones: OpcionFilaLocal[];
  sesiones: SesionFilaLocal[];
  participantes: ParticipanteFilaLocal[];
  respuestas: RespuestaFilaLocal[];
  resultados: ResultadoFilaLocal[];
}

function errorPrisma(codigo: string): Error {
  const error = new Error(codigo);
  (error as Error & { code: string }).code = codigo;
  return error;
}

interface ZonaTransaccion {
  id: symbol;
}

export class AlmacenPersistenciaLocal {
  imagenes: ImagenFilaLocal[] = [];
  cuestionarios: CuestionarioFilaLocal[] = [];
  preguntas: PreguntaFilaLocal[] = [];
  opciones: OpcionFilaLocal[] = [];
  sesiones: SesionFilaLocal[] = [];
  participantes: ParticipanteFilaLocal[] = [];
  respuestas: RespuestaFilaLocal[] = [];
  resultados: ResultadoFilaLocal[] = [];

  private readonly zonas = new AsyncLocalStorage<ZonaTransaccion>();
  private readonly candados = new Map<string, symbol>();
  private readonly colas = new Map<string, Array<() => void>>();
  private readonly rutaArchivo: string | null;

  constructor(persistirEnDisco = !process.env.JEST_WORKER_ID) {
    this.rutaArchivo = persistirEnDisco
      ? path.resolve(process.cwd(), 'datos/persistencia-local.json')
      : null;
    this.inicializar();
  }

  private inicializar(): void {
    this.sembrarBancoInicial();
    if (this.rutaArchivo && fs.existsSync(this.rutaArchivo)) {
      try {
        const crudo = JSON.parse(
          fs.readFileSync(this.rutaArchivo, 'utf8'),
        ) as Partial<EstadoSerializado>;
        this.fusionarDesdeDisco(crudo);
      } catch {
        // Si el archivo local está corrupto, se mantiene el banco semilla válido.
      }
    }
  }

  private sembrarBancoInicial(): void {
    this.imagenes = IMAGENES_BANCO.map((img) => ({
      ...img,
      creadoEn: FECHA_SEMILLA,
    }));

    this.cuestionarios = [];
    this.preguntas = [];
    this.opciones = [];

    for (const c of CUESTIONARIOS_BANCO) {
      this.cuestionarios.push({
        id: c.id,
        autorId: AUTOR_DEMOSTRACION.id,
        autorNombre: AUTOR_DEMOSTRACION.nombre,
        titulo: c.titulo,
        descripcion: c.descripcion,
        categoria: c.categoria,
        etiquetas: [...c.etiquetas],
        dificultad: c.dificultad,
        esDemostracion: true,
        imagenId: c.imagenId,
        creadoEn: new Date(FECHA_SEMILLA),
        actualizadoEn: new Date(FECHA_SEMILLA),
        eliminadoEn: null,
      });

      for (const p of c.preguntas) {
        this.preguntas.push({
          id: p.id,
          cuestionarioId: c.id,
          enunciado: p.enunciado,
          orden: p.orden,
          respuestaCorrecta: p.respuestaCorrecta,
          segundos: p.segundos ?? null,
          imagenId: p.imagenId ?? null,
        });

        for (const o of p.opciones) {
          this.opciones.push({
            id: o.id,
            preguntaId: p.id,
            texto: o.texto,
            orden: o.orden,
            correcta: o.correcta,
          });
        }
      }
    }

    this.sesiones = [];
    this.participantes = [];
    this.respuestas = [];
    this.resultados = [];

    for (const s of SESIONES_DEMOSTRACION) {
      const cuestionario = CUESTIONARIOS_BANCO.find(
        (c) => c.id === s.cuestionarioId,
      );
      const instantanea: InstantaneaPreguntas = {
        version: 1,
        preguntas: (cuestionario?.preguntas ?? []).map((p) => ({
          id: p.id,
          enunciado: p.enunciado,
          orden: p.orden,
          respuestaCorrecta: p.respuestaCorrecta,
          segundos: p.segundos ?? null,
          ...(p.imagenUrl ? { imagenUrl: p.imagenUrl } : {}),
          opciones: p.opciones.map((o) => ({
            id: o.id,
            texto: o.texto,
            orden: o.orden,
            correcta: o.correcta,
          })),
        })),
      };

      this.sesiones.push({
        id: s.id,
        codigo: s.codigo,
        cuestionarioId: s.cuestionarioId,
        titulo: s.titulo,
        anfitrionId: s.anfitrionId,
        anfitrionNombre: s.anfitrionNombre,
        estado: s.estado,
        preguntaActual: s.preguntaActual,
        segundos: s.segundos,
        cierraEn: null,
        preguntasInstantanea: instantanea,
        creadoEn: new Date(s.iniciadaEn),
        iniciadaEn: new Date(s.iniciadaEn),
        finalizadaEn: new Date(s.finalizadaEn),
      });

      const totalPreguntas = cuestionario?.preguntas.length ?? 0;

      for (const part of s.participantes) {
        this.participantes.push({
          id: part.id,
          sesionId: s.id,
          perfilId: part.perfilId,
          nombre: part.nombre,
          conectado: part.conectado,
          puntaje: part.puntaje,
          aciertos: part.aciertos,
          incorporadoEn: new Date(part.incorporadoEn),
        });

        for (const r of part.respuestas) {
          this.respuestas.push({
            id: r.id,
            sesionId: s.id,
            participanteId: part.id,
            preguntaId: r.preguntaId,
            opcionId: r.opcionId,
            valor: r.valor,
            aceptada: r.aceptada,
            tardia: r.tardia,
            puntos: r.puntos,
            respondidaEn: new Date(r.respondidaEn),
          });
        }

        this.resultados.push({
          id: `res-${part.id}`,
          sesionId: s.id,
          participanteId: part.id,
          puntuacion: part.puntaje,
          aciertos: part.aciertos,
          incorrectas: Math.max(0, totalPreguntas - part.aciertos),
          finalizadoEn: new Date(s.finalizadaEn),
        });
      }
    }
  }

  private fusionarDesdeDisco(crudo: Partial<EstadoSerializado>): void {
    if (Array.isArray(crudo.imagenes)) {
      for (const img of crudo.imagenes) {
        if (!this.imagenes.some((i) => i.id === img.id)) {
          this.imagenes.push({
            ...img,
            creadoEn: img.creadoEn ? new Date(img.creadoEn) : new Date(),
          });
        }
      }
    }
    if (Array.isArray(crudo.cuestionarios)) {
      for (const c of crudo.cuestionarios) {
        const idx = this.cuestionarios.findIndex((item) => item.id === c.id);
        const normalizado: CuestionarioFilaLocal = {
          ...c,
          creadoEn: new Date(c.creadoEn),
          actualizadoEn: new Date(c.actualizadoEn),
          eliminadoEn: c.eliminadoEn ? new Date(c.eliminadoEn) : null,
        };
        if (idx >= 0) {
          this.cuestionarios[idx] = normalizado;
        } else {
          this.cuestionarios.push(normalizado);
        }
      }
    }
    if (Array.isArray(crudo.preguntas)) {
      for (const p of crudo.preguntas) {
        const idx = this.preguntas.findIndex((item) => item.id === p.id);
        if (idx >= 0) {
          this.preguntas[idx] = p;
        } else {
          this.preguntas.push(p);
        }
      }
    }
    if (Array.isArray(crudo.opciones)) {
      for (const o of crudo.opciones) {
        const idx = this.opciones.findIndex((item) => item.id === o.id);
        if (idx >= 0) {
          this.opciones[idx] = o;
        } else {
          this.opciones.push(o);
        }
      }
    }
    if (Array.isArray(crudo.sesiones)) {
      for (const s of crudo.sesiones) {
        if (!this.sesiones.some((item) => item.codigo === s.codigo)) {
          this.sesiones.push({
            ...s,
            cierraEn: s.cierraEn ? new Date(s.cierraEn) : null,
            creadoEn: new Date(s.creadoEn),
            iniciadaEn: s.iniciadaEn ? new Date(s.iniciadaEn) : null,
            finalizadaEn: s.finalizadaEn ? new Date(s.finalizadaEn) : null,
          });
        }
      }
    }
    if (Array.isArray(crudo.participantes)) {
      for (const p of crudo.participantes) {
        if (
          !this.participantes.some(
            (item) =>
              item.id === p.id ||
              (item.sesionId === p.sesionId && item.perfilId === p.perfilId),
          )
        ) {
          this.participantes.push({
            ...p,
            incorporadoEn: new Date(p.incorporadoEn),
          });
        }
      }
    }
    if (Array.isArray(crudo.respuestas)) {
      for (const r of crudo.respuestas) {
        if (
          !this.respuestas.some(
            (item) =>
              item.id === r.id ||
              (item.participanteId === r.participanteId &&
                item.preguntaId === r.preguntaId),
          )
        ) {
          this.respuestas.push({
            ...r,
            respondidaEn: new Date(r.respondidaEn),
          });
        }
      }
    }
    if (Array.isArray(crudo.resultados)) {
      for (const res of crudo.resultados) {
        if (
          !this.resultados.some(
            (item) =>
              item.id === res.id ||
              item.participanteId === res.participanteId,
          )
        ) {
          this.resultados.push({
            ...res,
            finalizadoEn: new Date(res.finalizadoEn),
          });
        }
      }
    }
  }

  private persistir(): void {
    if (!this.rutaArchivo || this.zonas.getStore()) return;
    try {
      const dir = path.dirname(this.rutaArchivo);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      const datos: EstadoSerializado = {
        imagenes: this.imagenes,
        cuestionarios: this.cuestionarios,
        preguntas: this.preguntas,
        opciones: this.opciones,
        sesiones: this.sesiones,
        participantes: this.participantes,
        respuestas: this.respuestas,
        resultados: this.resultados,
      };
      fs.writeFileSync(this.rutaArchivo, JSON.stringify(datos, null, 2), 'utf8');
    } catch {
      // Ignorar errores de sistema de archivos en entornos de solo lectura
    }
  }

  readonly imagen = {
    findFirst: async ({ where }: { where: { url?: string; id?: string } }) =>
      this.imagenes.find(
        (imagen) =>
          (where.url === undefined || imagen.url === where.url) &&
          (where.id === undefined || imagen.id === where.id),
      ) ?? null,
    create: async ({ data }: { data: ImagenFilaLocal }) => {
      this.imagenes.push(data);
      this.persistir();
      return data;
    },
  };

  readonly cuestionario = {
    findMany: async ({
      where,
    }: {
      where?: {
        eliminadoEn?: null;
        autorId?: string | { in?: string[] };
        categoria?: string;
        esDemostracion?: boolean;
      };
    } = {}) =>
      this.filtrarCuestionarios(where ?? {}).map((fila) =>
        this.arbolCuestionario(fila),
      ),
    findFirst: async ({
      where,
    }: {
      where: {
        id?: string;
        eliminadoEn?: null;
        autorId?: string | { in?: string[] };
      };
    }) => {
      const fila = this.filtrarCuestionarios(where)[0];
      return fila ? this.arbolCuestionario(fila) : null;
    },
    count: async ({
      where,
    }: {
      where?: {
        eliminadoEn?: null;
        esDemostracion?: boolean;
        categoria?: string;
      };
    } = {}) => this.filtrarCuestionarios(where ?? {}).length,
    create: async ({
      data,
    }: {
      data: Omit<
        CuestionarioFilaLocal,
        'creadoEn' | 'actualizadoEn' | 'eliminadoEn'
      >;
    }) => {
      if (this.cuestionarios.some((item) => item.id === data.id)) {
        throw errorPrisma('P2002');
      }
      const fila: CuestionarioFilaLocal = {
        ...data,
        creadoEn: new Date(),
        actualizadoEn: new Date(),
        eliminadoEn: null,
      };
      this.cuestionarios.push(fila);
      this.persistir();
      return fila;
    },
    update: async ({
      where,
      data,
    }: {
      where: { id: string };
      data: Partial<CuestionarioFilaLocal>;
    }) => {
      const fila = this.exigir(
        this.cuestionarios.find((item) => item.id === where.id),
      );
      Object.assign(fila, data, { actualizadoEn: new Date() });
      this.persistir();
      return fila;
    },
  };

  readonly pregunta = {
    findFirst: async ({ where }: { where: { id: string } }) =>
      this.preguntas.find((pregunta) => pregunta.id === where.id) ?? null,
    create: async ({ data }: { data: PreguntaFilaLocal }) => {
      this.exigirLibre(
        this.preguntas.some((pregunta) => pregunta.id === data.id),
      );
      this.exigirOrdenPregunta(data.cuestionarioId, data.orden, data.id);
      this.preguntas.push(data);
      this.persistir();
      return data;
    },
    update: async ({
      where,
      data,
    }: {
      where: { id: string };
      data: Partial<PreguntaFilaLocal>;
    }) => {
      const fila = this.exigir(
        this.preguntas.find((pregunta) => pregunta.id === where.id),
      );
      const orden = data.orden ?? fila.orden;
      this.exigirOrdenPregunta(fila.cuestionarioId, orden, fila.id);
      Object.assign(fila, data);
      this.persistir();
      return fila;
    },
    delete: async ({ where }: { where: { id: string } }) => {
      this.preguntas = this.preguntas.filter(
        (pregunta) => pregunta.id !== where.id,
      );
      this.persistir();
    },
  };

  readonly opcion = {
    findFirst: async ({ where }: { where: { id: string } }) =>
      this.opciones.find((opcion) => opcion.id === where.id) ?? null,
    create: async ({ data }: { data: OpcionFilaLocal }) => {
      this.exigirLibre(this.opciones.some((opcion) => opcion.id === data.id));
      this.exigirOrdenOpcion(data.preguntaId, data.orden, data.id);
      this.exigirCorrecta(data.preguntaId, data.id, data.correcta);
      this.opciones.push(data);
      this.persistir();
      return data;
    },
    update: async ({
      where,
      data,
    }: {
      where: { id: string };
      data: Partial<OpcionFilaLocal>;
    }) => {
      const fila = this.exigir(
        this.opciones.find((opcion) => opcion.id === where.id),
      );
      const orden = data.orden ?? fila.orden;
      const correcta = data.correcta ?? fila.correcta;
      this.exigirOrdenOpcion(fila.preguntaId, orden, fila.id);
      this.exigirCorrecta(fila.preguntaId, fila.id, correcta);
      Object.assign(fila, data);
      this.persistir();
      return fila;
    },
    delete: async ({ where }: { where: { id: string } }) => {
      this.opciones = this.opciones.filter((opcion) => opcion.id !== where.id);
      this.persistir();
    },
  };

  readonly sesionJuego = {
    create: async ({
      data,
    }: {
      data: {
        id: string;
        codigo: string;
        cuestionarioId: string;
        titulo: string;
        anfitrionId: string;
        anfitrionNombre: string;
        estado: SesionFilaLocal['estado'];
        preguntaActual: number;
        segundos: number;
        cierraEn?: Date | null;
        preguntasInstantanea?: InstantaneaPreguntas | null;
        iniciadaEn?: Date | null;
        finalizadaEn?: Date | null;
      };
    }) => {
      if (
        this.sesiones.some(
          (item) => item.codigo === data.codigo || item.id === data.id,
        )
      ) {
        throw errorPrisma('P2002');
      }
      const fila: SesionFilaLocal = {
        id: data.id,
        codigo: data.codigo,
        cuestionarioId: data.cuestionarioId,
        titulo: data.titulo,
        anfitrionId: data.anfitrionId,
        anfitrionNombre: data.anfitrionNombre,
        estado: data.estado,
        preguntaActual: data.preguntaActual,
        segundos: data.segundos,
        cierraEn: data.cierraEn ?? null,
        preguntasInstantanea: data.preguntasInstantanea ?? null,
        creadoEn: new Date(),
        iniciadaEn: data.iniciadaEn ?? null,
        finalizadaEn: data.finalizadaEn ?? null,
      };
      this.sesiones.push(fila);
      this.persistir();
      return this.arbolSesion(fila);
    },
    findFirst: async ({
      where,
    }: {
      where: { codigo?: string; id?: string };
    }) => {
      const fila = this.sesiones.find(
        (item) =>
          (where.codigo === undefined || item.codigo === where.codigo) &&
          (where.id === undefined || item.id === where.id),
      );
      return fila ? this.arbolSesion(fila) : null;
    },
    findMany: async ({
      where,
    }: {
      where?: {
        cuestionarioId?: string;
        estado?: string | { in: string[] };
        OR?: Array<{
          anfitrionId?: string | { in?: string[] };
          participantes?: {
            some?: { perfilId?: string | { in?: string[] } };
          };
        }>;
      };
    } = {}) => {
      let lista = [...this.sesiones];
      if (where?.cuestionarioId) {
        lista = lista.filter(
          (item) => item.cuestionarioId === where.cuestionarioId,
        );
      }
      if (typeof where?.estado === 'string') {
        lista = lista.filter((item) => item.estado === where.estado);
      } else if (where?.estado && 'in' in where.estado) {
        const permitidos = where.estado.in;
        lista = lista.filter((item) => permitidos.includes(item.estado));
      }
      if (where?.OR) {
        lista = lista.filter((sesion) => {
          const parts = this.participantes.filter(
            (p) => p.sesionId === sesion.id,
          );
          return where.OR?.some((clausula) => {
            if (clausula.anfitrionId) {
              if (
                typeof clausula.anfitrionId === 'string' &&
                clausula.anfitrionId === sesion.anfitrionId
              ) {
                return true;
              }
              if (
                typeof clausula.anfitrionId === 'object' &&
                clausula.anfitrionId.in?.includes(sesion.anfitrionId)
              ) {
                return true;
              }
            }
            const perfilFiltro = clausula.participantes?.some?.perfilId;
            if (typeof perfilFiltro === 'string') {
              return parts.some((p) => p.perfilId === perfilFiltro);
            }
            if (perfilFiltro && typeof perfilFiltro === 'object') {
              return parts.some((p) => perfilFiltro.in?.includes(p.perfilId));
            }
            return false;
          });
        });
      }
      lista.sort(
        (a, b) =>
          (b.finalizadaEn?.getTime() ?? 0) - (a.finalizadaEn?.getTime() ?? 0),
      );
      return lista.map((fila) => this.arbolSesion(fila));
    },
    updateMany: async ({
      where,
      data,
    }: {
      where: {
        id: string;
        estado: SesionFilaLocal['estado'];
        preguntaActual?: number;
      };
      data: Partial<SesionFilaLocal>;
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
      Object.assign(fila, data);
      this.persistir();
      return { count: 1 };
    },
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
        puntaje?: number;
        aciertos?: number;
        incorporadoEn?: Date;
      };
    }) => {
      const ocupado = this.participantes.some(
        (item) =>
          item.id === data.id ||
          (item.sesionId === data.sesionId && item.perfilId === data.perfilId),
      );
      if (ocupado) throw errorPrisma('P2002');
      const nuevo: ParticipanteFilaLocal = {
        id: data.id,
        sesionId: data.sesionId,
        perfilId: data.perfilId,
        nombre: data.nombre,
        conectado: data.conectado,
        puntaje: data.puntaje ?? 0,
        aciertos: data.aciertos ?? 0,
        incorporadoEn: data.incorporadoEn ?? new Date(),
      };
      this.participantes.push(nuevo);
      this.persistir();
      return nuevo;
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
          ParticipanteFilaLocal,
          'nombre' | 'conectado' | 'puntaje' | 'aciertos'
        >
      >;
    }) => {
      const fila = this.participantes.find((item) =>
        'id' in where
          ? item.id === where.id
          : item.sesionId === where.sesionId_perfilId.sesionId &&
            item.perfilId === where.sesionId_perfilId.perfilId,
      );
      if (!fila) throw errorPrisma('P2025');
      Object.assign(fila, data);
      this.persistir();
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
      data: {
        id: string;
        sesionId: string;
        participanteId: string;
        preguntaId: string;
        opcionId: string | null;
        valor: boolean | null;
        aceptada?: boolean;
        tardia?: boolean;
        puntos?: number;
        respondidaEn?: Date;
      };
    }) => {
      const ocupado = this.respuestas.some(
        (item) =>
          item.id === data.id ||
          (item.participanteId === data.participanteId &&
            item.preguntaId === data.preguntaId),
      );
      if (ocupado) throw errorPrisma('P2002');
      const fila: RespuestaFilaLocal = {
        id: data.id,
        sesionId: data.sesionId,
        participanteId: data.participanteId,
        preguntaId: data.preguntaId,
        opcionId: data.opcionId,
        valor: data.valor,
        aceptada: data.aceptada ?? true,
        tardia: data.tardia ?? false,
        puntos: data.puntos ?? 0,
        respondidaEn: data.respondidaEn ?? new Date(),
      };
      this.respuestas.push(fila);
      this.persistir();
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
      fila.puntos = data.puntos;
      this.persistir();
      return fila;
    },
  };

  readonly resultado = {
    createMany: async ({
      data,
      skipDuplicates,
    }: {
      data: Array<
        Omit<ResultadoFilaLocal, 'finalizadoEn'> & { finalizadoEn?: Date }
      >;
      skipDuplicates?: boolean;
    }) => {
      const creados: ResultadoFilaLocal[] = [];
      for (const item of data) {
        const ocupado = this.resultados.some(
          (existente) =>
            existente.participanteId === item.participanteId ||
            (existente.sesionId === item.sesionId &&
              existente.participanteId === item.participanteId),
        );
        if (ocupado) {
          if (skipDuplicates) continue;
          throw errorPrisma('P2002');
        }
        creados.push({
          ...item,
          finalizadoEn: item.finalizadoEn ?? new Date(),
        });
      }
      this.resultados.push(...creados);
      this.persistir();
      return { count: creados.length };
    },
  };

  readonly $queryRaw = async (consulta: {
    strings?: readonly string[];
    values?: unknown[];
  }) => {
    const texto = consulta?.strings ? consulta.strings.join(' ') : '';
    if (!texto.includes('FOR UPDATE')) return [{ '?column?': 1 }];
    const valor = consulta.values?.[0];
    const codigo = (typeof valor === 'string' ? valor : '')
      .trim()
      .toUpperCase();
    const sesion = this.sesiones.find((item) => item.codigo === codigo);
    if (!sesion) return [];
    await this.adquirir(sesion.id);
    return [{ id: sesion.id }];
  };

  async $transaction<T>(operacion: (tx: this) => Promise<T>): Promise<T> {
    const copia = this.copiarEstado();
    const zona: ZonaTransaccion = { id: Symbol('tx') };
    return this.zonas.run(zona, async () => {
      try {
        const res = await operacion(this);
        this.persistirConcluida();
        return res;
      } catch (error) {
        this.restaurarEstado(copia);
        throw error;
      } finally {
        this.soltar(zona.id);
      }
    });
  }

  private persistirConcluida(): void {
    if (!this.rutaArchivo) return;
    try {
      const dir = path.dirname(this.rutaArchivo);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      const datos: EstadoSerializado = {
        imagenes: this.imagenes,
        cuestionarios: this.cuestionarios,
        preguntas: this.preguntas,
        opciones: this.opciones,
        sesiones: this.sesiones,
        participantes: this.participantes,
        respuestas: this.respuestas,
        resultados: this.resultados,
      };
      fs.writeFileSync(this.rutaArchivo, JSON.stringify(datos, null, 2), 'utf8');
    } catch {
      // Ignorar fallos de disco
    }
  }

  private async adquirir(sesionId: string): Promise<void> {
    const dueno = this.zonas.getStore()?.id;
    if (!dueno) return;
    for (;;) {
      const titular = this.candados.get(sesionId);
      if (!titular || titular === dueno) {
        this.candados.set(sesionId, dueno);
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

  private filtrarCuestionarios(where: {
    id?: string;
    autorId?: string | { in?: string[] };
    eliminadoEn?: null;
    esDemostracion?: boolean;
    categoria?: string;
  }): CuestionarioFilaLocal[] {
    return this.cuestionarios
      .filter((fila) => {
        if (where.id && fila.id !== where.id) return false;
        if (typeof where.autorId === 'string' && fila.autorId !== where.autorId)
          return false;
        if (
          where.autorId &&
          typeof where.autorId === 'object' &&
          where.autorId.in &&
          !where.autorId.in.includes(fila.autorId)
        ) {
          return false;
        }
        if (where.eliminadoEn === null && fila.eliminadoEn !== null)
          return false;
        if (
          where.esDemostracion !== undefined &&
          fila.esDemostracion !== where.esDemostracion
        )
          return false;
        if (where.categoria && fila.categoria !== where.categoria) return false;
        return true;
      })
      .sort(
        (a, b) =>
          b.actualizadoEn.getTime() - a.actualizadoEn.getTime() ||
          a.id.localeCompare(b.id),
      );
  }

  private arbolCuestionario(fila: CuestionarioFilaLocal) {
    const imagen = fila.imagenId
      ? (this.imagenes.find((item) => item.id === fila.imagenId) ?? null)
      : null;
    const preguntas = this.preguntas
      .filter((pregunta) => pregunta.cuestionarioId === fila.id)
      .sort((a, b) => a.orden - b.orden)
      .map((pregunta) => ({
        ...pregunta,
        imagen: pregunta.imagenId
          ? (this.imagenes.find((item) => item.id === pregunta.imagenId) ??
            null)
          : null,
        respuestas: this.respuestas
          .filter((respuesta) => respuesta.preguntaId === pregunta.id)
          .map((r) => ({ id: r.id })),
        opciones: this.opciones
          .filter((opcion) => opcion.preguntaId === pregunta.id)
          .sort((a, b) => a.orden - b.orden)
          .map((opcion) => ({
            ...opcion,
            respuestas: this.respuestas
              .filter((respuesta) => respuesta.opcionId === opcion.id)
              .map((r) => ({ id: r.id })),
          })),
      }));
    return { ...fila, imagen, preguntas };
  }

  private arbolSesion(fila: SesionFilaLocal) {
    const cuestionario = this.cuestionarios.find(
      (item) => item.id === fila.cuestionarioId,
    );
    const participantes = this.participantes
      .filter((item) => item.sesionId === fila.id)
      .sort((a, b) => a.incorporadoEn.getTime() - b.incorporadoEn.getTime())
      .map((participante) => ({
        ...participante,
        respuestas: this.respuestas
          .filter((respuesta) => respuesta.participanteId === participante.id)
          .sort((a, b) => a.respondidaEn.getTime() - b.respondidaEn.getTime()),
      }));
    return {
      ...fila,
      participantes,
      cuestionario: cuestionario ? this.arbolCuestionario(cuestionario) : null,
    };
  }

  private exigir<T>(fila: T | undefined): T {
    if (!fila) throw errorPrisma('P2025');
    return fila;
  }

  private exigirLibre(ocupado: boolean): void {
    if (ocupado) throw errorPrisma('P2002');
  }

  private exigirOrdenPregunta(
    cuestionarioId: string,
    orden: number,
    id: string,
  ): void {
    const ocupado = this.preguntas.some(
      (pregunta) =>
        pregunta.id !== id &&
        pregunta.cuestionarioId === cuestionarioId &&
        pregunta.orden === orden,
    );
    if (ocupado) throw errorPrisma('P2002');
  }

  private exigirOrdenOpcion(
    preguntaId: string,
    orden: number,
    id: string,
  ): void {
    const ocupado = this.opciones.some(
      (opcion) =>
        opcion.id !== id &&
        opcion.preguntaId === preguntaId &&
        opcion.orden === orden,
    );
    if (ocupado) throw errorPrisma('P2002');
  }

  private exigirCorrecta(
    preguntaId: string,
    id: string,
    correcta: boolean,
  ): void {
    if (!correcta) return;
    const ocupado = this.opciones.some(
      (opcion) =>
        opcion.id !== id && opcion.preguntaId === preguntaId && opcion.correcta,
    );
    if (ocupado) throw errorPrisma('P2002');
  }

  private copiarEstado(): EstadoSerializado {
    return {
      imagenes: structuredClone(this.imagenes),
      cuestionarios: structuredClone(this.cuestionarios),
      preguntas: structuredClone(this.preguntas),
      opciones: structuredClone(this.opciones),
      sesiones: structuredClone(this.sesiones),
      participantes: structuredClone(this.participantes),
      respuestas: structuredClone(this.respuestas),
      resultados: structuredClone(this.resultados),
    };
  }

  private restaurarEstado(copia: EstadoSerializado): void {
    this.imagenes = copia.imagenes;
    this.cuestionarios = copia.cuestionarios;
    this.preguntas = copia.preguntas;
    this.opciones = copia.opciones;
    this.sesiones = copia.sesiones;
    this.participantes = copia.participantes;
    this.respuestas = copia.respuestas;
    this.resultados = copia.resultados;
  }
}

