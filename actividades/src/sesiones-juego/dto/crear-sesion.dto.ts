import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CrearSesionDto {
  @IsString()
  @IsNotEmpty({ message: 'Elige un cuestionario.' })
  @MaxLength(80)
  cuestionarioId!: string;
}
