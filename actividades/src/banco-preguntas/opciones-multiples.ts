export interface PaqueteOpcionMultiple {
  enunciado: string;
  correcta: string;
  distractores: [string, string, string];
}

/** Las respuestas de los cuestionarios están en la base. */
export const OPCIONES_MULTIPLES: Record<string, PaqueteOpcionMultiple> = {};
