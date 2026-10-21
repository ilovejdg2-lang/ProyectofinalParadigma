import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { Prisma } from '../generated/prisma/client';
import { IdentidadExterna } from '../autenticacion/identidad-externa';
import { PrismaService } from '../prisma/prisma.service';
import { AvisoSesiones, CambioSesion } from './aviso-sesiones';
import { esAcierto, plazoVencido } from './calificacion';
import { codigoSala } from './codigo-sala';
import {
  FilaPregunta,
  FilaSesion,
  instantaneaDe,
  leerInstantanea,
  PreguntaInstantanea,
  presentarSala,
  SalaPublica,
} from './presentacion-sala';

const INTENTOS_CODIGO = 8;
const SEGUNDOS_SALA = 20;

const arbol = {
  participantes: {
    orderBy: { incorporadoEn: 'asc' as const },
    include: { respuestas: { orderBy: { respondidaEn: 'asc' as const } } },
  },
  cuestionario: {
    include: {
      preguntas: {
        orderBy: { orden: 'asc' as const },
        include: {
          imagen: true,
          opciones: { orderBy: { orden: 'asc' as const } },
        },
      },
    },
  },
};

interface CuestionarioJuego {
  id: string;
  titulo: string;
  eliminadoEn: Date | null;
  preguntas: FilaPregunta[];
}

