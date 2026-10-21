import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';

describe('Salud (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('GET /salud no expone la conexión', () => {
    return request(app.getHttpServer())
      .get('/salud')
      .expect(200)
      .expect((respuesta) => {
        const cuerpo = respuesta.body as {
          estado?: string;
          baseDatos?: string;
        };
        expect(cuerpo.estado).toBe('ok');
        expect(['no-configurada', 'disponible', 'no-disponible']).toContain(
          cuerpo.baseDatos,
        );
        expect(JSON.stringify(cuerpo)).not.toMatch(
          /postgres|password|supabase/i,
        );
      });
  });
});
