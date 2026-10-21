import { Module } from '@nestjs/common';
import { PreguntasService } from './preguntas.service';

@Module({
  providers: [PreguntasService],
  exports: [PreguntasService],
})
export class PreguntasModule {}
