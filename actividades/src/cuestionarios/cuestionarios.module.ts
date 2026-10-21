import { Module } from '@nestjs/common';
import { ImagenesModule } from '../imagenes/imagenes.module';
import { PreguntasModule } from '../preguntas/preguntas.module';
import { CuestionariosController } from './cuestionarios.controller';
import { CuestionariosService } from './cuestionarios.service';

@Module({
  imports: [PreguntasModule, ImagenesModule],
  controllers: [CuestionariosController],
  providers: [CuestionariosService],
  exports: [CuestionariosService],
})
export class CuestionariosModule {}
