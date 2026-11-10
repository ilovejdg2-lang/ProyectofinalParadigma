-- La clasificación queda entre el resultado de la pregunta y la siguiente.
ALTER TYPE "EstadoSesion" ADD VALUE IF NOT EXISTS 'clasificacion';

ALTER TABLE "SesionJuego" ADD COLUMN IF NOT EXISTS "iniciaEn" TIMESTAMPTZ(3);
ALTER TABLE "SesionJuego" ADD COLUMN IF NOT EXISTS "elegibles" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
