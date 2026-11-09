import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class OpcionCuestionarioResponseDto {
  @ApiProperty({ description: 'Identificador de la opción.' })
  id!: string;

  @ApiProperty({ description: 'Texto visible de la opción.' })
  texto!: string;

  @ApiPropertyOptional({
    description:
      'Indica si la opción es correcta; solo se incluye en la vista completa.',
  })
  correcta?: boolean;
}

export class PreguntaCuestionarioResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  enunciado!: string;

  @ApiProperty({ minimum: 1 })
  orden!: number;

  @ApiPropertyOptional()
  imagenUrl?: string;

  @ApiPropertyOptional({
    description: 'Respuesta correcta; solo se incluye en la vista completa.',
  })
  respuestaCorrecta?: boolean;

  @ApiProperty({ type: () => OpcionCuestionarioResponseDto, isArray: true })
  opciones!: OpcionCuestionarioResponseDto[];
}

export class CuestionarioResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  titulo!: string;

  @ApiProperty()
  descripcion!: string;

  @ApiProperty()
  categoria!: string;

  @ApiProperty({ type: String, isArray: true })
  etiquetas!: string[];

  @ApiProperty({ enum: ['facil', 'medio', 'dificil'] })
  dificultad!: 'facil' | 'medio' | 'dificil';

  @ApiProperty()
  autorId!: string;

  @ApiProperty()
  autorNombre!: string;

  @ApiProperty({ type: () => PreguntaCuestionarioResponseDto, isArray: true })
  preguntas!: PreguntaCuestionarioResponseDto[];

  @ApiPropertyOptional()
  imagenUrl?: string;

  @ApiProperty()
  esDemostracion!: boolean;

  @ApiProperty({ format: 'date-time' })
  actualizadoEn!: string;
}
