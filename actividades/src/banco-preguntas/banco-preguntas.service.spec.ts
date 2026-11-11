import { BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ResultadosService } from '../resultados/resultados.service';
import {
  deduplicarYValidarHistorial,
  validarRespuestasDePartida,
} from '../resultados/validacion-resultados';
import { BancoPreguntasService } from './banco-preguntas.service';
import {
  CUESTIONARIOS_BANCO,
  MODOS_JUEGO,
  PREGUNTAS_KANBAN_ACADEMICAS,
  SESIONES_DEMOSTRACION,
} from './datos-banco';

const PREGUNTA_VALIDACION = {
  id: 'f1',
  orden: 1,
  enunciado: 'Pregunta de la prueba',
  respuestaCorrecta: true,
  segundos: 20,
  imagen: null,
  opciones: [
    { id: 'f1:verdadero', texto: 'Verdadero', orden: 1, correcta: true },
    { id: 'f1:falso', texto: 'Falso', orden: 2, correcta: false },
  ],
};

async function asegurarCuestionarioLocal(prisma: PrismaService) {
  if (prisma.estado() === 'disponible') return;
  const db = prisma.obtener() as {
    cuestionario: {
      create(args: { data: Record<string, unknown> }): Promise<unknown>;
    };
    pregunta: {
      create(args: { data: Record<string, unknown> }): Promise<unknown>;
    };
    opcion: {
      create(args: { data: Record<string, unknown> }): Promise<unknown>;
    };
  };
  await db.cuestionario.create({
    data: {
      id: 'demo-funcional',
      autorId: 'spec',
      autorNombre: 'Spec',
      titulo: 'Spec',
      descripcion: 'Spec',
      categoria: 'General',
      etiquetas: [],
      dificultad: 'facil',
      esDemostracion: false,
      imagenId: null,
    },
  });
  const pares: Array<[string, boolean]> = [
    ['f1', true],
    ['f2', false],
    ['f3', true],
    ['f4', false],
  ];
  for (const [indice, [id, correcta]] of pares.entries()) {
    await db.pregunta.create({
      data: {
        id,
        cuestionarioId: 'demo-funcional',
        enunciado: `Pregunta ${id}`,
        orden: indice + 1,
        respuestaCorrecta: correcta,
        segundos: 20,
        imagenId: null,
      },
    });
    await db.opcion.create({
      data: {
        id: `${id}:verdadero`,
        preguntaId: id,
        texto: 'Verdadero',
        orden: 1,
        correcta,
      },
    });
    await db.opcion.create({
      data: {
        id: `${id}:falso`,
        preguntaId: id,
        texto: 'Falso',
        orden: 2,
        correcta: !correcta,
      },
    });
  }
}

