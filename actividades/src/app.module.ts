import { Module } from '@nestjs/common';
import { APP_FILTER, APP_PIPE } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { AutenticacionModule } from './autenticacion/autenticacion.module';
import { FiltroErrores } from './comun/filtro-errores';
import { tuboValidacion } from './comun/tubo-validacion';
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
    AutenticacionModule,
    CuestionariosModule,
    PreguntasModule,
    ImagenesModule,
    SesionesJuegoModule,
    ResultadosModule,
  ],
  controllers: [SaludController],
  providers: [
    { provide: APP_FILTER, useClass: FiltroErrores },
    { provide: APP_PIPE, useFactory: tuboValidacion },
  ],
})
export class AppModule {}
