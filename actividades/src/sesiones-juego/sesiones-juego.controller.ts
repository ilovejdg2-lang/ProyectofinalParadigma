import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { IdentidadActual } from '../autenticacion/identidad-actual';
import { IdentidadGuard } from '../autenticacion/identidad.guard';
import type { IdentidadExterna } from '../autenticacion/identidad-externa';
import { CrearSesionDto } from './dto/crear-sesion.dto';
import { ResponderDto } from './dto/responder.dto';
import { SesionesJuegoService } from './sesiones-juego.service';

@Controller()
export class SesionesJuegoController {
  constructor(private readonly sesiones: SesionesJuegoService) {}

  @Post('sesiones-juego')
  @UseGuards(IdentidadGuard)
  crear(
    @Body() entrada: CrearSesionDto,
    @IdentidadActual() identidad: IdentidadExterna,
  ) {
    return this.sesiones.crear(entrada.cuestionarioId, identidad);
  }

  @Get('sesiones-juego/:codigo')
  @UseGuards(IdentidadGuard)
  obtener(
    @Param('codigo') codigo: string,
    @IdentidadActual() identidad: IdentidadExterna,
  ) {
    return this.sesiones.obtener(codigo, identidad);
  }

  @Post('sesiones-juego/:codigo/participantes')
  @UseGuards(IdentidadGuard)
  unirse(
    @Param('codigo') codigo: string,
    @IdentidadActual() identidad: IdentidadExterna,
  ) {
    return this.sesiones.unirse(codigo, identidad);
  }

  @Post('sesiones-juego/:codigo/iniciar')
  @UseGuards(IdentidadGuard)
  iniciar(
    @Param('codigo') codigo: string,
    @IdentidadActual() identidad: IdentidadExterna,
  ) {
    return this.sesiones.iniciar(codigo, identidad);
  }

  @Post('sesiones-juego/:codigo/respuestas')
  @UseGuards(IdentidadGuard)
  responder(
    @Param('codigo') codigo: string,
    @Body() entrada: ResponderDto,
    @IdentidadActual() identidad: IdentidadExterna,
  ) {
    return this.sesiones.responder(codigo, identidad, entrada);
  }

  @Post('sesiones-juego/:codigo/cerrar')
  @UseGuards(IdentidadGuard)
  cerrar(
    @Param('codigo') codigo: string,
    @IdentidadActual() identidad: IdentidadExterna,
  ) {
    return this.sesiones.cerrar(codigo, identidad);
  }

  @Post('sesiones-juego/:codigo/avanzar')
  @UseGuards(IdentidadGuard)
  avanzar(
    @Param('codigo') codigo: string,
    @IdentidadActual() identidad: IdentidadExterna,
  ) {
    return this.sesiones.avanzar(codigo, identidad);
  }
}
