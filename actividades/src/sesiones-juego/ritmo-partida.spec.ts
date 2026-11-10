import { ConflictException } from '@nestjs/common';
import { IdentidadExterna } from '../autenticacion/identidad-externa';
import { PrismaService } from '../prisma/prisma.service';
import { puntosDeRespuesta } from './calificacion';
import { AvisoSesionesLocal } from './aviso-sesiones';
import { SesionesJuegoService } from './sesiones-juego.service';
import { cuestionarioValido, SesionMemoria } from '../../test/sesion-memoria';

const ana: IdentidadExterna = { id: 'ana', nombre: 'Ana' };
const estudiantes: IdentidadExterna[] = [
  { id: 'maria', nombre: 'María' },
  { id: 'samir', nombre: 'Samir' },
  { id: 'fatima', nombre: 'Fátima' },
  { id: 'brayan', nombre: 'Brayan' },
];

function armar() {
  const memoria = new SesionMemoria();
  const quiz = cuestionarioValido();
  quiz.preguntas[0].segundos = 30;
  quiz.preguntas[1].segundos = 20;
  memoria.cuestionarios.push(quiz);
  const avisos = new AvisoSesionesLocal();
  const prisma = {
    obtener: () => memoria,
    estaListo: () => true,
  } as unknown as PrismaService;
  return {
    memoria,
    avisos,
    servicio: new SesionesJuegoService(prisma, avisos),
  };
}

async function partida() {
  const contexto = armar();
  const sala = await contexto.servicio.crear('quiz-1', ana);
  for (const estudiante of estudiantes) {
    await contexto.servicio.unirse(sala.codigo, estudiante);
  }
  await contexto.servicio.iniciar(sala.codigo, ana);
  const snap = contexto.memoria.sesiones[0]?.preguntasInstantanea;
  if (snap) snap.abreEn = new Date(Date.now() - 1_000).toISOString();
  contexto.memoria.sesiones[0].iniciaEn = new Date(Date.now() - 1_000);
  return { ...contexto, codigo: sala.codigo };
}

describe('puntos por acierto', () => {
  it('da los puntos configurados y cero si falla', () => {
    expect(puntosDeRespuesta(true)).toBe(1);
    expect(puntosDeRespuesta(true, 4)).toBe(4);
    expect(puntosDeRespuesta(false, 4)).toBe(0);
    expect(puntosDeRespuesta(true, 0)).toBe(1);
    expect(puntosDeRespuesta(true, 500)).toBe(100);
  });
});

