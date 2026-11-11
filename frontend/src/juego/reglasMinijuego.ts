import type { PartidaLocal, TipoMinijuego } from '../dominio/tipos.ts'

const SEGMENTOS = [100, 200, 500, 200, 100, 500]

export function puntosPorVelocidad(acierto: boolean, transcurridoMs: number, totalMs: number, velocidad: boolean) {
  if (!acierto) return { total: 0, extra: 0 }
  if (!velocidad || totalMs <= 0) return { total: 1000, extra: 0 }
  const restante = Math.max(0, Math.min(totalMs, totalMs - transcurridoMs))
  const extra = Math.round(500 * (restante / totalMs))
  return { total: 1000 + extra, extra }
}

export function semillaDe(codigo: string, ronda: number, perfilId: string) {
  let hash = 2166136261
  const texto = `${codigo}:${ronda}:${perfilId}`
  for (let indice = 0; indice < texto.length; indice += 1) {
    hash ^= texto.charCodeAt(indice)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

export function fichasDe(semilla: number) {
  return Array.from({ length: 12 }, (_, indice) => `estrella-${(semilla + indice * 97) % 100000}`)
}

export function tableroDe(semilla: number) {
  const cartas = [0, 0, 1, 1, 2, 2]
  let estado = semilla || 1
  for (let indice = cartas.length - 1; indice > 0; indice -= 1) {
    estado = (estado * 1664525 + 1013904223) >>> 0
    const destino = estado % (indice + 1)
    const actual = cartas[indice]
    cartas[indice] = cartas[destino]
    cartas[destino] = actual
  }
  return cartas
}

export function resolverLocal(
  tipo: TipoMinijuego,
  semilla: number,
  accion: { indice?: number; capturas?: number; parejas?: number; detenidaEnMs?: number },
  academico: boolean,
) {
  if (tipo === 'cofres') {
    const indice = Math.min(2, Math.max(0, Math.floor(accion.indice ?? 0)))
    const valores = [100, 250, 500]
    const orden = [0, 1, 2].map((item) => (item + (semilla % 3)) % 3)
    const premio = valores[orden[indice]]
    const titulos = ['Un puñado de monedas', 'Cofre de plata', 'Cofre de oro']
    return { puntos: academico ? 0 : premio, titulo: academico ? 'Insignia de cofre' : titulos[orden[indice]], detalle: { indice } }
  }
  if (tipo === 'ruleta') {
    const indice = semilla % SEGMENTOS.length
    const premio = SEGMENTOS[indice]
    return { puntos: academico ? 0 : premio, titulo: academico ? 'Giro de práctica' : `Ruleta +${premio}`, detalle: { indice, segmentos: SEGMENTOS.length } }
  }
  if (tipo === 'estrellas') {
    const capturas = Math.min(12, Math.max(0, Math.floor(accion.capturas ?? 0)))
    return { puntos: academico ? 0 : capturas * 40, titulo: `${capturas} estrellas`, detalle: { capturas } }
  }
  if (tipo === 'memoria') {
    const parejas = Math.min(3, Math.max(0, Math.floor(accion.parejas ?? 0)))
    const puntos = parejas === 3 ? 200 : parejas * 50
    return { puntos: academico ? 0 : puntos, titulo: parejas === 3 ? 'Memoria completa' : `${parejas} parejas`, detalle: { parejas } }
  }
  const momento = Math.max(0, Math.floor(accion.detenidaEnMs ?? 9000))
  const aTiempo = momento >= 800 && momento <= 8000
  return { puntos: academico || !aTiempo ? 0 : 300, titulo: aTiempo ? 'Bomba desactivada' : 'La bomba explotó', detalle: { aTiempo, detenidaEnMs: momento } }
}

export function vistaLocal(partida: PartidaLocal | undefined, perfilId: string | undefined, codigo: string, activo: boolean) {
  if (!partida) return undefined
  const semilla = perfilId ? semillaDe(codigo, partida.ronda, perfilId) : 0
  const mio = perfilId ? partida.premios.find((item) => item.ronda === partida.ronda && item.perfilId === perfilId) : undefined
  return {
    activo,
    modalidad: partida.modalidad,
    tipo: activo ? partida.tipo : undefined,
    ronda: partida.ronda,
    duracion: partida.duracion,
    mio: mio ? { puntos: mio.puntos, titulo: mio.titulo, detalle: mio.detalle } : null,
    fichas: activo && partida.tipo === 'estrellas' && perfilId ? fichasDe(semilla) : undefined,
    cartas: activo && partida.tipo === 'memoria' ? 6 : undefined,
  }
}
