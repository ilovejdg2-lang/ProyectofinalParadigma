import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/** Preguntas y opciones. La validación al guardar queda para la fase siguiente. */
@Injectable()
export class PreguntasService {
  constructor(private readonly prisma: PrismaService) {}

  preparado(): boolean {
    return this.prisma.estaListo();
  }
}
