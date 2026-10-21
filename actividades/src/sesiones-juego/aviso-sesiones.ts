export type CambioSesion =
  | 'sala-creada'
  | 'participante-incorporado'
  | 'partida-iniciada'
  | 'respuesta-aceptada'
  | 'pregunta-cerrada'
  | 'pregunta-cambiada'
  | 'sesion-finalizada';

export interface AvisoConfirmado {
  tipo: CambioSesion;
  codigo: string;
  ocurridoEn: string;
}

/**
 * Punto de extensión para la persona 3. Se llama solo después de confirmar
 * la transacción. La lista en memoria se pierde si el proceso se reinicia
 * y no garantiza entrega entre servicios. Eso exigiría un outbox
 * transaccional, que no se implementa aquí.
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
