import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/** Resultados persistidos. El historial por API queda para una fase posterior. */
@Injectable()
export class ResultadosService {
  constructor(private readonly prisma: PrismaService) {}

  preparado(): boolean {
    return this.prisma.estaListo();
  }
}
