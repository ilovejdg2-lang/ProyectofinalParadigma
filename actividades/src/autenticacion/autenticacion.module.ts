import { Global, Module } from '@nestjs/common';
import { IdentidadGuard } from './identidad.guard';
import { VerificadorIdentidad } from './verificador-identidad';
import { VerificadorIdentidadJwt } from './verificador-identidad-jwt';

@Global()
@Module({
  providers: [
    IdentidadGuard,
    VerificadorIdentidadJwt,
    {
      provide: VerificadorIdentidad,
      useExisting: VerificadorIdentidadJwt,
    },
  ],
  exports: [IdentidadGuard, VerificadorIdentidad, VerificadorIdentidadJwt],
})
export class AutenticacionModule {}
