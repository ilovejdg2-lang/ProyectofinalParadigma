export interface OpcionPublica {
  id: string;
  texto: string;
  correcta?: boolean;
}

export interface PreguntaPublica {
  id: string;
  enunciado: string;
  orden: number;
  imagenUrl?: string;
  respuestaCorrecta?: boolean;
  opciones: OpcionPublica[];
}

export interface CuestionarioPublico {
  id: string;
  titulo: string;
  descripcion: string;
  categoria: string;
  etiquetas: string[];
  dificultad: 'facil' | 'medio' | 'dificil';
  autorId: string;
  autorNombre: string;
  preguntas: PreguntaPublica[];
  imagenUrl?: string;
  esDemostracion: boolean;
  actualizadoEn: string;
}

export interface FilaOpcion {
  id: string;
  texto: string;
  orden: number;
  correcta: boolean;
  respuestas?: { id: string }[];
}

export interface FilaPregunta {
  id: string;
  enunciado: string;
  orden: number;
  respuestaCorrecta: boolean;
  segundos: number | null;
  imagen?: { url: string } | null;
  opciones: FilaOpcion[];
  respuestas?: { id: string }[];
}

export interface FilaCuestionario {
  id: string;
  titulo: string;
  descripcion: string;
  categoria: string;
  etiquetas: string[];
  dificultad: 'facil' | 'medio' | 'dificil';
  autorId: string;
  autorNombre: string;
  esDemostracion: boolean;
  actualizadoEn: Date | string;
  eliminadoEn?: Date | string | null;
  imagen?: { url: string } | null;
  preguntas: FilaPregunta[];
}

export function presentar(
  fila: FilaCuestionario,
  completo: boolean,
): CuestionarioPublico {
  const imagenUrl = fila.imagen?.url;
  return {
    id: fila.id,
    titulo: fila.titulo,
    descripcion: fila.descripcion,
    categoria: fila.categoria,
    etiquetas: fila.etiquetas,
    dificultad: fila.dificultad,
    autorId: fila.autorId,
    autorNombre: fila.autorNombre,
    esDemostracion: fila.esDemostracion,
    actualizadoEn: new Date(fila.actualizadoEn).toISOString(),
    ...(imagenUrl ? { imagenUrl } : {}),
    preguntas: [...fila.preguntas]
      .sort((a, b) => a.orden - b.orden)
      .map((pregunta) => presentarPregunta(pregunta, completo)),
  };
}

function presentarPregunta(
  pregunta: FilaPregunta,
  completo: boolean,
): PreguntaPublica {
  const imagenUrl = pregunta.imagen?.url;
  const opciones = [...pregunta.opciones]
    .sort((a, b) => a.orden - b.orden)
    .map((opcion) =>
      completo
        ? { id: opcion.id, texto: opcion.texto, correcta: opcion.correcta }
        : { id: opcion.id, texto: opcion.texto },
    );
  return {
    id: pregunta.id,
    enunciado: pregunta.enunciado,
    orden: pregunta.orden,
    ...(imagenUrl ? { imagenUrl } : {}),
    ...(completo ? { respuestaCorrecta: pregunta.respuestaCorrecta } : {}),
    opciones,
  };
}

export function contieneSolucion(valor: unknown): boolean {
  return (
    JSON.stringify(valor).includes('"correcta":true') ||
    JSON.stringify(valor).includes('"respuestaCorrecta"')
  );
}
