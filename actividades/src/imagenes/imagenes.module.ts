import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AlmacenImagenes } from './almacen-imagenes';
import { AlmacenLocal } from './almacen-local';
import { AlmacenSupabase, supabaseConfigurado } from './almacen-supabase';
import { ImagenesController } from './imagenes.controller';
import { ImagenesService } from './imagenes.service';

@Module({
  controllers: [ImagenesController],
  providers: [
    ImagenesService,
    {
      provide: AlmacenImagenes,
      useFactory: (config: ConfigService) =>
        supabaseConfigurado(config) ? new AlmacenSupabase(config) : new AlmacenLocal(config),
      inject: [ConfigService],
    },
  ],
  exports: [ImagenesService],
})
export class ImagenesModule {}
