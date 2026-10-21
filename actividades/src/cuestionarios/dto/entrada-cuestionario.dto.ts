import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class OpcionDto {
  @IsOptional()
  @IsString()
  id?: string;

  @IsString()
  @IsNotEmpty({ message: 'Hay una respuesta vacía.' })
  texto!: string;

  @IsBoolean()
  correcta!: boolean;
}

export class PreguntaDto {
  @IsOptional()
  @IsString()
  id?: string;

  @IsString()
  @IsNotEmpty({ message: 'Hay una pregunta sin enunciado.' })
  enunciado!: string;

  @IsBoolean()
  respuestaCorrecta!: boolean;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OpcionDto)
  opciones?: OpcionDto[];

  @IsOptional()
  @IsString()
  imagenUrl?: string;

  @IsInt()
  @Min(1)
  orden!: number;

  @IsOptional()
  @IsInt()
  segundos?: number;
}

export class EntradaCuestionarioDto {
  @IsOptional()
  @IsString()
  id?: string;

  @IsString()
  @IsNotEmpty({ message: 'El título necesita al menos 3 caracteres.' })
  @MaxLength(80, { message: 'El título admite como máximo 80 caracteres.' })
  titulo!: string;

  @IsString()
  @IsNotEmpty({ message: 'La descripción necesita al menos 10 caracteres.' })
  @MaxLength(400, {
    message: 'La descripción admite como máximo 400 caracteres.',
  })
  descripcion!: string;

  @IsString()
  @IsNotEmpty({ message: 'Elige una categoría.' })
  @MaxLength(80, { message: 'La categoría admite como máximo 80 caracteres.' })
  categoria!: string;

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

  @IsIn(['facil', 'medio', 'dificil'], {
    message: 'La dificultad no es válida.',
  })
  dificultad!: 'facil' | 'medio' | 'dificil';

  @IsOptional()
  @IsString()
  imagenUrl?: string;

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
