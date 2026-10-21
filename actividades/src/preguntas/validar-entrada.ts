export interface OpcionEntrada {
  id?: string;
  texto: string;
  correcta: boolean;
}

export interface PreguntaEntrada {
  id?: string;
  enunciado: string;
  respuestaCorrecta: boolean;
  opciones?: OpcionEntrada[];
  imagenUrl?: string;
  orden: number;
  segundos?: number;
}

export interface CuestionarioEntrada {
  titulo: string;
  descripcion: string;
  categoria: string;
  etiquetas: string[];
  dificultad: 'facil' | 'medio' | 'dificil';
  imagenUrl?: string;
  preguntas: PreguntaEntrada[];
}

export function normalizarPreguntas(
  preguntas: PreguntaEntrada[],
): PreguntaEntrada[] {
  return preguntas.map((pregunta) => {
    if (pregunta.opciones && pregunta.opciones.length > 0) return pregunta;
    const base = pregunta.id ?? 'pregunta';
    return {
      ...pregunta,
      opciones: [
        {
          id: `${base}:verdadero`,
          texto: 'Verdadero',
          correcta: pregunta.respuestaCorrecta === true,
        },
        {
          id: `${base}:falso`,
          texto: 'Falso',
          correcta: pregunta.respuestaCorrecta === false,
        },
      ],
    };
  });
}

export function validarCuestionarioEntrada(
  entrada: CuestionarioEntrada,
): string[] {
  const errores: string[] = [];
  const titulo = entrada.titulo.trim();
  const descripcion = entrada.descripcion.trim();
  const categoria = entrada.categoria.trim();

  if (titulo.length < 3)
    errores.push('El título necesita al menos 3 caracteres.');
  if (titulo.length > 80)
    errores.push('El título admite como máximo 80 caracteres.');
  if (descripcion.length < 10)
    errores.push('La descripción necesita al menos 10 caracteres.');
  if (descripcion.length > 400)
    errores.push('La descripción admite como máximo 400 caracteres.');
  if (!categoria) errores.push('Elige una categoría.');
  if (categoria.length > 80)
    errores.push('La categoría admite como máximo 80 caracteres.');
  if (entrada.preguntas.length === 0)
    errores.push('Agrega al menos una pregunta.');
  if (entrada.etiquetas.length > 20)
    errores.push('El cuestionario admite como máximo 20 etiquetas.');
  entrada.etiquetas.forEach((etiqueta) => {
    if (etiqueta.trim().length > 40)
      errores.push('Una etiqueta admite como máximo 40 caracteres.');
  });

  const ordenes = new Set<number>();
  const idsPregunta = new Set<string>();
  entrada.preguntas.forEach((pregunta, indice) => {
    const numero = indice + 1;
    const enunciado = pregunta.enunciado.trim();
    if (enunciado.length < 5) {
      errores.push(
        `La pregunta ${numero} necesita un enunciado de al menos 5 caracteres.`,
      );
    }
    if (enunciado.length > 280) {
      errores.push(`La pregunta ${numero} admite como máximo 280 caracteres.`);
    }
    if (!Number.isInteger(pregunta.orden) || pregunta.orden < 1) {
      errores.push(`La pregunta ${numero} tiene un orden inválido.`);
    } else if (ordenes.has(pregunta.orden)) {
      errores.push('El orden de las preguntas está repetido.');
    } else {
      ordenes.add(pregunta.orden);
    }
    if (pregunta.id) {
      if (idsPregunta.has(pregunta.id)) {
        errores.push(`La pregunta ${numero} repite un identificador.`);
      }
      idsPregunta.add(pregunta.id);
    }
    if (
      pregunta.segundos !== undefined &&
      (!Number.isInteger(pregunta.segundos) ||
        pregunta.segundos < 5 ||
        pregunta.segundos > 120)
    ) {
      errores.push(
        `El tiempo de la pregunta ${numero} debe estar entre 5 y 120 segundos.`,
      );
    }

    const opciones = pregunta.opciones ?? [];
    if (opciones.length < 2) {
      errores.push(`La pregunta ${numero} necesita al menos 2 respuestas.`);
    }
    if (opciones.length > 6) {
      errores.push(`La pregunta ${numero} admite como máximo 6 respuestas.`);
    }
    const idsOpcion = new Set<string>();
    let correctas = 0;
    opciones.forEach((opcion, numeroOpcion) => {
      const texto = opcion.texto.trim();
      if (texto.length < 1) {
        errores.push(
          `La respuesta ${numeroOpcion + 1} de la pregunta ${numero} está vacía.`,
        );
      }
      if (texto.length > 280) {
        errores.push(
          `La respuesta ${numeroOpcion + 1} de la pregunta ${numero} admite como máximo 280 caracteres.`,
        );
      }
      if (opcion.correcta) correctas += 1;
      if (opcion.id) {
        if (idsOpcion.has(opcion.id)) {
          errores.push(
            `La pregunta ${numero} repite un identificador de respuesta.`,
          );
        }
        idsOpcion.add(opcion.id);
      }
    });
    if (opciones.length >= 2 && correctas === 0) {
      errores.push(`Indica la respuesta correcta de la pregunta ${numero}.`);
    }
    if (correctas > 1) {
      errores.push(
        `La pregunta ${numero} solo puede tener una respuesta correcta.`,
      );
    }
  });

  return errores;
}
