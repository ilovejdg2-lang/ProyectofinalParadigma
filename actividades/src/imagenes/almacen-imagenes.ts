export interface ArchivoAlmacen {
  ruta: string;
  tipoMime: string;
  contenido: Buffer;
}

export interface ArchivoLeido {
  tipoMime: string;
  contenido: Buffer;
}

export abstract class AlmacenImagenes {
  abstract subir(archivo: ArchivoAlmacen): Promise<string>;
  abstract retirar(ruta: string): Promise<void>;

  abrir(_ruta: string): Promise<ArchivoLeido | null> {
    return Promise.resolve(null);
  }
}
