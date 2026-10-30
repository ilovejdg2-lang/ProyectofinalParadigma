import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { Prisma } from '../generated/prisma/client';
import { IdentidadExterna } from '../autenticacion/identidad-externa';
import { ProgresoUsuario } from '../banco-preguntas/estructura-banco';
import { PrismaService } from '../prisma/prisma.service';
import { codigoSala } from '../sesiones-juego/codigo-sala';
import {
  FilaPregunta,
  FilaSesion,
  instantaneaDe,
  presentarResultado,
  ResumenPublico,
} from '../sesiones-juego/presentacion-sala';
import { GuardarPartidaDto } from './dto/guardar-partida.dto';
import {
  calcularProgresoUsuario,
  deduplicarYValidarHistorial,
  idsEquivalentesUsuario,
  validarRespuestasDePartida,
} from './validacion-resultados';

const arbol = {
  participantes: {
    orderBy: { incorporadoEn: 'asc' as const },
    include: { respuestas: { orderBy: { respondidaEn: 'asc' as const } } },
  },
};

const arbolCuestionario = {
  preguntas: {
    orderBy: { orden: 'asc' as const },
    include: {
      imagen: true,
      opciones: { orderBy: { orden: 'asc' as const } },
    },
  },
};

@Injectable()
export class ResultadosService {
  constructor(private readonly prisma: PrismaService) {}

  preparado(): boolean {
    return this.prisma.estaListo();
  }

  async historial(identidad: IdentidadExterna): Promise<ResumenPublico[]> {
    const ids = idsEquivalentesUsuario(identidad.id);
    const clausulasOr = ids.flatMap((id) => [
      { anfitrionId: id },
      { participantes: { some: { perfilId: id } } },
    ]);
    const filas = await this.db().sesionJuego.findMany({
      where: {
        estado: 'finalizada',
        OR: clausulasOr,
      },
      include: arbol,
      orderBy: { finalizadaEn: 'desc' },
    });
    return deduplicarYValidarHistorial(filas);
  }

  async obtener(
    codigo: string,
    identidad: IdentidadExterna,
  ): Promise<ResumenPublico> {
    const fila = await this.db().sesionJuego.findFirst({
      where: { codigo: codigo.trim().toUpperCase() },
      include: arbol,
    });
    if (!fila || fila.estado !== 'finalizada') {
      throw new NotFoundException({
        mensaje: 'Esta sesión todavía no tiene resultados guardados.',
      });
    }
    const ids = new Set(idsEquivalentesUsuario(identidad.id));
    const autorizada =
      ids.has(fila.anfitrionId) ||
      fila.participantes.some((item) => ids.has(item.perfilId));
    if (!autorizada) {
      throw new ForbiddenException({
        mensaje: 'No puedes ver los resultados de esta partida.',
      });
    }
    const [validado] = deduplicarYValidarHistorial([fila]);
    return validado ?? presentarResultado(fila);
  }

  async guardarPartida(
    entrada: GuardarPartidaDto,
    identidad: IdentidadExterna,
  ): Promise<ResumenPublico> {
    const base = this.dbCompleta();
    const codigoSolicitado = entrada.codigo
      ? entrada.codigo.trim().toUpperCase().slice(0, 6)
      : undefined;

    if (codigoSolicitado) {
      const previa = await base.sesionJuego.findFirst({
        where: { codigo: codigoSolicitado },
        include: arbol,
      });
      if (previa && previa.estado === 'finalizada') {
        const ids = new Set(idsEquivalentesUsuario(identidad.id));
        const pertenece =
          ids.has(previa.anfitrionId) ||
          previa.participantes.some((item) => ids.has(item.perfilId));
        if (!pertenece) {
          throw new ConflictException({
            mensaje: 'Ya existe una partida registrada con ese código.',
          });
        }
        const [existente] = deduplicarYValidarHistorial([previa]);
        return existente ?? presentarResultado(previa);
      }
    }

    const cuestionario = await base.cuestionario.findFirst({
      where: { id: entrada.cuestionarioId.trim(), eliminadoEn: null },
      include: arbolCuestionario,
    });
    if (!cuestionario) {
      throw new NotFoundException({
        mensaje: 'No se encontró el cuestionario.',
      });
    }

    const validado = validarRespuestasDePartida(
      cuestionario.preguntas,
      entrada.respuestas,
      entrada.puntuacionReportada,
    );

    const instantanea = instantaneaDe(cuestionario.preguntas);
    const ahora = new Date();

    const guardada = await base.$transaction(async (tx) => {
      let codigoFinal =
        codigoSolicitado && /^[A-Z0-9]{6}$/.test(codigoSolicitado)
          ? codigoSolicitado
          : codigoSala();

      for (let intento = 0; intento < 8; intento += 1) {
        const ocupada = await tx.sesionJuego.findFirst({
          where: { codigo: codigoFinal },
          include: arbol,
        });
        if (!ocupada) break;
        if (codigoSolicitado) {
          return ocupada;
        }
        codigoFinal = codigoSala();
      }

      const sesionId = randomUUID();
      await tx.sesionJuego.create({
        data: {
          id: sesionId,
          codigo: codigoFinal,
          cuestionarioId: cuestionario.id,
          titulo: cuestionario.titulo,
          anfitrionId: identidad.id,
          anfitrionNombre: identidad.nombre,
          estado: 'finalizada',
          preguntaActual: Math.max(0, instantanea.preguntas.length - 1),
          segundos: 20,
          cierraEn: null,
          preguntasInstantanea:
            instantanea as unknown as Prisma.InputJsonValue,
          iniciadaEn: ahora,
          finalizadaEn: ahora,
        },
        include: arbol,
      });

      const participanteId = randomUUID();
      await tx.participante.create({
        data: {
          id: participanteId,
          sesionId,
          perfilId: identidad.id,
          nombre: identidad.nombre,
          conectado: true,
          puntaje: validado.puntuacion,
          aciertos: validado.aciertos,
          incorporadoEn: ahora,
        },
      });

      for (const resp of validado.respuestas) {
        await tx.respuesta.create({
          data: {
            id: randomUUID(),
            sesionId,
            participanteId,
            preguntaId: resp.preguntaId,
            opcionId: resp.opcionId,
            valor: resp.valor,
            aceptada: resp.aceptada,
            tardia: resp.tardia,
            puntos: resp.puntos,
            respondidaEn: ahora,
          },
        });
      }

      await tx.resultado.createMany({
        data: [
          {
            id: randomUUID(),
            sesionId,
            participanteId,
            puntuacion: validado.puntuacion,
            aciertos: validado.aciertos,
            incorrectas: validado.incorrectas,
            finalizadoEn: ahora,
          },
        ],
      });

      const recargada = await tx.sesionJuego.findFirst({
        where: { codigo: codigoFinal },
        include: arbol,
      });
      if (!recargada) {
        throw new NotFoundException({
          mensaje: 'No se pudo recuperar el resultado guardado.',
        });
      }
      return recargada;
    });

    const [resumen] = deduplicarYValidarHistorial([guardada]);
    return resumen ?? presentarResultado(guardada);
  }

