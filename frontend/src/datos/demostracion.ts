import type { Cuestionario } from '../dominio/tipos.ts'

export const CORREO_DEMO = 'docente.demo@profelink.test'
export const CONTRASENA_DEMO = 'Demo-2026'
export const NOMBRE_DEMO = 'Docente de prueba'
export const ID_DEMO = 'perfil-demo'

const fecha = '2026-10-18T12:00:00.000Z'

export function cuestionariosDemostracion(): Cuestionario[] {
  return [
    {
      id: 'demo-funcional',
      titulo: 'Paradigma funcional',
      descripcion: 'Preguntas de prueba sobre funciones puras, inmutabilidad y orden superior.',
      categoria: 'Paradigma funcional',
      etiquetas: ['funcional', 'funciones', 'inmutabilidad'],
      dificultad: 'medio',
      autorId: ID_DEMO,
      autorNombre: NOMBRE_DEMO,
      imagenUrl: '/portadas/funcional.svg',
      esDemostracion: true,
      actualizadoEn: fecha,
      preguntas: [
        {
          id: 'f1',
          orden: 1,
          enunciado: 'Una función pura devuelve el mismo resultado si recibe los mismos argumentos y no modifica estado externo.',
          respuestaCorrecta: true,
          imagenUrl: '/portadas/funcional.svg',
        },
        {
          id: 'f2',
          orden: 2,
          enunciado: 'Una función de orden superior no puede recibir otra función como argumento.',
          respuestaCorrecta: false,
        },
        {
          id: 'f3',
          orden: 3,
          enunciado: 'La inmutabilidad significa que un dato no cambia después de crearse.',
          respuestaCorrecta: true,
        },
        {
          id: 'f4',
          orden: 4,
          enunciado: 'El paradigma funcional obliga a usar clases como unidad principal del programa.',
          respuestaCorrecta: false,
        },
      ],
    },
    {
      id: 'demo-logico',
      titulo: 'Paradigma lógico',
      descripcion: 'Datos de prueba sobre hechos, reglas y búsqueda de conclusiones.',
      categoria: 'Paradigma lógico',
      etiquetas: ['lógico', 'reglas', 'prolog'],
      dificultad: 'medio',
      autorId: ID_DEMO,
      autorNombre: NOMBRE_DEMO,
      imagenUrl: '/portadas/logico.svg',
      esDemostracion: true,
      actualizadoEn: fecha,
      preguntas: [
        {
          id: 'l1',
          orden: 1,
          enunciado: 'En programación lógica se describen hechos y reglas, y un motor busca conclusiones.',
          respuestaCorrecta: true,
        },
        {
          id: 'l2',
          orden: 2,
          enunciado: 'Prolog es un lenguaje asociado al paradigma lógico.',
          respuestaCorrecta: true,
          imagenUrl: '/portadas/logico.svg',
        },
        {
          id: 'l3',
          orden: 3,
          enunciado: 'En el paradigma lógico el programa siempre indica el orden exacto de cada instrucción.',
          respuestaCorrecta: false,
        },
        {
          id: 'l4',
          orden: 4,
          enunciado: 'Una regla puede definirse a partir de otras relaciones.',
          respuestaCorrecta: true,
        },
      ],
    },
    {
      id: 'demo-objetos',
      titulo: 'Orientado a objetos',
      descripcion: 'Cuestionario de prueba sobre objetos, herencia, encapsulamiento y polimorfismo.',
      categoria: 'Orientado a objetos',
      etiquetas: ['objetos', 'clases', 'herencia'],
      dificultad: 'facil',
      autorId: ID_DEMO,
      autorNombre: NOMBRE_DEMO,
      imagenUrl: '/portadas/objetos.svg',
      esDemostracion: true,
      actualizadoEn: fecha,
      preguntas: [
        {
          id: 'o1',
          orden: 1,
          enunciado: 'Un objeto combina estado y comportamiento.',
          respuestaCorrecta: true,
        },
        {
          id: 'o2',
          orden: 2,
          enunciado: 'La herencia permite que una clase reutilice miembros de otra.',
          respuestaCorrecta: true,
        },
        {
          id: 'o3',
          orden: 3,
          enunciado: 'El encapsulamiento busca exponer todos los campos como públicos.',
          respuestaCorrecta: false,
          imagenUrl: '/portadas/objetos.svg',
        },
        {
          id: 'o4',
          orden: 4,
          enunciado: 'El polimorfismo permite tratar objetos distintos mediante una interfaz común.',
          respuestaCorrecta: true,
        },
      ],
    },
  ]
}
