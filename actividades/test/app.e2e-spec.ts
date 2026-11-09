import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';

jest.setTimeout(15_000);

describe('Salud (e2e)', () => {
  let app: INestApplication<App>;
  const directUrl = process.env.DIRECT_URL;
  const databaseUrl = process.env.DATABASE_URL;

  beforeAll(() => {
    // Prove the app boots in its documented no-database fallback mode.
    process.env.DIRECT_URL = '';
    process.env.DATABASE_URL = '';
  });

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app?.close();
  });

  afterAll(() => {
    if (directUrl === undefined) delete process.env.DIRECT_URL;
    else process.env.DIRECT_URL = directUrl;
    if (databaseUrl === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = databaseUrl;
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
