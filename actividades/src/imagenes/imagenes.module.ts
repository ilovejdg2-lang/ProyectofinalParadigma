import { Module } from '@nestjs/common';
import { AlmacenImagenes } from './almacen-imagenes';
import { AlmacenSupabase } from './almacen-supabase';
import { ImagenesController } from './imagenes.controller';
import { ImagenesService } from './imagenes.service';

@Module({
  controllers: [ImagenesController],
  providers: [
    ImagenesService,
    { provide: AlmacenImagenes, useClass: AlmacenSupabase },
  ],
  exports: [ImagenesService],
})
export class ImagenesModule {}
