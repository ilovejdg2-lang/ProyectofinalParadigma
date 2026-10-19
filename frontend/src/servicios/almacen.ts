export interface Almacen {
  leer(clave: string): string | null
  escribir(clave: string, valor: string): void
  borrar(clave: string): void
}

export function almacenLocal(): Almacen {
  return {
    leer: (clave) => localStorage.getItem(clave),
    escribir: (clave, valor) => localStorage.setItem(clave, valor),
    borrar: (clave) => localStorage.removeItem(clave),
  }
}

export function almacenMemoria(): Almacen {
  const datos = new Map<string, string>()
  return {
    leer: (clave) => datos.get(clave) ?? null,
    escribir: (clave, valor) => {
      datos.set(clave, valor)
    },
    borrar: (clave) => {
      datos.delete(clave)
    },
  }
}
