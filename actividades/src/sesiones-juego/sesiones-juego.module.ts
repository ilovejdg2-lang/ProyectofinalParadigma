import { Module } from '@nestjs/common';
import { AvisoSesiones, AvisoSesionesLocal } from './aviso-sesiones';
import { SesionesJuegoController } from './sesiones-juego.controller';
import { SesionesJuegoService } from './sesiones-juego.service';

@Module({
  controllers: [SesionesJuegoController],
  providers: [
    SesionesJuegoService,
    { provide: AvisoSesiones, useClass: AvisoSesionesLocal },
  ],
  exports: [SesionesJuegoService, AvisoSesiones],
})
export class SesionesJuegoModule {}
