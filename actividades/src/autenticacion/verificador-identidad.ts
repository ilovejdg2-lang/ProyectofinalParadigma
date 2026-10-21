import { Injectable } from '@nestjs/common';
import { IdentidadExterna } from './identidad-externa';

/**
 * Punto de extensión del servicio de autenticación.
 * La implementación real deberá verificar firma, emisor y audiencia del Bearer.
 * Mientras no exista, la implementación registrada no acepta ningún token.
 */
@Injectable()
export abstract class VerificadorIdentidad {
  abstract verificar(token: string): Promise<IdentidadExterna | null>;
}

@Injectable()
export class VerificadorIdentidadPendiente extends VerificadorIdentidad {
  verificar(): Promise<IdentidadExterna | null> {
    return Promise.resolve(null);
  }
}

export function tokenBearer(autorizacion?: string): string | null {
  if (!autorizacion?.startsWith('Bearer ')) return null;
  const token = autorizacion.slice('Bearer '.length).trim();
  return token.length > 0 ? token : null;
}
