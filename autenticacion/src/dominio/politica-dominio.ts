import { BadRequestException } from '@nestjs/common';
import { RolUsuario } from './tipos';

export interface PoliticaDominioResultado {
  rol: RolUsuario;
  emailVerificado: boolean;
  institutionId?: string;
  requiereVerificacion: boolean;
}

export interface EntidadPoliticaDominio {
  domain: string;
  defaultRole: string;
  autoGrantRole: boolean;
  requiresVerification: boolean;
  institutionId?: string | null;
}

export function normalizarEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function extraerDominio(email: string): string {
  const normalizado = normalizarEmail(email);
  const partes = normalizado.split('@');
  if (partes.length !== 2 || !partes[1]) {
    throw new BadRequestException('El formato del correo electrónico no es válido.');
  }
  return partes[1];
}

export function resolverRolYPolitica(
  email: string,
  politicas: EntidadPoliticaDominio[],
  modoRegistro: 'open' | 'domains-only' = 'open',
  autoVerificarEmail = false,
): PoliticaDominioResultado {
  const dominio = extraerDominio(email);
  const politica = politicas.find((p) => p.domain.toLowerCase() === dominio);

  if (politica) {
    const rol = (politica.defaultRole as RolUsuario) || 'student';
    const requiereVerificacion = politica.requiresVerification && !autoVerificarEmail;
    return {
      rol,
      emailVerificado: !requiereVerificacion,
      requiereVerificacion,
      institutionId: politica.institutionId ?? undefined,
    };
  }

  if (modoRegistro === 'domains-only') {
    throw new BadRequestException(
      `El dominio '@${dominio}' no está autorizado para registrarse en esta plataforma.`,
    );
  }

  // En modo abierto, dominios externos siempre reciben rol student
  return {
    rol: 'student',
    emailVerificado: autoVerificarEmail,
    requiereVerificacion: !autoVerificarEmail,
  };
}
