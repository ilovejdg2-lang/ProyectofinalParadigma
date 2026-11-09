import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class OpcionPreguntaReutilizableDto {
  @ApiProperty({ description: 'Identificador de la opción.', example: 'opcion-1' })
  id!: string;

  @ApiProperty({ description: 'Texto visible de la opción.', example: 'Ejemplo de respuesta' })
  texto!: string;

  @ApiProperty({ description: 'Posición de la opción en la pregunta.', example: 1 })
  orden!: number;
}

export class PreguntaReutilizableDto {
  @ApiProperty({ description: 'Identificador de la pregunta.', example: 'pregunta-1' })
  id!: string;

  @ApiProperty({ description: 'Identificador del cuestionario de origen.', example: 'demo-funcional' })
  cuestionarioId!: string;

  @ApiProperty({ description: 'Título del cuestionario de origen.', example: 'Paradigma funcional' })
  cuestionarioTitulo!: string;

  @ApiProperty({ description: 'Enunciado de la pregunta.' })
  enunciado!: string;

  @ApiProperty({ description: 'Posición de la pregunta en el cuestionario.', example: 1 })
  orden!: number;

  @ApiProperty({ description: 'Categoría temática de la pregunta.', example: 'Paradigmas' })
  categoria!: string;

  @ApiProperty({ description: 'Subtema de la pregunta.', example: 'Programación funcional' })
  subtema!: string;

  @ApiProperty({
    description: 'Nivel de dificultad de la pregunta.',
    enum: ['facil', 'medio', 'dificil'],
    example: 'facil',
  })
  dificultad!: 'facil' | 'medio' | 'dificil';

  @ApiProperty({
    description: 'Modo de juego recomendado para la pregunta.',
    enum: ['en-vivo', 'practica', 'evaluacion', 'desafio'],
    example: 'practica',
  })
  modoRecomendado!: 'en-vivo' | 'practica' | 'evaluacion' | 'desafio';

  @ApiProperty({ description: 'Duración recomendada en segundos.', example: 20 })
  segundos!: number;

  @ApiPropertyOptional({ description: 'Explicación de la respuesta, cuando existe.' })
  explicacion?: string;

  @ApiPropertyOptional({ description: 'URL de la imagen asociada, cuando existe.' })
  imagenUrl?: string;

  @ApiProperty({
    description: 'Opciones disponibles para responder la pregunta.',
    type: () => [OpcionPreguntaReutilizableDto],
  })
  opciones!: OpcionPreguntaReutilizableDto[];
}
