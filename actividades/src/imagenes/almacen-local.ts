import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { AlmacenImagenes, ArchivoAlmacen, ArchivoLeido } from './almacen-imagenes';

const tipos: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
};

@Injectable()
export class AlmacenLocal extends AlmacenImagenes {
  constructor(private readonly config: ConfigService) {
    super();
  }

  async subir(archivo: ArchivoAlmacen): Promise<string> {
    const destino = this.resolver(archivo.ruta);
    await mkdir(path.dirname(destino), { recursive: true });
    await writeFile(destino, archivo.contenido);
    return this.urlPublica(this.rutaLimpia(archivo.ruta));
  }

  async retirar(ruta: string): Promise<void> {
    await rm(this.resolver(ruta), { force: true });
  }

  async abrir(ruta: string): Promise<ArchivoLeido | null> {
    const destino = this.resolver(ruta);
    try {
      const contenido = await readFile(destino);
      const tipoMime = tipos[path.extname(destino).toLowerCase()] ?? 'application/octet-stream';
      return { tipoMime, contenido };
    } catch (error) {
      if (esAusente(error)) return null;
      throw error;
    }
  }

  private urlPublica(ruta: string): string {
    const puerto = this.config.get<string>('PORT')?.trim() || '5002';
    const base = (this.config.get<string>('PUBLIC_API_URL')?.trim() || `http://127.0.0.1:${puerto}`).replace(
      /\/$/,
      '',
    );
    return `${base}/archivos/${ruta.split('/').map(encodeURIComponent).join('/')}`;
  }

  private resolver(ruta: string): string {
    const limpia = this.rutaLimpia(ruta);
    const raiz = path.resolve(this.directorio());
    const destino = path.resolve(raiz, limpia);
    const relativo = path.relative(raiz, destino);
    if (relativo.startsWith('..') || path.isAbsolute(relativo)) {
      throw new BadRequestException({ mensaje: 'No se pudo guardar la imagen.' });
    }
    return destino;
  }

  private rutaLimpia(ruta: string): string {
    const normalizada = ruta.replaceAll('\\', '/');
    if (!/^[A-Za-z0-9_./-]+$/.test(normalizada) || normalizada.includes('..')) {
      throw new BadRequestException({ mensaje: 'No se pudo guardar la imagen.' });
    }
    return normalizada;
  }

  private directorio(): string {
    return this.config.get<string>('ALMACEN_IMAGENES_DIR')?.trim() || path.resolve(process.cwd(), 'almacen-imagenes');
  }
}

function esAusente(error: unknown): boolean {
  return Boolean(error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT');
}
