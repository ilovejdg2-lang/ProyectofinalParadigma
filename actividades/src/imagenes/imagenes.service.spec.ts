import {
  BadRequestException,
  ServiceUnavailableException,
} from '@nestjs/common';
import sharp from 'sharp';
import { PrismaMemoria } from '../../test/prisma-memoria';
import { AlmacenImagenes, ArchivoAlmacen } from './almacen-imagenes';
import { subirObjeto } from './almacen-supabase';
import { ImagenesService } from './imagenes.service';
import { LIMITE_IMAGEN_BYTES } from './validar-archivo';
import { PrismaService } from '../prisma/prisma.service';

const png = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
);
const jpeg = {
  originalname: 'foto.jpg',
  mimetype: 'image/jpeg',
  buffer: Buffer.from([0xff, 0xd8, 0xff, 0xd9]),
};
const gif = {
  originalname: 'anim.gif',
  mimetype: 'image/gif',
  buffer: Buffer.from('GIF89a'),
};
const webp = {
  originalname: 'foto.webp',
  mimetype: 'image/webp',
  buffer: Buffer.concat([
    Buffer.from('RIFF'),
    Buffer.alloc(4),
    Buffer.from('WEBP'),
  ]),
};

class AlmacenMemoria extends AlmacenImagenes {
  readonly recibidos: ArchivoAlmacen[] = [];
  retiradas: string[] = [];

  subir(archivo: ArchivoAlmacen): Promise<string> {
    this.recibidos.push(archivo);
    return Promise.resolve(`https://cdn.ejemplo/public/${archivo.ruta}`);
  }

  retirar(ruta: string): Promise<void> {
    this.retiradas.push(ruta);
    return Promise.resolve();
  }
}

function servicio(memoria: PrismaMemoria, almacen: AlmacenImagenes) {
  return new ImagenesService(
    {
      obtener: () => memoria,
      estaListo: () => true,
    } as unknown as PrismaService,
    almacen,
  );
}

