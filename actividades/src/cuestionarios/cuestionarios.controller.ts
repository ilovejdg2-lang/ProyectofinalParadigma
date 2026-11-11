import {
  Body,
  Controller,
  Delete,
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
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiHeader,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { CuestionariosService } from './cuestionarios.service';
import {
  EntradaCuestionarioDto,
  FiltrosCatalogoDto,
} from './dto/entrada-cuestionario.dto';
import { CuestionarioResponseDto } from './dto/cuestionario-response.dto';

@Controller()
@ApiTags('Cuestionarios')
export class CuestionariosController {
  constructor(private readonly cuestionarios: CuestionariosService) {}

  @Get('cuestionarios')
  @ApiOperation({ summary: 'Listar cuestionarios del catálogo' })
  @ApiQuery({
    name: 'texto',
    required: false,
    type: String,
    description: 'Filtra por texto; máximo 80 caracteres.',
  })
  @ApiQuery({
    name: 'categoria',
    required: false,
    type: String,
    description: 'Filtra por categoría; máximo 80 caracteres.',
  })
  @ApiQuery({
    name: 'dificultad',
    required: false,
    enum: ['facil', 'medio', 'dificil'],
  })
  @ApiQuery({
    name: 'autor',
    required: false,
    type: String,
    description: 'Filtra por autor; máximo 120 caracteres.',
  })
  @ApiOkResponse({
    description: 'Cuestionarios visibles del catálogo.',
    type: CuestionarioResponseDto,
    isArray: true,
  })
  listar(@Query() filtros: FiltrosCatalogoDto) {
    return this.cuestionarios.listar(filtros);
  }

  @Get('mis-cuestionarios')
  @ApiBearerAuth()
  @UseGuards(IdentidadGuard)
  @ApiOperation({ summary: 'Listar los cuestionarios del usuario autenticado' })
  @ApiOkResponse({
    description: 'Cuestionarios propios, con sus respuestas correctas.',
    type: CuestionarioResponseDto,
    isArray: true,
  })
  mios(@IdentidadActual() identidad: IdentidadExterna) {
    return this.cuestionarios.mios(identidad);
  }

  @Get('cuestionarios/:id')
  @ApiOperation({ summary: 'Obtener un cuestionario' })
  @ApiParam({ name: 'id', description: 'Identificador del cuestionario.' })
  @ApiHeader({
    name: 'authorization',
    required: false,
    description:
      'Bearer token opcional; si pertenece al autor, incluye los datos completos.',
  })
  @ApiOkResponse({
    description: 'Cuestionario solicitado.',
    type: CuestionarioResponseDto,
  })
  obtener(
    @Param('id') id: string,
    @Headers('authorization') autorizacion?: string,
  ) {
    return this.cuestionarios.obtener(id, autorizacion);
  }

  @Post('cuestionarios')
  @ApiBearerAuth()
  @UseGuards(IdentidadGuard)
  @ApiOperation({ summary: 'Crear un cuestionario' })
  @ApiCreatedResponse({
    description: 'Cuestionario creado.',
    type: CuestionarioResponseDto,
  })
  crear(
    @Body() entrada: EntradaCuestionarioDto,
    @IdentidadActual() identidad: IdentidadExterna,
  ) {
    return this.cuestionarios.crear(entrada, identidad);
  }

  @Put('cuestionarios/:id')
  @ApiBearerAuth()
  @UseGuards(IdentidadGuard)
  @ApiOperation({
    summary: 'Actualizar un cuestionario propio',
  })
  @ApiParam({ name: 'id', description: 'Identificador del cuestionario.' })
  @ApiOkResponse({
    description: 'Cuestionario actualizado.',
    type: CuestionarioResponseDto,
  })
  actualizar(
    @Param('id') id: string,
    @Body() entrada: EntradaCuestionarioDto,
    @IdentidadActual() identidad: IdentidadExterna,
  ) {
    return this.cuestionarios.actualizar(id, entrada, identidad);
  }

  @Delete('cuestionarios/:id')
  @HttpCode(204)
  @ApiBearerAuth()
  @UseGuards(IdentidadGuard)
  @ApiOperation({
    summary: 'Eliminar un cuestionario propio',
  })
  @ApiParam({ name: 'id', description: 'Identificador del cuestionario.' })
  @ApiNoContentResponse({ description: 'Cuestionario eliminado.' })
  eliminar(
    @Param('id') id: string,
    @IdentidadActual() identidad: IdentidadExterna,
  ) {
    return this.cuestionarios.eliminar(id, identidad);
  }
}
