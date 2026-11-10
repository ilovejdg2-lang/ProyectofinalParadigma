import { IsIn, IsOptional } from 'class-validator';

export class AvanzarDto {
  @IsOptional()
  @IsIn(['cerrada', 'clasificacion'])
  desde?: 'cerrada' | 'clasificacion';
}
