import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { PrismaClient } from '../generated/prisma/client';
import { IdentidadExterna } from '../autenticacion/identidad-externa';
import {
  tokenBearer,
  VerificadorIdentidad,
} from '../autenticacion/verificador-identidad';
import { ImagenesService } from '../imagenes/imagenes.service';
import { PreguntasService } from '../preguntas/preguntas.service';
import {
  CuestionarioEntrada,
  normalizarPreguntas,
  OpcionEntrada,
  PreguntaEntrada,
} from '../preguntas/validar-entrada';
import { FiltrosCatalogoDto } from './dto/entrada-cuestionario.dto';
import {
  CuestionarioPublico,
  FilaCuestionario,
  FilaPregunta,
  presentar,
} from './presentacion';
import { PrismaService } from '../prisma/prisma.service';

const MENSAJE_PARTIDA_ACTIVA =
  'No se puede quitar una pregunta o una opción de una partida que ya comenzó.';

const arbol = {
  imagen: true,
  preguntas: {
    orderBy: { orden: 'asc' as const },
    include: {
      imagen: true,
      respuestas: { select: { id: true } },
      opciones: {
        orderBy: { orden: 'asc' as const },
        include: { respuestas: { select: { id: true } } },
      },
    },
  },
};

type Tx = Parameters<Parameters<PrismaClient['$transaction']>[0]>[0];

interface PreguntaLista extends PreguntaEntrada {
  id: string;
  opciones: (OpcionEntrada & { id: string })[];
}

interface ReferenciasPartida {
  preguntas: Set<string>;
  opciones: Set<string>;
}

