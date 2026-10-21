import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { IdentidadActual } from '../autenticacion/identidad-actual';
import { IdentidadGuard } from '../autenticacion/identidad.guard';
import type { IdentidadExterna } from '../autenticacion/identidad-externa';
import { ResultadosService } from './resultados.service';

@Controller()
export class ResultadosController {
  constructor(private readonly resultados: ResultadosService) {}

  @Get('resultados')
  @UseGuards(IdentidadGuard)
  historial(@IdentidadActual() identidad: IdentidadExterna) {
    return this.resultados.historial(identidad);
  }

  @Get('resultados/:codigo')
  @UseGuards(IdentidadGuard)
  obtener(
    @Param('codigo') codigo: string,
    @IdentidadActual() identidad: IdentidadExterna,
  ) {
    return this.resultados.obtener(codigo, identidad);
  }
}
