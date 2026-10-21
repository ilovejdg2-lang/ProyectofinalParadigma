import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { VerificadorIdentidad } from '../src/autenticacion/verificador-identidad';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import {
  ResumenPublico,
  SalaPublica,
} from '../src/sesiones-juego/presentacion-sala';
import { cuestionarioValido, SesionMemoria } from './sesion-memoria';

function comoSala(cuerpo: unknown): SalaPublica {
  return cuerpo as SalaPublica;
}

describe('Partidas y resultados (e2e)', () => {
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
          if (token === 'token-nora')
            return Promise.resolve({ id: 'nora', nombre: 'Nora' });
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

  it('juega una partida, puntúa en el servidor y publica el historial autorizado', async () => {
    const http = request(app.getHttpServer());
    await http
      .post('/sesiones-juego/ABC123/respuestas')
      .send({ opcionId: 'p1a' })
      .expect(401);

    const creada = await http
      .post('/sesiones-juego')
      .set('Authorization', 'Bearer token-ana')
      .send({ cuestionarioId: 'quiz-1' })
      .expect(201);
    const codigo = comoSala(creada.body).codigo;

    await http
      .post(`/sesiones-juego/${codigo}/participantes`)
      .set('Authorization', 'Bearer token-luis')
      .send({})
      .expect(201);
    await http
      .post(`/sesiones-juego/${codigo}/iniciar`)
      .set('Authorization', 'Bearer token-ana')
      .send({})
      .expect(201);

    await http
      .post(`/sesiones-juego/${codigo}/respuestas`)
      .set('Authorization', 'Bearer token-luis')
      .send({ opcionId: 'p1a', puntos: 99 })
      .expect(400);

    const respondida = await http
      .post(`/sesiones-juego/${codigo}/respuestas`)
      .set('Authorization', 'Bearer token-luis')
      .send({ opcionId: 'p1a' })
      .expect(201);
    expect(JSON.stringify(respondida.body)).not.toContain('correcta');
    expect(
      comoSala(respondida.body).participantes[0].respuestas[0].puntos,
    ).toBe(0);

    await http
      .post(`/sesiones-juego/${codigo}/respuestas`)
      .set('Authorization', 'Bearer token-luis')
      .send({ opcionId: 'p1b' })
      .expect(409)
      .expect({ mensaje: 'Ya enviaste una respuesta para esta pregunta.' });

    await http
      .post(`/sesiones-juego/${codigo}/cerrar`)
      .set('Authorization', 'Bearer token-luis')
      .send({})
      .expect(403);

    const cerrada = await http
      .post(`/sesiones-juego/${codigo}/cerrar`)
      .set('Authorization', 'Bearer token-ana')
      .send({})
      .expect(201);
    expect(comoSala(cerrada.body).participantes[0].puntaje).toBe(1);
    expect(comoSala(cerrada.body).preguntas[1].enunciado).toBe('');

    await http
      .get(`/resultados/${codigo}`)
      .set('Authorization', 'Bearer token-ana')
      .expect(404)
      .expect({
        mensaje: 'Esta sesión todavía no tiene resultados guardados.',
      });

    await http
      .post(`/sesiones-juego/${codigo}/avanzar`)
      .set('Authorization', 'Bearer token-ana')
      .send({})
      .expect(201);
    await http
      .post(`/sesiones-juego/${codigo}/cerrar`)
      .set('Authorization', 'Bearer token-ana')
      .send({})
      .expect(201);
    const fin = await http
      .post(`/sesiones-juego/${codigo}/avanzar`)
      .set('Authorization', 'Bearer token-ana')
      .send({})
      .expect(201);
    expect(comoSala(fin.body).estado).toBe('finalizada');

    await http
      .get(`/resultados/${codigo}`)
      .set('Authorization', 'Bearer token-nora')
      .expect(403)
      .expect({ mensaje: 'No puedes ver los resultados de esta partida.' });
    await http
      .get(`/sesiones-juego/${codigo}`)
      .set('Authorization', 'Bearer token-nora')
      .expect(403);

    const resultado = await http
      .get(`/resultados/${codigo}`)
      .set('Authorization', 'Bearer token-luis')
      .expect(200);
    const cuerpo = resultado.body as ResumenPublico;
    expect(cuerpo).toMatchObject({
      codigo,
      titulo: 'Paradigma en vivo',
      anfitrionId: 'ana',
    });
    expect(cuerpo.participantes[0]).toMatchObject({
      perfilId: 'luis',
      puntaje: 1,
      aciertos: 1,
    });

    const historial = await http
      .get('/resultados')
      .set('Authorization', 'Bearer token-ana')
      .expect(200);
    expect(historial.body).toHaveLength(1);
    await http
      .get('/resultados')
      .set('Authorization', 'Bearer token-nora')
      .expect(200)
      .expect([]);
  });
});
