import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { IdentidadExterna } from '../autenticacion/identidad-externa';
import { PrismaService } from '../prisma/prisma.service';
import { AlmacenImagenes } from './almacen-imagenes';
import { ArchivoRecibido, prepararImagen } from './validar-archivo';

interface ImagenTx {
  imagen: {
    findFirst(args: { where: { url: string } }): Promise<{ id: string } | null>;
    create(args: {
      data: {
        id: string;
        nombreArchivo: string;
        url: string;
        tipoMime: string;
        tamanoBytes: number;
      };
    }): Promise<{ id: string }>;
  };
}

@Injectable()
export class ImagenesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly almacen: AlmacenImagenes,
  ) {}

  async guardar(
    archivo: ArchivoRecibido | undefined,
    identidad: IdentidadExterna,
  ): Promise<{ url: string }> {
    const leida = await prepararImagen(archivo);
    if (!this.prisma.estaListo()) {
      throw new ServiceUnavailableException({
        mensaje: 'La base de datos no está disponible.',
      });
    }
    const id = randomUUID();
    const ruta = `${segmento(identidad.id)}/${id}.${leida.extension}`;
    const url = await this.almacen.subir({
      ruta,
      tipoMime: leida.tipoMime,
      contenido: leida.contenido,
    });
    try {
      await this.prisma.obtener().imagen.create({
        data: {
          id,
          nombreArchivo: leida.nombreArchivo,
          url,
          tipoMime: leida.tipoMime,
          tamanoBytes: leida.contenido.length,
        },
      });
    } catch (error) {
      await this.almacen.retirar(ruta).catch(() => undefined);
      throw error;
    }
    return { url };
  }

  async asegurar(tx: ImagenTx, url?: string | null): Promise<string | null> {
    const limpia = url?.trim();
    if (!limpia) return null;
    const existente = await tx.imagen.findFirst({ where: { url: limpia } });
    if (existente) return existente.id;
    const creada = await tx.imagen.create({
      data: {
        id: randomUUID(),
        nombreArchivo: nombreDe(limpia),
        url: limpia,
        tipoMime: tipoDe(limpia),
        tamanoBytes: 0,
      },
    });
    return creada.id;
  }
}

function segmento(id: string): string {
  const limpio = id.replace(/[^A-Za-z0-9_-]/g, '').slice(0, 80);
  return limpio || 'autor';
}

function nombreDe(url: string): string {
  const segmentoUrl = url.split('/').pop() ?? 'imagen';
  const limpio = segmentoUrl.split('?')[0] || 'imagen';
  return limpio.slice(0, 120);
}

function tipoDe(url: string): string {
  const base = url.split('?')[0].toLowerCase();
  if (base.endsWith('.svg')) return 'image/svg+xml';
  if (base.endsWith('.png')) return 'image/png';
  if (base.endsWith('.webp')) return 'image/webp';
  if (base.endsWith('.gif')) return 'image/gif';
  if (base.endsWith('.jpg') || base.endsWith('.jpeg')) return 'image/jpeg';
  return 'application/octet-stream';
}
