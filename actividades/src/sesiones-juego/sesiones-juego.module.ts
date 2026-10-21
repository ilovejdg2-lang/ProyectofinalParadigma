import { Module } from '@nestjs/common';
import { SesionesJuegoService } from './sesiones-juego.service';

@Module({
  providers: [SesionesJuegoService],
  exports: [SesionesJuegoService],
})
export class SesionesJuegoModule {}
