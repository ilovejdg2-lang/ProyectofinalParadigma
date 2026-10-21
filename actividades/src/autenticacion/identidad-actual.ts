import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { IdentidadExterna } from './identidad-externa';
import { SolicitudConIdentidad } from './identidad.guard';

export const IdentidadActual = createParamDecorator(
  (_dato: unknown, contexto: ExecutionContext): IdentidadExterna => {
    const solicitud = contexto
      .switchToHttp()
      .getRequest<SolicitudConIdentidad>();
    return solicitud.identidad as IdentidadExterna;
  },
);
