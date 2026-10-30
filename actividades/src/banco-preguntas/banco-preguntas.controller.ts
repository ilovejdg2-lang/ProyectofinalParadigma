import { Controller, Get, Query } from '@nestjs/common';
import { BancoPreguntasService } from './banco-preguntas.service';
import { FiltrosBancoDto } from './dto/filtros-banco.dto';

@Controller('banco-preguntas')
export class BancoPreguntasController {
  constructor(private readonly banco: BancoPreguntasService) {}

  @Get()
  listar(@Query() filtros: FiltrosBancoDto) {
    return this.banco.listarPreguntas(filtros);
  }

  @Get('kanban')
  kanban() {
    return this.banco.obtenerBancoKanban();
  }

  @Get('modos')
  modos() {
    return this.banco.obtenerModosDemostracion();
  }
}

