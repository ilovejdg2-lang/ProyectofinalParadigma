import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Headers,
  HttpCode,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { IdentidadActual } from '../autenticacion/identidad-actual';
import { IdentidadGuard } from '../autenticacion/identidad.guard';
import type { IdentidadExterna } from '../autenticacion/identidad-externa';
import { CuestionariosService } from './cuestionarios.service';
import {
  EntradaCuestionarioDto,
  FiltrosCatalogoDto,
} from './dto/entrada-cuestionario.dto';

function exigirDocente(identidad: IdentidadExterna) {
  if (identidad.role && identidad.role !== 'teacher' && identidad.role !== 'admin') {
    throw new ForbiddenException({
      mensaje: 'Solo los docentes pueden gestionar cuestionarios.',
    });
  }
}

@Controller()
export class CuestionariosController {
  constructor(private readonly cuestionarios: CuestionariosService) {}

  @Get('cuestionarios')
  listar(@Query() filtros: FiltrosCatalogoDto) {
    return this.cuestionarios.listar(filtros);
  }

  @Get('mis-cuestionarios')
  @UseGuards(IdentidadGuard)
  mios(@IdentidadActual() identidad: IdentidadExterna) {
    return this.cuestionarios.mios(identidad);
  }

  @Get('cuestionarios/:id')
  obtener(
    @Param('id') id: string,
    @Headers('authorization') autorizacion?: string,
  ) {
    return this.cuestionarios.obtener(id, autorizacion);
  }

  @Post('cuestionarios')
  @UseGuards(IdentidadGuard)
  crear(
    @Body() entrada: EntradaCuestionarioDto,
    @IdentidadActual() identidad: IdentidadExterna,
  ) {
    exigirDocente(identidad);
    return this.cuestionarios.crear(entrada, identidad);
  }

  @Put('cuestionarios/:id')
  @UseGuards(IdentidadGuard)
  actualizar(
    @Param('id') id: string,
    @Body() entrada: EntradaCuestionarioDto,
    @IdentidadActual() identidad: IdentidadExterna,
  ) {
    exigirDocente(identidad);
    return this.cuestionarios.actualizar(id, entrada, identidad);
  }

  @Delete('cuestionarios/:id')
  @HttpCode(204)
  @UseGuards(IdentidadGuard)
  eliminar(
    @Param('id') id: string,
    @IdentidadActual() identidad: IdentidadExterna,
  ) {
    exigirDocente(identidad);
    return this.cuestionarios.eliminar(id, identidad);
  }
}
