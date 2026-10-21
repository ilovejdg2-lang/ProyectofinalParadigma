import 'dotenv/config';
import { defineConfig } from 'prisma/config';

// La CLI de Prisma usa el session pooler (DIRECT_URL, puerto 5432).
// El transaction pooler no sirve para migraciones: no mantiene sesión
// y en Supabase no permite crear la base sombra que exige migrate dev.
// process.env evita que `prisma generate` falle cuando todavía no hay .env.
export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'tsx prisma/seed.ts',
  },
  datasource: {
    url: process.env.DIRECT_URL ?? '',
  },
});
