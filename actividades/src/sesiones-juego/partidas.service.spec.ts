import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { IdentidadExterna } from '../autenticacion/identidad-externa';
import { PrismaService } from '../prisma/prisma.service';
import { plazoVencido } from './calificacion';
import { ResultadosService } from '../resultados/resultados.service';
import { AvisoSesionesLocal } from './aviso-sesiones';
import { SesionesJuegoService } from './sesiones-juego.service';
import { cuestionarioValido, SesionMemoria } from '../../test/sesion-memoria';

const ana: IdentidadExterna = { id: 'ana', nombre: 'Ana' };
const luis: IdentidadExterna = { id: 'luis', nombre: 'Luis' };
const marta: IdentidadExterna = { id: 'marta', nombre: 'Marta' };

function armar(memoria = new SesionMemoria()) {
  memoria.cuestionarios.push(cuestionarioValido());
  const avisos = new AvisoSesionesLocal();
  const prisma = {
    obtener: () => memoria,
    estaListo: () => true,
  } as unknown as PrismaService;
  return {
    memoria,
    avisos,
    servicio: new SesionesJuegoService(prisma, avisos),
    resultados: new ResultadosService(prisma),
  };
}

async function rechazo(operacion: Promise<unknown>) {
  try {
    await operacion;
  } catch (error) {
    return error as { getResponse(): { mensaje: string } };
  }
  throw new Error('La operación debía rechazarse.');
}

async function salaLista() {
  const contexto = armar();
  const sala = await contexto.servicio.crear('quiz-1', ana);
  await contexto.servicio.unirse(sala.codigo, luis);
  await contexto.servicio.unirse(sala.codigo, marta);
  const iniciada = await contexto.servicio.iniciar(sala.codigo, ana);
  return { ...contexto, codigo: sala.codigo, iniciada };
}

describe('plazo de respuesta', () => {
  it('acepta el instante exacto y rechaza el milisegundo siguiente', () => {
    const limite = new Date('2026-10-21T12:00:00.000Z');
    expect(plazoVencido(limite, new Date(limite.getTime()))).toBe(false);
    expect(plazoVencido(limite, new Date(limite.getTime() + 1))).toBe(true);
    expect(plazoVencido(null, limite)).toBe(false);
  });
});