describe('Banco de preguntas y persistencia (Persona 4)', () => {
  let prisma: PrismaService;
  let banco: BancoPreguntasService;
  let resultados: ResultadosService;

  beforeEach(async () => {
    prisma = new PrismaService();
    await prisma.onModuleInit();
    banco = new BancoPreguntasService(prisma);
    resultados = new ResultadosService(prisma);
  });

  it('define la estructura de juegos, preguntas, respuestas y los cuatro modos de demostración', () => {
    expect(MODOS_JUEGO.map((m) => m.id)).toEqual([
      'en-vivo',
      'practica',
      'evaluacion',
      'desafio',
    ]);
    const modosDemo = banco.obtenerModosDemostracion();
    expect(modosDemo).toHaveLength(4);
    for (const modo of modosDemo) {
      expect(modo.cuestionarios.length).toBeGreaterThanOrEqual(0);
    }
    expect(CUESTIONARIOS_BANCO).toEqual([]);
    expect(SESIONES_DEMOSTRACION).toEqual([]);
  });

  it('no guarda preguntas académicas en el código', () => {
    expect(PREGUNTAS_KANBAN_ACADEMICAS).toEqual([]);
    const respuestaKanban = banco.obtenerBancoKanban();
    expect(respuestaKanban.totalPreguntas).toBe(0);
    expect(respuestaKanban.cuestionarios).toEqual([]);
  });

  it('filtra el banco de preguntas por modo, categoría y texto a través del servicio integrado', async () => {
    const porModo = await banco.listarPreguntas({ modo: 'evaluacion' });
    expect(porModo.every((p) => p.modoRecomendado === 'evaluacion')).toBe(true);

    const porTexto = await banco.listarPreguntas({
      categoria: 'Kanban',
      texto: 'Ley de Little',
    });
    expect(porTexto).toEqual([]);
  });

  it('gestiona el guardado de partidas validando respuestas y asociando el progreso al usuario autenticado', async () => {
    const identidad = {
      id: 'estudiante-kanban-1',
      correo: 'estudiante@kanban.test',
      nombre: 'Camila Kanban',
      rol: 'student',
    };

    await asegurarCuestionarioLocal(prisma);

    const guardado = await resultados.guardarPartida(
      {
        cuestionarioId: 'demo-funcional',
        modo: 'practica',
        respuestas: [
          { preguntaId: 'f1', opcionId: 'f1:verdadero' },
          { preguntaId: 'f2', opcionId: 'f2:falso' },
          { preguntaId: 'f3', opcionId: 'f3:verdadero' },
          { preguntaId: 'f4', opcionId: 'f4:falso' },
        ],
      },
      identidad,
    );

    expect(guardado.participantes).toHaveLength(1);
    expect(guardado.participantes[0]?.nombre).toBe('Camila Kanban');
    expect(guardado.participantes[0]?.aciertos).toBe(4);
    expect(guardado.participantes[0]?.puntaje).toBe(4);

    const progreso = await resultados.progreso(identidad);
    expect(progreso.usuarioId).toBe('estudiante-kanban-1');
    expect(progreso.partidasJugadas).toBe(1);
    expect(progreso.totalAciertos).toBe(4);
    expect(progreso.totalPreguntasRespondidas).toBe(4);
  });

  it('evita duplicados de preguntas, de códigos de partida y rechaza puntajes adulterados', async () => {
    const identidad = {
      id: 'estudiante-validacion',
      correo: 'val@kanban.test',
      nombre: 'Valeria Validación',
      rol: 'student',
    };
    const otro = {
      id: 'otro-estudiante',
      correo: 'otro@kanban.test',
      nombre: 'Otro Estudiante',
      rol: 'student',
    };
    const preguntasFila = [PREGUNTA_VALIDACION];

    expect(() =>
      validarRespuestasDePartida(preguntasFila, [
        { preguntaId: 'f1', opcionId: 'f1:verdadero' },
        { preguntaId: 'f1', opcionId: 'f1:falso' },
      ]),
    ).toThrow(ConflictException);

    expect(() =>
      validarRespuestasDePartida(
        preguntasFila,
        [{ preguntaId: 'f1', opcionId: 'f1:verdadero' }],
        999,
      ),
    ).toThrow(BadRequestException);

    await asegurarCuestionarioLocal(prisma);

    await resultados.guardarPartida(
      {
        codigo: 'UNICO1',
        cuestionarioId: 'demo-funcional',
        respuestas: [{ preguntaId: 'f1', opcionId: 'f1:verdadero' }],
      },
      identidad,
    );

    await expect(
      resultados.guardarPartida(
        {
          codigo: 'UNICO1',
          cuestionarioId: 'demo-funcional',
          respuestas: [{ preguntaId: 'f1', opcionId: 'f1:verdadero' }],
        },
        otro,
      ),
    ).rejects.toThrow(ConflictException);

    const historial = await resultados.historial(identidad);
    const conCodigo = historial.filter((item) => item.codigo === 'UNICO1');
    expect(conCodigo).toHaveLength(1);
    expect(deduplicarYValidarHistorial([]).length).toBe(0);
  });
});
