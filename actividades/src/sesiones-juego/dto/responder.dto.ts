import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

export class ResponderDto {
  @IsOptional()
  @IsBoolean()
  valor?: boolean | null;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  opcionId?: string;
}
