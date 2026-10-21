import { BadRequestException, ValidationPipe } from '@nestjs/common';
import { ValidationError } from 'class-validator';

export function tuboValidacion(): ValidationPipe {
  return new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    exceptionFactory: (errores: ValidationError[]) =>
      new BadRequestException({ mensaje: aplanar(errores) }),
  });
}

function aplanar(errores: ValidationError[]): string {
  const textos: string[] = [];
  const recorrer = (lista: ValidationError[]) => {
    for (const error of lista) {
      if (error.constraints) textos.push(...Object.values(error.constraints));
      if (error.children?.length) recorrer(error.children);
    }
  };
  recorrer(errores);
  return textos.join(' ') || 'Los datos del cuestionario no son válidos.';
}
