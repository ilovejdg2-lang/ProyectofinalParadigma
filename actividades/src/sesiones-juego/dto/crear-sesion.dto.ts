import { Type } from 'class-transformer';
import { IsArray, IsBoolean, IsIn, IsInt, IsNotEmpty, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { TIPOS_MINIJUEGO } from '../minijuegos';

export class CrearSesionDto {
  @IsString()
  @IsNotEmpty({ message: 'Elige un cuestionario.' })
  @MaxLength(80)
  cuestionarioId!: string;

  @IsOptional()
  @IsIn(['practica', 'evaluacion'])
  modo?: 'practica' | 'evaluacion';

  @IsOptional()
  @IsString()
  @MaxLength(80)
  cursoId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  nombreEvaluacion?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(1000)
  notaMaxima?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  valorPorcentaje?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(1000)
  notaMinima?: number;

  @IsOptional()
  @IsIn(['academico', 'competitivo'])
  modalidad?: 'academico' | 'competitivo';

  @IsOptional()
  @IsBoolean()
  minijuegosActivos?: boolean;

  @IsOptional()
  @IsArray()
  @IsIn(TIPOS_MINIJUEGO, { each: true })
  tiposMinijuego?: Array<(typeof TIPOS_MINIJUEGO)[number]>;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(20)
  cadaPreguntas?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(5)
  @Max(20)
  duracionMinijuego?: number;

  @IsOptional()
  @IsBoolean()
  velocidadActiva?: boolean;
}
