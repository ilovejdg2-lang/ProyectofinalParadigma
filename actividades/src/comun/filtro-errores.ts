import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';

@Catch()
export class FiltroErrores implements ExceptionFilter {
  catch(excepcion: unknown, host: ArgumentsHost): void {
    const respuesta = host.switchToHttp().getResponse<Response>();
    if (excepcion instanceof HttpException) {
      respuesta
        .status(excepcion.getStatus())
        .json({ mensaje: mensajeDe(excepcion) });
      return;
    }
    respuesta.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      mensaje: 'Ocurrió un error inesperado.',
    });
  }
}

function mensajeDe(excepcion: HttpException): string {
  const cuerpo = excepcion.getResponse();
  if (typeof cuerpo === 'string') return cuerpo;
  if (typeof cuerpo === 'object' && cuerpo && 'mensaje' in cuerpo) {
    const mensaje = (cuerpo as { mensaje?: unknown }).mensaje;
    if (typeof mensaje === 'string' && mensaje.trim()) return mensaje;
  }
  return 'Ocurrió un error inesperado.';
}
