import { Module } from '@nestjs/common';
import { AvisoSesiones } from './aviso-sesiones';
import { AvisoSesionesCanal, CanalWebSocketService } from './canal-websocket.service';
import { SesionesJuegoController } from './sesiones-juego.controller';
import { SesionesJuegoService } from './sesiones-juego.service';

@Module({
  controllers: [SesionesJuegoController],
  providers: [
    SesionesJuegoService,
    CanalWebSocketService,
    AvisoSesionesCanal,
    {
      provide: AvisoSesiones,
      useExisting: AvisoSesionesCanal,
    },
  ],
  exports: [SesionesJuegoService, AvisoSesiones, CanalWebSocketService],
})
export class SesionesJuegoModule {}
