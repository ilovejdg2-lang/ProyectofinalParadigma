import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/** Metadatos de imágenes. La subida a almacenamiento queda para la fase siguiente. */
@Injectable()
export class ImagenesService {
  constructor(private readonly prisma: PrismaService) {}

  preparado(): boolean {
    return this.prisma.estaListo();
  }
}
