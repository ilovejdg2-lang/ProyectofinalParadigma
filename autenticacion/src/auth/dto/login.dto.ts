import { IsEmail, IsOptional, IsString } from 'class-validator';

export class LoginDto {
  @IsOptional()
  @IsEmail({}, { message: 'El correo electrónico no es válido' })
  correo?: string;

  @IsOptional()
  @IsEmail({}, { message: 'El correo electrónico no es válido' })
  email?: string;

  @IsOptional()
  @IsString()
  contrasena?: string;

  @IsOptional()
  @IsString()
  password?: string;
}

export function extraerEmail(datos: any): string {
  if (typeof datos?.obtenerEmail === 'function') return datos.obtenerEmail();
  const val = (datos?.correo ?? datos?.email ?? '').trim().toLowerCase();
  if (!val) throw new Error('El correo electrónico es obligatorio.');
  return val;
}

export function extraerPassword(datos: any): string {
  if (typeof datos?.obtenerPassword === 'function') return datos.obtenerPassword();
  const val = datos?.contrasena ?? datos?.password ?? '';
  if (!val) throw new Error('La contraseña es obligatoria.');
  return val;
}
