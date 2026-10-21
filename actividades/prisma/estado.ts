import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client';

async function main() {
  const conexion = process.env.DIRECT_URL?.trim();
  if (!conexion) {
    console.error('DIRECT_URL no está configurada. Completa actividades/.env antes de probar la conexión.');
    process.exit(2);
  }

  const prisma = new PrismaClient({
    adapter: new PrismaPg({
      connectionString: conexion,
      max: 1,
      connectionTimeoutMillis: 8000,
    }),
  });

  try {
    await prisma.$queryRaw`SELECT 1`;
    const tablas = await prisma.$queryRaw<Array<{ table_name: string }>>`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name
    `;
    console.log(`Conexión con PostgreSQL correcta. Tablas en public: ${tablas.length}.`);
    for (const tabla of tablas) {
      console.log(`- ${tabla.table_name}`);
    }
  } catch {
    console.error('No se pudo consultar PostgreSQL. Revisa DIRECT_URL en actividades/.env.');
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

void main();
