export interface PaqueteOpcionMultiple {
  enunciado: string;
  correcta: string;
  distractores: [string, string, string];
}

/** Cuatro respuestas por pregunta. La correcta conserva el id verdadero/falso ya usado en partidas. */
export const OPCIONES_MULTIPLES: Record<string, PaqueteOpcionMultiple> = {
  f1: {
    enunciado: '¿Qué caracteriza a una función pura?',
    correcta: 'Mismo resultado y sin cambiar estado externo',
    distractores: [
      'Cambia variables globales al ejecutarse',
      'Solo puede vivir dentro de una clase',
      'Necesita efectos secundarios',
    ],
  },
  f2: {
    enunciado: '¿Qué es una función de orden superior?',
    correcta: 'Recibe o devuelve otra función',
    distractores: [
      'No puede recibir otra función',
      'Solo trabaja con números enteros',
      'Obliga a programar con clases',
    ],
  },
  f3: {
    enunciado: '¿Qué significa inmutabilidad?',
    correcta: 'Un dato no cambia después de crearse',
    distractores: [
      'El dato se modifica en el mismo lugar',
      'Toda variable debe ser global',
      'Los datos heredan de una clase base',
    ],
  },
  f4: {
    enunciado: '¿Cuál es la unidad principal del paradigma funcional?',
    correcta: 'La función, no la clase',
    distractores: [
      'La clase, como en objetos',
      'El archivo de configuración',
      'El ciclo for como único control',
    ],
  },
  l1: {
    enunciado: '¿Cómo trabaja la programación lógica?',
    correcta: 'Hechos y reglas; un motor busca conclusiones',
    distractores: [
      'Indica el orden exacto de cada instrucción',
      'Solo usa clases y objetos',
      'Modifica el estado paso a paso',
    ],
  },
  l2: {
    enunciado: '¿Qué lenguaje se asocia al paradigma lógico?',
    correcta: 'Prolog',
    distractores: ['Java', 'C', 'Ensamblador'],
  },
  l3: {
    enunciado: '¿Qué describe un programa en el paradigma lógico?',
    correcta: 'Qué relaciones se cumplen',
    distractores: [
      'El orden exacto de cada instrucción',
      'Los píxeles de la pantalla',
      'El tamaño en bytes de cada variable',
    ],
  },
  l4: {
    enunciado: '¿Cómo puede definirse una regla lógica?',
    correcta: 'A partir de otras relaciones',
    distractores: [
      'Solo con números, sin predicados',
      'Copiando una clase padre',
      'Sin relacionarse con otros hechos',
    ],
  },
  o1: {
    enunciado: '¿Qué combina un objeto?',
    correcta: 'Estado y comportamiento',
    distractores: [
      'Solo comentarios del código',
      'Únicamente la interfaz de red',
      'El historial de commits',
    ],
  },
  o2: {
    enunciado: '¿Qué permite la herencia?',
    correcta: 'Que una clase reutilice miembros de otra',
    distractores: [
      'Borrar los métodos de la clase base',
      'Impedir cualquier reutilización',
      'Convertir el programa en un script lineal',
    ],
  },
  o3: {
    enunciado: '¿Qué busca el encapsulamiento?',
    correcta: 'Ocultar el estado y exponer una interfaz',
    distractores: [
      'Exponer todos los campos como públicos',
      'Eliminar los métodos de la clase',
      'Hacer globales todas las variables',
    ],
  },
  o4: {
    enunciado: '¿Qué permite el polimorfismo?',
    correcta: 'Tratar objetos distintos con una interfaz común',
    distractores: [
      'Que cada clase tenga el mismo nombre',
      'Impedir redefinir un método',
      'Usar un solo tipo en todo el programa',
    ],
  },
  k1: {
    enunciado: '¿Para qué sirve limitar el WIP en Kanban?',
    correcta: 'Ver cuellos de botella y bajar la multitarea',
    distractores: [
      'Llenar la columna por encima de su límite',
      'Ocultar el trabajo bloqueado',
      'Vaciar el tablero al cerrar el sprint',
    ],
  },
  k2: {
    enunciado: '¿Cómo entra el trabajo nuevo en Kanban?',
    correcta: 'Pull: se toma solo si hay capacidad libre',
    distractores: [
      'Push: se empuja aunque la columna esté llena',
      'Se asigna al azar, sin mirar el tablero',
      'Se espera al siguiente sprint obligatorio',
    ],
  },
  k3: {
    enunciado: '¿Qué aportan las políticas explícitas?',
    correcta: 'Criterios claros para mover una tarjeta',
    distractores: [
      'Que cada quien mueva tarjetas sin reglas',
      'Ocultar el estado al resto del equipo',
      'Sustituir el tablero por una lista privada',
    ],
  },
  k4: {
    enunciado: '¿Qué pide empezar con lo que ya se hace?',
    correcta: 'Respetar roles actuales y mejorar poco a poco',
    distractores: [
      'Reemplazar de inmediato todos los cargos',
      'Borrar el tablero y empezar de cero',
      'Renombrar todos los equipos el primer día',
    ],
  },
  k5: {
    enunciado: '¿Qué facilita un tablero de tarjetas y columnas?',
    correcta: 'Ver bloqueos y dependencias',
    distractores: [
      'Esconder el trabajo en curso',
      'Evitar hablar del flujo',
      'Medir solo las horas de una persona',
    ],
  },
  k6: {
    enunciado: '¿Qué resume “dejar de empezar y empezar a terminar”?',
    correcta: 'Respetar el WIP y cerrar lo que ya está abierto',
    distractores: [
      'Abrir todas las tarjetas a la vez',
      'Ignorar las columnas que llegaron al límite',
      'Medir solo la reunión diaria',
    ],
  },
  km1: {
    enunciado: '¿Qué mide el Lead Time?',
    correcta: 'Desde que se pide la tarea hasta que se entrega',
    distractores: [
      'Solo las horas escribiendo código',
      'Cuántas tarjetas se terminan por semana',
      'El ancho de una banda en el diagrama',
    ],
  },
  km2: {
    enunciado:
      'Según la Ley de Little, si sube el WIP y el Throughput no mejora, ¿qué pasa?',
    correcta: 'El tiempo de ciclo promedio aumenta',
    distractores: [
      'El tiempo de ciclo baja solo',
      'El Throughput se duplica sin cambiar el WIP',
      'El Lead Time deja de depender del WIP',
    ],
  },
  km3: {
    enunciado: '¿Qué es el Throughput?',
    correcta: 'Elementos terminados por unidad de tiempo',
    distractores: [
      'Horas estimadas de una sola tarjeta',
      'Tiempo desde la solicitud hasta la entrega',
      'La cantidad de columnas del tablero',
    ],
  },
  km4: {
    enunciado: 'En un CFD, ¿qué indica una franja que se ensancha?',
    correcta: 'Se acumula trabajo en esa columna',
    distractores: [
      'Esa etapa ya no tiene trabajo',
      'El equipo redujo el WIP de esa etapa',
      'El diagrama dejó de registrar el flujo',
    ],
  },
  km5: {
    enunciado: '¿Qué efecto tiene reducir el WIP en un sistema estable?',
    correcta: 'Mejora la predictibilidad y acorta la entrega',
    distractores: [
      'No cambia la predictibilidad ni el tiempo',
      'Obliga a reiniciar el tablero cada dos semanas',
      'Aumenta siempre la multitarea',
    ],
  },
  kt1: {
    enunciado: 'Si una tarjeta queda bloqueada, ¿qué conviene hacer?',
    correcta: 'Marcarla en el tablero y contarla en el WIP',
    distractores: [
      'Ocultarla o borrarla para liberar espacio',
      'Pasarla a Terminado aunque siga bloqueada',
      'Duplicarla en todas las columnas',
    ],
  },
  kt2: {
    enunciado: '¿Qué definen las clases de servicio en Kanban?',
    correcta: 'Políticas distintas de prioridad y de riesgo',
    distractores: [
      'El lenguaje de programación del equipo',
      'El salario de cada rol',
      'La duración fija de un sprint',
    ],
  },
  kt3: {
    enunciado: 'En la reunión diaria, ¿cómo se recorre el tablero?',
    correcta: 'De derecha a izquierda, para destrabar entregas',
    distractores: [
      'Solo de izquierda a derecha, por lo recién llegado',
      'Se ignora el tablero y se habla del futuro',
      'Solo se miran las tarjetas ya archivadas',
    ],
  },
  kt4: {
    enunciado: '¿En qué se diferencia Kanban de un sprint obligatorio?',
    correcta: 'Usa flujo continuo y no vacía el tablero cada dos semanas',
    distractores: [
      'Reinicia el tablero al cerrar cada sprint',
      'Prohíbe columnas y tarjetas',
      'Exige las mismas ceremonias que Scrum',
    ],
  },
  kt5: {
    enunciado: '¿Para qué dividir una columna en “En curso” y “Listo”?',
    correcta: 'Ver la espera interna y facilitar el Pull',
    distractores: [
      'Ocultar lo que ya se puede jalar',
      'Duplicar el límite WIP sin mostrarlo',
      'Quitar las políticas de la columna',
    ],
  },
};