@Injectable()
export class CuestionariosService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly preguntas: PreguntasService,
    private readonly imagenes: ImagenesService,
    private readonly verificador: VerificadorIdentidad,
  ) { }

  async listar(filtros: FiltrosCatalogoDto): Promise<CuestionarioPublico[]> {
    const filas = await this.db().cuestionario.findMany({
      where: { eliminadoEn: null },
      include: arbol,
      orderBy: [{ actualizadoEn: 'desc' }, { id: 'asc' }],
    });
    return filas
      .map((fila) => presentar(fila as FilaCuestionario, false))
      .filter((item) => this.coincide(item, filtros));
  }

  async obtener(
    id: string,
    autorizacion?: string,
  ): Promise<CuestionarioPublico> {
    const fila = await this.buscarActivo(id);
    const identidad = await this.identidadOpcional(autorizacion);
    const completo = Boolean(
      identidad && esMismoAutor(fila.autorId, identidad.id),
    );
    return presentar(fila, completo);
  }

  async mios(identidad: IdentidadExterna): Promise<CuestionarioPublico[]> {
    const filas = await this.db().cuestionario.findMany({
      where: {
        eliminadoEn: null,
        autorId:
          identidad.id === 'perfil-demo-docente' ? 'perfil-demo' : identidad.id,
      },
      include: arbol,
      orderBy: [{ actualizadoEn: 'desc' }, { id: 'asc' }],
    });
    if (identidad.id === 'perfil-demo-docente') {
      const propias = await this.db().cuestionario.findMany({
        where: { eliminadoEn: null, autorId: identidad.id },
        include: arbol,
        orderBy: [{ actualizadoEn: 'desc' }, { id: 'asc' }],
      });
      const vistos = new Set<string>();
      const combinadas = [...propias, ...filas].filter((f) => {
        if (vistos.has(f.id)) return false;
        vistos.add(f.id);
        return true;
      });
      return combinadas.map((fila) => presentar(fila as FilaCuestionario, true));
    }
    return filas.map((fila) => presentar(fila as FilaCuestionario, true));
  }

  async crear(
    entrada: CuestionarioEntrada,
    identidad: IdentidadExterna,
  ): Promise<CuestionarioPublico> {
    const preparada = this.preparar(entrada);
    const creada = await this.transaccion(async (tx) => {
      const imagenId = await this.imagenes.asegurar(tx, preparada.imagenUrl);
      const id = randomUUID();
      await tx.cuestionario.create({
        data: {
          id,
          autorId: identidad.id,
          autorNombre: identidad.nombre,
          titulo: preparada.titulo.trim(),
          descripcion: preparada.descripcion.trim(),
          categoria: preparada.categoria.trim(),
          etiquetas: etiquetasDe(preparada),
          dificultad: preparada.dificultad,
          esDemostracion: false,
          imagenId,
        },
      });
      await this.guardarPreguntas(tx, id, preparada.preguntas, []);
      return this.leer(tx, id);
    });
    return presentar(creada, true);
  }

  async actualizar(
    id: string,
    entrada: CuestionarioEntrada,
    identidad: IdentidadExterna,
  ): Promise<CuestionarioPublico> {
    const actual = await this.buscarActivo(id);
    if (!esMismoAutor(actual.autorId, identidad.id)) {
      throw new ForbiddenException({
        mensaje: 'Solo quien creó el cuestionario puede editarlo.',
      });
    }
    const preparada = this.preparar(entrada);
    const guardada = await this.transaccion(async (tx) => {
      const imagenId = await this.imagenes.asegurar(tx, preparada.imagenUrl);
      await tx.cuestionario.update({
        where: { id },
        data: {
          titulo: preparada.titulo.trim(),
          descripcion: preparada.descripcion.trim(),
          categoria: preparada.categoria.trim(),
          etiquetas: etiquetasDe(preparada),
          dificultad: preparada.dificultad,
          imagenId,
        },
      });
      await this.guardarPreguntas(
        tx,
        id,
        preparada.preguntas,
        actual.preguntas,
      );
      return this.leer(tx, id);
    });
    return presentar(guardada, true);
  }

  async eliminar(id: string, identidad: IdentidadExterna): Promise<void> {
    const actual = await this.buscarActivo(id);
    if (!esMismoAutor(actual.autorId, identidad.id)) {
      throw new ForbiddenException({
        mensaje: 'Solo quien creó el cuestionario puede eliminarlo.',
      });
    }
    await this.db().cuestionario.update({
      where: { id },
      data: { eliminadoEn: new Date() },
    });
  }

  private async identidadOpcional(
    autorizacion?: string,
  ): Promise<IdentidadExterna | null> {
    const token = tokenBearer(autorizacion);
    if (!token) return null;
    return this.verificador.verificar(token);
  }

  private preparar(entrada: CuestionarioEntrada): CuestionarioEntrada & {
    preguntas: PreguntaLista[];
  } {
    const normalizada: CuestionarioEntrada = {
      ...entrada,
      preguntas: normalizarPreguntas(entrada.preguntas),
    };
    const errores = this.preguntas.validar(normalizada);
    if (errores.length > 0) {
      throw new BadRequestException({ mensaje: errores.join(' ') });
    }
    const preguntas = [...normalizada.preguntas]
      .sort((a, b) => a.orden - b.orden)
      .map((pregunta) => ({
        ...pregunta,
        id: idSeguro(pregunta.id),
        enunciado: pregunta.enunciado.trim(),
        imagenUrl: pregunta.imagenUrl?.trim() || undefined,
        opciones: (pregunta.opciones ?? []).map((opcion) => ({
          ...opcion,
          id: idSeguro(opcion.id),
          texto: opcion.texto.trim(),
        })),
      }));
    return {
      ...normalizada,
      imagenUrl: normalizada.imagenUrl?.trim() || undefined,
      preguntas,
    };
  }

  private async referenciasDePartidasActivas(
    tx: Tx,
    cuestionarioId: string,
  ): Promise<ReferenciasPartida> {
    const sesiones = await tx.sesionJuego.findMany({
      where: {
        cuestionarioId,
        estado: { in: ['pregunta', 'cerrada'] },
      },
      select: { preguntasInstantanea: true },
    });
    const referencias: ReferenciasPartida = {
      preguntas: new Set(),
      opciones: new Set(),
    };
    for (const sesion of sesiones) {
      const instantanea = sesion.preguntasInstantanea as {
        preguntas?: Array<{ id?: string; opciones?: Array<{ id?: string }> }>;
      } | null;
      for (const pregunta of instantanea?.preguntas ?? []) {
        if (pregunta.id) referencias.preguntas.add(pregunta.id);
        for (const opcion of pregunta.opciones ?? []) {
          if (opcion.id) referencias.opciones.add(opcion.id);
        }
      }
    }
    return referencias;
  }

  private retenida(
    referencias: ReferenciasPartida,
    pregunta: FilaPregunta,
  ): boolean {
    if (referencias.preguntas.has(pregunta.id)) return true;
    return pregunta.opciones.some((opcion) =>
      referencias.opciones.has(opcion.id),
    );
  }

  private async guardarPreguntas(
    tx: Tx,
    cuestionarioId: string,
    preguntas: PreguntaLista[],
    actuales: FilaPregunta[],
  ): Promise<void> {
    const referencias = await this.referenciasDePartidasActivas(
      tx,
      cuestionarioId,
    );
    for (const actual of actuales) {
      if (preguntas.some((pregunta) => pregunta.id === actual.id)) continue;
      if (
        (actual.respuestas?.length ?? 0) > 0 ||
        this.retenida(referencias, actual)
      ) {
        throw new ConflictException({
          mensaje:
            (actual.respuestas?.length ?? 0) > 0
              ? 'No se puede modificar una pregunta que ya tiene respuestas en una partida.'
              : MENSAJE_PARTIDA_ACTIVA,
        });
      }
      for (const opcion of actual.opciones) {
        await tx.opcion.delete({ where: { id: opcion.id } });
      }
      await tx.pregunta.delete({ where: { id: actual.id } });
    }

    let temporal = -1;
    for (const pregunta of preguntas) {
      const actual = actuales.find((item) => item.id === pregunta.id);
      const imagenId = await this.imagenes.asegurar(tx, pregunta.imagenUrl);
      const respuestaCorrecta = pregunta.opciones.some(
        (opcion) =>
          opcion.correcta && opcion.texto.toLowerCase() === 'verdadero',
      );
      if (actual) {
        const bloqueada = (actual.respuestas?.length ?? 0) > 0;
        if (bloqueada && !mismoContenido(actual, pregunta)) {
          throw new ConflictException({
            mensaje:
              'No se puede modificar una pregunta que ya tiene respuestas en una partida.',
          });
        }
        await tx.pregunta.update({
          where: { id: actual.id },
          data: bloqueada
            ? { orden: temporal }
            : {
              enunciado: pregunta.enunciado,
              respuestaCorrecta,
              segundos: pregunta.segundos ?? null,
              imagenId,
              orden: temporal,
            },
        });
        if (!bloqueada) {
          await this.sincronizarOpciones(tx, actual, pregunta, referencias);
        }
      } else {
        const ajena = await tx.pregunta.findFirst({
          where: { id: pregunta.id },
        });
        if (ajena) {
          throw new ConflictException({
            mensaje: 'Ya existe un registro con ese identificador.',
          });
        }
        await tx.pregunta.create({
          data: {
            id: pregunta.id,
            cuestionarioId,
            enunciado: pregunta.enunciado,
            respuestaCorrecta,
            segundos: pregunta.segundos ?? null,
            imagenId,
            orden: temporal,
          },
        });
        await this.crearOpciones(tx, pregunta);
      }
      temporal -= 1;
    }

    for (let indice = 0; indice < preguntas.length; indice += 1) {
      const pregunta = preguntas[indice];
      await tx.pregunta.update({
        where: { id: pregunta.id },
        data: { orden: indice + 1 },
      });
      for (let numero = 0; numero < pregunta.opciones.length; numero += 1) {
        await tx.opcion.update({
          where: { id: pregunta.opciones[numero].id },
          data: {
            orden: numero + 1,
            correcta: pregunta.opciones[numero].correcta,
          },
        });
      }
    }
  }

  private async sincronizarOpciones(
    tx: Tx,
    actual: FilaPregunta,
    pregunta: PreguntaLista,
    referencias: ReferenciasPartida,
  ): Promise<void> {
    for (const opcion of actual.opciones) {
      if (pregunta.opciones.some((item) => item.id === opcion.id)) continue;
      if ((opcion.respuestas?.length ?? 0) > 0) {
        throw new ConflictException({
          mensaje:
            'No se puede modificar una pregunta que ya tiene respuestas en una partida.',
        });
      }
      if (referencias.opciones.has(opcion.id)) {
        throw new ConflictException({ mensaje: MENSAJE_PARTIDA_ACTIVA });
      }
      await tx.opcion.delete({ where: { id: opcion.id } });
    }
    for (const [indice, opcion] of pregunta.opciones.entries()) {
      const previa = actual.opciones.find((item) => item.id === opcion.id);
      if (previa) {
        await tx.opcion.update({
          where: { id: previa.id },
          data: { texto: opcion.texto, orden: -(indice + 1), correcta: false },
        });
        continue;
      }
      const ajena = await tx.opcion.findFirst({ where: { id: opcion.id } });
      if (ajena) {
        throw new ConflictException({
          mensaje: 'Ya existe un registro con ese identificador.',
        });
      }
      await tx.opcion.create({
        data: {
          id: opcion.id,
          preguntaId: actual.id,
          texto: opcion.texto,
          orden: -(indice + 1),
          correcta: false,
        },
      });
    }
  }

  private async crearOpciones(tx: Tx, pregunta: PreguntaLista): Promise<void> {
    for (const [indice, opcion] of pregunta.opciones.entries()) {
      const ajena = await tx.opcion.findFirst({ where: { id: opcion.id } });
      if (ajena) {
        throw new ConflictException({
          mensaje: 'Ya existe un registro con ese identificador.',
        });
      }
      await tx.opcion.create({
        data: {
          id: opcion.id,
          preguntaId: pregunta.id,
          texto: opcion.texto,
          orden: -(indice + 1),
          correcta: false,
        },
      });
    }
  }

  private async buscarActivo(id: string): Promise<FilaCuestionario> {
    const fila = await this.db().cuestionario.findFirst({
      where: { id, eliminadoEn: null },
      include: arbol,
    });
    if (!fila) {
      throw new NotFoundException({
        mensaje: 'No se encontró el cuestionario.',
      });
    }
    return fila;
  }

  private async leer(tx: Tx, id: string): Promise<FilaCuestionario> {
    const fila = await tx.cuestionario.findFirst({
      where: { id },
      include: arbol,
    });
    if (!fila) {
      throw new NotFoundException({
        mensaje: 'No se encontró el cuestionario.',
      });
    }
    return fila;
  }

  private db() {
    if (!this.prisma.estaListo()) {
      throw new ServiceUnavailableException({
        mensaje: 'La base de datos no está disponible.',
      });
    }
    return this.prisma.obtener();
  }

  private async transaccion<T>(operacion: (tx: Tx) => Promise<T>): Promise<T> {
    try {
      return await this.db().$transaction(operacion);
    } catch (error) {
      if (
        error instanceof BadRequestException ||
        error instanceof ConflictException ||
        error instanceof ForbiddenException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }
      const codigo = codigoPrisma(error);
      if (codigo === 'P2002') {
        throw new ConflictException({
          mensaje: 'Ya existe un registro con ese identificador.',
        });
      }
      if (codigo === 'P2003' || codigo === 'P2025') {
        throw new ConflictException({
          mensaje:
            'No se puede modificar el cuestionario porque ya forma parte de una partida.',
        });
      }
      throw error;
    }
  }

  private coincide(
    item: CuestionarioPublico,
    filtros: FiltrosCatalogoDto,
  ): boolean {
    const texto = filtros.texto?.trim().toLowerCase() ?? '';
    const contenido = [
      item.titulo,
      item.descripcion,
      item.autorNombre,
      item.categoria,
      ...item.etiquetas,
    ]
      .join(' ')
      .toLowerCase();
    const coincideTexto = texto.length === 0 || contenido.includes(texto);
    const coincideCategoria =
      !filtros.categoria || item.categoria === filtros.categoria;
    const coincideDificultad =
      !filtros.dificultad || item.dificultad === filtros.dificultad;
    const coincideAutor = !filtros.autor || item.autorNombre === filtros.autor;
    return (
      coincideTexto && coincideCategoria && coincideDificultad && coincideAutor
    );
  }
}

