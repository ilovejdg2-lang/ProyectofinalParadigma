import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client';
import { AUTOR_DEMOSTRACION } from '../src/autenticacion/identidad-externa';

const FECHA = new Date('2026-10-18T12:00:00.000Z');

interface OpcionSemilla {
  id: string;
  texto: string;
  orden: number;
  correcta: boolean;
}

interface PreguntaSemilla {
  id: string;
  enunciado: string;
  orden: number;
  respuestaCorrecta: boolean;
  imagenId?: string;
  opciones: OpcionSemilla[];
}

interface CuestionarioSemilla {
  id: string;
  titulo: string;
  descripcion: string;
  categoria: string;
  etiquetas: string[];
  dificultad: 'facil' | 'medio' | 'dificil';
  imagenId: string;
  preguntas: PreguntaSemilla[];
}

function opciones(preguntaId: string, respuestaCorrecta: boolean): OpcionSemilla[] {
  return [
    {
      id: `${preguntaId}:verdadero`,
      texto: 'Verdadero',
      orden: 1,
      correcta: respuestaCorrecta,
    },
    {
      id: `${preguntaId}:falso`,
      texto: 'Falso',
      orden: 2,
      correcta: !respuestaCorrecta,
    },
  ];
}

function pregunta(
  id: string,
  orden: number,
  enunciado: string,
  respuestaCorrecta: boolean,
  imagenId?: string,
): PreguntaSemilla {
  return {
    id,
    orden,
    enunciado,
    respuestaCorrecta,
    imagenId,
    opciones: opciones(id, respuestaCorrecta),
  };
}

const imagenes = [
  {
    id: 'img-funcional',
    nombreArchivo: 'funcional.svg',
    url: '/portadas/funcional.svg',
    tipoMime: 'image/svg+xml',
    tamanoBytes: 564,
  },
  {
    id: 'img-logico',
    nombreArchivo: 'logico.svg',
    url: '/portadas/logico.svg',
    tipoMime: 'image/svg+xml',
    tamanoBytes: 602,
  },
  {
    id: 'img-objetos',
    nombreArchivo: 'objetos.svg',
    url: '/portadas/objetos.svg',
    tipoMime: 'image/svg+xml',
    tamanoBytes: 495,
  },
];

const cuestionarios: CuestionarioSemilla[] = [
  {
    id: 'demo-funcional',
    titulo: 'Paradigma funcional',
    descripcion: 'Preguntas de prueba sobre funciones puras, inmutabilidad y orden superior.',
    categoria: 'Paradigma funcional',
    etiquetas: ['funcional', 'funciones', 'inmutabilidad'],
    dificultad: 'medio',
    imagenId: 'img-funcional',
    preguntas: [
      pregunta(
        'f1',
        1,
        'Una función pura devuelve el mismo resultado si recibe los mismos argumentos y no modifica estado externo.',
        true,
        'img-funcional',
      ),
      pregunta(
        'f2',
        2,
        'Una función de orden superior no puede recibir otra función como argumento.',
        false,
      ),
      pregunta('f3', 3, 'La inmutabilidad significa que un dato no cambia después de crearse.', true),
      pregunta(
        'f4',
        4,
        'El paradigma funcional obliga a usar clases como unidad principal del programa.',
        false,
      ),
    ],
  },
  {
    id: 'demo-logico',
    titulo: 'Paradigma lógico',
    descripcion: 'Datos de prueba sobre hechos, reglas y búsqueda de conclusiones.',
    categoria: 'Paradigma lógico',
    etiquetas: ['lógico', 'reglas', 'prolog'],
    dificultad: 'medio',
    imagenId: 'img-logico',
    preguntas: [
      pregunta(
        'l1',
        1,
        'En programación lógica se describen hechos y reglas, y un motor busca conclusiones.',
        true,
      ),
      pregunta('l2', 2, 'Prolog es un lenguaje asociado al paradigma lógico.', true, 'img-logico'),
      pregunta(
        'l3',
        3,
        'En el paradigma lógico el programa siempre indica el orden exacto de cada instrucción.',
        false,
      ),
      pregunta('l4', 4, 'Una regla puede definirse a partir de otras relaciones.', true),
    ],
  },
  {
    id: 'demo-objetos',
    titulo: 'Orientado a objetos',
    descripcion: 'Cuestionario de prueba sobre objetos, herencia, encapsulamiento y polimorfismo.',
    categoria: 'Orientado a objetos',
    etiquetas: ['objetos', 'clases', 'herencia'],
    dificultad: 'facil',
    imagenId: 'img-objetos',
    preguntas: [
      pregunta('o1', 1, 'Un objeto combina estado y comportamiento.', true),
      pregunta('o2', 2, 'La herencia permite que una clase reutilice miembros de otra.', true),
      pregunta(
        'o3',
        3,
        'El encapsulamiento busca exponer todos los campos como públicos.',
        false,
        'img-objetos',
      ),
      pregunta(
        'o4',
        4,
        'El polimorfismo permite tratar objetos distintos mediante una interfaz común.',
        true,
      ),
    ],
  },
];

async function main() {
  const conexion = process.env.DIRECT_URL?.trim();
  if (!conexion) {
    console.error('Falta DIRECT_URL. Copia actividades/.env.example a actividades/.env y completa la cadena del session pooler.');
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
    for (const imagen of imagenes) {
      await prisma.imagen.upsert({
        where: { id: imagen.id },
        create: { ...imagen, creadoEn: FECHA },
        update: imagen,
      });
    }

    for (const cuestionario of cuestionarios) {
      const datos = {
        autorId: AUTOR_DEMOSTRACION.id,
        autorNombre: AUTOR_DEMOSTRACION.nombre,
        titulo: cuestionario.titulo,
        descripcion: cuestionario.descripcion,
        categoria: cuestionario.categoria,
        etiquetas: cuestionario.etiquetas,
        dificultad: cuestionario.dificultad,
        esDemostracion: true,
        imagenId: cuestionario.imagenId,
        eliminadoEn: null,
      };
      await prisma.cuestionario.upsert({
        where: { id: cuestionario.id },
        create: { id: cuestionario.id, ...datos, creadoEn: FECHA, actualizadoEn: FECHA },
        update: { ...datos, actualizadoEn: FECHA },
      });

      for (const item of cuestionario.preguntas) {
        const datosPregunta = {
          enunciado: item.enunciado,
          orden: item.orden,
          respuestaCorrecta: item.respuestaCorrecta,
          segundos: null,
          imagenId: item.imagenId ?? null,
        };
        await prisma.pregunta.upsert({
          where: { id: item.id },
          create: {
            id: item.id,
            cuestionarioId: cuestionario.id,
            ...datosPregunta,
            creadoEn: FECHA,
            actualizadoEn: FECHA,
          },
          update: { ...datosPregunta, actualizadoEn: FECHA },
        });

        for (const opcion of item.opciones) {
          await prisma.opcion.upsert({
            where: { id: opcion.id },
            create: { ...opcion, preguntaId: item.id },
            update: {
              texto: opcion.texto,
              orden: opcion.orden,
              correcta: opcion.correcta,
            },
          });
        }
      }
    }

    const total = await prisma.cuestionario.count({ where: { esDemostracion: true } });
    console.log(`Seed listo. Cuestionarios de demostración: ${total}.`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch(() => {
  console.error('El seed no pudo completarse. Revisa DIRECT_URL sin compartir la cadena de conexión.');
  process.exit(1);
});
