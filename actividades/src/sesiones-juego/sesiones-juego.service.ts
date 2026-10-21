import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/** Salas, participantes y respuestas. Las reglas de partida quedan para una fase posterior. */
@Injectable()
export class SesionesJuegoService {
  constructor(private readonly prisma: PrismaService) {}

  preparado(): boolean {
    return this.prisma.estaListo();
  }
}
