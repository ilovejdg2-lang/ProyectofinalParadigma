import { ApiProperty } from '@nestjs/swagger';

export class CuestionarioModoDto {
  @ApiProperty({ description: 'Identificador del cuestionario.' })
  id!: string;

  @ApiProperty({ description: 'Título del cuestionario.' })
  titulo!: string;

  @ApiProperty({ description: 'Categoría del cuestionario.' })
  categoria!: string;

  @ApiProperty({ enum: ['facil', 'medio', 'dificil'] })
  dificultad!: 'facil' | 'medio' | 'dificil';

  @ApiProperty({ description: 'Cantidad de preguntas del cuestionario.' })
  totalPreguntas!: number;
}

export class SesionDemostracionDto {
  @ApiProperty({ description: 'Código de la sesión de demostración.' })
  codigo!: string;

  @ApiProperty({ description: 'Título de la sesión.' })
  titulo!: string;

  @ApiProperty({ enum: ['en-vivo', 'practica', 'evaluacion', 'desafio'] })
  modo!: 'en-vivo' | 'practica' | 'evaluacion' | 'desafio';

  @ApiProperty({ description: 'Cantidad actual de participantes.' })
  participantes!: number;
}

export class ModoDemostracionDto {
  @ApiProperty({ enum: ['en-vivo', 'practica', 'evaluacion', 'desafio'] })
  id!: 'en-vivo' | 'practica' | 'evaluacion' | 'desafio';

  @ApiProperty({ description: 'Nombre visible del modo de juego.' })
  nombre!: string;

  @ApiProperty({ description: 'Descripción del modo de juego.' })
  descripcion!: string;

  @ApiProperty({ description: 'Duración por pregunta en segundos.' })
  segundosPorPregunta!: number;

  @ApiProperty({ description: 'Indica si el modo permite jugar individualmente.' })
  permiteIndividual!: boolean;

  @ApiProperty({ description: 'Indica si se muestra explicación inmediatamente.' })
  mostrarExplicacionInmediata!: boolean;

  @ApiProperty({ type: () => [CuestionarioModoDto] })
  cuestionarios!: CuestionarioModoDto[];

  @ApiProperty({ type: () => [SesionDemostracionDto] })
  sesionesDemostracion!: SesionDemostracionDto[];
}
