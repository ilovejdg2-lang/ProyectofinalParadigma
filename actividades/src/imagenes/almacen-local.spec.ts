import { BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { AlmacenLocal } from './almacen-local';
import { AlmacenSupabase, supabaseConfigurado } from './almacen-supabase';

const png = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
);

describe('Almacen local de imágenes', () => {
  let directorio = '';

  beforeEach(async () => {
    directorio = await mkdtemp(path.join(tmpdir(), 'profelink-img-'));
  });

  afterEach(async () => {
    await rm(directorio, { recursive: true, force: true });
  });

  it('guarda la imagen en disco y la vuelve a leer por la URL local', async () => {
    const almacen = new AlmacenLocal(config({ ALMACEN_IMAGENES_DIR: directorio, PORT: '5002' }));
    const url = await almacen.subir({
      ruta: 'perfil-demo/foto.png',
      tipoMime: 'image/png',
      contenido: png,
    });

    expect(url).toBe('http://127.0.0.1:5002/archivos/perfil-demo/foto.png');
    await expect(almacen.abrir('perfil-demo/foto.png')).resolves.toEqual({
      tipoMime: 'image/png',
      contenido: png,
    });
  });

  it('rechaza una ruta que sale del directorio', async () => {
    const almacen = new AlmacenLocal(config({ ALMACEN_IMAGENES_DIR: directorio }));
    await expect(
      almacen.subir({ ruta: '../secreto.png', tipoMime: 'image/png', contenido: png }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('usa el disco local cuando falta el JWT de Supabase', () => {
    const local = config({
      SUPABASE_URL: 'https://proyecto.supabase.co',
      SUPABASE_SECRET_KEY: 'sb_secret-prueba',
      SUPABASE_STORAGE_BUCKET: 'profelink-imagenes',
    });
    const remoto = config({
      SUPABASE_URL: 'https://proyecto.supabase.co',
      SUPABASE_SECRET_KEY: 'sb_secret-prueba',
      SUPABASE_SERVICE_ROLE_JWT: 'eyJhbGci.eyJyb2xlIjoic2VydmljZV9yb2xlIn0.signature',
      SUPABASE_STORAGE_BUCKET: 'profelink-imagenes',
    });

    expect(supabaseConfigurado(local)).toBe(false);
    expect(supabaseConfigurado(remoto)).toBe(true);
    expect(new AlmacenSupabase(local)).toBeInstanceOf(AlmacenSupabase);
  });
});

function config(valores: Record<string, string>): ConfigService {
  return { get: (nombre: string) => valores[nombre] } as ConfigService;
}
