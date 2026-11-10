import {
  Controller,
  Get,
  Param,
  Post,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { IdentidadActual } from '../autenticacion/identidad-actual';
import { IdentidadGuard } from '../autenticacion/identidad.guard';
import type { IdentidadExterna } from '../autenticacion/identidad-externa';
import { AlmacenImagenes } from './almacen-imagenes';
import { ImagenesService } from './imagenes.service';
import { ArchivoRecibido, LIMITE_IMAGEN_BYTES } from './validar-archivo';

@Controller()
export class ImagenesController {
  constructor(
    private readonly imagenes: ImagenesService,
    private readonly almacen: AlmacenImagenes,
  ) {}

  @Get('archivos/:autor/:archivo')
  async abrir(
    @Param('autor') autor: string,
    @Param('archivo') archivo: string,
    @Res() respuesta: Response,
  ): Promise<void> {
    const leido = await this.almacen.abrir(`${autor}/${archivo}`);
    if (!leido) {
      respuesta.status(404).json({ mensaje: 'No se encontró la imagen.' });
      return;
    }
    respuesta.setHeader('Content-Type', leido.tipoMime);
    respuesta.setHeader('Cache-Control', 'public, max-age=86400');
    respuesta.setHeader('X-Content-Type-Options', 'nosniff');
    respuesta.send(leido.contenido);
  }

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
