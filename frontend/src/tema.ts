export type Tema = 'claro' | 'oscuro'

const CLAVE_TEMA = 'profelink.tema'

export function leerTema(): Tema {
  try {
    const guardado = localStorage.getItem(CLAVE_TEMA)
    if (guardado === 'claro' || guardado === 'oscuro') return guardado
  } catch {
    /* El navegador puede bloquear el almacenamiento. */
  }
  if (typeof window.matchMedia === 'function' && window.matchMedia('(prefers-color-scheme: light)').matches) {
    return 'claro'
  }
  return 'oscuro'
}

export function guardarTema(tema: Tema) {
  document.documentElement.dataset.tema = tema
  try {
    localStorage.setItem(CLAVE_TEMA, tema)
  } catch {
    /* Si no se puede guardar, el tema sigue aplicado en la página. */
  }
}
