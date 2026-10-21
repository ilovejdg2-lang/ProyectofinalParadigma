import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';

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

function nombreDe(url: string): string {
  const segmento = url.split('/').pop() ?? 'imagen';
  const limpio = segmento.split('?')[0] || 'imagen';
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
