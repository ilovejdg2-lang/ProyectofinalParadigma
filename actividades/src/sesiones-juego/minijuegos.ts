export const TIPOS_MINIJUEGO = ['cofres', 'ruleta', 'estrellas', 'memoria', 'bomba'] as const

export type TipoMinijuego = (typeof TIPOS_MINIJUEGO)[number]

export interface PremioMinijuego {
  perfilId: string
  ronda: number
  puntos: number
  titulo: string
  detalle: Record<string, unknown>
}

export interface ConfigJuego {
  modalidad: 'academico' | 'competitivo'
  activos: boolean
  tipos: TipoMinijuego[]
  cada: number
  duracion: number
  velocidad: boolean
  ronda: number
  tipo?: TipoMinijuego
  premios: PremioMinijuego[]
}

const SEGMENTOS_RULETA = [100, 200, 500, 200, 100, 500] as const

export function semillaDe(sesionId: string, ronda: number, perfilId: string): number {
  let hash = 2166136261
  const texto = `${sesionId}:${ronda}:${perfilId}`
  for (let indice = 0; indice < texto.length; indice += 1) {
    hash ^= texto.charCodeAt(indice)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

export function tiposValidos(valor: unknown): TipoMinijuego[] {
  if (!Array.isArray(valor)) return [...TIPOS_MINIJUEGO]
  const lista = valor.filter((item): item is TipoMinijuego =>
    TIPOS_MINIJUEGO.includes(item as TipoMinijuego),
  )
  return lista.length > 0 ? lista : [...TIPOS_MINIJUEGO]
}

export function configInicial(entrada: Partial<ConfigJuego> | undefined, academico: boolean): ConfigJuego {
  return {
    modalidad: academico ? 'academico' : 'competitivo',
    tipos: tiposValidos(entrada?.tipos),
    cada: Math.min(20, Math.max(1, entrada?.cada ?? 3)),
    duracion: Math.min(20, Math.max(5, entrada?.duracion ?? 8)),
    velocidad: academico ? false : entrada?.velocidad !== false,
    ronda: entrada?.ronda ?? 0,
    tipo: entrada?.tipo,
    premios: entrada?.premios ?? [],
    activos: entrada?.activos ?? false,
  }
}

export function juegoDeInstantanea(valor: unknown): ConfigJuego | undefined {
  if (!valor || typeof valor !== 'object') return undefined
  const juego = (valor as { juego?: Partial<ConfigJuego> }).juego
  if (!juego) return undefined
  const academico = juego.modalidad === 'academico'
  return configInicial(
    {
      ...juego,
      modalidad: academico ? 'academico' : 'competitivo',
      activos: Boolean(juego.activos),
    },
    academico,
  )
}

export function tocaMinijuego(juego: ConfigJuego | undefined, preguntaActual: number, total: number): boolean {
  if (!juego?.activos || juego.tipos.length === 0) return false
  const respondidas = preguntaActual + 1
  if (respondidas >= total) return false
  return respondidas % juego.cada === 0
}

export function siguienteTipo(juego: ConfigJuego): TipoMinijuego {
  return juego.tipos[juego.ronda % juego.tipos.length]
}

export function resolverMinijuego(
  tipo: TipoMinijuego,
  semilla: number,
  accion: { indice?: number; capturas?: number; parejas?: number; detenidaEnMs?: number },
  academico: boolean,
): { puntos: number; titulo: string; detalle: Record<string, unknown> } {
  if (tipo === 'cofres') {
    const indice = Math.min(2, Math.max(0, Math.floor(accion.indice ?? 0)))
    const valores = [100, 250, 500]
    const orden = [0, 1, 2].map((item) => (item + (semilla % 3)) % 3)
    const premio = valores[orden[indice]]
    const titulos = ['Un puñado de monedas', 'Cofre de plata', 'Cofre de oro']
    return {
      puntos: academico ? 0 : premio,
      titulo: academico ? 'Insignia de cofre' : titulos[orden[indice]],
      detalle: { indice, mostrado: academico ? 0 : premio },
    }
  }
  if (tipo === 'ruleta') {
    const indice = semilla % SEGMENTOS_RULETA.length
    const premio = SEGMENTOS_RULETA[indice]
    return {
      puntos: academico ? 0 : premio,
      titulo: academico ? 'Giro de práctica' : `Ruleta +${premio}`,
      detalle: { indice, segmentos: SEGMENTOS_RULETA.length },
    }
  }
  if (tipo === 'estrellas') {
    const capturas = Math.min(12, Math.max(0, Math.floor(accion.capturas ?? 0)))
    return {
      puntos: academico ? 0 : capturas * 40,
      titulo: academico ? `${capturas} estrellas` : `${capturas} estrellas`,
      detalle: { capturas },
    }
  }
  if (tipo === 'memoria') {
    const parejas = Math.min(3, Math.max(0, Math.floor(accion.parejas ?? 0)))
    const puntos = parejas === 3 ? 200 : parejas * 50
    return {
      puntos: academico ? 0 : puntos,
      titulo: academico ? `${parejas} parejas` : parejas === 3 ? 'Memoria completa' : `${parejas} parejas`,
      detalle: { parejas },
    }
  }
  const limite = 8000
  const momento = Math.max(0, Math.floor(accion.detenidaEnMs ?? limite + 1))
  const aTiempo = momento >= 800 && momento <= limite
  return {
    puntos: academico || !aTiempo ? 0 : 300,
    titulo: aTiempo ? (academico ? 'Bomba desactivada' : 'Bomba desactivada') : 'La bomba explotó',
    detalle: { detenidaEnMs: momento, aTiempo },
  }
}

export function puntosCompetitivos(
  acierto: boolean,
  transcurridoMs: number,
  totalMs: number,
  velocidad: boolean,
): { total: number; velocidad: number } {
  if (!acierto) return { total: 0, velocidad: 0 }
  if (!velocidad || totalMs <= 0) return { total: 1000, velocidad: 0 }
  const restante = Math.max(0, Math.min(totalMs, totalMs - transcurridoMs))
  const extra = Math.round(500 * (restante / totalMs))
  return { total: 1000 + extra, velocidad: extra }
}

export function bonusRacha(racha: number, competitivo: boolean): number {
  if (!competitivo || racha < 3 || racha % 3 !== 0) return 0
  return 150
}

export function fichasEstrellas(semilla: number): string[] {
  return Array.from({ length: 12 }, (_, indice) => {
    const valor = (Math.abs(semilla) + indice * 97) % 100000
    return `estrella-${valor}`
  })
}

export function tableroMemoria(semilla: number): number[] {
  const cartas = [0, 0, 1, 1, 2, 2]
  let estado = Math.abs(semilla) || 1
  for (let indice = cartas.length - 1; indice > 0; indice -= 1) {
    estado = (estado * 1664525 + 1013904223) >>> 0
    const destino = estado % (indice + 1)
    const actual = cartas[indice]
    cartas[indice] = cartas[destino]
    cartas[destino] = actual
  }
  return cartas
}

export function parejasValidas(semilla: number, cartas: number[] | undefined, previas: number[]): number[] {
  const tablero = tableroMemoria(semilla)
  const encontradas = new Set(previas.filter((item) => item >= 0 && item <= 2))
  if (!cartas || cartas.length !== 2) return [...encontradas]
  const [primera, segunda] = cartas
  if (!Number.isInteger(primera) || !Number.isInteger(segunda)) return [...encontradas]
  if (primera === segunda || primera < 0 || segunda < 0 || primera > 5 || segunda > 5) return [...encontradas]
  if (tablero[primera] === tablero[segunda]) encontradas.add(tablero[primera])
  return [...encontradas]
}
