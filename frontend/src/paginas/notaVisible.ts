export function notaDeAciertos(aciertos: number, total: number, notaMaxima: number) {
  if (!(total > 0) || !(notaMaxima > 0)) return 0
  return Math.round((Math.min(total, Math.max(0, aciertos)) / total) * notaMaxima)
}

export function aporteDe(nota: number, notaMaxima: number, valorPorcentaje: number) {
  if (!(notaMaxima > 0) || !(valorPorcentaje > 0)) return 0
  return Math.round((Math.max(0, nota) / notaMaxima) * valorPorcentaje * 10) / 10
}
