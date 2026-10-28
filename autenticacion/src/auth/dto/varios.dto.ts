import { IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';

export class RefreshDto {
  @IsOptional()
  @IsString()
  refreshToken?: string;

  @IsOptional()
  @IsString()
  token?: string;
}

export function extraerRefreshToken(datos: any): string {
  if (typeof datos?.obtenerRefreshToken === 'function') return datos.obtenerRefreshToken();
  const val = (datos?.refreshToken ?? datos?.token ?? '').trim();
  if (!val) throw new Error('El refresh token es obligatorio.');
  return val;
}

export class ActualizarPerfilDto {
  @IsOptional()
  @IsString()
  displayName?: string;

  @IsOptional()
  @IsString()
  nombre?: string;
}

export function extraerNombreActualizar(datos: any): string | undefined {
  if (typeof datos?.obtenerNombre === 'function') return datos.obtenerNombre();
  const val = (datos?.displayName ?? datos?.nombre ?? '').trim();
  return val.length > 0 ? val : undefined;
}

export class VerificarEmailDto {
  @IsNotEmpty({ message: 'El token de verificación es obligatorio' })
  @IsString()
  token!: string;
}

export class CambiarPasswordDto {
  @IsOptional()
  @IsString()
  contrasenaActual?: string;

  @IsOptional()
  @IsString()
  currentPassword?: string;

  @IsOptional()
  @IsString()
  @MinLength(8, { message: 'La nueva contraseña debe tener al menos 8 caracteres' })
  nuevaContrasena?: string;

  @IsOptional()
  @IsString()
  @MinLength(8, { message: 'La nueva contraseña debe tener al menos 8 caracteres' })
  newPassword?: string;
}

export function extraerPasswordActual(datos: any): string {
  const val = datos?.contrasenaActual ?? datos?.currentPassword ?? '';
  if (!val) throw new Error('La contraseña actual es obligatoria.');
  return val;
}

export function extraerPasswordNueva(datos: any): string {
  const val = datos?.nuevaContrasena ?? datos?.newPassword ?? '';
  if (!val || val.length < 8) {
    throw new Error('La nueva contraseña debe tener al menos 8 caracteres.');
  }
  return val;
}