@Injectable()
export class SesionesJuegoService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly avisos: AvisoSesiones,
  ) {}

  preparado(): boolean {
    return this.prisma.estaListo();
  }

  async crear(
    cuestionarioId: string,
    identidad: IdentidadExterna,
  ): Promise<SalaPublica> {
    const cuestionario = await this.cuestionarioJugable(cuestionarioId);
    for (let intento = 0; intento < INTENTOS_CODIGO; intento += 1) {
      try {
        const creada = await this.db().sesionJuego.create({
          data: {
            id: randomUUID(),
            codigo: codigoSala(),
            cuestionarioId: cuestionario.id,
            titulo: cuestionario.titulo,
            anfitrionId: identidad.id,
            anfitrionNombre: identidad.nombre,
            estado: 'esperando',
            preguntaActual: 0,
            segundos: SEGUNDOS_SALA,
          },
          include: arbol,
        });
        this.avisos.confirmar(aviso('sala-creada', creada.codigo));
        return presentarSala(creada, identidad.id);
      } catch (error) {
        if (codigoPrisma(error) !== 'P2002') throw error;
      }
    }
    throw new ConflictException({
      mensaje: 'No se pudo crear la sala. Intenta de nuevo.',
    });
  }

  async obtener(
    codigo: string,
    identidad: IdentidadExterna,
  ): Promise<SalaPublica> {
    const fila = await this.buscar(codigo);
    this.exigirLecturaFinal(fila, identidad);
    return presentarSala(fila, identidad.id);
  }

  async unirse(
    codigo: string,
    identidad: IdentidadExterna,
  ): Promise<SalaPublica> {
    const sala = await this.transaccion(async (tx) => {
      const normalizado = codigo.trim().toUpperCase();
      await this.bloquear(tx, normalizado);
      const actual = await this.buscarEn(tx, normalizado);
      const propio = actual.participantes.find(
        (participante) => participante.perfilId === identidad.id,
      );
      if (actual.estado === 'finalizada') {
        throw new ConflictException({ mensaje: 'Esta partida ya finalizó.' });
      }
      if (!propio && actual.estado !== 'esperando') {
        throw new ConflictException({ mensaje: 'La partida ya fue iniciada.' });
      }
      if (propio) {
        await tx.participante.update({
          where: {
            sesionId_perfilId: {
              sesionId: actual.id,
              perfilId: identidad.id,
            },
          },
          data: { nombre: identidad.nombre, conectado: true },
        });
      } else {
        try {
          await tx.participante.create({
            data: {
              id: randomUUID(),
              sesionId: actual.id,
              perfilId: identidad.id,
              nombre: identidad.nombre,
              conectado: true,
            },
          });
        } catch (error) {
          if (codigoPrisma(error) !== 'P2002') throw error;
          await tx.participante.update({
            where: {
              sesionId_perfilId: {
                sesionId: actual.id,
                perfilId: identidad.id,
              },
            },
            data: { nombre: identidad.nombre, conectado: true },
          });
        }
      }
      return this.buscarEn(tx, normalizado);
    });
    this.avisos.confirmar(aviso('participante-incorporado', sala.codigo));
    return presentarSala(sala, identidad.id);
  }

  async iniciar(
    codigo: string,
    identidad: IdentidadExterna,
  ): Promise<SalaPublica> {
    const sala = await this.transaccion(async (tx) => {
      const normalizado = codigo.trim().toUpperCase();
      await this.bloquear(tx, normalizado);
      const actual = await this.buscarEn(tx, normalizado);
      if (actual.anfitrionId !== identidad.id) {
        throw new ForbiddenException({
          mensaje: 'Solo el anfitrión puede iniciar la partida.',
        });
      }
      if (actual.estado !== 'esperando') {
        throw new ConflictException({ mensaje: 'La partida ya fue iniciada.' });
      }
      if (actual.participantes.length === 0) {
        throw new ConflictException({
          mensaje: 'Todavía no hay participantes.',
        });
      }
      if (actual.cuestionario?.eliminadoEn) {
        throw new ConflictException({
          mensaje: 'El cuestionario ya no está disponible.',
        });
      }
      const preguntas = jugables(actual.cuestionario?.preguntas ?? []);
      const instantanea = instantaneaDe(preguntas);
      const segundos = segundosDe(instantanea.preguntas[0]);
      const iniciadaEn = new Date();
      const cambio = await tx.sesionJuego.updateMany({
        where: { id: actual.id, estado: 'esperando' },
        data: {
          estado: 'pregunta',
          preguntaActual: 0,
          segundos,
          iniciadaEn,
          cierraEn: new Date(iniciadaEn.getTime() + segundos * 1000),
          preguntasInstantanea: instantanea as unknown as Prisma.InputJsonValue,
        },
      });
      if (cambio.count !== 1) {
        throw new ConflictException({ mensaje: 'La partida ya fue iniciada.' });
      }
      return this.buscarEn(tx, normalizado);
    });
    this.avisos.confirmar(aviso('partida-iniciada', sala.codigo));
    return presentarSala(sala, identidad.id);
  }

  async responder(
    codigo: string,
    identidad: IdentidadExterna,
    entrada: { valor?: boolean | null; opcionId?: string },
  ): Promise<SalaPublica> {
    const sala = await this.transaccion(async (tx) => {
      const normalizado = codigo.trim().toUpperCase();
      await this.bloquear(tx, normalizado);
      const actual = await this.buscarEn(tx, normalizado);
      if (actual.estado === 'finalizada') {
        throw new ConflictException({ mensaje: 'Esta partida ya finalizó.' });
      }
      if (actual.estado !== 'pregunta') {
        throw new ConflictException({
          mensaje: 'La pregunta ya está cerrada. La respuesta no se acepta.',
        });
      }
      if (plazoVencido(actual.cierraEn, new Date())) {
        throw new ConflictException({
          mensaje: 'El tiempo de respuesta terminó.',
        });
      }
      const participante = actual.participantes.find(
        (item) => item.perfilId === identidad.id,
      );
      if (!participante) {
        throw new ForbiddenException({
          mensaje: 'No estás unido a esta sala.',
        });
      }
      const pregunta = this.preguntaActiva(actual);
      const seleccion = seleccionDe(entrada, pregunta);
      const repetida = await tx.respuesta.findMany({
        where: { participanteId: participante.id, preguntaId: pregunta.id },
      });
      if (repetida.length > 0) {
        throw new ConflictException({
          mensaje: 'Ya enviaste una respuesta para esta pregunta.',
        });
      }
      try {
        await tx.respuesta.create({
          data: {
            id: randomUUID(),
            sesionId: actual.id,
            participanteId: participante.id,
            preguntaId: pregunta.id,
            opcionId: seleccion.opcionId,
            valor: seleccion.valor,
            aceptada: true,
            tardia: false,
            puntos: 0,
          },
        });
      } catch (error) {
        if (codigoPrisma(error) !== 'P2002') throw error;
        throw new ConflictException({
          mensaje: 'Ya enviaste una respuesta para esta pregunta.',
        });
      }
      return this.buscarEn(tx, normalizado);
    });
    this.avisos.confirmar(aviso('respuesta-aceptada', sala.codigo));
    return presentarSala(sala, identidad.id);
  }

  async cerrar(
    codigo: string,
    identidad: IdentidadExterna,
  ): Promise<SalaPublica> {
    const sala = await this.transaccion(async (tx) => {
      const normalizado = codigo.trim().toUpperCase();
      await this.bloquear(tx, normalizado);
      const actual = await this.buscarEn(tx, normalizado);
      if (actual.anfitrionId !== identidad.id) {
        throw new ForbiddenException({
          mensaje: 'Solo el anfitrión puede cerrar la pregunta.',
        });
      }
      if (actual.estado !== 'pregunta') {
        throw new ConflictException({
          mensaje: 'No hay una pregunta abierta.',
        });
      }
      const pregunta = this.preguntaActiva(actual);
      await this.calificar(tx, actual, pregunta);
      const cambio = await tx.sesionJuego.updateMany({
        where: {
          id: actual.id,
          estado: 'pregunta',
          preguntaActual: actual.preguntaActual,
        },
        data: { estado: 'cerrada', cierraEn: null },
      });
      if (cambio.count !== 1) {
        throw new ConflictException({
          mensaje: 'No hay una pregunta abierta.',
        });
      }
      return this.buscarEn(tx, normalizado);
    });
    this.avisos.confirmar(aviso('pregunta-cerrada', sala.codigo));
    return presentarSala(sala, identidad.id);
  }

  async avanzar(
    codigo: string,
    identidad: IdentidadExterna,
  ): Promise<SalaPublica> {
    const sala = await this.transaccion(async (tx) => {
      const normalizado = codigo.trim().toUpperCase();
      await this.bloquear(tx, normalizado);
      const actual = await this.buscarEn(tx, normalizado);
      if (actual.anfitrionId !== identidad.id) {
        throw new ForbiddenException({
          mensaje: 'Solo el anfitrión puede avanzar la partida.',
        });
      }
      if (actual.estado === 'finalizada') {
        throw new ConflictException({ mensaje: 'La partida ya finalizó.' });
      }
      if (actual.estado !== 'cerrada') {
        throw new ConflictException({
          mensaje: 'Cierra la pregunta antes de avanzar.',
        });
      }
      const instantanea = leerInstantanea(actual.preguntasInstantanea);
      const preguntas = instantanea?.preguntas ?? [];
      if (actual.preguntaActual + 1 >= preguntas.length) {
        await this.finalizar(tx, actual, preguntas.length);
      } else {
        const siguiente = preguntas[actual.preguntaActual + 1];
        const segundos = segundosDe(siguiente);
        const cambio = await tx.sesionJuego.updateMany({
          where: {
            id: actual.id,
            estado: 'cerrada',
            preguntaActual: actual.preguntaActual,
          },
          data: {
            estado: 'pregunta',
            preguntaActual: actual.preguntaActual + 1,
            segundos,
            cierraEn: new Date(Date.now() + segundos * 1000),
          },
        });
        if (cambio.count !== 1) {
          throw new ConflictException({
            mensaje: 'Cierra la pregunta antes de avanzar.',
          });
        }
      }
      return this.buscarEn(tx, normalizado);
    });
    const tipo =
      sala.estado === 'finalizada' ? 'sesion-finalizada' : 'pregunta-cambiada';
    this.avisos.confirmar(aviso(tipo, sala.codigo));
    return presentarSala(sala, identidad.id);
  }

  private async cuestionarioJugable(id: string): Promise<CuestionarioJuego> {
    const fila = await this.db().cuestionario.findFirst({
      where: { id, eliminadoEn: null },
      include: arbol.cuestionario.include,
    });
    if (!fila) {
      throw new NotFoundException({
        mensaje: 'No se encontró el cuestionario.',
      });
    }
    jugables(fila.preguntas);
    return fila;
  }

  private async buscar(codigo: string): Promise<FilaSesion & { id: string }> {
    return this.buscarEn(this.db(), codigo);
  }

  private async buscarEn(
    tx: ClienteSesion,
    codigo: string,
  ): Promise<FilaSesion & { id: string }> {
    const fila = await tx.sesionJuego.findFirst({
      where: { codigo: codigo.trim().toUpperCase() },
      include: arbol,
    });
    if (!fila) {
      throw new NotFoundException({
        mensaje: 'No hay una sala con ese código.',
      });
    }
    return fila;
  }

  private async bloquear(tx: ClienteSesion, codigo: string): Promise<void> {
    await tx.$queryRaw(
      Prisma.sql`SELECT id FROM "SesionJuego" WHERE codigo = ${codigo} FOR UPDATE`,
    );
  }

  private exigirLecturaFinal(
    fila: FilaSesion,
    identidad: IdentidadExterna,
  ): void {
    if (fila.estado !== 'finalizada') return;
    if (fila.anfitrionId === identidad.id) return;
    if (fila.participantes.some((item) => item.perfilId === identidad.id))
      return;
    throw new ForbiddenException({
      mensaje: 'No puedes ver los resultados de esta partida.',
    });
  }

  private preguntaActiva(fila: FilaSesion): PreguntaInstantanea {
    const instantanea = leerInstantanea(fila.preguntasInstantanea);
    const pregunta = instantanea?.preguntas[fila.preguntaActual];
    if (!pregunta) {
      throw new ConflictException({ mensaje: 'No hay una pregunta activa.' });
    }
    return pregunta;
  }

  private async calificar(
    tx: ClienteSesion,
    fila: FilaSesion,
    pregunta: PreguntaInstantanea,
  ): Promise<void> {
    const deLaPregunta = await tx.respuesta.findMany({
      where: { sesionId: fila.id, preguntaId: pregunta.id, aceptada: true },
    });
    for (const respuesta of deLaPregunta) {
      if (respuesta.puntos > 0) continue;
      const puntos = esAcierto(pregunta, respuesta) ? 1 : 0;
      if (puntos === 0) continue;
      await tx.respuesta.update({
        where: { id: respuesta.id },
        data: { puntos },
      });
    }
    for (const participante of fila.participantes) {
      const suyas = await tx.respuesta.findMany({
        where: { participanteId: participante.id },
      });
      const puntaje = suyas.reduce((suma, item) => suma + item.puntos, 0);
      const aciertos = suyas.filter((item) => item.puntos > 0).length;
      await tx.participante.update({
        where: { id: participante.id },
        data: { puntaje, aciertos },
      });
    }
  }

  private async finalizar(
    tx: ClienteSesion,
    fila: FilaSesion,
    jugadas: number,
  ): Promise<void> {
    const finalizadaEn = new Date();
    const cambio = await tx.sesionJuego.updateMany({
      where: {
        id: fila.id,
        estado: 'cerrada',
        preguntaActual: fila.preguntaActual,
      },
      data: { estado: 'finalizada', finalizadaEn, cierraEn: null },
    });
    if (cambio.count !== 1) {
      throw new ConflictException({ mensaje: 'La partida ya finalizó.' });
    }
    await tx.resultado.createMany({
      data: fila.participantes.map((participante) => ({
        id: randomUUID(),
        sesionId: fila.id,
        participanteId: participante.id,
        puntuacion: participante.puntaje,
        aciertos: participante.aciertos,
        incorrectas: Math.max(0, jugadas - participante.aciertos),
        finalizadoEn: finalizadaEn,
      })),
    });
  }

  private db(): ClienteSesion {
    if (!this.prisma.estaListo()) {
      throw new ServiceUnavailableException({
        mensaje: 'La base de datos no está disponible.',
      });
    }
    return this.prisma.obtener() as unknown as ClienteSesion;
  }

  private async transaccion<T>(
    operacion: (tx: ClienteSesion) => Promise<T>,
  ): Promise<T> {
    return this.db().$transaction(operacion);
  }
}

