import { BadRequestException } from '@nestjs/common';
import { convertirSvg } from './convertir-svg';
import {
  LIMITE_IMAGEN_BYTES,
  MENSAJE_TAMANO_IMAGEN,
  MENSAJE_TIPO_IMAGEN,
} from './limites';

export { LIMITE_IMAGEN_BYTES, MENSAJE_TAMANO_IMAGEN, MENSAJE_TIPO_IMAGEN };

export interface ArchivoRecibido {
  originalname?: string;
  mimetype?: string;
  buffer?: Buffer;
}

export interface ImagenLeida {
  contenido: Buffer;
  tipoMime: 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif';
  extension: 'jpg' | 'png' | 'webp' | 'gif';
  nombreArchivo: string;
}

const FIRMAS: Record<
  ImagenLeida['tipoMime'],
  {
    extension: ImagenLeida['extension'];
    coincide: (contenido: Buffer) => boolean;
  }
> = {
  'image/jpeg': {
    extension: 'jpg',
    coincide: (contenido) =>
      contenido.length >= 3 &&
      contenido[0] === 0xff &&
      contenido[1] === 0xd8 &&
      contenido[2] === 0xff,
  },
  'image/png': {
    extension: 'png',
    coincide: (contenido) =>
      contenido.length >= 8 &&
      contenido
        .subarray(0, 8)
        .equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
  },
  'image/gif': {
    extension: 'gif',
    coincide: (contenido) =>
      contenido.length >= 6 &&
      (contenido.subarray(0, 6).toString('ascii') === 'GIF87a' ||
        contenido.subarray(0, 6).toString('ascii') === 'GIF89a'),
  },
  'image/webp': {
    extension: 'webp',
    coincide: (contenido) =>
      contenido.length >= 12 &&
      contenido.subarray(0, 4).toString('ascii') === 'RIFF' &&
      contenido.subarray(8, 12).toString('ascii') === 'WEBP',
  },
};

export async function prepararImagen(
  archivo: ArchivoRecibido | undefined,
): Promise<ImagenLeida> {
  if (!archivo?.buffer) {
    throw new BadRequestException({ mensaje: 'Selecciona una imagen.' });
  }
  if (archivo.buffer.length === 0) {
    throw new BadRequestException({
      mensaje: 'El archivo de imagen está vacío.',
    });
  }
  if (archivo.buffer.length > LIMITE_IMAGEN_BYTES) {
    throw new BadRequestException({ mensaje: MENSAJE_TAMANO_IMAGEN });
  }

  const declarado = normalizarMime(archivo.mimetype);
  const detectado = detectar(archivo.buffer);
  if (detectado) {
    if (declarado && declarado !== detectado) {
      throw new BadRequestException({ mensaje: MENSAJE_TIPO_IMAGEN });
    }
    const firma = FIRMAS[detectado];
    return {
      contenido: archivo.buffer,
      tipoMime: detectado,
      extension: firma.extension,
      nombreArchivo: nombreArchivo(archivo.originalname, firma.extension),
    };
  }
  if (declarado && declarado in FIRMAS) {
    throw new BadRequestException({ mensaje: MENSAJE_TIPO_IMAGEN });
  }

  const texto = textoSvg(archivo.buffer);
  if (!texto) {
    throw new BadRequestException({
      mensaje:
        declarado === 'image/svg+xml'
          ? 'El SVG no es válido o no se puede usar.'
          : MENSAJE_TIPO_IMAGEN,
    });
  }
  const png = await convertirSvg(texto);
  return {
    contenido: png,
    tipoMime: 'image/png',
    extension: 'png',
    nombreArchivo: nombreArchivo(archivo.originalname, 'png'),
  };
}

function textoSvg(contenido: Buffer): string | null {
  if (contenido.includes(0) || contenido[0] === 0xff || contenido[0] === 0xfe) {
    return null;
  }
  try {
    const texto = new TextDecoder('utf-8', { fatal: true })
      .decode(contenido)
      .replace(/^\uFEFF/, '');
    return /<svg[\s>]/i.test(texto) ? texto : null;
  } catch {
    return null;
  }
}

function detectar(contenido: Buffer): ImagenLeida['tipoMime'] | null {
  const tipos = Object.keys(FIRMAS) as ImagenLeida['tipoMime'][];
  return tipos.find((tipo) => FIRMAS[tipo].coincide(contenido)) ?? null;
}

function normalizarMime(tipo: string | undefined): string | null {
  const limpio = tipo?.split(';')[0]?.trim().toLowerCase();
  if (!limpio || limpio === 'application/octet-stream') return null;
  if (limpio === 'image/jpg') return 'image/jpeg';
  return limpio;
}

function nombreArchivo(
  original: string | undefined,
  extension: string,
): string {
  const base = (original ?? 'imagen').split(/[/\\]/).pop() ?? 'imagen';
  const limpio = base.replace(/[^A-Za-z0-9._-]/g, '').slice(0, 100);
  const tronco = limpio.replace(/\.[^.]+$/, '') || 'imagen';
  return `${tronco}.${extension}`.slice(0, 120);
}
