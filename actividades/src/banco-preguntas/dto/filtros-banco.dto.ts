import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export class FiltrosBancoDto {
  @IsOptional()
  @IsString()
  @MaxLength(80)
  categoria?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  subtema?: string;

  @IsOptional()
  @IsIn(['facil', 'medio', 'dificil'], {
    message: 'La dificultad no es válida.',
  })
  dificultad?: 'facil' | 'medio' | 'dificil';

  @IsOptional()
  @IsIn(['en-vivo', 'practica', 'evaluacion', 'desafio'], {
    message: 'El modo de juego no es válido.',
  })
  modo?: 'en-vivo' | 'practica' | 'evaluacion' | 'desafio';

  @IsOptional()
  @IsString()
  @MaxLength(80)
  texto?: string;
}

