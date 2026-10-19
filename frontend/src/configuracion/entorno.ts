export interface Entorno {
  authUrl: string
  actividadesUrl: string
  canalUrl: string
  simulacion: boolean
}

export function leerEntorno(): Entorno {
  return {
    authUrl: import.meta.env.VITE_AUTH_URL ?? '',
    actividadesUrl: import.meta.env.VITE_ACTIVIDADES_URL ?? '',
    canalUrl: import.meta.env.VITE_CANAL_URL ?? '',
    simulacion: import.meta.env.VITE_USAR_SIMULACION !== 'false',
  }
}
