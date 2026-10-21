import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { VerificadorIdentidad } from '../src/autenticacion/verificador-identidad';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { PrismaMemoria } from './prisma-memoria';

function sinPropietario<T extends { autorId: string }>(datos: T) {
  const copia = { ...datos };
  delete (copia as { autorId?: string }).autorId;
  return copia;
}

const cuerpo = {
  titulo: 'Cuestionario de integración',
  descripcion: 'Descripción válida para la prueba de extremo a extremo.',
  categoria: 'General',
  etiquetas: ['integracion'],
  dificultad: 'medio',
  autorId: 'intruso',
  preguntas: [
    {
      enunciado: 'El encapsulamiento oculta el estado interno.',
      respuestaCorrecta: true,
      orden: 1,
      opciones: [
        { texto: 'Verdadero', correcta: true },
        { texto: 'Falso', correcta: false },
      ],
    },
  ],
};

describe('CRUD de cuestionarios (e2e)', () => {
  let app: INestApplication<App>;
  let memoria: PrismaMemoria;

  beforeEach(async () => {
    memoria = new PrismaMemoria();
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
        verificar: (token: string) => {
          if (token === 'token-ana')
            return Promise.resolve({ id: 'ana', nombre: 'Ana' });
          if (token === 'token-luis')
            return Promise.resolve({ id: 'luis', nombre: 'Luis' });
          return Promise.resolve(null);
        },
      })
      .compile();

    app = modulo.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('protege las operaciones privadas y no acepta un autor enviado por el cliente', async () => {
    await request(app.getHttpServer())
      .get('/mis-cuestionarios')
      .expect(401)
      .expect({ mensaje: 'La sesión no es válida.' });
    await request(app.getHttpServer())
      .post('/cuestionarios')
      .send(cuerpo)
      .expect(401);
    await request(app.getHttpServer())
      .post('/cuestionarios')
      .set('Authorization', 'Bearer token-ana')
      .send(cuerpo)
      .expect(400);

    const sinAutor = sinPropietario(cuerpo);
    const creado = await request(app.getHttpServer())
      .post('/cuestionarios')
      .set('Authorization', 'Bearer token-ana')
      .send(sinAutor)
      .expect(201);
    const creadoCuerpo = creado.body as {
      id: string;
      autorId: string;
      autorNombre: string;
    };
    expect(creadoCuerpo.autorId).toBe('ana');
    expect(creadoCuerpo.autorNombre).toBe('Ana');

    await request(app.getHttpServer())
      .put(`/cuestionarios/${creadoCuerpo.id}`)
      .set('Authorization', 'Bearer token-luis')
      .send(sinAutor)
      .expect(403)
      .expect({ mensaje: 'Solo quien creó el cuestionario puede editarlo.' });

    await request(app.getHttpServer())
      .delete(`/cuestionarios/${creadoCuerpo.id}`)
      .set('Authorization', 'Bearer token-luis')
      .expect(403);

    await request(app.getHttpServer())
      .delete(`/cuestionarios/${creadoCuerpo.id}`)
      .set('Authorization', 'Bearer token-ana')
      .expect(204);
    await request(app.getHttpServer())
      .get(`/cuestionarios/${creadoCuerpo.id}`)
      .expect(404);
    await request(app.getHttpServer())
      .get('/cuestionarios')
      .expect(200)
      .expect([]);
  });

  it('rechaza un cuestionario inválido de un usuario autenticado', async () => {
    const sinAutor = sinPropietario(cuerpo);
    await request(app.getHttpServer())
      .post('/cuestionarios')
      .set('Authorization', 'Bearer token-ana')
      .send({ ...sinAutor, titulo: 'No' })
      .expect(400);
    expect(memoria.cuestionarios).toHaveLength(0);
  });
});
