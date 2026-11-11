import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { Prisma, PrismaClient } from '../src/generated/prisma/client';
import {
  CUESTIONARIOS_BANCO,
  FECHA_SEMILLA,
  IMAGENES_BANCO,
  SESIONES_DEMOSTRACION,
} from '../src/banco-preguntas/datos-banco';

async function main() {
  const conexion = process.env.DIRECT_URL?.trim();
  if (!conexion) {
    console.error(
      'Falta DIRECT_URL. Copia actividades/.env.example a actividades/.env y completa la cadena del session pooler.',
    );
    process.exit(1);
  }

  const prisma = new PrismaClient({
    adapter: new PrismaPg({
      connectionString: conexion,
      max: 2,
      connectionTimeoutMillis: 8000,
    }),
  });

  try {
    for (const imagen of IMAGENES_BANCO) {
      await prisma.imagen.upsert({
        where: { id: imagen.id },
        create: { ...imagen, creadoEn: FECHA_SEMILLA },
        update: imagen,
      });
    }

    for (const sesion of SESIONES_DEMOSTRACION) {
      const cuestionario = CUESTIONARIOS_BANCO.find(
        (c) => c.id === sesion.cuestionarioId,
      );
      const instantanea = {
        version: 1,
        preguntas: (cuestionario?.preguntas ?? []).map((p) => ({
          id: p.id,
          enunciado: p.enunciado,
          orden: p.orden,
          respuestaCorrecta: p.respuestaCorrecta,
          segundos: p.segundos ?? null,
          ...(p.imagenUrl ? { imagenUrl: p.imagenUrl } : {}),
          opciones: p.opciones.map((o) => ({
            id: o.id,
            texto: o.texto,
            orden: o.orden,
            correcta: o.correcta,
          })),
        })),
      };

      await prisma.sesionJuego.upsert({
        where: { codigo: sesion.codigo },
        create: {
          id: sesion.id,
          codigo: sesion.codigo,
          cuestionarioId: sesion.cuestionarioId,
          titulo: sesion.titulo,
          anfitrionId: sesion.anfitrionId,
          anfitrionNombre: sesion.anfitrionNombre,
          estado: sesion.estado,
          preguntaActual: sesion.preguntaActual,
          segundos: sesion.segundos,
          cierraEn: null,
          preguntasInstantanea: instantanea as unknown as Prisma.InputJsonValue,
          creadoEn: new Date(sesion.iniciadaEn),
          iniciadaEn: new Date(sesion.iniciadaEn),
          finalizadaEn: new Date(sesion.finalizadaEn),
        },
        update: {
          titulo: sesion.titulo,
          estado: sesion.estado,
          preguntaActual: sesion.preguntaActual,
          segundos: sesion.segundos,
          cierraEn: null,
          preguntasInstantanea: instantanea as unknown as Prisma.InputJsonValue,
          finalizadaEn: new Date(sesion.finalizadaEn),
        },
      });

      for (const part of sesion.participantes) {
        await prisma.participante.upsert({
          where: {
            sesionId_perfilId: {
              sesionId: sesion.id,
              perfilId: part.perfilId,
            },
          },
          create: {
            id: part.id,
            sesionId: sesion.id,
            perfilId: part.perfilId,
            nombre: part.nombre,
            conectado: part.conectado,
            puntaje: part.puntaje,
            aciertos: part.aciertos,
            incorporadoEn: new Date(part.incorporadoEn),
          },
          update: {
            nombre: part.nombre,
            conectado: part.conectado,
            puntaje: part.puntaje,
            aciertos: part.aciertos,
          },
        });

        for (const resp of part.respuestas) {
          await prisma.respuesta.upsert({
            where: {
              participanteId_preguntaId: {
                participanteId: part.id,
                preguntaId: resp.preguntaId,
              },
            },
            create: {
              id: resp.id,
              sesionId: sesion.id,
              participanteId: part.id,
              preguntaId: resp.preguntaId,
              opcionId: resp.opcionId,
              valor: resp.valor,
              aceptada: resp.aceptada,
              tardia: resp.tardia,
              puntos: resp.puntos,
              respondidaEn: new Date(resp.respondidaEn),
            },
            update: {
              opcionId: resp.opcionId,
              valor: resp.valor,
              aceptada: resp.aceptada,
              tardia: resp.tardia,
              puntos: resp.puntos,
            },
          });
        }

        const totalPreguntas = cuestionario?.preguntas.length ?? part.respuestas.length;
        await prisma.resultado.upsert({
          where: {
            sesionId_participanteId: {
              sesionId: sesion.id,
              participanteId: part.id,
            },
          },
          create: {
            id: `res-${part.id}`,
            sesionId: sesion.id,
            participanteId: part.id,
            puntuacion: part.puntaje,
            aciertos: part.aciertos,
            incorrectas: Math.max(0, totalPreguntas - part.aciertos),
            finalizadoEn: new Date(sesion.finalizadaEn),
          },
          update: {
            puntuacion: part.puntaje,
            aciertos: part.aciertos,
            incorrectas: Math.max(0, totalPreguntas - part.aciertos),
            finalizadoEn: new Date(sesion.finalizadaEn),
          },
        });
      }
    }

    const total = await prisma.cuestionario.count({
      where: { eliminadoEn: null },
    });
    console.log(`Seed listo. Cuestionarios visibles: ${total}.`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  const texto = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
  console.error(texto.replace(/postgres(?:ql)?:\/\/\S+/gi, '[url]'));
  process.exit(1);
});
