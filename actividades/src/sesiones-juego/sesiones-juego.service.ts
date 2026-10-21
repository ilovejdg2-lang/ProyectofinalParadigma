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
import { AvisoSesiones } from './aviso-sesiones';
import { codigoSala } from './codigo-sala';
import {
  FilaPregunta,
  FilaSesion,
  instantaneaDe,
  PreguntaInstantanea,
  presentarSala,
  SalaPublica,
} from './presentacion-sala';

const INTENTOS_CODIGO = 8;
const SEGUNDOS_SALA = 20;

const arbol = {
  participantes: { orderBy: { incorporadoEn: 'asc' as const } },
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
        return presentarSala(creada);
      } catch (error) {
        if (codigoPrisma(error) !== 'P2002') throw error;
      }
    }
    throw new ConflictException({
      mensaje: 'No se pudo crear la sala. Intenta de nuevo.',
    });
  }

  async obtener(codigo: string): Promise<SalaPublica> {
    return presentarSala(await this.buscar(codigo));
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
    return presentarSala(sala);
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
    return presentarSala(sala);
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

  private db(): ClienteSesion {
    if (!this.prisma.estaListo()) {
      throw new ServiceUnavailableException({
        mensaje: 'La base de datos no está disponible.',
      });
    }
    return this.prisma.obtener();
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
      where: { id: string; estado: 'esperando' };
      data: {
        estado: 'pregunta';
        preguntaActual: number;
        segundos: number;
        iniciadaEn: Date;
        cierraEn: Date;
        preguntasInstantanea: Prisma.InputJsonValue;
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
      where: { sesionId_perfilId: { sesionId: string; perfilId: string } };
      data: { nombre: string; conectado: boolean };
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

function aviso(
  tipo: 'sala-creada' | 'participante-incorporado' | 'partida-iniciada',
  codigo: string,
) {
  return { tipo, codigo, ocurridoEn: new Date().toISOString() };
}

function codigoPrisma(error: unknown): string {
  if (typeof error === 'object' && error && 'code' in error)
    return String(error.code);
  return '';
}
