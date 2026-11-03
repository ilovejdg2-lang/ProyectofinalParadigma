import { ConflictException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AvisoSesionesLocal } from '../src/sesiones-juego/aviso-sesiones';
import { SesionesJuegoService } from '../src/sesiones-juego/sesiones-juego.service';
import { PrismaService } from '../src/prisma/prisma.service';
import type { IdentidadExterna } from '../src/autenticacion/identidad-externa';

const databaseUrl = process.env.ACTIVIDADES_TEST_DATABASE_URL?.trim();
const databaseNamePrefix = 'actividades_concurrency_test_';

function validarBaseAislada(url: string | undefined): asserts url is string {
  if (!url) {
    throw new Error(
      'ACTIVIDADES_TEST_DATABASE_URL es obligatoria; apunta a una base local aislada.',
    );
  }

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error('ACTIVIDADES_TEST_DATABASE_URL no es una URL válida.');
  }

  const databaseName = decodeURIComponent(parsed.pathname.slice(1));
  if (
    !['localhost', '127.0.0.1', '[::1]'].includes(parsed.hostname) ||
    !databaseName.startsWith(databaseNamePrefix)
  ) {
    throw new Error(
      `La prueba solo permite una base local cuyo nombre empiece con ${databaseNamePrefix}.`,
    );
  }
}

describe('Concurrencia real de sesiones de juego en PostgreSQL', () => {
  let prisma: PrismaService;
  let sesiones: SesionesJuegoService;
  let codigoCreado: string | undefined;

  const anfitrion: IdentidadExterna = {
    id: 'perfil-demo',
    nombre: 'Docente de prueba',
    role: 'teacher',
  };
  const participante: IdentidadExterna = {
    id: 'perfil-concurrencia-local',
    nombre: 'Participante de prueba',
    role: 'student',
  };

  beforeAll(async () => {
    validarBaseAislada(databaseUrl);
    const config = {
      get: (key: string) => (key === 'DIRECT_URL' ? databaseUrl : undefined),
    } as ConfigService;

    prisma = new PrismaService(config);
    await prisma.onModuleInit();
    if (prisma.estado() !== 'disponible') {
      throw new Error('No se pudo conectar a la base local aislada.');
    }

    const cuestionario = await prisma.obtener().cuestionario.findUnique({
      where: { id: 'demo-funcional' },
      select: { id: true },
    });
    if (!cuestionario) {
      throw new Error(
        'Falta el seed local; aplica la migración y ejecuta npm run db:seed en la base aislada.',
      );
    }

    sesiones = new SesionesJuegoService(prisma, new AvisoSesionesLocal());
  });

  afterEach(async () => {
    if (codigoCreado) {
      const sala = await prisma.obtener().sesionJuego.findUnique({
        where: { codigo: codigoCreado },
        select: { id: true },
      });
      if (sala) {
        await prisma.obtener().participante.deleteMany({
          where: { sesionId: sala.id },
        });
      }
      await prisma.obtener().sesionJuego.deleteMany({
        where: { codigo: codigoCreado },
      });
      codigoCreado = undefined;
    }
  });

  afterAll(async () => {
    await prisma?.onModuleDestroy();
  });

  it('rechaza destinos no locales o nombres fuera del prefijo de test', () => {
    expect(() =>
      validarBaseAislada(
        'postgresql://user:pass@db.example.invalid:5432/postgres',
      ),
    ).toThrow(/solo permite una base local/i);
    expect(() =>
      validarBaseAislada('postgresql://user:pass@127.0.0.1:5432/postgres'),
    ).toThrow(/solo permite una base local/i);
  });

  it('permite una sola solicitud al iniciar la misma partida en paralelo', async () => {
    const sala = await sesiones.crear('demo-funcional', anfitrion);
    codigoCreado = sala.codigo;
    await sesiones.unirse(sala.codigo, participante);

    const intentos = await Promise.allSettled([
      sesiones.iniciar(sala.codigo, anfitrion),
      sesiones.iniciar(sala.codigo, anfitrion),
    ]);

    const exitosos = intentos.filter(
      (intento) => intento.status === 'fulfilled',
    );
    const fallidos = intentos.filter(
      (intento) => intento.status === 'rejected',
    );
    expect(exitosos).toHaveLength(1);
    expect(fallidos).toHaveLength(1);
    if (fallidos[0]?.status === 'rejected') {
      expect(fallidos[0].reason).toBeInstanceOf(ConflictException);
    }

    const persistida = await prisma.obtener().sesionJuego.findUnique({
      where: { codigo: sala.codigo },
      select: { estado: true, preguntaActual: true },
    });
    expect(persistida).toMatchObject({ estado: 'pregunta', preguntaActual: 0 });
  });
});