describe('cierre, gráfica y avance de la partida', () => {
  it('termina en cuanto responde el último estudiante elegible', async () => {
    const { servicio, memoria, codigo } = await partida();
    const antes = Date.now();
    for (const estudiante of estudiantes.slice(0, 3)) {
      const sala = await servicio.responder(codigo, estudiante, { opcionId: 'p1a' });
      expect(sala.estado).toBe('pregunta');
    }
    const cerrada = await servicio.responder(codigo, estudiantes[3], {
      opcionId: 'p1a',
    });
    expect(cerrada.estado).toBe('cerrada');
    expect(cerrada.cierraEn).toBeNull();
    expect(Date.now() - antes).toBeLessThan(10_000);
    expect(memoria.sesiones[0].cierraEn).toBeNull();
    expect(
      cerrada.participantes.every((item) => (item.puntaje ?? 0) >= 1),
    ).toBe(true);
  });

  it('no se cierra antes de tiempo si alguien elegible sigue sin responder', async () => {
    const { servicio, codigo } = await partida();
    for (const estudiante of estudiantes.slice(0, 3)) {
      await servicio.responder(codigo, estudiante, { opcionId: 'p1a' });
    }
    const abierta = await servicio.obtener(codigo, ana);
    expect(abierta.estado).toBe('pregunta');
    expect(abierta.cierraEn).not.toBeNull();
  });

  it('al vencer el plazo deja en cero a quien no respondió', async () => {
    const { servicio, memoria, codigo } = await partida();
    await servicio.responder(codigo, estudiantes[0], { opcionId: 'p1a' });
    memoria.sesiones[0].cierraEn = new Date(Date.now() - 5);
    await servicio.cerrarPorPlazo(codigo);
    const cerrada = await servicio.obtener(codigo, ana);
    expect(cerrada.estado).toBe('cerrada');
    const callado = cerrada.participantes.find(
      (item) => item.perfilId === estudiantes[3].id,
    );
    expect(callado?.respuestas).toEqual([]);
    expect(callado?.puntaje).toBe(0);
    const rapida = cerrada.participantes.find(
      (item) => item.perfilId === estudiantes[0].id,
    );
    expect(rapida?.puntaje).toBe(1);
  });

  it('paga más al acierto rápido y cero al error rápido', async () => {
    const { servicio, memoria, codigo } = await partida();
    const inicio = new Date(Date.now() - 15_000);
    memoria.sesiones[0].iniciaEn = inicio;
    memoria.sesiones[0].segundos = 20;
    memoria.sesiones[0].cierraEn = new Date(inicio.getTime() + 20_000);
    await servicio.responder(codigo, estudiantes[0], { opcionId: 'p1a' });
    await servicio.responder(codigo, estudiantes[1], { opcionId: 'p1a' });
    await servicio.responder(codigo, estudiantes[2], { opcionId: 'p1b' });
    const porPerfil = new Map(
      memoria.sesiones[0].participantes.map((item) => [item.perfilId, item.id]),
    );
    const marcar = (perfil: string, segundos: number) => {
      const id = porPerfil.get(perfil);
      const respuesta = memoria.respuestas.find((item) => item.participanteId === id);
      if (respuesta) {
        respuesta.respondidaEn = new Date(inicio.getTime() + segundos * 1000);
      }
    };
    marcar(estudiantes[0].id, 2);
    marcar(estudiantes[1].id, 10);
    marcar(estudiantes[2].id, 3);
    await servicio.cerrar(codigo, ana);
    const cerrada = await servicio.obtener(codigo, ana);
    const puntos = (perfil: string) =>
      cerrada.participantes.find((item) => item.perfilId === perfil)?.puntaje;
    expect(puntos(estudiantes[0].id)).toBe(1);
    expect(puntos(estudiantes[1].id)).toBe(1);
    expect(puntos(estudiantes[2].id)).toBe(0);
    const tiempo = (perfil: string) =>
      cerrada.participantes.find((item) => item.perfilId === perfil)?.tiempoMs ?? 0;
    expect(tiempo(estudiantes[0].id)).toBeLessThan(tiempo(estudiantes[1].id));
    expect(puntos(estudiantes[3].id)).toBe(0);
    const correcta = cerrada.preguntas[0].opciones.find((item) => item.correcta);
    expect(correcta?.id).toBe('p1a');
    const eligieron = (opcionId: string) =>
      cerrada.participantes.filter((item) =>
        item.respuestas.some(
          (respuesta) =>
            respuesta.preguntaId === 'p1' && respuesta.opcionId === opcionId,
        ),
      ).length;
    expect(eligieron('p1a')).toBe(2);
    expect(eligieron('p1b')).toBe(1);
  });

  it('no deja que un ingreso posterior bloquee el cierre ni que una desconexión lo adelante', async () => {
    const { servicio, memoria, codigo } = await partida();
    const sesion = memoria.sesiones[0];
    sesion.participantes.push({
      id: 'tarde',
      sesionId: sesion.id,
      perfilId: 'tarde',
      nombre: 'Tarde',
      conectado: true,
      puntaje: 0,
      aciertos: 0,
      incorporadoEn: new Date(),
    });
    const desconectado = sesion.participantes.find(
      (item) => item.perfilId === estudiantes[3].id,
    );
    if (desconectado) desconectado.conectado = false;
    for (const estudiante of estudiantes.slice(0, 3)) {
      const sala = await servicio.responder(codigo, estudiante, { opcionId: 'p1a' });
      expect(sala.estado).toBe('pregunta');
    }
    const rechazo = servicio.responder(codigo, { id: 'tarde', nombre: 'Tarde' }, {
      opcionId: 'p1a',
    });
    await expect(rechazo).rejects.toBeInstanceOf(ConflictException);
    expect(memoria.sesiones[0].estado).toBe('pregunta');
  });

  it('recupera el mismo plazo al consultar de nuevo y no duplica la respuesta', async () => {
    const { servicio, memoria, codigo } = await partida();
    const primera = await servicio.obtener(codigo, estudiantes[0]);
    const segunda = await servicio.obtener(codigo, estudiantes[0]);
    expect(segunda.cierraEn).toBe(primera.cierraEn);
    expect(segunda.iniciaEn).toBe(primera.iniciaEn);
    await servicio.responder(codigo, estudiantes[0], { opcionId: 'p1a' });
    await expect(
      servicio.responder(codigo, estudiantes[0], { opcionId: 'p1b' }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(
      memoria.respuestas.filter((item) => item.preguntaId === 'p1'),
    ).toHaveLength(1);
    expect(memoria.sesiones[0].cierraEn).toEqual(primera.cierraEn ? new Date(primera.cierraEn) : null);
  });

  it('pasa de resultados a clasificación y solo entonces a la siguiente pregunta o al podio', async () => {
    const { servicio, codigo } = await partida();
    for (const estudiante of estudiantes) {
      await servicio.responder(codigo, estudiante, { opcionId: 'p1a' });
    }
    const resultados = await servicio.obtener(codigo, ana);
    expect(resultados.estado).toBe('cerrada');
    await expect(servicio.avanzar(codigo, ana)).resolves.toMatchObject({
      estado: 'clasificacion',
      preguntaActual: 0,
    });
    const siguiente = await servicio.avanzar(codigo, ana);
    expect(siguiente.estado).toBe('pregunta');
    expect(siguiente.preguntaActual).toBe(1);
    expect(JSON.stringify(siguiente.preguntas[1])).not.toContain('correcta');

    await servicio.cerrar(codigo, ana);
    await servicio.avanzar(codigo, ana);
    const fin = await servicio.avanzar(codigo, ana);
    expect(fin.estado).toBe('finalizada');
    expect(fin.participantes).toHaveLength(4);
    expect(fin.participantes[0].puntaje).toBeGreaterThanOrEqual(
      fin.participantes[1].puntaje,
    );
  });
});