describe('ImagenesService', () => {
  let memoria: PrismaMemoria;
  let almacen: AlmacenMemoria;

  beforeEach(() => {
    memoria = new PrismaMemoria();
    almacen = new AlmacenMemoria();
  });

  it('guarda una imagen válida y reutiliza su metadato en el cuestionario', async () => {
    const actual = servicio(memoria, almacen);
    const guardada = await actual.guardar(
      { originalname: 'portada.png', mimetype: 'image/png', buffer: png },
      { id: 'ana', nombre: 'Ana' },
    );
    expect(guardada.url).toContain('/ana/');
    expect(guardada.url.endsWith('.png')).toBe(true);
    expect(almacen.recibidos[0]?.tipoMime).toBe('image/png');
    expect(memoria.imagenes).toHaveLength(1);
    expect(memoria.imagenes[0]?.tamanoBytes).toBe(png.length);

    const id = await actual.asegurar(memoria, guardada.url);
    expect(id).toBe(memoria.imagenes[0]?.id);
    expect(memoria.imagenes).toHaveLength(1);
  });

  it('rechaza un archivo vacío, un SVG y un archivo que supera 5 MB', async () => {
    const actual = servicio(memoria, almacen);
    await expect(
      actual.guardar(undefined, { id: 'ana', nombre: 'Ana' }),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      actual.guardar(
        { mimetype: 'image/svg+xml', buffer: Buffer.from('<svg></svg>') },
        { id: 'ana', nombre: 'Ana' },
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      actual.guardar(
        {
          mimetype: 'image/png',
          buffer: Buffer.alloc(LIMITE_IMAGEN_BYTES + 1),
        },
        { id: 'ana', nombre: 'Ana' },
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(almacen.recibidos).toHaveLength(0);
    expect(memoria.imagenes).toHaveLength(0);
  });

  it('rechaza un tipo declarado que no coincide con el contenido', async () => {
    const actual = servicio(memoria, almacen);
    const rechazo = actual.guardar(
      { mimetype: 'image/jpeg', buffer: png },
      { id: 'ana', nombre: 'Ana' },
    );
    await expect(rechazo).rejects.toBeInstanceOf(BadRequestException);
    const error = await rechazo.catch((valor: unknown) => valor);
    expect(error).toBeInstanceOf(BadRequestException);
    if (error instanceof BadRequestException) {
      expect(error.getResponse()).toEqual({
        mensaje: 'Usa una imagen JPG, PNG, WEBP, GIF o SVG.',
      });
    }
  });

  it('no sube la imagen si la base de datos no está disponible', async () => {
    const actual = new ImagenesService(
      { estaListo: () => false } as unknown as PrismaService,
      almacen,
    );
    await expect(
      actual.guardar(
        { mimetype: 'image/png', buffer: png },
        { id: 'ana', nombre: 'Ana' },
      ),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
    expect(almacen.recibidos).toHaveLength(0);
  });

  it('retira el archivo si no puede guardar el metadato', async () => {
    const actual = new ImagenesService(
      {
        estaListo: () => true,
        obtener: () => ({
          imagen: {
            create: () => Promise.reject(new Error('fallo de escritura')),
          },
        }),
      } as unknown as PrismaService,
      almacen,
    );
    await expect(
      actual.guardar(
        { mimetype: 'image/png', buffer: png },
        { id: 'ana', nombre: 'Ana' },
      ),
    ).rejects.toThrow('fallo de escritura');
    expect(almacen.retiradas).toHaveLength(1);
  });

  it('convierte un SVG a PNG y conserva JPEG, GIF y WebP', async () => {
    const actual = servicio(memoria, almacen);
    const svg = Buffer.from(
      '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="10" viewBox="0 0 20 10"><rect x="0" y="0" width="10" height="10" fill="#ff0000"/></svg>',
    );
    const guardada = await actual.guardar(
      { originalname: 'icono.svg', mimetype: 'image/svg+xml', buffer: svg },
      { id: 'ana', nombre: 'Ana' },
    );
    const recibido = almacen.recibidos[0];
    expect(guardada.url.endsWith('.png')).toBe(true);
    expect(recibido?.tipoMime).toBe('image/png');
    expect(recibido?.contenido.subarray(0, 8)).toEqual(png.subarray(0, 8));
    expect(recibido?.contenido.includes(Buffer.from('<svg'))).toBe(false);
    expect(memoria.imagenes[0]?.nombreArchivo).toBe('icono.png');
    expect(memoria.imagenes[0]?.tipoMime).toBe('image/png');
    expect(memoria.imagenes[0]?.tamanoBytes).toBe(recibido?.contenido.length);
    if (!recibido) throw new Error('falta el archivo convertido');

    const pixels = await sharp(recibido.contenido).raw().toBuffer({
      resolveWithObject: true,
    });
    expect(pixels.info.width).toBe(20);
    expect(pixels.info.height).toBe(10);
    expect(pixels.info.channels).toBe(4);
    const rojo = (5 * 20 + 2) * 4;
    const vacio = (5 * 20 + 18) * 4;
    expect(pixels.data[rojo]).toBeGreaterThan(200);
    expect(pixels.data[rojo + 3]).toBeGreaterThan(200);
    expect(pixels.data[vacio + 3]).toBe(0);

    for (const archivo of [jpeg, gif, webp]) {
      await actual.guardar(archivo, { id: 'ana', nombre: 'Ana' });
    }
    expect(almacen.recibidos.map((archivo) => archivo.tipoMime)).toEqual([
      'image/png',
      'image/jpeg',
      'image/gif',
      'image/webp',
    ]);
  });
});

describe('Almacen de Supabase', () => {
  const origen = {
    url: 'https://proyecto.supabase.co',
    clave: 'clave-prueba',
    bucket: 'profelink-imagenes',
  };

  it('sube el archivo y devuelve la URL pública', async () => {
    const solicitudes: { url: string; tipo?: string }[] = [];
    const solicitar = ((url: string | URL, init?: RequestInit) => {
      const cabeceras = new Headers(init?.headers);
      solicitudes.push({
        url: String(url),
        tipo: cabeceras.get('content-type') ?? undefined,
      });
      expect(cabeceras.get('authorization')).toBe('Bearer clave-prueba');
      return Promise.resolve(new Response('{}', { status: 200 }));
    }) as typeof fetch;

    const url = await subirObjeto(origen, solicitar, {
      ruta: 'ana/foto.png',
      tipoMime: 'image/png',
      contenido: png,
    });
    expect(url).toBe(
      'https://proyecto.supabase.co/storage/v1/object/public/profelink-imagenes/ana/foto.png',
    );
    expect(solicitudes[0]?.url).toBe(
      'https://proyecto.supabase.co/storage/v1/object/profelink-imagenes/ana/foto.png',
    );
    expect(solicitudes[0]?.tipo).toBe('image/png');
  });

  it('no reenvía el detalle interno cuando Storage rechaza el archivo', async () => {
    const solicitar = (() =>
      Promise.resolve(
        new Response(
          JSON.stringify({ message: 'detalle interno del bucket' }),
          {
            status: 415,
          },
        ),
      )) as typeof fetch;
    const rechazo = subirObjeto(origen, solicitar, {
      ruta: 'ana/foto.png',
      tipoMime: 'image/png',
      contenido: png,
    });
    await expect(rechazo).rejects.toBeInstanceOf(BadRequestException);
    const error = await rechazo.catch((valor: unknown) => valor);
    expect(error).toBeInstanceOf(BadRequestException);
    if (error instanceof BadRequestException) {
      expect(error.getResponse()).toEqual({
        mensaje: 'Usa una imagen JPG, PNG, WEBP, GIF o SVG.',
      });
    }
  });
});