interface ClienteSesion {
  cuestionario: {
    findFirst(args: {
      where: { id: string; eliminadoEn: null };
      include: typeof arbol.cuestionario.include;
    }): Promise<CuestionarioJuego | null>;
  };
  sesionJuego: {
    create(args: {
      data: {
        id: string;
        codigo: string;
        cuestionarioId: string;
        titulo: string;
        anfitrionId: string;
        anfitrionNombre: string;
        estado: 'esperando';
        preguntaActual: number;
        segundos: number;
      };
      include: typeof arbol;
    }): Promise<FilaSesion & { id: string; codigo: string }>;
    findFirst(args: {
      where: { codigo: string };
      include: typeof arbol;
    }): Promise<
      | (FilaSesion & { id: string; cuestionario: CuestionarioJuego | null })
      | null
    >;
    updateMany(args: {
      where: { id: string; estado: string; preguntaActual?: number };
      data: {
        estado?: string;
        preguntaActual?: number;
        segundos?: number;
        iniciadaEn?: Date;
        cierraEn?: Date | null;
        finalizadaEn?: Date;
        preguntasInstantanea?: Prisma.InputJsonValue;
      };
    }): Promise<{ count: number }>;
  };
  participante: {
    create(args: {
      data: {
        id: string;
        sesionId: string;
        perfilId: string;
        nombre: string;
        conectado: boolean;
      };
    }): Promise<unknown>;
    update(args: {
      where:
        | { id: string }
        | { sesionId_perfilId: { sesionId: string; perfilId: string } };
      data: {
        nombre?: string;
        conectado?: boolean;
        puntaje?: number;
        aciertos?: number;
      };
    }): Promise<unknown>;
  };
  respuesta: {
    findMany(args: {
      where: {
        sesionId?: string;
        preguntaId?: string;
        participanteId?: string;
        aceptada?: boolean;
      };
    }): Promise<
      Array<{
        id: string;
        participanteId: string;
        preguntaId: string;
        opcionId: string | null;
        valor: boolean | null;
        puntos: number;
      }>
    >;
    create(args: {
      data: {
        id: string;
        sesionId: string;
        participanteId: string;
        preguntaId: string;
        opcionId: string | null;
        valor: boolean | null;
        aceptada: boolean;
        tardia: boolean;
        puntos: number;
      };
    }): Promise<unknown>;
    update(args: {
      where: { id: string };
      data: { puntos: number };
    }): Promise<unknown>;
  };
  resultado: {
    createMany(args: {
      data: Array<{
        id: string;
        sesionId: string;
        participanteId: string;
        puntuacion: number;
        aciertos: number;
        incorrectas: number;
        finalizadoEn: Date;
      }>;
    }): Promise<unknown>;
  };
  $queryRaw(consulta: Prisma.Sql): Promise<unknown>;
  $transaction<T>(operacion: (tx: ClienteSesion) => Promise<T>): Promise<T>;
}

