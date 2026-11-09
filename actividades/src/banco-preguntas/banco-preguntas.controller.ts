import { Controller, Get, Query } from '@nestjs/common';
import { BancoPreguntasService } from './banco-preguntas.service';
import { FiltrosBancoDto } from './dto/filtros-banco.dto';
import { BancoKanbanDto } from './dto/banco-kanban.dto';
import { ModoDemostracionDto } from './dto/modo-demostracion.dto';
import { PreguntaReutilizableDto } from './dto/pregunta-reutilizable.dto';

import {
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';

@ApiTags('Banco de Preguntas')
@Controller('banco-preguntas')
export class BancoPreguntasController {
  constructor(private readonly banco: BancoPreguntasService) {}

  @Get()
  @ApiOperation({
    summary: 'Listar preguntas del banco',
    description:
      'Permite filtrar por categoría, subtema, dificultad, modo de juego y texto.',
  })
  @ApiQuery({
    name: 'categoria',
    required: false,
    type: String,
    description: 'Filtra por categoría. Máximo 80 caracteres.',
  })
  @ApiQuery({
    name: 'subtema',
    required: false,
    type: String,
    description: 'Filtra por subtema. Máximo 80 caracteres.',
  })
  @ApiQuery({
    name: 'dificultad',
    required: false,
    enum: ['facil', 'medio', 'dificil'],
  })
  @ApiQuery({
    name: 'modo',
    required: false,
    enum: ['en-vivo', 'practica', 'evaluacion', 'desafio'],
  })
  @ApiQuery({
    name: 'texto',
    required: false,
    type: String,
    description: 'Filtra por texto. Máximo 80 caracteres.',
  })
  @ApiOkResponse({
    description: 'Lista de preguntas reutilizables del banco.',
    type: PreguntaReutilizableDto,
    isArray: true,
  })
  listar(@Query() filtros: FiltrosBancoDto) {
    return this.banco.listarPreguntas(filtros);
  }

  @Get('kanban')
  @ApiOperation({
    summary: 'Obtener el banco Kanban',
    description: 'Incluye cuestionarios, preguntas, opciones y subtemas de Kanban.',
  })
  @ApiOkResponse({
    description: 'Resumen del banco de preguntas de Kanban.',
    type: BancoKanbanDto,
  })
  kanban() {
    return this.banco.obtenerBancoKanban();
  }

  @Get('modos')
  @ApiOperation({
    summary: 'Listar modos de demostración',
    description: 'Incluye los modos de juego y sus cuestionarios y sesiones disponibles.',
  })
  @ApiOkResponse({
    description: 'Modos de juego y recursos de demostración disponibles.',
    type: ModoDemostracionDto,
    isArray: true,
  })
  modos() {
    return this.banco.obtenerModosDemostracion();
  }
}
