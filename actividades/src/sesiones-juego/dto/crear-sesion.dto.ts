import { Type } from 'class-transformer';
import { IsIn, IsInt, IsNotEmpty, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

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
}
