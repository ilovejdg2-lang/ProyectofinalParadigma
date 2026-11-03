import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { OpcionPreguntaReutilizableDto } from './pregunta-reutilizable.dto';

export class PreguntaKanbanDto {
  @ApiProperty({ description: 'Identificador de la pregunta.' })
  id!: string;

  @ApiProperty({ description: 'Posición de la pregunta en el cuestionario.' })
  orden!: number;

  @ApiProperty({ description: 'Enunciado de la pregunta.' })
  enunciado!: string;

  @ApiProperty({ description: 'Subtema de la pregunta.' })
  subtema!: string;

  @ApiProperty({ enum: ['facil', 'medio', 'dificil'] })
  dificultad!: 'facil' | 'medio' | 'dificil';

  @ApiProperty({ enum: ['en-vivo', 'practica', 'evaluacion', 'desafio'] })
  modoRecomendado!: 'en-vivo' | 'practica' | 'evaluacion' | 'desafio';

  @ApiProperty({ description: 'Duración recomendada en segundos.' })
  segundos!: number;

  @ApiPropertyOptional({ description: 'Explicación de la pregunta, cuando existe.' })
  explicacion?: string;

  @ApiProperty({
    type: () => [OpcionPreguntaReutilizableDto],
    description: 'Opciones disponibles para responder.',
  })
  opciones!: OpcionPreguntaReutilizableDto[];
}

export class CuestionarioKanbanDto {
  @ApiProperty({ description: 'Identificador del cuestionario.' })
  id!: string;

  @ApiProperty({ description: 'Título del cuestionario.' })
  titulo!: string;

  @ApiProperty({ description: 'Descripción del cuestionario.' })
  descripcion!: string;

  @ApiProperty({ description: 'Categoría del cuestionario.' })
  categoria!: string;

  @ApiProperty({ enum: ['facil', 'medio', 'dificil'] })
  dificultad!: 'facil' | 'medio' | 'dificil';

  @ApiProperty({ enum: ['en-vivo', 'practica', 'evaluacion', 'desafio'] })
  modo!: 'en-vivo' | 'practica' | 'evaluacion' | 'desafio';

  @ApiProperty({ type: [String], description: 'Etiquetas del cuestionario.' })
  etiquetas!: string[];

  @ApiProperty({ description: 'URL de la imagen del cuestionario.' })
  imagenUrl!: string;

  @ApiProperty({ description: 'Cantidad de preguntas del cuestionario.' })
  totalPreguntas!: number;

  @ApiProperty({ type: () => [PreguntaKanbanDto] })
  preguntas!: PreguntaKanbanDto[];
}

export class BancoKanbanDto {
  @ApiProperty({ description: 'Tema general del banco Kanban.' })
  tema!: string;

  @ApiProperty({ description: 'Cantidad de cuestionarios Kanban.' })
  totalCuestionarios!: number;

  @ApiProperty({ description: 'Cantidad total de preguntas Kanban.' })
  totalPreguntas!: number;

  @ApiProperty({ type: [String], description: 'Subtemas encontrados en el banco.' })
  subtemas!: string[];

  @ApiProperty({ type: () => [CuestionarioKanbanDto] })
  cuestionarios!: CuestionarioKanbanDto[];
}
