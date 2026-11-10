/** Un acierto vale los puntos del cuestionario. Por defecto es 1. El error vale 0. */
export function puntosDeRespuesta(acierto: boolean, puntosPorAcierto = 1): number {
  if (!acierto) return 0
  const puntos = Math.round(puntosPorAcierto)
  if (!Number.isInteger(puntos) || puntos < 1) return 1
  return Math.min(100, puntos)
}

export function formatoPuntos(valor: number) {
  return new Intl.NumberFormat('es-MX').format(Math.round(valor))
}

export function formatoSegundos(milisegundos: number) {
  return (Math.max(0, milisegundos) / 1000).toFixed(1)
}