describe('respuestas, cierre y resultados', () => {
  it('registra una opción y un verdadero o falso sin revelar la solución', async () => {
    const { servicio, codigo, iniciada } = await salaLista();
    expect(JSON.stringify(iniciada)).not.toContain('correcta');
    const conOpcion = await servicio.responder(codigo, luis, {
      opcionId: 'p1a',
    });
    expect(conOpcion.estado).toBe('pregunta');
    expect(
      conOpcion.participantes.find((item) => item.perfilId === 'luis')
        ?.respuestas,
    ).toEqual([
      {
        preguntaId: 'p1',
        valor: null,
        opcionId: 'p1a',
        aceptada: true,
        tardia: false,
        puntos: 0,
      },
    ]);
    expect(JSON.stringify(conOpcion)).not.toContain('correcta');
    const vistaAjena = await servicio.obtener(codigo, ana);
    expect(
      vistaAjena.participantes.find((item) => item.perfilId === 'luis')
        ?.respuestas[0],
    ).toEqual({
      preguntaId: 'p1',
      valor: null,
      aceptada: true,
      tardia: false,
      puntos: 0,
    });

    const conValor = await servicio.responder(codigo, marta, { valor: false });
    expect(
      conValor.participantes.find((item) => item.perfilId === 'marta')
        ?.respuestas[0],
    ).toMatchObject({ preguntaId: 'p1', valor: false, puntos: 0 });
  });

  it('rechaza quien no está en la sala, una opción ajena, el vacío y la pregunta anterior', async () => {
    const { servicio, codigo } = await salaLista();
    const ajeno = await rechazo(
      servicio.responder(codigo, ana, { opcionId: 'p1a' }),
    );
    expect(ajeno).toBeInstanceOf(ForbiddenException);
    expect(ajeno.getResponse().mensaje).toBe('No estás unido a esta sala.');

    const extraña = await rechazo(
      servicio.responder(codigo, luis, { opcionId: 'p2b' }),
    );
    expect(extraña.getResponse().mensaje).toBe(
      'Esa opción no pertenece a la pregunta.',
    );

    const vacia = await rechazo(servicio.responder(codigo, luis, {}));
    expect(vacia.getResponse().mensaje).toBe('Elige una respuesta.');

    await servicio.responder(codigo, luis, { opcionId: 'p1a' });
    await servicio.cerrar(codigo, ana);
    await servicio.avanzar(codigo, ana);
    const anterior = await rechazo(
      servicio.responder(codigo, luis, { opcionId: 'p1a' }),
    );
    expect(anterior.getResponse().mensaje).toBe(
      'Esa opción no pertenece a la pregunta.',
    );
  });

  it('rechaza duplicadas, tardías y las que llegan con la pregunta cerrada o finalizada', async () => {
    const { servicio, memoria, codigo } = await salaLista();
    await servicio.responder(codigo, luis, { opcionId: 'p1a' });
    const duplicada = await rechazo(
      servicio.responder(codigo, luis, { opcionId: 'p1b' }),
    );
    expect(duplicada).toBeInstanceOf(ConflictException);
    expect(duplicada.getResponse().mensaje).toBe(
      'Ya enviaste una respuesta para esta pregunta.',
    );
    expect(memoria.respuestas).toHaveLength(1);

    memoria.sesiones[0].cierraEn = new Date(Date.now() - 1000);
    const tardia = await rechazo(
      servicio.responder(codigo, marta, { opcionId: 'p1a' }),
    );
    expect(tardia.getResponse().mensaje).toBe(
      'El tiempo de respuesta terminó.',
    );
    expect(memoria.respuestas).toHaveLength(1);

    memoria.sesiones[0].cierraEn = new Date(Date.now() + 60_000);
    await servicio.cerrar(codigo, ana);
    const cerrada = await rechazo(
      servicio.responder(codigo, marta, { opcionId: 'p1a' }),
    );
    expect(cerrada.getResponse().mensaje).toBe(
      'La pregunta ya está cerrada. La respuesta no se acepta.',
    );

    await servicio.avanzar(codigo, ana);
    await servicio.cerrar(codigo, ana);
    await servicio.avanzar(codigo, ana);
    const fin = await rechazo(
      servicio.responder(codigo, marta, { valor: true }),
    );
    expect(fin.getResponse().mensaje).toBe('Esta partida ya finalizó.');
  });

  it('califica una sola vez y deja en cero a quien falló o no respondió', async () => {
    const { servicio, memoria, codigo } = await salaLista();
    await servicio.responder(codigo, luis, { opcionId: 'p1a' });
    await servicio.responder(codigo, marta, { opcionId: 'p1b' });
    memoria.cuestionarios[0].preguntas[0].opciones[0].correcta = false;
    const cerrada = await servicio.cerrar(codigo, ana);
    expect(cerrada.estado).toBe('cerrada');
    expect(cerrada.cierraEn).toBeNull();
    const luisSala = cerrada.participantes.find(
      (item) => item.perfilId === 'luis',
    );
    const martaSala = cerrada.participantes.find(
      (item) => item.perfilId === 'marta',
    );
    expect(luisSala).toMatchObject({ puntaje: 1, aciertos: 1 });
    expect(luisSala?.respuestas[0].puntos).toBe(1);
    expect(luisSala?.respuestas[0].opcionId).toBe('p1a');
    expect(martaSala).toMatchObject({ puntaje: 0, aciertos: 0 });
    expect(martaSala?.respuestas[0].puntos).toBe(0);
    expect(cerrada.preguntas[0].opciones[0]).toMatchObject({
      id: 'p1a',
      correcta: true,
    });
    expect(cerrada.preguntas[1].enunciado).toBe('');

    const otra = await rechazo(servicio.cerrar(codigo, ana));
    expect(otra.getResponse().mensaje).toBe('No hay una pregunta abierta.');
    expect(
      memoria.sesiones[0].participantes.find((item) => item.perfilId === 'luis')
        ?.puntaje,
    ).toBe(1);

    const intruso = await rechazo(servicio.cerrar(codigo, luis));
    expect(intruso).toBeInstanceOf(ForbiddenException);
  });

  it('revierte la calificación si el cierre no confirma el estado', async () => {
    const { servicio, memoria, codigo } = await salaLista();
    await servicio.responder(codigo, luis, { opcionId: 'p1a' });
    memoria.sesionJuego.updateMany = () => Promise.resolve({ count: 0 });
    const error = await rechazo(servicio.cerrar(codigo, ana));
    expect(error.getResponse().mensaje).toBe('No hay una pregunta abierta.');
    expect(memoria.sesiones[0].estado).toBe('pregunta');
    expect(
      memoria.sesiones[0].participantes.find((item) => item.perfilId === 'luis')
        ?.puntaje,
    ).toBe(0);
    expect(memoria.respuestas[0].puntos).toBe(0);
  });

  it('serializa dos respuestas del mismo participante y varias de personas distintas', async () => {
    const { servicio, memoria, codigo } = await salaLista();
    const duplicadas = await Promise.allSettled([
      servicio.responder(codigo, luis, { opcionId: 'p1a' }),
      servicio.responder(codigo, luis, { opcionId: 'p1a' }),
    ]);
    expect(
      duplicadas.filter((item) => item.status === 'fulfilled'),
    ).toHaveLength(1);
    expect(
      duplicadas.filter((item) => item.status === 'rejected'),
    ).toHaveLength(1);
    expect(memoria.respuestas).toHaveLength(1);

    await servicio.responder(codigo, marta, { valor: true });
    expect(memoria.respuestas).toHaveLength(2);
    await servicio.cerrar(codigo, ana);
    expect(
      memoria.sesiones[0].participantes.every((item) => item.puntaje === 1),
    ).toBe(true);
  });

  it('no acepta una respuesta que espera mientras el anfitrión cierra', async () => {
    const { servicio, memoria, codigo } = await salaLista();
    await servicio.responder(codigo, luis, { opcionId: 'p1a' });
    let seguir: () => void = () => undefined;
    let avisar: () => void = () => undefined;
    const enElCandado = new Promise<void>((resolve) => {
      avisar = resolve;
    });
    memoria.ganchoTrasBloquear = () => {
      avisar();
      return new Promise<void>((resolve) => {
        seguir = resolve;
      });
    };
    const cierre = servicio.cerrar(codigo, ana);
    await enElCandado;
    const tardia = servicio.responder(codigo, marta, { opcionId: 'p1a' });
    let termino = false;
    void tardia.then(
      () => {
        termino = true;
      },
      () => {
        termino = true;
      },
    );
    await new Promise((resolve) => setImmediate(resolve));
    expect(termino).toBe(false);
    seguir();
    const cerrada = await cierre;
    const error = await rechazo(tardia);
    expect(cerrada.estado).toBe('cerrada');
    expect(error.getResponse().mensaje).toBe(
      'La pregunta ya está cerrada. La respuesta no se acepta.',
    );
    expect(memoria.respuestas.map((item) => item.participanteId)).toEqual([
      memoria.sesiones[0].participantes.find((item) => item.perfilId === 'luis')
        ?.id,
    ]);
    expect(
      cerrada.participantes.find((item) => item.perfilId === 'luis')?.puntaje,
    ).toBe(1);
  });

  it('avanza una sola pregunta, renueva el plazo y no muestra la solución abierta', async () => {
    const { servicio, codigo } = await salaLista();
    await servicio.responder(codigo, luis, { opcionId: 'p1a' });
    await servicio.cerrar(codigo, ana);
    const antes = Date.now();
    const avanzada = await servicio.avanzar(codigo, ana);
    expect(avanzada.estado).toBe('pregunta');
    expect(avanzada.preguntaActual).toBe(1);
    expect(avanzada.segundos).toBe(20);
    expect(new Date(avanzada.cierraEn ?? 0).getTime()).toBeGreaterThanOrEqual(
      antes + 20_000,
    );
    expect(avanzada.preguntas[0].respuestaCorrecta).toBe(true);
    expect(avanzada.preguntas[1].enunciado).toBe(
      'La herencia copia cada método a mano.',
    );
    expect(avanzada.preguntas[1].opciones[0]).toEqual({
      id: 'p2a',
      texto: 'Sí',
    });
    expect(JSON.stringify(avanzada.preguntas[1])).not.toContain('correcta');

    const repetido = await rechazo(servicio.avanzar(codigo, ana));
    expect(repetido.getResponse().mensaje).toBe(
      'Cierra la pregunta antes de avanzar.',
    );
    expect((await servicio.obtener(codigo, ana)).preguntaActual).toBe(1);

    const ajeno = await rechazo(servicio.avanzar(codigo, luis));
    expect(ajeno.getResponse().mensaje).toBe(
      'Solo el anfitrión puede avanzar la partida.',
    );
    const temprano = await rechazo(servicio.avanzar(codigo, ana));
    expect(temprano.getResponse().mensaje).toBe(
      'Cierra la pregunta antes de avanzar.',
    );
  });

  it('no deja que un avance paralelo salte preguntas ni se adelante al cierre', async () => {
    const { servicio, memoria, codigo } = await salaLista();
    await servicio.responder(codigo, luis, { opcionId: 'p1a' });
    let seguir: () => void = () => undefined;
    let avisar: () => void = () => undefined;
    const enElCandado = new Promise<void>((resolve) => {
      avisar = resolve;
    });
    memoria.ganchoTrasBloquear = () => {
      avisar();
      return new Promise<void>((resolve) => {
        seguir = resolve;
      });
    };
    const cierre = servicio.cerrar(codigo, ana);
    await enElCandado;
    const paso = servicio.avanzar(codigo, ana);
    let termino = false;
    void paso.then(
      () => {
        termino = true;
      },
      () => {
        termino = true;
      },
    );
    await new Promise((resolve) => setImmediate(resolve));
    expect(termino).toBe(false);
    seguir();
    await cierre;
    const avanzada = await paso;
    expect(avanzada.preguntaActual).toBe(1);
    expect(
      avanzada.participantes.find((item) => item.perfilId === 'luis')?.puntaje,
    ).toBe(1);

    await servicio.cerrar(codigo, ana);
    const saltos = await Promise.allSettled([
      servicio.avanzar(codigo, ana),
      servicio.avanzar(codigo, ana),
    ]);
    expect(saltos.filter((item) => item.status === 'fulfilled')).toHaveLength(
      1,
    );
    expect(memoria.sesiones[0].estado).toBe('finalizada');
    expect(memoria.sesiones[0].preguntaActual).toBe(1);
  });

  it('finaliza, guarda un resultado por participante y puede reintentar si falla', async () => {
    const { servicio, resultados, memoria, avisos, codigo } = await salaLista();
    await servicio.responder(codigo, luis, { opcionId: 'p1a' });
    await servicio.cerrar(codigo, ana);
    await servicio.avanzar(codigo, ana);
    await servicio.responder(codigo, luis, { opcionId: 'p2b' });
    await servicio.cerrar(codigo, ana);
    memoria.fallarResultados = true;
    await rechazo(servicio.avanzar(codigo, ana));
    expect(memoria.sesiones[0].estado).toBe('cerrada');
    expect(memoria.sesiones[0].finalizadaEn).toBeNull();
    expect(memoria.resultados).toHaveLength(0);

    memoria.fallarResultados = false;
    const fin = await servicio.avanzar(codigo, ana);
    expect(fin.estado).toBe('finalizada');
    expect(fin.cierraEn).toBeNull();
    expect(memoria.sesiones[0].finalizadaEn).toBeInstanceOf(Date);
    expect(memoria.resultados).toHaveLength(2);
    const deLuis = memoria.resultados.find(
      (item) =>
        item.participanteId ===
        memoria.sesiones[0].participantes.find(
          (persona) => persona.perfilId === 'luis',
        )?.id,
    );
    expect(deLuis).toMatchObject({
      puntuacion: 2,
      aciertos: 2,
      incorrectas: 0,
    });
    const deMarta = memoria.resultados.find((item) => item !== deLuis);
    expect(deMarta).toMatchObject({
      puntuacion: 0,
      aciertos: 0,
      incorrectas: 2,
    });
    expect(avisos.recientes().map((item) => item.tipo)).toContain(
      'sesion-finalizada',
    );

    const repetida = await rechazo(servicio.avanzar(codigo, ana));
    expect(repetida.getResponse().mensaje).toBe('La partida ya finalizó.');
    expect(memoria.resultados).toHaveLength(2);

    const resumen = await resultados.obtener(codigo, luis);
    expect(resumen).toMatchObject({
      codigo,
      titulo: 'Paradigma en vivo',
      anfitrionId: 'ana',
    });
    expect(resumen.participantes.map((item) => item.perfilId)).toEqual([
      'luis',
      'marta',
    ]);
    expect(typeof resumen.finalizadaEn).toBe('string');

    const ajena = await rechazo(
      resultados.obtener(codigo, { id: 'nora', nombre: 'Nora' }),
    );
    expect(ajena).toBeInstanceOf(ForbiddenException);
    const salaAjena = await rechazo(
      servicio.obtener(codigo, { id: 'nora', nombre: 'Nora' }),
    );
    expect(salaAjena.getResponse().mensaje).toBe(
      'No puedes ver los resultados de esta partida.',
    );

    const historialAna = await resultados.historial(ana);
    const historialLuis = await resultados.historial(luis);
    const historialNora = await resultados.historial({
      id: 'nora',
      nombre: 'Nora',
    });
    expect(historialAna).toHaveLength(1);
    expect(historialLuis).toHaveLength(1);
    expect(historialNora).toEqual([]);
    expect(historialAna[0].codigo).toBe(codigo);

    const ausente = await rechazo(resultados.obtener('ZZZZZZ', ana));
    expect(ausente).toBeInstanceOf(NotFoundException);
    expect(ausente.getResponse().mensaje).toBe(
      'Esta sesión todavía no tiene resultados guardados.',
    );
  });
});
