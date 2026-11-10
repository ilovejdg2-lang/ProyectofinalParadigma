import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class OpcionDto {
  @ApiPropertyOptional()
  @IsOptional()
  @ApiProperty()
  @IsString()
  id?: string;

  @ApiProperty({ description: 'Texto de la opción de respuesta.' })
  @IsString()
  @IsNotEmpty({ message: 'Hay una respuesta vacía.' })
  texto!: string;

  @ApiProperty()
  @IsBoolean()
  correcta!: boolean;
}

export class PreguntaDto {
  @ApiPropertyOptional()
  @IsOptional()
  @ApiProperty()
  @IsString()
  id?: string;

  @ApiProperty({ description: 'Enunciado de la pregunta.' })
  @IsString()
  @IsNotEmpty({ message: 'Hay una pregunta sin enunciado.' })
  enunciado!: string;

  @ApiProperty()
  @IsBoolean()
  respuestaCorrecta!: boolean;

  @ApiPropertyOptional({ type: () => OpcionDto, isArray: true })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OpcionDto)
  opciones?: OpcionDto[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  imagenUrl?: string;

  @ApiProperty({ minimum: 1 })
  @IsInt()
  @Min(1)
  orden!: number;

  @ApiPropertyOptional({ minimum: 5, maximum: 120 })
  @IsOptional()
  @IsInt()
  @Min(5)
  @Max(120)
  segundos?: number;
}

export class EntradaCuestionarioDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  id?: string;

  @ApiProperty({ maxLength: 80, minLength: 3 })
  @IsString()
  @MinLength(3, { message: 'El título necesita al menos 3 caracteres.' })
  @MaxLength(80, { message: 'El título admite como máximo 80 caracteres.' })
  titulo!: string;

  @ApiProperty({ maxLength: 400 })
  @IsString()
  @IsNotEmpty({ message: 'La descripción necesita al menos 10 caracteres.' })
  @MaxLength(400, {
    message: 'La descripción admite como máximo 400 caracteres.',
  })
  descripcion!: string;

  @ApiProperty({ maxLength: 80, description: 'Categoría del cuestionario.' })
  @IsString()
  @IsNotEmpty({ message: 'Elige una categoría.' })
  @MaxLength(80, { message: 'La categoría admite como máximo 80 caracteres.' })
  categoria!: string;

  @ApiProperty({ type: String, isArray: true, maxItems: 20 })
  @IsArray()
  @ArrayMaxSize(20, {
    message: 'El cuestionario admite como máximo 20 etiquetas.',
  })
  @IsString({ each: true })
  @MaxLength(40, {
    each: true,
    message: 'Una etiqueta admite como máximo 40 caracteres.',
  })
  etiquetas!: string[];

  @ApiProperty({ enum: ['facil', 'medio', 'dificil'] })
  @IsIn(['facil', 'medio', 'dificil'], {
    message: 'La dificultad no es válida.',
  })
  dificultad!: 'facil' | 'medio' | 'dificil';

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  imagenUrl?: string;

  @ApiProperty({ type: () => PreguntaDto, isArray: true })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PreguntaDto)
  preguntas!: PreguntaDto[];
}

export class FiltrosCatalogoDto {
  @IsOptional()
  @IsString()
  @MaxLength(80)
  texto?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  categoria?: string;

  @IsOptional()
  @IsIn(['facil', 'medio', 'dificil'], {
    message: 'La dificultad no es válida.',
  })
  dificultad?: 'facil' | 'medio' | 'dificil';

  @IsOptional()
  @IsString()
  @MaxLength(120)
  autor?: string;
}
