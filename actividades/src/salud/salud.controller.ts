import { Controller, Get } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Controller()
export class SaludController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('salud')
  salud(): { estado: 'ok'; baseDatos: string } {
    return {
      estado: 'ok',
      baseDatos: this.prisma.estado(),
    };
  }
}