  async progreso(identidad: IdentidadExterna): Promise<ProgresoUsuario> {
    const ids = idsEquivalentesUsuario(identidad.id);
    const clausulasOr = ids.flatMap((id) => [
      { anfitrionId: id },
      { participantes: { some: { perfilId: id } } },
    ]);
    const filas = await this.db().sesionJuego.findMany({
      where: {
        estado: 'finalizada',
        OR: clausulasOr,
      },
      include: arbol,
      orderBy: { finalizadaEn: 'desc' },
    });
    return calcularProgresoUsuario(identidad, filas);
  }

  private db(): {
    sesionJuego: {
      findMany(args: {
        where: {
          estado: 'finalizada';
          OR: Array<
            | { anfitrionId: string }
            | { participantes: { some: { perfilId: string } } }
          >;
        };
        include: typeof arbol;
        orderBy: { finalizadaEn: 'desc' };
      }): Promise<FilaSesion[]>;
      findFirst(args: {
        where: { codigo: string };
        include: typeof arbol;
      }): Promise<FilaSesion | null>;
    };
  } {
    if (!this.prisma.estaListo()) {
      throw new ServiceUnavailableException({
        mensaje: 'La base de datos no está disponible.',
      });
    }
    return this.prisma.obtener();
  }

  private dbCompleta(): ClienteResultadosPersistente {
    if (!this.prisma.estaListo()) {
      throw new ServiceUnavailableException({
        mensaje: 'La base de datos no está disponible.',
      });
    }
    return this.prisma.obtener() as unknown as ClienteResultadosPersistente;
  }
}

interface ClienteResultadosPersistente {
  cuestionario: {
    findFirst(args: {
      where: { id: string; eliminadoEn: null };
      include: typeof arbolCuestionario;
    }): Promise<{
      id: string;
      titulo: string;
      categoria: string;
      preguntas: FilaPregunta[];
    } | null>;
  };
  sesionJuego: {
    findFirst(args: {
      where: { codigo: string };
      include: typeof arbol;
    }): Promise<FilaSesion | null>;
    create(args: {
      data: {
        id: string;
        codigo: string;
        cuestionarioId: string;
        titulo: string;
        anfitrionId: string;
        anfitrionNombre: string;
        estado: 'finalizada';
        preguntaActual: number;
        segundos: number;
        cierraEn: null;
        preguntasInstantanea: Prisma.InputJsonValue;
        iniciadaEn: Date;
        finalizadaEn: Date;
      };
      include: typeof arbol;
    }): Promise<FilaSesion>;
  };
  participante: {
    create(args: {
      data: {
        id: string;
        sesionId: string;
        perfilId: string;
        nombre: string;
        conectado: boolean;
        puntaje: number;
        aciertos: number;
        incorporadoEn: Date;
      };
    }): Promise<unknown>;
  };
  respuesta: {
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
        respondidaEn: Date;
      };
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
  $transaction<T>(
    operacion: (tx: ClienteResultadosPersistente) => Promise<T>,
  ): Promise<T>;
}