function esMismoAutor(autorId: string, identidadId: string): boolean {
  if (autorId === identidadId) return true;
  if (
    (autorId === 'perfil-demo' && identidadId === 'perfil-demo-docente') ||
    (autorId === 'perfil-demo-docente' && identidadId === 'perfil-demo')
  ) {
    return true;
  }
  return false;
}

function etiquetasDe(entrada: CuestionarioEntrada): string[] {
  return entrada.etiquetas.map((etiqueta) => etiqueta.trim()).filter(Boolean);
}

function idSeguro(id?: string): string {
  if (id && /^[A-Za-z0-9:_-]{1,80}$/.test(id)) return id;
  return randomUUID();
}

function mismoContenido(
  actual: FilaPregunta,
  pregunta: PreguntaLista,
): boolean {
  const imagenActual = actual.imagen?.url ?? null;
  const imagenNueva = pregunta.imagenUrl ?? null;
  if (actual.enunciado !== pregunta.enunciado) return false;
  if (imagenActual !== imagenNueva) return false;
  if (actual.opciones.length !== pregunta.opciones.length) return false;
  const opciones = [...actual.opciones].sort((a, b) => a.orden - b.orden);
  return pregunta.opciones.every((opcion, indice) => {
    const previa = opciones[indice];
    return (
      previa.id === opcion.id &&
      previa.texto === opcion.texto &&
      previa.correcta === opcion.correcta
    );
  });
}

function codigoPrisma(error: unknown): string {
  if (typeof error === 'object' && error && 'code' in error) {
    return String(error.code);
  }
  return '';
}
