export class ErrorServicio extends Error {
    codigo;
    constructor(codigo, mensaje) {
        super(mensaje);
        this.name = 'ErrorServicio';
        this.codigo = codigo;
    }
}
export function mensajeDe(error) {
    if (error instanceof Error)
        return error.message;
    return 'Ocurrió un error inesperado.';
}
