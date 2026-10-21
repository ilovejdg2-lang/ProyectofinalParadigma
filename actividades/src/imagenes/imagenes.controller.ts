import {
  Controller,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { IdentidadActual } from '../autenticacion/identidad-actual';
import { IdentidadGuard } from '../autenticacion/identidad.guard';
import type { IdentidadExterna } from '../autenticacion/identidad-externa';
import { ImagenesService } from './imagenes.service';
import { ArchivoRecibido, LIMITE_IMAGEN_BYTES } from './validar-archivo';

@Controller()
export class ImagenesController {
  constructor(private readonly imagenes: ImagenesService) {}

  @Post('imagenes')
  @UseGuards(IdentidadGuard)
  @UseInterceptors(
    FileInterceptor('archivo', {
      limits: { fileSize: LIMITE_IMAGEN_BYTES, files: 1 },
    }),
  )
  cargar(
    @UploadedFile() archivo: ArchivoRecibido | undefined,
    @IdentidadActual() identidad: IdentidadExterna,
  ): Promise<{ url: string }> {
    return this.imagenes.guardar(archivo, identidad);
  }
}
