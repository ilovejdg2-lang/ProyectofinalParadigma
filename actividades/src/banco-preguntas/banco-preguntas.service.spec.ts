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
      expect(modo.cuestionarios.length).toBeGreaterThanOrEqual(1);
    }
    for (const cuestionario of CUESTIONARIOS_BANCO) {
      expect(cuestionario.preguntas.length).toBeGreaterThanOrEqual(4);
      for (const pregunta of cuestionario.preguntas) {
        expect(pregunta.opciones.length).toBeGreaterThanOrEqual(2);
        expect(
          pregunta.opciones.filter((opcion) => opcion.correcta),
        ).toHaveLength(1);
      }
    }
    expect(SESIONES_DEMOSTRACION.length).toBeGreaterThanOrEqual(3);
  });

  it('incluye las preguntas académicas sobre Kanban con explicación y opciones válidas', () => {
    expect(PREGUNTAS_KANBAN_ACADEMICAS.length).toBeGreaterThanOrEqual(15);
    const respuestaKanban = banco.obtenerBancoKanban();
    expect(respuestaKanban.totalPreguntas).toBe(
      PREGUNTAS_KANBAN_ACADEMICAS.length,
    );
    expect(respuestaKanban.cuestionarios.map((c) => c.id)).toEqual([
      'demo-kanban-fundamentos',
      'demo-kanban-metricas',
      'demo-kanban-tablero',
    ]);
    expect(
      respuestaKanban.cuestionarios.every((c) =>
        c.preguntas.every((p) => Boolean(p.explicacion?.trim())),
      ),
    ).toBe(true);
  });

  it('filtra el banco de preguntas por modo, categoría y texto a través del servicio integrado', async () => {
    const porModo = await banco.listarPreguntas({ modo: 'evaluacion' });
    expect(porModo.length).toBeGreaterThan(0);
    expect(porModo.every((p) => p.modoRecomendado === 'evaluacion')).toBe(true);

    const porTexto = await banco.listarPreguntas({
      categoria: 'Kanban',
      texto: 'Ley de Little',
    });
    expect(porTexto.map((p) => p.cuestionarioId)).toContain(
      'demo-kanban-metricas',
    );
  });

  it('gestiona el guardado de partidas validando respuestas y asociando el progreso al usuario autenticado', async () => {
    const identidad = {
      id: 'estudiante-kanban-1',
      correo: 'estudiante@kanban.test',
      nombre: 'Camila Kanban',
      rol: 'student',
    };

    const guardado = await resultados.guardarPartida(
      {
        cuestionarioId: 'demo-kanban-fundamentos',
        modo: 'practica',
        respuestas: [
          { preguntaId: 'k1', opcionId: 'k1:verdadero' },
          { preguntaId: 'k2', opcionId: 'k2:falso' },
          { preguntaId: 'k3', valor: true },
          { preguntaId: 'k4', opcionId: 'k4:verdadero' },
          { preguntaId: 'k5', opcionId: 'k5:verdadero' },
          { preguntaId: 'k6', opcionId: 'k6:verdadero' },
        ],
      },
      identidad,
    );

    expect(guardado.participantes).toHaveLength(1);
    expect(guardado.participantes[0]?.nombre).toBe('Camila Kanban');
    expect(guardado.participantes[0]?.aciertos).toBe(5);
    expect(guardado.participantes[0]?.puntaje).toBe(5);

    const progreso = await resultados.progreso(identidad);
    expect(progreso.usuarioId).toBe('estudiante-kanban-1');
    expect(progreso.partidasJugadas).toBe(1);
    expect(progreso.totalAciertos).toBe(5);
    expect(progreso.totalPreguntasRespondidas).toBe(6);
    expect(progreso.dominioKanban.porcentajeDominio).toBe(83);
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
    const kanban = CUESTIONARIOS_BANCO.find(
      (item) => item.id === 'demo-kanban-fundamentos',
    )!;
    const preguntasFila = kanban.preguntas.map((p) => ({
      ...p,
      segundos: p.segundos ?? 20,
      imagen: null,
    }));

    expect(() =>
      validarRespuestasDePartida(preguntasFila, [
        { preguntaId: 'k1', opcionId: 'k1:verdadero' },
        { preguntaId: 'k1', opcionId: 'k1:falso' },
      ]),
    ).toThrow(ConflictException);

    expect(() =>
      validarRespuestasDePartida(
        preguntasFila,
        [{ preguntaId: 'k1', opcionId: 'k1:verdadero' }],
        999,
      ),
    ).toThrow(BadRequestException);

    await resultados.guardarPartida(
      {
        codigo: 'UNICO1',
        cuestionarioId: 'demo-kanban-fundamentos',
        respuestas: [{ preguntaId: 'k1', opcionId: 'k1:verdadero' }],
      },
      identidad,
    );

    await expect(
      resultados.guardarPartida(
        {
          codigo: 'UNICO1',
          cuestionarioId: 'demo-kanban-fundamentos',
          respuestas: [{ preguntaId: 'k1', opcionId: 'k1:verdadero' }],
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
