import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { VerificadorIdentidad } from '../src/autenticacion/verificador-identidad';
import { AppModule } from '../src/app.module';
import {
  AlmacenImagenes,
  ArchivoAlmacen,
} from '../src/imagenes/almacen-imagenes';
import { LIMITE_IMAGEN_BYTES } from '../src/imagenes/validar-archivo';
import { PrismaService } from '../src/prisma/prisma.service';
import { PrismaMemoria } from './prisma-memoria';

const png = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
);

class AlmacenFijo extends AlmacenImagenes {
  llamadas = 0;
  ultimo?: ArchivoAlmacen;

  subir(archivo: ArchivoAlmacen): Promise<string> {
    this.llamadas += 1;
    this.ultimo = archivo;
    return Promise.resolve(`https://cdn.ejemplo/public/${archivo.ruta}`);
  }

  retirar(): Promise<void> {
    return Promise.resolve();
  }
}

describe('Imágenes (e2e)', () => {
  let app: INestApplication<App>;
  let memoria: PrismaMemoria;
  let almacen: AlmacenFijo;

  beforeEach(async () => {
    memoria = new PrismaMemoria();
    almacen = new AlmacenFijo();
    const modulo: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue({
        obtener: () => memoria,
        estaListo: () => true,
        estado: () => 'disponible',
        onModuleInit: () => Promise.resolve(),
        onModuleDestroy: () => Promise.resolve(),
      })
      .overrideProvider(VerificadorIdentidad)
      .useValue({
        verificar: (token: string) =>
          token === 'token-ana'
            ? Promise.resolve({ id: 'ana', nombre: 'Ana' })
            : Promise.resolve(null),
      })
      .overrideProvider(AlmacenImagenes)
      .useValue(almacen)
      .compile();

    app = modulo.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('exige autenticación para subir una imagen', async () => {
    await request(app.getHttpServer())
      .post('/imagenes')
      .attach('archivo', png, {
        filename: 'foto.png',
        contentType: 'image/png',
      })
      .expect(401)
      .expect({ mensaje: 'La sesión no es válida.' });
    expect(almacen.llamadas).toBe(0);
  });

  it('guarda la imagen y el cuestionario reutiliza esa URL', async () => {
    const cargada = await request(app.getHttpServer())
      .post('/imagenes')
      .set('Authorization', 'Bearer token-ana')
      .attach('archivo', png, {
        filename: 'foto.png',
        contentType: 'image/png',
      })
      .expect(201);
    const cuerpo = cargada.body as { url: string };
    expect(cuerpo.url).toContain('https://cdn.ejemplo/public/ana/');
    expect(JSON.stringify(cuerpo)).not.toMatch(/clave|secret|supabase/i);

    const creado = await request(app.getHttpServer())
      .post('/cuestionarios')
      .set('Authorization', 'Bearer token-ana')
      .send({
        titulo: 'Cuestionario con portada',
        descripcion: 'Descripción válida para comprobar la imagen.',
        categoria: 'General',
        etiquetas: ['imagen'],
        dificultad: 'facil',
        imagenUrl: cuerpo.url,
        preguntas: [
          {
            enunciado: 'La portada se guardó junto con la pregunta.',
            respuestaCorrecta: true,
            orden: 1,
            imagenUrl: cuerpo.url,
            opciones: [
              { texto: 'Verdadero', correcta: true },
              { texto: 'Falso', correcta: false },
            ],
          },
        ],
      })
      .expect(201);
    const cuestionario = creado.body as {
      imagenUrl: string;
      preguntas: { imagenUrl: string }[];
    };
    expect(cuestionario.imagenUrl).toBe(cuerpo.url);
    expect(cuestionario.preguntas[0]?.imagenUrl).toBe(cuerpo.url);
    expect(memoria.imagenes).toHaveLength(1);
    expect(almacen.llamadas).toBe(1);
  });

  it('rechaza un archivo que no es una imagen y uno que supera el límite', async () => {
    await request(app.getHttpServer())
      .post('/imagenes')
      .set('Authorization', 'Bearer token-ana')
      .attach('archivo', Buffer.from('no es una imagen'), {
        filename: 'notas.png',
        contentType: 'image/png',
      })
      .expect(400)
      .expect({ mensaje: 'Usa una imagen JPG, PNG, WEBP, GIF o SVG.' });

    await request(app.getHttpServer())
      .post('/imagenes')
      .set('Authorization', 'Bearer token-ana')
      .attach('archivo', Buffer.alloc(LIMITE_IMAGEN_BYTES + 1), {
        filename: 'grande.png',
        contentType: 'image/png',
      })
      .expect(413)
      .expect({ mensaje: 'La imagen supera 5 MB.' });
    expect(memoria.imagenes).toHaveLength(0);
    expect(almacen.llamadas).toBe(0);
  });

  it('convierte un SVG autenticado en un PNG reutilizable', async () => {
    const svg = Buffer.from(
      '<svg xmlns="http://www.w3.org/2000/svg" width="12" height="8"><rect width="12" height="8" fill="#00ff00"/></svg>',
    );
    const cargada = await request(app.getHttpServer())
      .post('/imagenes')
      .set('Authorization', 'Bearer token-ana')
      .attach('archivo', svg, {
        filename: 'dibujo.svg',
        contentType: 'image/svg+xml',
      })
      .expect(201);
    const cuerpo = cargada.body as { url: string };
    expect(Object.keys(cuerpo)).toEqual(['url']);
    expect(cuerpo.url.endsWith('.png')).toBe(true);
    expect(almacen.ultimo?.tipoMime).toBe('image/png');
    expect(almacen.ultimo?.contenido.includes(Buffer.from('<svg'))).toBe(false);
    expect(almacen.ultimo?.contenido.subarray(0, 4).toString('hex')).toBe(
      '89504e47',
    );
    expect(memoria.imagenes[0]?.tipoMime).toBe('image/png');
    expect(memoria.imagenes[0]?.nombreArchivo.endsWith('.png')).toBe(true);
    expect(memoria.imagenes[0]?.tamanoBytes).toBe(
      almacen.ultimo?.contenido.length,
    );
  });
});
