export type CambioSesion =
  'sala-creada' | 'participante-incorporado' | 'partida-iniciada';

export interface AvisoConfirmado {
  tipo: CambioSesion;
  codigo: string;
  ocurridoEn: string;
}

/**
 * Punto de extensión para la persona 3. Se llama solo después de confirmar
 * la transacción. No transporta eventos en vivo. Una entrega fiable entre
 * procesos requeriría un outbox transaccional, que no se implementa aquí.
 */
export abstract class AvisoSesiones {
  abstract confirmar(aviso: AvisoConfirmado): void;
}

export class AvisoSesionesLocal extends AvisoSesiones {
  private readonly avisos: AvisoConfirmado[] = [];

  confirmar(aviso: AvisoConfirmado): void {
    this.avisos.push(aviso);
  }

  recientes(): AvisoConfirmado[] {
    return [...this.avisos];
  }
}
