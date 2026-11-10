-- Cursos, matrículas y notas académicas. Las partidas ya guardadas quedan como práctica.

ALTER TABLE "SesionJuego" ADD COLUMN IF NOT EXISTS "modoAcademico" VARCHAR(20) NOT NULL DEFAULT 'practica';
ALTER TABLE "SesionJuego" ADD COLUMN IF NOT EXISTS "cursoId" TEXT;
ALTER TABLE "SesionJuego" ADD COLUMN IF NOT EXISTS "cursoNombre" VARCHAR(80);
ALTER TABLE "SesionJuego" ADD COLUMN IF NOT EXISTS "nombreEvaluacion" VARCHAR(80);
ALTER TABLE "SesionJuego" ADD COLUMN IF NOT EXISTS "notaMaxima" INTEGER NOT NULL DEFAULT 100;
ALTER TABLE "SesionJuego" ADD COLUMN IF NOT EXISTS "valorPorcentaje" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "SesionJuego" ADD COLUMN IF NOT EXISTS "notaMinima" INTEGER NOT NULL DEFAULT 70;

CREATE TABLE IF NOT EXISTS "Curso" (
  "id" TEXT NOT NULL,
  "nombre" VARCHAR(80) NOT NULL,
  "docenteId" TEXT NOT NULL,
  "creadoEn" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Curso_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "Curso_docenteId_idx" ON "Curso"("docenteId");

CREATE TABLE IF NOT EXISTS "Matricula" (
  "id" TEXT NOT NULL,
  "cursoId" TEXT NOT NULL,
  "estudianteId" TEXT NOT NULL,
  "nombre" VARCHAR(80) NOT NULL,
  CONSTRAINT "Matricula_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "Matricula_cursoId_estudianteId_key" ON "Matricula"("cursoId", "estudianteId");
CREATE INDEX IF NOT EXISTS "Matricula_estudianteId_idx" ON "Matricula"("estudianteId");

DO $$ BEGIN
  ALTER TABLE "Matricula"
    ADD CONSTRAINT "Matricula_cursoId_fkey"
    FOREIGN KEY ("cursoId") REFERENCES "Curso"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "SesionJuego"
    ADD CONSTRAINT "SesionJuego_cursoId_fkey"
    FOREIGN KEY ("cursoId") REFERENCES "Curso"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS "SesionJuego_cursoId_idx" ON "SesionJuego"("cursoId");

CREATE TABLE IF NOT EXISTS "Calificacion" (
  "id" TEXT NOT NULL,
  "sesionId" TEXT NOT NULL,
  "estudianteId" TEXT NOT NULL,
  "nombre" TEXT NOT NULL,
  "aciertos" INTEGER NOT NULL,
  "total" INTEGER NOT NULL,
  "nota" INTEGER NOT NULL,
  "aporte" DOUBLE PRECISION NOT NULL,
  "posicion" INTEGER NOT NULL,
  "puntaje" INTEGER NOT NULL,
  "creadaEn" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Calificacion_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "Calificacion_sesionId_estudianteId_key" ON "Calificacion"("sesionId", "estudianteId");
CREATE INDEX IF NOT EXISTS "Calificacion_estudianteId_idx" ON "Calificacion"("estudianteId");
CREATE INDEX IF NOT EXISTS "Calificacion_sesionId_idx" ON "Calificacion"("sesionId");

DO $$ BEGIN
  ALTER TABLE "Calificacion"
    ADD CONSTRAINT "Calificacion_sesionId_fkey"
    FOREIGN KEY ("sesionId") REFERENCES "SesionJuego"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

INSERT INTO "Curso" ("id", "nombre", "docenteId")
VALUES ('curso-paradigmas', 'Paradigmas de Programación', 'perfil-demo')
ON CONFLICT ("id") DO NOTHING;

INSERT INTO "Matricula" ("id", "cursoId", "estudianteId", "nombre")
VALUES ('matricula-paradigmas-estudiante', 'curso-paradigmas', 'perfil-demo-estudiante', 'Estudiante de prueba')
ON CONFLICT ("cursoId", "estudianteId") DO NOTHING;
