-- El esquema public ya existe en Supabase. No se crea ni se modifica.
-- Esta migración solo agrega objetos de ProfeLink.

-- CreateEnum
CREATE TYPE "Dificultad" AS ENUM ('facil', 'medio', 'dificil');

-- CreateEnum
CREATE TYPE "EstadoSesion" AS ENUM ('esperando', 'pregunta', 'cerrada', 'finalizada');

-- CreateTable
CREATE TABLE "Imagen" (
    "id" TEXT NOT NULL,
    "nombreArchivo" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "tipoMime" TEXT NOT NULL,
    "tamanoBytes" INTEGER NOT NULL,
    "creadoEn" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Imagen_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Cuestionario" (
    "id" TEXT NOT NULL,
    "autorId" TEXT NOT NULL,
    "autorNombre" TEXT NOT NULL,
    "titulo" VARCHAR(80) NOT NULL,
    "descripcion" VARCHAR(400) NOT NULL,
    "categoria" VARCHAR(80) NOT NULL,
    "etiquetas" TEXT[] NOT NULL,
    "dificultad" "Dificultad" NOT NULL,
    "esDemostracion" BOOLEAN NOT NULL DEFAULT false,
    "imagenId" TEXT,
    "creadoEn" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMPTZ(3) NOT NULL,
    "eliminadoEn" TIMESTAMPTZ(3),

    CONSTRAINT "Cuestionario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Pregunta" (
    "id" TEXT NOT NULL,
    "cuestionarioId" TEXT NOT NULL,
    "enunciado" VARCHAR(280) NOT NULL,
    "orden" INTEGER NOT NULL,
    "respuestaCorrecta" BOOLEAN NOT NULL,
    "segundos" INTEGER,
    "imagenId" TEXT,
    "creadoEn" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Pregunta_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Opcion" (
    "id" TEXT NOT NULL,
    "preguntaId" TEXT NOT NULL,
    "texto" VARCHAR(280) NOT NULL,
    "orden" INTEGER NOT NULL,
    "correcta" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Opcion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SesionJuego" (
    "id" TEXT NOT NULL,
    "codigo" VARCHAR(6) NOT NULL,
    "cuestionarioId" TEXT NOT NULL,
    "titulo" VARCHAR(80) NOT NULL,
    "anfitrionId" TEXT NOT NULL,
    "anfitrionNombre" TEXT NOT NULL,
    "estado" "EstadoSesion" NOT NULL DEFAULT 'esperando',
    "preguntaActual" INTEGER NOT NULL DEFAULT 0,
    "segundos" INTEGER NOT NULL DEFAULT 20,
    "cierraEn" TIMESTAMPTZ(3),
    "preguntasInstantanea" JSONB,
    "creadoEn" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "iniciadaEn" TIMESTAMPTZ(3),
    "finalizadaEn" TIMESTAMPTZ(3),

    CONSTRAINT "SesionJuego_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Participante" (
    "id" TEXT NOT NULL,
    "sesionId" TEXT NOT NULL,
    "perfilId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "conectado" BOOLEAN NOT NULL DEFAULT true,
    "puntaje" INTEGER NOT NULL DEFAULT 0,
    "aciertos" INTEGER NOT NULL DEFAULT 0,
    "incorporadoEn" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Participante_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Respuesta" (
    "id" TEXT NOT NULL,
    "sesionId" TEXT NOT NULL,
    "participanteId" TEXT NOT NULL,
    "preguntaId" TEXT NOT NULL,
    "opcionId" TEXT,
    "valor" BOOLEAN,
    "aceptada" BOOLEAN NOT NULL DEFAULT true,
    "tardia" BOOLEAN NOT NULL DEFAULT false,
    "puntos" INTEGER NOT NULL DEFAULT 0,
    "respondidaEn" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Respuesta_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Resultado" (
    "id" TEXT NOT NULL,
    "sesionId" TEXT NOT NULL,
    "participanteId" TEXT NOT NULL,
    "puntuacion" INTEGER NOT NULL,
    "aciertos" INTEGER NOT NULL,
    "incorrectas" INTEGER NOT NULL,
    "finalizadoEn" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Resultado_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Cuestionario_autorId_idx" ON "Cuestionario"("autorId");

-- CreateIndex
CREATE INDEX "Cuestionario_categoria_idx" ON "Cuestionario"("categoria");

-- CreateIndex
CREATE INDEX "Cuestionario_eliminadoEn_idx" ON "Cuestionario"("eliminadoEn");

-- CreateIndex
CREATE INDEX "Pregunta_cuestionarioId_idx" ON "Pregunta"("cuestionarioId");

-- CreateIndex
CREATE UNIQUE INDEX "Pregunta_cuestionarioId_orden_key" ON "Pregunta"("cuestionarioId", "orden");

-- CreateIndex
CREATE INDEX "Opcion_preguntaId_idx" ON "Opcion"("preguntaId");

-- CreateIndex
CREATE UNIQUE INDEX "Opcion_preguntaId_orden_key" ON "Opcion"("preguntaId", "orden");

-- CreateIndex
CREATE UNIQUE INDEX "SesionJuego_codigo_key" ON "SesionJuego"("codigo");

-- CreateIndex
CREATE INDEX "SesionJuego_anfitrionId_idx" ON "SesionJuego"("anfitrionId");

-- CreateIndex
CREATE INDEX "SesionJuego_estado_idx" ON "SesionJuego"("estado");

-- CreateIndex
CREATE INDEX "SesionJuego_cuestionarioId_idx" ON "SesionJuego"("cuestionarioId");

-- CreateIndex
CREATE INDEX "Participante_perfilId_idx" ON "Participante"("perfilId");

-- CreateIndex
CREATE UNIQUE INDEX "Participante_sesionId_perfilId_key" ON "Participante"("sesionId", "perfilId");

-- CreateIndex
CREATE INDEX "Respuesta_sesionId_idx" ON "Respuesta"("sesionId");

-- CreateIndex
CREATE INDEX "Respuesta_preguntaId_idx" ON "Respuesta"("preguntaId");

-- CreateIndex
CREATE UNIQUE INDEX "Respuesta_participanteId_preguntaId_key" ON "Respuesta"("participanteId", "preguntaId");

-- CreateIndex
CREATE UNIQUE INDEX "Resultado_participanteId_key" ON "Resultado"("participanteId");

-- CreateIndex
CREATE INDEX "Resultado_sesionId_idx" ON "Resultado"("sesionId");

-- CreateIndex
CREATE UNIQUE INDEX "Resultado_sesionId_participanteId_key" ON "Resultado"("sesionId", "participanteId");

-- AddForeignKey
ALTER TABLE "Cuestionario" ADD CONSTRAINT "Cuestionario_imagenId_fkey" FOREIGN KEY ("imagenId") REFERENCES "Imagen"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pregunta" ADD CONSTRAINT "Pregunta_cuestionarioId_fkey" FOREIGN KEY ("cuestionarioId") REFERENCES "Cuestionario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pregunta" ADD CONSTRAINT "Pregunta_imagenId_fkey" FOREIGN KEY ("imagenId") REFERENCES "Imagen"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Opcion" ADD CONSTRAINT "Opcion_preguntaId_fkey" FOREIGN KEY ("preguntaId") REFERENCES "Pregunta"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SesionJuego" ADD CONSTRAINT "SesionJuego_cuestionarioId_fkey" FOREIGN KEY ("cuestionarioId") REFERENCES "Cuestionario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Participante" ADD CONSTRAINT "Participante_sesionId_fkey" FOREIGN KEY ("sesionId") REFERENCES "SesionJuego"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Respuesta" ADD CONSTRAINT "Respuesta_sesionId_fkey" FOREIGN KEY ("sesionId") REFERENCES "SesionJuego"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Respuesta" ADD CONSTRAINT "Respuesta_participanteId_fkey" FOREIGN KEY ("participanteId") REFERENCES "Participante"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Respuesta" ADD CONSTRAINT "Respuesta_preguntaId_fkey" FOREIGN KEY ("preguntaId") REFERENCES "Pregunta"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Respuesta" ADD CONSTRAINT "Respuesta_opcionId_fkey" FOREIGN KEY ("opcionId") REFERENCES "Opcion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Resultado" ADD CONSTRAINT "Resultado_sesionId_fkey" FOREIGN KEY ("sesionId") REFERENCES "SesionJuego"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Resultado" ADD CONSTRAINT "Resultado_participanteId_fkey" FOREIGN KEY ("participanteId") REFERENCES "Participante"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Como máximo una opción correcta por pregunta.
-- "Al menos dos opciones y exactamente una correcta" se valida al guardar o iniciar,
-- porque un borrador puede estar incompleto.
CREATE UNIQUE INDEX "Opcion_una_correcta_por_pregunta" ON "Opcion"("preguntaId") WHERE "correcta" = true;

ALTER TABLE "SesionJuego" ADD CONSTRAINT "SesionJuego_codigo_seis" CHECK (char_length("codigo") = 6);
ALTER TABLE "Respuesta" ADD CONSTRAINT "Respuesta_elige_opcion_o_valor" CHECK ("opcionId" IS NOT NULL OR "valor" IS NOT NULL);

-- La Data API de Supabase expone public. Sin políticas, anon y authenticated no leen estas tablas.
-- El rol dueño con el que se conecta NestJS no queda sujeto a RLS salvo que se fuerce.
DO $$
DECLARE
  tabla text;
BEGIN
  FOREACH tabla IN ARRAY ARRAY[
    'Imagen',
    'Cuestionario',
    'Pregunta',
    'Opcion',
    'SesionJuego',
    'Participante',
    'Respuesta',
    'Resultado'
  ]
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', tabla);
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
      EXECUTE format('REVOKE ALL ON TABLE %I FROM anon', tabla);
    END IF;
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
      EXECUTE format('REVOKE ALL ON TABLE %I FROM authenticated', tabla);
    END IF;
  END LOOP;
END $$;
