export type Espacio = 'cursos' | 'cuestionarios'

const CLAVE = 'profelink.espacio'

export function leerEspacio(): Espacio | null {
  try {
    const valor = sessionStorage.getItem(CLAVE)
    if (valor === 'cursos' || valor === 'cuestionarios') return valor
  } catch {
    /* El navegador puede bloquear la sesión. */
  }
  return null
}

export function guardarEspacio(espacio: Espacio) {
  sessionStorage.setItem(CLAVE, espacio)
}

export function limpiarEspacio() {
  sessionStorage.removeItem(CLAVE)
}

export function esEntradaDirecta(ruta: string) {
  return /^\/(partida|sala|resultados)(\/|$)/.test(ruta)
}
