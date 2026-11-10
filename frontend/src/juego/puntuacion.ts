/** Misma fórmula que el servidor: 500 por acertar y hasta 500 por rapidez. */
export function puntosDeRespuesta(acierto: boolean, transcurridoMs: number, limiteMs: number): number {
  if (!acierto) return 0
  if (!(limiteMs > 0)) return 500
  const razon = Math.min(1, Math.max(0, transcurridoMs / limiteMs))
  return Math.min(1000, Math.max(500, Math.round(500 + 500 * (1 - razon))))
}

export function formatoPuntos(valor: number) {
  return new Intl.NumberFormat('es-MX').format(Math.round(valor))
}

export function formatoSegundos(milisegundos: number) {
  return (Math.max(0, milisegundos) / 1000).toFixed(1)
}
