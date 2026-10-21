import { randomInt } from 'node:crypto';

/** Mismo alfabeto que la simulación del frontend: sin 0, 1, I ni O. */
export const ALFABETO_SALA = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function codigoSala(azar: (tope: number) => number = randomInt): string {
  let codigo = '';
  for (let indice = 0; indice < 6; indice += 1) {
    codigo += ALFABETO_SALA[azar(ALFABETO_SALA.length)];
  }
  return codigo;
}
