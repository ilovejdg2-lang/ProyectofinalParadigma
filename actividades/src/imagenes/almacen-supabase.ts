import {
  BadGatewayException,
  BadRequestException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AlmacenImagenes, ArchivoAlmacen } from './almacen-imagenes';
import { MENSAJE_TIPO_IMAGEN } from './limites';
import { MENSAJE_TAMANO_IMAGEN } from './validar-archivo';

interface ConfiguracionAlmacen {
  url: string;
  clave: string;
  jwtServicio: string;
  bucket: string;
}

@Injectable()
export class AlmacenSupabase extends AlmacenImagenes {
  constructor(private readonly config: ConfigService) {
    super();
  }

  subir(archivo: ArchivoAlmacen): Promise<string> {
    return subirObjeto(this.leer(), fetch, archivo);
  }

  retirar(ruta: string): Promise<void> {
    return retirarObjeto(this.leer(), fetch, ruta);
  }

  private leer(): ConfiguracionAlmacen {
    const url = this.config.get<string>('SUPABASE_URL')?.trim() ?? '';
    const clave = this.config.get<string>('SUPABASE_SECRET_KEY')?.trim() ?? '';
    const jwtServicio =
      this.config.get<string>('SUPABASE_SERVICE_ROLE_JWT')?.trim() ?? '';
    const bucket =
      this.config.get<string>('SUPABASE_STORAGE_BUCKET')?.trim() ?? '';
    if (
      !url.startsWith('https://') ||
      !clave ||
      !esJwtCompacto(jwtServicio) ||
      !bucket
    ) {
      throw new ServiceUnavailableException({
        mensaje: 'El almacenamiento de imágenes no está disponible.',
      });
    }
    return { url: url.replace(/\/$/, ''), clave, jwtServicio, bucket };
  }
}

export async function subirObjeto(
  origen: ConfiguracionAlmacen,
  solicitar: typeof fetch,
  archivo: ArchivoAlmacen,
): Promise<string> {
  const ruta = rutaSegura(archivo.ruta);
  const respuesta = await pedir(solicitar, destino(origen, ruta), {
    method: 'POST',
    headers: cabeceras(origen, archivo.tipoMime),
    body: new Uint8Array(archivo.contenido),
  });
  if (respuesta.ok) return urlPublica(origen, ruta);
  throw errorDeCarga(respuesta.status);
}

export async function retirarObjeto(
  origen: ConfiguracionAlmacen,
  solicitar: typeof fetch,
  ruta: string,
): Promise<void> {
  const respuesta = await pedir(solicitar, destino(origen, rutaSegura(ruta)), {
    method: 'DELETE',
    headers: cabeceras(origen),
  });
  if (respuesta.ok || respuesta.status === 404) return;
  throw errorDeStorage(respuesta.status);
}

function destino(origen: ConfiguracionAlmacen, ruta: string): string {
  return `${origen.url}/storage/v1/object/${encodeURIComponent(origen.bucket)}/${codificarRuta(ruta)}`;
}

function urlPublica(origen: ConfiguracionAlmacen, ruta: string): string {
  return `${origen.url}/storage/v1/object/public/${encodeURIComponent(origen.bucket)}/${codificarRuta(ruta)}`;
}

function codificarRuta(ruta: string): string {
  return ruta.split('/').map(encodeURIComponent).join('/');
}

function cabeceras(
  origen: ConfiguracionAlmacen,
  tipo?: string,
): Record<string, string> {
  return {
    Authorization: `Bearer ${origen.jwtServicio}`,
    apikey: origen.clave,
    'x-upsert': 'false',
    ...(tipo ? { 'Content-Type': tipo } : {}),
  };
}

export function supabaseConfigurado(config: ConfigService): boolean {
  const url = config.get<string>('SUPABASE_URL')?.trim() ?? '';
  const clave = config.get<string>('SUPABASE_SECRET_KEY')?.trim() ?? '';
  const jwtServicio = config.get<string>('SUPABASE_SERVICE_ROLE_JWT')?.trim() ?? '';
  const bucket = config.get<string>('SUPABASE_STORAGE_BUCKET')?.trim() ?? '';
  return url.startsWith('https://') && Boolean(clave) && esJwtCompacto(jwtServicio) && Boolean(bucket);
}

function esJwtCompacto(valor: string): boolean {
  const segmentos = valor.split('.');
  return segmentos.length === 3 && segmentos.every((segmento) => segmento);
}

function rutaSegura(ruta: string): string {
  if (!/^[A-Za-z0-9_./-]+$/.test(ruta) || ruta.includes('..')) {
    throw new BadRequestException({ mensaje: 'No se pudo guardar la imagen.' });
  }
  return ruta;
}

async function pedir(
  solicitar: typeof fetch,
  url: string,
  init: RequestInit,
): Promise<Response> {
  try {
    return await solicitar(url, {
      ...init,
      signal: AbortSignal.timeout(20000),
    });
  } catch {
    throw new ServiceUnavailableException({
      mensaje: 'No se pudo guardar la imagen.',
    });
  }
}

function errorDeCarga(estado: number): Error {
  if (estado === 400 || estado === 415) {
    return new BadGatewayException({
      mensaje: `El almacenamiento rechazó la carga de la imagen (HTTP ${estado}).`,
    });
  }
  return errorDeStorage(estado);
}

function errorDeStorage(estado: number): Error {
  if (estado === 413) {
    return new BadRequestException({ mensaje: MENSAJE_TAMANO_IMAGEN });
  }
  if (estado === 400 || estado === 415) {
    return new BadRequestException({ mensaje: MENSAJE_TIPO_IMAGEN });
  }
  return new ServiceUnavailableException({
    mensaje: 'No se pudo guardar la imagen.',
  });
}
