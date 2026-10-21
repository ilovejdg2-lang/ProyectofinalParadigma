import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { tokenBearer, VerificadorIdentidad } from './verificador-identidad';
import { IdentidadExterna } from './identidad-externa';

export interface SolicitudConIdentidad {
  headers: { authorization?: string };
  identidad?: IdentidadExterna;
}

@Injectable()
export class IdentidadGuard implements CanActivate {
  constructor(private readonly verificador: VerificadorIdentidad) {}

  async canActivate(contexto: ExecutionContext): Promise<boolean> {
    const solicitud = contexto
      .switchToHttp()
      .getRequest<SolicitudConIdentidad>();
    const token = tokenBearer(solicitud.headers.authorization);
    const identidad = token ? await this.verificador.verificar(token) : null;
    if (!identidad) {
      throw new UnauthorizedException({
        mensaje: 'La sesión no es válida.',
      });
    }
    solicitud.identidad = identidad;
    return true;
  }
}
