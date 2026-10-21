import { Injectable } from '@nestjs/common';
import {
  CuestionarioEntrada,
  validarCuestionarioEntrada,
} from './validar-entrada';

@Injectable()
export class PreguntasService {
  validar(entrada: CuestionarioEntrada): string[] {
    return validarCuestionarioEntrada(entrada);
  }
}
