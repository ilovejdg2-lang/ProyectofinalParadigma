import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import request = require('supertest');
import type { App } from 'supertest/types';
import { AppModule } from '../src/app.module';

describe('Autenticación (e2e)', () => {
  let app: INestApplication<App> | undefined;
  let keysDir: string | undefined;

  beforeAll(async () => {
    keysDir = await mkdtemp(join(tmpdir(), 'profelink-auth-e2e-'));
    const config: Record<string, string> = {
      DIRECT_URL: '',
      RSA_KEYS_DIR: keysDir,
      REGISTRATION_MODE: 'open',
      EMAIL_AUTO_VERIFY: 'true',
    };
    const modulo = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(ConfigService)
      .useValue({ get: (key: string, fallback?: unknown) => config[key] ?? fallback })
      .compile();
    app = modulo.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidUnknownValues: false,
    }));
    await app.init();
  });

  afterAll(async () => {
    try {
      await app?.close();
    } finally {
      if (keysDir) await rm(keysDir, { recursive: true, force: true });
    }
  });

  it('registra, inicia sesión y obtiene el perfil autenticado', async () => {
    const http = request(app!.getHttpServer());
    const correo = 'estudiante.e2e@example.test';
    const contrasena = 'Demo-E2E-123!';
    await http.get('/api/v1/auth/me').expect(401);
    await http.post('/perfiles').send({ nombre: 'Estudiante E2E', correo, contrasena }).expect(201);
    const login = await http.post('/sesiones').send({ correo, contrasena }).expect(200);
    const { token } = login.body as { token: string };
    expect(token).toEqual(expect.any(String));
    const perfil = await http.get('/api/v1/auth/me').set('Authorization', `Bearer ${token}`).expect(200);
    expect(perfil.body).toMatchObject({ correo });
  });
});
