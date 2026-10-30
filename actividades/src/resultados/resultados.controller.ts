import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { IdentidadActual } from '../autenticacion/identidad-actual';
import { IdentidadGuard } from '../autenticacion/identidad.guard';
import type { IdentidadExterna } from '../autenticacion/identidad-externa';
import { GuardarPartidaDto } from './dto/guardar-partida.dto';
import { ResultadosService } from './resultados.service';

@Controller()
export class ResultadosController {
  constructor(private readonly resultados: ResultadosService) { }

  @Get('resultados')
  @UseGuards(IdentidadGuard)
  historial(@IdentidadActual() identidad: IdentidadExterna) {
    return this.resultados.historial(identidad);
  }

  @Get(['resultados/progreso', 'progreso'])
  @UseGuards(IdentidadGuard)
  progreso(@IdentidadActual() identidad: IdentidadExterna) {
    return this.resultados.progreso(identidad);
  }

  @Post(['resultados/partidas', 'partidas'])
  @UseGuards(IdentidadGuard)
  guardarPartida(
    @Body() entrada: GuardarPartidaDto,
    @IdentidadActual() identidad: IdentidadExterna,
  ) {
    return this.resultados.guardarPartida(entrada, identidad);
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
