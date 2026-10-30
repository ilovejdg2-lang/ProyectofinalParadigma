import { Module } from '@nestjs/common';
import { BancoPreguntasController } from './banco-preguntas.controller';
import { BancoPreguntasService } from './banco-preguntas.service';

@Module({
  controllers: [BancoPreguntasController],
  providers: [BancoPreguntasService],
  exports: [BancoPreguntasService],
})
export class BancoPreguntasModule {}

