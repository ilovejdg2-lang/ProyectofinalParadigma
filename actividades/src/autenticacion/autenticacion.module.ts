import { Global, Module } from '@nestjs/common';
import { IdentidadGuard } from './identidad.guard';
import {
  VerificadorIdentidad,
  VerificadorIdentidadPendiente,
} from './verificador-identidad';

@Global()
@Module({
  providers: [
    IdentidadGuard,
    {
      provide: VerificadorIdentidad,
      useClass: VerificadorIdentidadPendiente,
    },
  ],
  exports: [IdentidadGuard, VerificadorIdentidad],
})
export class AutenticacionModule {}
