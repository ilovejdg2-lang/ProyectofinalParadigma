import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { VerificadorIdentidad } from '../src/autenticacion/verificador-identidad';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { SalaPublica } from '../src/sesiones-juego/presentacion-sala';
import { cuestionarioValido, SesionMemoria } from './sesion-memoria';

function comoSala(cuerpo: unknown): SalaPublica {
  return cuerpo as SalaPublica;
}

describe('Sesiones de juego (e2e)', () => {
  let app: INestApplication<App>;
  let memoria: SesionMemoria;

  beforeEach(async () => {
    memoria = new SesionMemoria();
    memoria.cuestionarios.push(cuestionarioValido());
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

  it('exige identidad y no acepta suplantar al anfitrión ni al participante', async () => {
    await request(app.getHttpServer())
      .post('/sesiones-juego')
      .send({ cuestionarioId: 'quiz-1' })
      .expect(401)
      .expect({ mensaje: 'La sesión no es válida.' });

    await request(app.getHttpServer())
      .post('/sesiones-juego')
      .set('Authorization', 'Bearer token-ana')
      .send({ cuestionarioId: 'quiz-1', anfitrionId: 'intruso' })
      .expect(400);

    const creada = await request(app.getHttpServer())
      .post('/sesiones-juego')
      .set('Authorization', 'Bearer token-ana')
      .send({ cuestionarioId: 'quiz-1' })
      .expect(201);

    const sala = comoSala(creada.body);
    expect(sala).toMatchObject({
      anfitrionId: 'ana',
      anfitrionNombre: 'Ana',
      estado: 'esperando',
      canal: 'remoto',
      participantes: [],
    });
    expect(sala.codigo).toMatch(/^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}$/);
    expect(JSON.stringify(sala)).not.toContain('correcta');

    const codigo = sala.codigo;
    const unido = await request(app.getHttpServer())
      .post(`/sesiones-juego/${codigo}/participantes`)
      .set('Authorization', 'Bearer token-luis')
      .send({ perfilId: 'ana' })
      .expect(201);
    expect(comoSala(unido.body).participantes).toEqual([
      expect.objectContaining({ perfilId: 'luis', nombre: 'Luis' }),
    ]);

    await request(app.getHttpServer())
      .post(`/sesiones-juego/${codigo}/iniciar`)
      .set('Authorization', 'Bearer token-luis')
      .send({})
      .expect(403)
      .expect({ mensaje: 'Solo el anfitrión puede iniciar la partida.' });
  });

  it('recupera la sala sin duplicar participantes y conserva la instantánea', async () => {
    const creada = await request(app.getHttpServer())
      .post('/sesiones-juego')
      .set('Authorization', 'Bearer token-ana')
      .send({ cuestionarioId: 'quiz-1' })
      .expect(201);
    const codigo = comoSala(creada.body).codigo;

    const consulta = await request(app.getHttpServer())
      .get(`/sesiones-juego/${codigo}`)
      .set('Authorization', 'Bearer token-ana')
      .expect(200);
    expect(comoSala(consulta.body).participantes).toEqual([]);

    await request(app.getHttpServer())
      .get('/sesiones-juego/ZZZZZZ')
      .set('Authorization', 'Bearer token-ana')
      .expect(404)
      .expect({ mensaje: 'No hay una sala con ese código.' });

    await request(app.getHttpServer())
      .post(`/sesiones-juego/${codigo}/participantes`)
      .set('Authorization', 'Bearer token-luis')
      .send({})
      .expect(201);
    const repetido = await request(app.getHttpServer())
      .post(`/sesiones-juego/${codigo}/participantes`)
      .set('Authorization', 'Bearer token-luis')
      .send({})
      .expect(201);
    expect(comoSala(repetido.body).participantes).toHaveLength(1);

    const iniciada = await request(app.getHttpServer())
      .post(`/sesiones-juego/${codigo}/iniciar`)
      .set('Authorization', 'Bearer token-ana')
      .send({})
      .expect(201);
    const partida = comoSala(iniciada.body);
    expect(partida.estado).toBe('pregunta');
    expect(partida.cierraEn).toEqual(expect.any(String));
    expect(JSON.stringify(partida)).not.toContain('correcta');
    expect(JSON.stringify(partida)).not.toContain('herencia');
    expect(partida.preguntas).toHaveLength(2);

    memoria.cuestionarios[0].preguntas[0].enunciado = 'Cambiado en el catálogo';
    const vigente = await request(app.getHttpServer())
      .get(`/sesiones-juego/${codigo.toLowerCase()}`)
      .set('Authorization', 'Bearer token-luis')
      .expect(200);
    const recuperada = comoSala(vigente.body);
    expect(recuperada.preguntas[0].enunciado).toBe(
      'Una función pura no tiene efectos externos.',
    );
    expect(recuperada.participantes).toHaveLength(1);

    await request(app.getHttpServer())
      .post(`/sesiones-juego/${codigo}/iniciar`)
      .set('Authorization', 'Bearer token-ana')
      .send({})
      .expect(409)
      .expect({ mensaje: 'La partida ya fue iniciada.' });

    await request(app.getHttpServer())
      .post(`/sesiones-juego/${codigo}/cerrar`)
      .set('Authorization', 'Bearer token-ana')
      .send({})
      .expect(404);
  });

  it('rechaza cuestionarios que no se pueden jugar', async () => {
    await request(app.getHttpServer())
      .post('/sesiones-juego')
      .set('Authorization', 'Bearer token-ana')
      .send({ cuestionarioId: 'ausente' })
      .expect(404)
      .expect({ mensaje: 'No se encontró el cuestionario.' });

    memoria.cuestionarios[0].eliminadoEn = new Date();
    await request(app.getHttpServer())
      .post('/sesiones-juego')
      .set('Authorization', 'Bearer token-ana')
      .send({ cuestionarioId: 'quiz-1' })
      .expect(404);

    memoria.cuestionarios[0].eliminadoEn = null;
    memoria.cuestionarios[0].preguntas = [];
    await request(app.getHttpServer())
      .post('/sesiones-juego')
      .set('Authorization', 'Bearer token-ana')
      .send({ cuestionarioId: 'quiz-1' })
      .expect(400)
      .expect({ mensaje: 'El cuestionario no tiene preguntas.' });
  });
});
