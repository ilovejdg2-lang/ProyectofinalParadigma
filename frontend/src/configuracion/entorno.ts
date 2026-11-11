export interface Entorno {
  authUrl: string
  actividadesUrl: string
  canalUrl: string
  simulacion: boolean
}

function hostDeEstaRed(url: string): string {
  if (typeof window === 'undefined' || !url) return url
  const pagina = window.location.hostname
  if (pagina === 'localhost' || pagina === '127.0.0.1') return url
  try {
    const destino = new URL(url)
    if (destino.hostname === 'localhost' || destino.hostname === '127.0.0.1') {
      destino.hostname = pagina
      return destino.toString().replace(/\/$/, '')
    }
  } catch {
    return url
  }
  return url
}

export function leerEntorno(): Entorno {
  const authUrl = hostDeEstaRed(import.meta.env.VITE_AUTH_URL ?? '')
  const actividadesUrl = hostDeEstaRed(import.meta.env.VITE_ACTIVIDADES_URL ?? '')
  const canalUrl = hostDeEstaRed(import.meta.env.VITE_CANAL_URL ?? '')
  const flag = import.meta.env.VITE_USAR_SIMULACION
  // Opt-in: solo simula si se pide explícitamente. Si hay URLs de API, se usan.
  const simulacion = flag === 'true'
  return { authUrl, actividadesUrl, canalUrl, simulacion }
}
