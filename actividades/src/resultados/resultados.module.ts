import { Module } from '@nestjs/common';
import { ResultadosService } from './resultados.service';

@Module({
  providers: [ResultadosService],
  exports: [ResultadosService],
})
export class ResultadosModule {}
