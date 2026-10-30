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

export class RespuestaPartidaDto {
  @IsString()
  @IsNotEmpty({ message: 'Cada respuesta debe indicar la pregunta.' })
  @MaxLength(80)
  preguntaId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  opcionId?: string;

  @IsOptional()
  @IsBoolean()
  valor?: boolean | null;

  @IsOptional()
  @IsBoolean()
  tardia?: boolean;
}

export class GuardarPartidaDto {
  @IsOptional()
  @IsString()
  @MaxLength(12)
  codigo?: string;

  @IsString()
  @IsNotEmpty({ message: 'Elige un cuestionario para guardar la partida.' })
  @MaxLength(80)
  cuestionarioId!: string;

  @IsOptional()
  @IsIn(['en-vivo', 'practica', 'evaluacion', 'desafio'], {
    message: 'El modo de juego no es válido.',
  })
  modo?: 'en-vivo' | 'practica' | 'evaluacion' | 'desafio';

  @IsArray({ message: 'Las respuestas deben enviarse como una lista.' })
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => RespuestaPartidaDto)
  respuestas!: RespuestaPartidaDto[];

  @IsOptional()
  @IsInt()
  @Min(0)
  puntuacionReportada?: number;
}