function jugables(preguntas: FilaPregunta[]): FilaPregunta[] {
  if (preguntas.length === 0) {
    throw new BadRequestException({
      mensaje: 'El cuestionario no tiene preguntas.',
    });
  }
  for (const pregunta of preguntas) {
    const correctas = pregunta.opciones.filter(
      (opcion) => opcion.correcta,
    ).length;
    if (pregunta.opciones.length < 2 || correctas !== 1) {
      throw new BadRequestException({
        mensaje: 'El cuestionario no está listo para jugar.',
      });
    }
  }
  return preguntas;
}

function segundosDe(pregunta: PreguntaInstantanea | undefined): number {
  const segundos = pregunta?.segundos;
  if (segundos === null || segundos === undefined) return SEGUNDOS_SALA;
  if (!Number.isInteger(segundos) || segundos < 5 || segundos > 120)
    return SEGUNDOS_SALA;
  return segundos;
}

function aviso(tipo: CambioSesion, codigo: string) {
  return { tipo, codigo, ocurridoEn: new Date().toISOString() };
}

function seleccionDe(
  entrada: { valor?: boolean | null; opcionId?: string },
  pregunta: PreguntaInstantanea,
): { opcionId: string | null; valor: boolean | null } {
  const opcionId = entrada.opcionId?.trim() ?? '';
  if (opcionId) {
    const existe = pregunta.opciones.some((opcion) => opcion.id === opcionId);
    if (!existe) {
      throw new BadRequestException({
        mensaje: 'Esa opción no pertenece a la pregunta.',
      });
    }
    return { opcionId, valor: null };
  }
  if (typeof entrada.valor === 'boolean') {
    return { opcionId: null, valor: entrada.valor };
  }
  throw new BadRequestException({ mensaje: 'Elige una respuesta.' });
}

function codigoPrisma(error: unknown): string {
  if (typeof error === 'object' && error && 'code' in error)
    return String(error.code);
  return '';
}
