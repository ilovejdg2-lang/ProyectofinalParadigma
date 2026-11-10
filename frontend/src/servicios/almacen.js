export function almacenLocal() {
    return {
        leer: (clave) => localStorage.getItem(clave),
        escribir: (clave, valor) => localStorage.setItem(clave, valor),
        borrar: (clave) => localStorage.removeItem(clave),
    };
}
export function almacenMemoria() {
    const datos = new Map();
    return {
        leer: (clave) => datos.get(clave) ?? null,
        escribir: (clave, valor) => {
            datos.set(clave, valor);
        },
        borrar: (clave) => {
            datos.delete(clave);
        },
    };
}
