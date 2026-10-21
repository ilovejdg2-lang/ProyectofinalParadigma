import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/** Casos de uso de cuestionarios. Las rutas CRUD quedan para la fase siguiente. */
@Injectable()
export class CuestionariosService {
  constructor(private readonly prisma: PrismaService) {}

  preparado(): boolean {
    return this.prisma.estaListo();
  }
}
