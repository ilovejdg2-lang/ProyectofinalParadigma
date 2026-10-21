import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { IdentidadExterna } from '../autenticacion/identidad-externa';
import { PrismaService } from '../prisma/prisma.service';
import { AvisoSesionesLocal } from './aviso-sesiones';
import { SesionesJuegoService } from './sesiones-juego.service';
import { cuestionarioValido, SesionMemoria } from '../../test/sesion-memoria';

const ana: IdentidadExterna = { id: 'ana', nombre: 'Ana' };
const luis: IdentidadExterna = { id: 'luis', nombre: 'Luis' };
const CODIGO = /^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}$/;

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

describe('SesionesJuegoService', () => {
  it('crea una sala esperando con un código de seis caracteres', async () => {
    const { servicio, avisos } = armar();
    const sala = await servicio.crear('quiz-1', ana);
    expect(sala.codigo).toMatch(CODIGO);
    expect(sala).toMatchObject({
      cuestionarioId: 'quiz-1',
      titulo: 'Paradigma en vivo',
      anfitrionId: 'ana',
      anfitrionNombre: 'Ana',
      estado: 'esperando',
      preguntaActual: 0,
      segundos: 20,
      cierraEn: null,
      participantes: [],
      canal: 'remoto',
    });
    expect(sala.preguntas).toEqual([
      { id: 'p1', enunciado: '', orden: 1, opciones: [] },
      { id: 'p2', enunciado: '', orden: 2, opciones: [] },
    ]);
    expect(JSON.stringify(sala)).not.toContain('correcta');
    expect(avisos.recientes()).toEqual([
      expect.objectContaining({ tipo: 'sala-creada', codigo: sala.codigo }),
    ]);
  });

  it('genera códigos distintos y reintenta cuando hay una colisión', async () => {
    const { servicio, memoria } = armar();
    memoria.fallosCodigoRestantes = 2;
    const primera = await servicio.crear('quiz-1', ana);
    const segunda = await servicio.crear('quiz-1', ana);
    expect(primera.codigo).not.toBe(segunda.codigo);
    expect(new Set([primera.codigo, segunda.codigo]).size).toBe(2);
  });

  it('se detiene si el código choca demasiadas veces', async () => {
    const { servicio, memoria } = armar();
    memoria.fallosCodigoRestantes = 8;
    const error = await rechazo(servicio.crear('quiz-1', ana));
    expect(error).toBeInstanceOf(ConflictException);
    expect(error.getResponse()).toEqual({
      mensaje: 'No se pudo crear la sala. Intenta de nuevo.',
    });
    expect(memoria.sesiones).toHaveLength(0);
  });

  it('rechaza un cuestionario inexistente, eliminado o incompleto', async () => {
    const { servicio, memoria } = armar();
    const ausente = await rechazo(servicio.crear('no-existe', ana));
    expect(ausente).toBeInstanceOf(NotFoundException);
    expect(ausente.getResponse().mensaje).toBe(
      'No se encontró el cuestionario.',
    );

    memoria.cuestionarios[0].eliminadoEn = new Date();
    const borrado = await rechazo(servicio.crear('quiz-1', ana));
    expect(borrado.getResponse().mensaje).toBe(
      'No se encontró el cuestionario.',
    );

    memoria.cuestionarios[0].eliminadoEn = null;
    memoria.cuestionarios[0].preguntas = [];
    const vacio = await rechazo(servicio.crear('quiz-1', ana));
    expect(vacio.getResponse().mensaje).toBe(
      'El cuestionario no tiene preguntas.',
    );

    memoria.cuestionarios[0] = cuestionarioValido();
    memoria.cuestionarios[0].preguntas[0].opciones = [
      { id: 'solo', texto: 'Única', orden: 1, correcta: true },
    ];
    const incompleto = await rechazo(servicio.crear('quiz-1', ana));
    expect(incompleto.getResponse().mensaje).toBe(
      'El cuestionario no está listo para jugar.',
    );
  });

  it('incorpora participantes sin duplicarlos y rechaza una sala finalizada', async () => {
    const { servicio, memoria, avisos } = armar();
    const sala = await servicio.crear('quiz-1', ana);
    const conLuis = await servicio.unirse(sala.codigo, luis);
    const repetido = await servicio.unirse(sala.codigo, {
      id: 'luis',
      nombre: 'Luis Renovado',
    });
    expect(repetido.participantes).toEqual([
      expect.objectContaining({
        perfilId: 'luis',
        nombre: 'Luis Renovado',
        conectado: true,
        puntaje: 0,
        aciertos: 0,
        respuestas: [],
      }),
    ]);
    expect(conLuis.participantes).toHaveLength(1);

    await servicio.unirse(sala.codigo, { id: 'marta', nombre: 'Marta' });
    expect(
      (await servicio.obtener(sala.codigo, ana)).participantes,
    ).toHaveLength(2);
    expect(avisos.recientes().map((aviso) => aviso.tipo)).toEqual([
      'sala-creada',
      'participante-incorporado',
      'participante-incorporado',
      'participante-incorporado',
    ]);

    memoria.sesiones[0].estado = 'finalizada';
    const cerrada = await rechazo(servicio.unirse(sala.codigo, luis));
    expect(cerrada).toBeInstanceOf(ConflictException);
    expect(cerrada.getResponse().mensaje).toBe('Esta partida ya finalizó.');
    expect(avisos.recientes()).toHaveLength(4);
  });

  it('resuelve uniones simultáneas del mismo perfil y de varios perfiles', async () => {
    const { servicio } = armar();
    const sala = await servicio.crear('quiz-1', ana);
    await Promise.all([
      servicio.unirse(sala.codigo, luis),
      servicio.unirse(sala.codigo, luis),
      servicio.unirse(sala.codigo, { id: 'marta', nombre: 'Marta' }),
      servicio.unirse(sala.codigo, { id: 'nora', nombre: 'Nora' }),
    ]);
    const actual = await servicio.obtener(sala.codigo, ana);
    expect(actual.participantes.map((item) => item.perfilId).sort()).toEqual([
      'luis',
      'marta',
      'nora',
    ]);
  });

  it('inicia una sola vez, guarda la instantánea y no la altera si el cuestionario cambia', async () => {
    const { servicio, memoria, avisos } = armar();
    const sala = await servicio.crear('quiz-1', ana);
    const sinGente = await rechazo(servicio.iniciar(sala.codigo, ana));
    expect(sinGente.getResponse().mensaje).toBe(
      'Todavía no hay participantes.',
    );

    await servicio.unirse(sala.codigo, luis);
    const ajena = await rechazo(servicio.iniciar(sala.codigo, luis));
    expect(ajena).toBeInstanceOf(ForbiddenException);
    expect(ajena.getResponse().mensaje).toBe(
      'Solo el anfitrión puede iniciar la partida.',
    );

    const antes = Date.now();
    const iniciada = await servicio.iniciar(sala.codigo, ana);
    const limite = new Date(iniciada.cierraEn ?? 0).getTime();
    expect(iniciada.estado).toBe('pregunta');
    expect(iniciada.preguntaActual).toBe(0);
    expect(iniciada.segundos).toBe(15);
    expect(limite).toBeGreaterThanOrEqual(antes + 15_000);
    expect(limite).toBeLessThanOrEqual(Date.now() + 15_000);
    expect(JSON.stringify(iniciada)).not.toContain('correcta');
    expect(
      memoria.sesiones[0].preguntasInstantanea?.preguntas[0],
    ).toMatchObject({
      enunciado: 'Una función pura no tiene efectos externos.',
      opciones: [
        { id: 'p1a', correcta: true },
        { id: 'p1b', correcta: false },
      ],
    });

    memoria.cuestionarios[0].preguntas[0].enunciado =
      'Enunciado editado después';
    memoria.cuestionarios[0].preguntas[0].opciones[0].correcta = false;
    const vigente = await servicio.obtener(sala.codigo, ana);
    expect(vigente.preguntas[0].enunciado).toBe(
      'Una función pura no tiene efectos externos.',
    );
    expect(JSON.stringify(vigente)).not.toContain('correcta');

    const repetido = await rechazo(servicio.iniciar(sala.codigo, ana));
    expect(repetido.getResponse().mensaje).toBe('La partida ya fue iniciada.');
    expect(
      avisos.recientes().filter((aviso) => aviso.tipo === 'partida-iniciada'),
    ).toHaveLength(1);
  });

  it('no deja iniciar dos veces la misma partida en paralelo', async () => {
    const { servicio, memoria } = armar();
    const sala = await servicio.crear('quiz-1', ana);
    await servicio.unirse(sala.codigo, luis);
    const resultados = await Promise.allSettled([
      servicio.iniciar(sala.codigo, ana),
      servicio.iniciar(sala.codigo, ana),
    ]);
    expect(
      resultados.filter((item) => item.status === 'fulfilled'),
    ).toHaveLength(1);
    expect(
      resultados.filter((item) => item.status === 'rejected'),
    ).toHaveLength(1);
    expect(memoria.sesiones[0].estado).toBe('pregunta');
    expect(memoria.sesiones[0].preguntasInstantanea?.version).toBe(1);
  });

  it('trata un update sin filas como un inicio ya consumido', async () => {
    const { servicio, memoria } = armar();
    const sala = await servicio.crear('quiz-1', ana);
    await servicio.unirse(sala.codigo, luis);
    memoria.sesionJuego.updateMany = () => Promise.resolve({ count: 0 });
    const error = await rechazo(servicio.iniciar(sala.codigo, ana));
    expect(error.getResponse().mensaje).toBe('La partida ya fue iniciada.');
    expect(memoria.sesiones[0].estado).toBe('esperando');
    expect(memoria.sesiones[0].preguntasInstantanea).toBeNull();
  });

  it('consulta la sala sin crear participantes y oculta las soluciones mientras sigue abierta', async () => {
    const { servicio, memoria } = armar();
    const sala = await servicio.crear('quiz-1', ana);
    const consulta = await servicio.obtener(sala.codigo.toLowerCase(), ana);
    expect(consulta.participantes).toEqual([]);
    expect(consulta.codigo).toBe(sala.codigo);

    const ausente = await rechazo(servicio.obtener('ZZZZZZ', ana));
    expect(ausente).toBeInstanceOf(NotFoundException);
    expect(ausente.getResponse().mensaje).toBe(
      'No hay una sala con ese código.',
    );

    await servicio.unirse(sala.codigo, luis);
    const otraVez = await servicio.obtener(sala.codigo, ana);
    expect(otraVez.participantes).toHaveLength(1);

    await servicio.iniciar(sala.codigo, ana);
    memoria.sesiones[0].estado = 'cerrada';
    const revelada = await servicio.obtener(sala.codigo, ana);
    expect(revelada.preguntas[0].respuestaCorrecta).toBe(true);
    expect(
      revelada.preguntas[0].opciones.find((opcion) => opcion.id === 'p1a')
        ?.correcta,
    ).toBe(true);
    expect(revelada.preguntas[1]).toEqual({
      id: 'p2',
      enunciado: '',
      orden: 2,
      opciones: [],
    });
  });

  it('no admite un participante nuevo después de iniciar y conserva al que ya estaba', async () => {
    const { servicio } = armar();
    const sala = await servicio.crear('quiz-1', ana);
    await servicio.unirse(sala.codigo, luis);
    await servicio.iniciar(sala.codigo, ana);
    const tarde = await rechazo(
      servicio.unirse(sala.codigo, { id: 'marta', nombre: 'Marta' }),
    );
    expect(tarde.getResponse().mensaje).toBe('La partida ya fue iniciada.');
    const reconexion = await servicio.unirse(sala.codigo, {
      id: 'luis',
      nombre: 'Luis',
    });
    expect(reconexion.participantes).toHaveLength(1);
    expect(reconexion.estado).toBe('pregunta');
  });

  it('revierte el inicio si el cuestionario dejó de ser jugable', async () => {
    const { servicio, memoria } = armar();
    const sala = await servicio.crear('quiz-1', ana);
    await servicio.unirse(sala.codigo, luis);
    memoria.cuestionarios[0].eliminadoEn = new Date();
    const borrado = await rechazo(servicio.iniciar(sala.codigo, ana));
    expect(borrado.getResponse().mensaje).toBe(
      'El cuestionario ya no está disponible.',
    );
    expect(memoria.sesiones[0].estado).toBe('esperando');

    memoria.cuestionarios[0].eliminadoEn = null;
    memoria.cuestionarios[0].preguntas[1].opciones[1].correcta = false;
    const invalido = await rechazo(servicio.iniciar(sala.codigo, ana));
    expect(invalido.getResponse().mensaje).toBe(
      'El cuestionario no está listo para jugar.',
    );
    expect(memoria.sesiones[0].preguntasInstantanea).toBeNull();
  });

  it('oculta la pregunta abierta y las siguientes, y revela solo las ya cerradas', async () => {
    const { servicio, memoria } = armar();
    const sala = await servicio.crear('quiz-1', ana);
    await servicio.unirse(sala.codigo, luis);
    const abierta = await servicio.iniciar(sala.codigo, ana);
    expect(abierta.preguntas).toHaveLength(2);
    expect(abierta.preguntaActual).toBe(0);
    expect(abierta.preguntas[0]).toEqual({
      id: 'p1',
      enunciado: 'Una función pura no tiene efectos externos.',
      orden: 1,
      opciones: [
        { id: 'p1a', texto: 'Verdadero' },
        { id: 'p1b', texto: 'Falso' },
      ],
    });
    expect(abierta.preguntas[1]).toEqual({
      id: 'p2',
      enunciado: '',
      orden: 2,
      opciones: [],
    });
    expect(JSON.stringify(abierta)).not.toContain('correcta');
    expect(JSON.stringify(abierta)).not.toContain('herencia');

    memoria.sesiones[0].estado = 'cerrada';
    const cerrada = await servicio.obtener(sala.codigo, ana);
    expect(cerrada.preguntas[0].respuestaCorrecta).toBe(true);
    expect(cerrada.preguntas[0].opciones[0]).toEqual({
      id: 'p1a',
      texto: 'Verdadero',
      correcta: true,
    });
    expect(JSON.stringify(cerrada.preguntas[1])).not.toContain('herencia');
    expect(JSON.stringify(cerrada.preguntas[1])).not.toContain('correcta');

    const instantanea = memoria.sesiones[0].preguntasInstantanea;
    instantanea?.preguntas.push({
      id: 'p3',
      enunciado: 'Secreto de la pregunta que no se jugó',
      orden: 3,
      respuestaCorrecta: true,
      segundos: null,
      opciones: [
        { id: 'p3a', texto: 'Oculta', orden: 1, correcta: true },
        { id: 'p3b', texto: 'También oculta', orden: 2, correcta: false },
      ],
    });
    memoria.sesiones[0].estado = 'finalizada';
    memoria.sesiones[0].preguntaActual = 1;
    const finalizada = await servicio.obtener(sala.codigo, ana);
    expect(finalizada.preguntas).toHaveLength(3);
    expect(finalizada.preguntas[0].respuestaCorrecta).toBe(true);
    expect(finalizada.preguntas[1].enunciado).toBe(
      'La herencia copia cada método a mano.',
    );
    expect(finalizada.preguntas[1].respuestaCorrecta).toBe(false);
    expect(finalizada.preguntas[2]).toEqual({
      id: 'p3',
      enunciado: '',
      orden: 3,
      opciones: [],
    });
    expect(JSON.stringify(finalizada)).not.toContain('Secreto');
  });

  it('no deja entrar a alguien nuevo entre la lectura y el inicio', async () => {
    const { servicio, memoria } = armar();
    const sala = await servicio.crear('quiz-1', ana);
    await servicio.unirse(sala.codigo, luis);
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

    const union = servicio.unirse(sala.codigo, {
      id: 'marta',
      nombre: 'Marta',
    });
    await enElCandado;
    const inicio = servicio.iniciar(sala.codigo, ana);
    let inicioTermino = false;
    void inicio.then(
      () => {
        inicioTermino = true;
      },
      () => {
        inicioTermino = true;
      },
    );
    await new Promise((resolve) => setImmediate(resolve));
    expect(inicioTermino).toBe(false);
    seguir();
    const [incorporada, iniciada] = await Promise.all([union, inicio]);
    expect(iniciada.estado).toBe('pregunta');
    expect(iniciada.participantes.map((item) => item.perfilId).sort()).toEqual([
      'luis',
      'marta',
    ]);
    expect(incorporada.participantes).toHaveLength(2);
    expect(memoria.sesiones[0].participantes).toHaveLength(2);
  });

  it('reconecta a quien ya estaba aunque el inicio ocurra al mismo tiempo', async () => {
    const { servicio } = armar();
    const sala = await servicio.crear('quiz-1', ana);
    await servicio.unirse(sala.codigo, luis);
    const [iniciada, reconectada] = await Promise.all([
      servicio.iniciar(sala.codigo, ana),
      servicio.unirse(sala.codigo, { id: 'luis', nombre: 'Luis Renovado' }),
    ]);
    expect(iniciada.estado).toBe('pregunta');
    expect(reconectada.estado).toBe('pregunta');
    expect(reconectada.participantes).toEqual([
      expect.objectContaining({
        perfilId: 'luis',
        nombre: 'Luis Renovado',
        respuestas: [],
      }),
    ]);
    const vigente = await servicio.obtener(sala.codigo, ana);
    expect(vigente.participantes).toHaveLength(1);
    expect(vigente).toMatchObject({
      codigo: sala.codigo,
      estado: 'pregunta',
      preguntaActual: 0,
      canal: 'remoto',
      anfitrionId: 'ana',
    });
  });

  it('responde que la base no está disponible', async () => {
    const avisos = new AvisoSesionesLocal();
    const servicio = new SesionesJuegoService(
      {
        estaListo: () => false,
        obtener: () => memoriaInutil(),
      } as unknown as PrismaService,
      avisos,
    );
    const error = await rechazo(servicio.crear('quiz-1', ana));
    expect(error).toBeInstanceOf(ServiceUnavailableException);
    expect(error.getResponse().mensaje).toBe(
      'La base de datos no está disponible.',
    );
  });
});

function memoriaInutil(): never {
  throw new Error('no debe consultar');
}
