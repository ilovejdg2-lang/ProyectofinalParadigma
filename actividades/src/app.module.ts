import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CuestionariosModule } from './cuestionarios/cuestionarios.module';
import { ImagenesModule } from './imagenes/imagenes.module';
import { PreguntasModule } from './preguntas/preguntas.module';
import { PrismaModule } from './prisma/prisma.module';
import { ResultadosModule } from './resultados/resultados.module';
import { SaludController } from './salud/salud.controller';
import { SesionesJuegoModule } from './sesiones-juego/sesiones-juego.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    CuestionariosModule,
    PreguntasModule,
    ImagenesModule,
    SesionesJuegoModule,
    ResultadosModule,
  ],
  controllers: [SaludController],
})
export class AppModule {}
