import { Module } from '@nestjs/common';
import { CuestionariosService } from './cuestionarios.service';

@Module({
  providers: [CuestionariosService],
  exports: [CuestionariosService],
})
export class CuestionariosModule {}
