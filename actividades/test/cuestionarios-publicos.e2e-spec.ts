import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';

describe('Catálogo público en Supabase (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const modulo: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = modulo.createNestApplication();
    await app.init();
  }, 20000);

  afterAll(async () => {
    await app.close();
  });

  it('consulta el seed sin revelar respuestas correctas', async () => {
    const listado = await request(app.getHttpServer())
      .get('/cuestionarios')
      .expect(200);
    const texto = JSON.stringify(listado.body);
    expect(texto).toContain('demo-funcional');
    expect(texto).not.toContain('"correcta"');
    expect(texto).not.toContain('"respuestaCorrecta"');

    const detalle = await request(app.getHttpServer())
      .get('/cuestionarios/demo-funcional')
      .expect(200);
    const detalleCuerpo = detalle.body as {
      preguntas: { opciones: { texto: string }[] }[];
    };
    expect(detalleCuerpo.preguntas).toHaveLength(4);
    expect(detalleCuerpo.preguntas[0].opciones).toHaveLength(2);
    expect(detalleCuerpo.preguntas[0].opciones[0].texto).toBe('Verdadero');
    expect(JSON.stringify(detalle.body)).not.toContain('"correcta"');

    await request(app.getHttpServer())
      .get('/cuestionarios/no-existe')
      .expect(404)
      .expect({ mensaje: 'No se encontró el cuestionario.' });
  }, 20000);

  it('mantiene privadas las operaciones de escritura', async () => {
    await request(app.getHttpServer()).get('/mis-cuestionarios').expect(401);
    await request(app.getHttpServer())
      .post('/cuestionarios')
      .send({})
      .expect(401);
    await request(app.getHttpServer())
      .put('/cuestionarios/demo-funcional')
      .send({})
      .expect(401);
    await request(app.getHttpServer())
      .delete('/cuestionarios/demo-funcional')
      .expect(401);
  });
});
