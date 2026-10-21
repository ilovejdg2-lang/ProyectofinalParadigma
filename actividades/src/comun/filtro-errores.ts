import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
import { MENSAJE_TAMANO_IMAGEN } from '../imagenes/validar-archivo';

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
    const mensajeArchivo = mensajeDeArchivo(excepcion);
    if (mensajeArchivo) {
      respuesta
        .status(HttpStatus.BAD_REQUEST)
        .json({ mensaje: mensajeArchivo });
      return;
    }
    respuesta.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      mensaje: 'Ocurrió un error inesperado.',
    });
  }
}

function mensajeDeArchivo(excepcion: unknown): string | null {
  if (!(excepcion instanceof Error)) return null;
  if (excepcion.name === 'MulterError') {
    const codigo = 'code' in excepcion ? String(excepcion.code) : '';
    return codigo === 'LIMIT_FILE_SIZE'
      ? MENSAJE_TAMANO_IMAGEN
      : 'Selecciona una imagen.';
  }
  if (/multipart|boundary/i.test(excepcion.message)) {
    return 'Selecciona una imagen.';
  }
  return null;
}

function mensajeDe(excepcion: HttpException): string {
  if (excepcion.getStatus() === 413) {
    return MENSAJE_TAMANO_IMAGEN;
  }
  const cuerpo = excepcion.getResponse();
  if (typeof cuerpo === 'string') {
    if (/multipart|boundary|unexpected file/i.test(cuerpo)) {
      return 'Selecciona una imagen.';
    }
    return cuerpo;
  }
  if (typeof cuerpo === 'object' && cuerpo && 'mensaje' in cuerpo) {
    const mensaje = (cuerpo as { mensaje?: unknown }).mensaje;
    if (typeof mensaje === 'string' && mensaje.trim()) return mensaje;
  }
  return 'Ocurrió un error inesperado.';
}
