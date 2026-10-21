/* eslint-disable @typescript-eslint/require-await */
interface ImagenFila {
  id: string;
  nombreArchivo: string;
  url: string;
  tipoMime: string;
  tamanoBytes: number;
}

interface CuestionarioFila {
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

interface PreguntaFila {
  id: string;
  cuestionarioId: string;
  enunciado: string;
  orden: number;
  respuestaCorrecta: boolean;
  segundos: number | null;
  imagenId: string | null;
}

interface OpcionFila {
  id: string;
  preguntaId: string;
  texto: string;
  orden: number;
  correcta: boolean;
}

interface RespuestaFila {
  id: string;
  preguntaId: string;
  opcionId?: string;
}

function errorPrisma(codigo: string): Error {
  const error = new Error(codigo);
  (error as Error & { code: string }).code = codigo;
  return error;
}

interface EstadoMemoria {
  imagenes: ImagenFila[];
  cuestionarios: CuestionarioFila[];
  preguntas: PreguntaFila[];
  opciones: OpcionFila[];
  respuestas: RespuestaFila[];
  sesiones: Array<{
    cuestionarioId: string;
    estado: string;
    preguntasInstantanea: unknown;
  }>;
}

export class PrismaMemoria {
  imagenes: ImagenFila[] = [];
  cuestionarios: CuestionarioFila[] = [];
  preguntas: PreguntaFila[] = [];
  opciones: OpcionFila[] = [];
  respuestas: RespuestaFila[] = [];
  sesiones: Array<{
    cuestionarioId: string;
    estado: string;
    preguntasInstantanea: unknown;
  }> = [];

  readonly imagen = {
    findFirst: async ({ where }: { where: { url: string } }) =>
      this.imagenes.find((imagen) => imagen.url === where.url) ?? null,
    create: async ({ data }: { data: ImagenFila }) => {
      this.imagenes.push(data);
      return data;
    },
  };

  readonly cuestionario = {
    findMany: async ({
      where,
    }: {
      where: { eliminadoEn: null; autorId?: string };
    }) => this.filtrarCuestionarios(where).map((fila) => this.arbol(fila)),
    findFirst: async ({
      where,
    }: {
      where: { id?: string; eliminadoEn?: null };
    }) => {
      const fila = this.filtrarCuestionarios(where)[0];
      return fila ? this.arbol(fila) : null;
    },
    create: async ({
      data,
    }: {
      data: Omit<
        CuestionarioFila,
        'creadoEn' | 'actualizadoEn' | 'eliminadoEn'
      >;
    }) => {
      const fila: CuestionarioFila = {
        ...data,
        creadoEn: new Date(),
        actualizadoEn: new Date(),
        eliminadoEn: null,
      };
      this.cuestionarios.push(fila);
      return fila;
    },
    update: async ({
      where,
      data,
    }: {
      where: { id: string };
      data: Partial<CuestionarioFila>;
    }) => {
      const fila = this.exigir(
        this.cuestionarios.find((item) => item.id === where.id),
      );
      Object.assign(fila, data, { actualizadoEn: new Date() });
      return fila;
    },
  };

  readonly pregunta = {
    findFirst: async ({ where }: { where: { id: string } }) =>
      this.preguntas.find((pregunta) => pregunta.id === where.id) ?? null,
    create: async ({ data }: { data: PreguntaFila }) => {
      this.exigirLibre(
        this.preguntas.some((pregunta) => pregunta.id === data.id),
      );
      this.exigirOrdenPregunta(data.cuestionarioId, data.orden, data.id);
      this.preguntas.push(data);
      return data;
    },
    update: async ({
      where,
      data,
    }: {
      where: { id: string };
      data: Partial<PreguntaFila>;
    }) => {
      const fila = this.exigir(
        this.preguntas.find((pregunta) => pregunta.id === where.id),
      );
      const orden = data.orden ?? fila.orden;
      this.exigirOrdenPregunta(fila.cuestionarioId, orden, fila.id);
      Object.assign(fila, data);
      return fila;
    },
    delete: async ({ where }: { where: { id: string } }) => {
      this.preguntas = this.preguntas.filter(
        (pregunta) => pregunta.id !== where.id,
      );
    },
  };

