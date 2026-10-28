import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';

export class RegistroDto {
  @IsOptional()
  @IsString()
  nombre?: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsEmail({}, { message: 'El correo electrónico no es válido' })
  correo?: string;

  @IsOptional()
  @IsEmail({}, { message: 'El correo electrónico no es válido' })
  email?: string;

  @IsOptional()
  @IsString()
  @MinLength(8, { message: 'La contraseña debe tener al menos 8 caracteres' })
  contrasena?: string;

  @IsOptional()
  @IsString()
  @MinLength(8, { message: 'La contraseña debe tener al menos 8 caracteres' })
  password?: string;
}

export function extraerNombreRegistro(datos: any): string {
  if (typeof datos?.obtenerNombre === 'function') return datos.obtenerNombre();
  const val = (datos?.nombre ?? datos?.name ?? '').trim();
  if (!val) throw new Error('El nombre es obligatorio.');
  return val;
}

export function extraerEmailRegistro(datos: any): string {
  if (typeof datos?.obtenerEmail === 'function') return datos.obtenerEmail();
  const val = (datos?.correo ?? datos?.email ?? '').trim().toLowerCase();
  if (!val) throw new Error('El correo electrónico es obligatorio.');
  return val;
}

export function extraerPasswordRegistro(datos: any): string {
  if (typeof datos?.obtenerPassword === 'function') return datos.obtenerPassword();
  const val = datos?.contrasena ?? datos?.password ?? '';
  if (!val || val.length < 8) {
    throw new Error('La contraseña debe tener al menos 8 caracteres.');
  }
  return val;
}
