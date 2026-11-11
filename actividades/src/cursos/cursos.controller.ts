import { Body, Controller, Get, Header, Param, Post, Res, UseGuards } from '@nestjs/common';
import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';
import type { Response } from 'express';
import { IdentidadActual } from '../autenticacion/identidad-actual';
import { IdentidadGuard } from '../autenticacion/identidad.guard';
import type { IdentidadExterna } from '../autenticacion/identidad-externa';
import { CursosService } from './cursos.service';

class CrearCursoDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(80)
  nombre!: string;
}

class MatricularDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  estudianteId!: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(80)
  nombre!: string;
}

@Controller()
@UseGuards(IdentidadGuard)
export class CursosController {
  constructor(private readonly cursos: CursosService) {}

  @Get('cursos')
  listar(@IdentidadActual() identidad: IdentidadExterna) {
    return this.cursos.listar(identidad);
  }

  @Post('cursos')
  crear(@Body() entrada: CrearCursoDto, @IdentidadActual() identidad: IdentidadExterna) {
    return this.cursos.crear(identidad, entrada.nombre);
  }

  @Get('cursos/:id/matriculas')
  matriculas(@Param('id') id: string, @IdentidadActual() identidad: IdentidadExterna) {
    return this.cursos.matriculas(identidad, id);
  }

  @Post('cursos/predeterminado')
  entrarPredeterminado(@IdentidadActual() identidad: IdentidadExterna) {
    return this.cursos.entrarPredeterminado(identidad);
  }

  @Get('cursos/:id/evaluaciones')
  evaluaciones(@Param('id') id: string, @IdentidadActual() identidad: IdentidadExterna) {
    return this.cursos.evaluaciones(identidad, id);
  }

  @Post('cursos/:id/matriculas')
  matricular(
    @Param('id') id: string,
    @Body() entrada: MatricularDto,
    @IdentidadActual() identidad: IdentidadExterna,
  ) {
    return this.cursos.matricular(identidad, id, entrada.estudianteId, entrada.nombre);
  }

  @Get('evaluaciones/:codigo')
  detalle(@Param('codigo') codigo: string, @IdentidadActual() identidad: IdentidadExterna) {
    return this.cursos.detalle(identidad, codigo);
  }

  @Get('evaluaciones/:codigo/csv')
  @Header('Content-Type', 'text/csv; charset=utf-8')
  async csv(
    @Param('codigo') codigo: string,
    @IdentidadActual() identidad: IdentidadExterna,
    @Res() respuesta: Response,
  ) {
    const texto = await this.cursos.csv(identidad, codigo);
    respuesta.setHeader('Content-Disposition', `attachment; filename="evaluacion-${codigo}.csv"`);
    respuesta.send(texto);
  }
}