  readonly opcion = {
    findFirst: async ({ where }: { where: { id: string } }) =>
      this.opciones.find((opcion) => opcion.id === where.id) ?? null,
    create: async ({ data }: { data: OpcionFila }) => {
      this.exigirLibre(this.opciones.some((opcion) => opcion.id === data.id));
      this.exigirOrdenOpcion(data.preguntaId, data.orden, data.id);
      this.exigirCorrecta(data.preguntaId, data.id, data.correcta);
      this.opciones.push(data);
      return data;
    },
    update: async ({
      where,
      data,
    }: {
      where: { id: string };
      data: Partial<OpcionFila>;
    }) => {
      const fila = this.exigir(
        this.opciones.find((opcion) => opcion.id === where.id),
      );
      const orden = data.orden ?? fila.orden;
      const correcta = data.correcta ?? fila.correcta;
      this.exigirOrdenOpcion(fila.preguntaId, orden, fila.id);
      this.exigirCorrecta(fila.preguntaId, fila.id, correcta);
      Object.assign(fila, data);
      return fila;
    },
    delete: async ({ where }: { where: { id: string } }) => {
      this.opciones = this.opciones.filter((opcion) => opcion.id !== where.id);
    },
  };

  readonly sesionJuego = {
    findMany: async ({
      where,
    }: {
      where: { cuestionarioId: string; estado: { in: string[] } };
    }) =>
      this.sesiones.filter(
        (sesion) =>
          sesion.cuestionarioId === where.cuestionarioId &&
          where.estado.in.includes(sesion.estado),
      ),
  };

  async $transaction<T>(operacion: (tx: this) => Promise<T>): Promise<T> {
    const copia = this.copiar();
    try {
      return await operacion(this);
    } catch (error) {
      this.restaurar(copia);
      throw error;
    }
  }

  agregarRespuesta(respuesta: RespuestaFila): void {
    this.respuestas.push(respuesta);
  }

  private filtrarCuestionarios(where: {
    id?: string;
    autorId?: string;
    eliminadoEn?: null;
  }): CuestionarioFila[] {
    return this.cuestionarios
      .filter((fila) => {
        if (where.id && fila.id !== where.id) return false;
        if (where.autorId && fila.autorId !== where.autorId) return false;
        if (where.eliminadoEn === null && fila.eliminadoEn) return false;
        return true;
      })
      .sort(
        (a, b) =>
          b.actualizadoEn.getTime() - a.actualizadoEn.getTime() ||
          a.id.localeCompare(b.id),
      );
  }

  private arbol(fila: CuestionarioFila) {
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
        respuestas: this.respuestas.filter(
          (respuesta) => respuesta.preguntaId === pregunta.id,
        ),
        opciones: this.opciones
          .filter((opcion) => opcion.preguntaId === pregunta.id)
          .sort((a, b) => a.orden - b.orden)
          .map((opcion) => ({
            ...opcion,
            respuestas: this.respuestas.filter(
              (respuesta) => respuesta.opcionId === opcion.id,
            ),
          })),
      }));
    return { ...fila, imagen, preguntas };
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

  private copiar(): EstadoMemoria {
    return {
      imagenes: structuredClone(this.imagenes),
      cuestionarios: structuredClone(this.cuestionarios),
      preguntas: structuredClone(this.preguntas),
      opciones: structuredClone(this.opciones),
      respuestas: structuredClone(this.respuestas),
      sesiones: structuredClone(this.sesiones),
    };
  }

  private restaurar(copia: EstadoMemoria): void {
    this.imagenes = copia.imagenes;
    this.cuestionarios = copia.cuestionarios;
    this.preguntas = copia.preguntas;
    this.opciones = copia.opciones;
    this.respuestas = copia.respuestas;
    this.sesiones = copia.sesiones;
  }
}
