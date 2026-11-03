import { ConfigService } from '@nestjs/config';
import { PrismaService } from './prisma.service';
import { afterAll, beforeAll, describe, expect, it } from '@jest/globals';

const testDatabaseUrl = process.env.AUTH_TEST_DATABASE_URL;

if (testDatabaseUrl) {
  let parsedUrl: URL;

  try {
    parsedUrl = new URL(testDatabaseUrl);
  } catch {
    throw new Error('AUTH_TEST_DATABASE_URL debe ser una URL PostgreSQL válida.');
  }

  const databaseName = parsedUrl.pathname.replace(/^\/+/, '');
  const isLocalDisposableDatabase =
    parsedUrl.protocol === 'postgresql:' &&
    parsedUrl.hostname === '127.0.0.1' &&
    parsedUrl.port === '55432' &&
    databaseName.startsWith('auth_useexisting_');

  if (!isLocalDisposableDatabase) {
    throw new Error(
      'La prueba requiere una base auth_useexisting_... en 127.0.0.1:55432.',
    );
  }
}

describe('Persistencia PostgreSQL de autenticación', () => {
  let prisma: PrismaService | undefined;
  const integrationIt = testDatabaseUrl ? it : it.skip;

  beforeAll(async () => {
    if (!testDatabaseUrl) return;

    const config = {
      get: (key: string) =>
        key === 'DIRECT_URL' ? testDatabaseUrl : undefined,
    } as unknown as ConfigService;

    prisma = new PrismaService(config);
    await prisma.onModuleInit();

    if (!prisma.estaListo()) {
      throw new Error('Prisma no pudo conectarse a la base local de prueba.');
    }
  }, 15_000);

  afterAll(async () => {
    await prisma?.onModuleDestroy();
  });

  integrationIt('lee los tres usuarios demo persistidos en auth_service', async () => {
    const expectedIds = [
      'perfil-demo-admin',
      'perfil-demo-docente',
      'perfil-demo-estudiante',
    ];

    const users = await prisma!.obtener().user.findMany({
      where: { id: { in: expectedIds } },
      select: { id: true },
      orderBy: { id: 'asc' },
    });

    expect(users.map((user) => user.id)).toEqual(expectedIds);
  });
});