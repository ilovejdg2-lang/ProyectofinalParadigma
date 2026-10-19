export type CodigoError =
  | 'validacion'
  | 'permiso'
  | 'no-encontrado'
  | 'tarde'
  | 'conexion'
  | 'estado'
  | 'credenciales'

export class ErrorServicio extends Error {
  readonly codigo: CodigoError

  constructor(codigo: CodigoError, mensaje: string) {
    super(mensaje)
    this.name = 'ErrorServicio'
    this.codigo = codigo
  }
}

export function mensajeDe(error: unknown): string {
  if (error instanceof Error) return error.message
  return 'Ocurrió un error inesperado.'
}
