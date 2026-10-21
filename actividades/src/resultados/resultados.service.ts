import {
  ForbiddenException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { IdentidadExterna } from '../autenticacion/identidad-externa';
import { PrismaService } from '../prisma/prisma.service';
import {
  FilaSesion,
  presentarResultado,
  ResumenPublico,
} from '../sesiones-juego/presentacion-sala';

const arbol = {
  participantes: {
    orderBy: { incorporadoEn: 'asc' as const },
    include: { respuestas: { orderBy: { respondidaEn: 'asc' as const } } },
  },
};

@Injectable()
export class ResultadosService {
  constructor(private readonly prisma: PrismaService) {}

  preparado(): boolean {
    return this.prisma.estaListo();
  }

  async historial(identidad: IdentidadExterna): Promise<ResumenPublico[]> {
    const filas = await this.db().sesionJuego.findMany({
      where: {
        estado: 'finalizada',
        OR: [
          { anfitrionId: identidad.id },
          { participantes: { some: { perfilId: identidad.id } } },
        ],
      },
      include: arbol,
      orderBy: { finalizadaEn: 'desc' },
    });
    return filas.map((fila) => presentarResultado(fila));
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
    const autorizada =
      fila.anfitrionId === identidad.id ||
      fila.participantes.some((item) => item.perfilId === identidad.id);
    if (!autorizada) {
      throw new ForbiddenException({
        mensaje: 'No puedes ver los resultados de esta partida.',
      });
    }
    return presentarResultado(fila);
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
}
