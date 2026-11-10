import type { Paisaje } from './ronda.ts'

type Efecto = 'ingreso' | 'cuenta' | 'jugar' | 'aviso' | 'tic' | 'enviado' | 'correcto' | 'incorrecto' | 'tiempo' | 'clasificacion' | 'podio'

interface Preferencia {
  silenciado: boolean
  volumen: number
}

const CLAVE = 'profelink.audio'

function leerPreferencia(): Preferencia {
  try {
    const crudo = localStorage.getItem(CLAVE)
    if (!crudo) return { silenciado: false, volumen: 0.55 }
    const dato = JSON.parse(crudo) as Partial<Preferencia>
    return {
      silenciado: Boolean(dato.silenciado),
      volumen: Math.min(1, Math.max(0, Number(dato.volumen) || 0.55)),
    }
  } catch {
    return { silenciado: false, volumen: 0.55 }
  }
}

class MotorAudio {
  private ctx: AudioContext | null = null
  private master: GainNode | null = null
  private musica: GainNode | null = null
  private paisaje: Paisaje = 'silencio'
  private tension = false
  private listo = false
  private cursor = 0
  private indice = 0
  private reloj = 0
  private pendiente: Efecto | null = null
  private preferencia = leerPreferencia()
  private oyentes = new Set<() => void>()
  private instalado = false

  instalar() {
    if (this.instalado || typeof window === 'undefined') return
    this.instalado = true
    window.addEventListener('pointerdown', () => void this.desbloquear(), { capture: true })
  }

  suscribir(oyente: () => void) {
    this.oyentes.add(oyente)
    return () => this.oyentes.delete(oyente)
  }

  snapshot() {
    return {
      paisaje: this.paisaje,
      silenciado: this.preferencia.silenciado,
      volumen: this.preferencia.volumen,
      contexto: this.ctx?.state ?? 'cerrado',
    }
  }

  async desbloquear() {
    this.listo = true
    const ctx = this.asegurar()
    if (!ctx) return
    if (ctx.state === 'suspended') await ctx.resume()
    this.aplicar()
    this.arrancar()
    if (this.pendiente && ctx.state === 'running') {
      this.tocar(this.pendiente)
      this.pendiente = null
    }
    this.emitir()
  }

  ambiente(paisaje: Paisaje, tension: boolean) {
    const cambio = paisaje !== this.paisaje
    this.paisaje = paisaje
    this.tension = tension
    if (cambio) this.cursor = 0
    if (this.listo) this.arrancar()
    this.emitir()
  }

  silenciar(valor: boolean) {
    this.preferencia = { ...this.preferencia, silenciado: valor }
    this.guardar()
    this.aplicar()
    this.emitir()
  }

  volumen(valor: number) {
    this.preferencia = { ...this.preferencia, volumen: Math.min(1, Math.max(0, valor)) }
    this.guardar()
    this.aplicar()
    this.emitir()
  }

  efecto(nombre: Efecto) {
    if (!this.listo || !this.ctx || this.ctx.state !== 'running' || this.preferencia.silenciado) {
      if (nombre === 'ingreso' || nombre === 'jugar' || nombre === 'correcto') this.pendiente = nombre
      return
    }
    this.tocar(nombre)
  }

  private emitir() {
    for (const oyente of this.oyentes) oyente()
  }

  private guardar() {
    localStorage.setItem(CLAVE, JSON.stringify(this.preferencia))
  }

  private asegurar() {
    if (this.ctx && this.master && this.musica) return this.ctx
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!Ctx) return null
    const ctx = new Ctx()
    const master = ctx.createGain()
    const musica = ctx.createGain()
    musica.gain.value = 1
    musica.connect(master)
    master.connect(ctx.destination)
    this.ctx = ctx
    this.master = master
    this.musica = musica
    this.aplicar()
    return ctx
  }

  private aplicar() {
    if (!this.master || !this.ctx) return
    const valor = this.preferencia.silenciado ? 0 : this.preferencia.volumen
    this.master.gain.setTargetAtTime(valor, this.ctx.currentTime, 0.04)
  }

  private arrancar() {
    if (!this.listo) return
    const ctx = this.asegurar()
    if (!ctx) return
    if (this.reloj) window.clearInterval(this.reloj)
    this.reloj = 0
    if (this.paisaje === 'silencio') return
    if (this.cursor < ctx.currentTime) this.cursor = ctx.currentTime + 0.05
    const bombear = () => this.compasarHasta(ctx.currentTime + 0.45)
    bombear()
    this.reloj = window.setInterval(bombear, 120)
  }

  private paso() {
    if (this.paisaje === 'victoria') return 0.18
    if (this.paisaje === 'suspenso') return this.tension ? 0.24 : 0.5
    return 0.7
  }

  private compasarHasta(horizonte: number) {
    if (!this.musica || this.paisaje === 'silencio') return
    const paso = this.paso()
    while (this.cursor < horizonte) {
      this.compasar(this.cursor)
      this.cursor += paso
    }
  }

  private compasar(cuando: number) {
    if (!this.musica) return
    const escalas = {
      espera: [262, 330, 392, 494, 392, 330],
      suspenso: [98, 117, 131, 98, 87, 131],
      victoria: [523, 659, 784, 1047, 784, 659],
    } as const
    if (this.paisaje !== 'espera' && this.paisaje !== 'suspenso' && this.paisaje !== 'victoria') return
    const escala = escalas[this.paisaje]
    const nota = escala[this.indice % escala.length] ?? 262
    this.indice += 1
    const tipo: OscillatorType = this.paisaje === 'espera' ? 'sine' : 'triangle'
    const fuerza = this.paisaje === 'suspenso' ? (this.tension ? 0.08 : 0.055) : 0.045
    this.tono(nota, cuando, this.paisaje === 'victoria' ? 0.26 : 0.42, tipo, fuerza, this.musica)
    if (this.paisaje === 'suspenso' && this.tension) {
      this.tono(nota * 2, cuando, 0.07, 'sine', 0.025, this.musica)
    }
  }

  private tocar(nombre: Efecto) {
    if (!this.master || !this.ctx) return
    const ahora = this.ctx.currentTime + 0.01
    const destino = this.master
    if (nombre === 'ingreso') {
      this.tono(523, ahora, 0.12, 'sine', 0.08, destino)
      this.tono(659, ahora + 0.08, 0.16, 'sine', 0.07, destino)
    } else if (nombre === 'cuenta') {
      this.tono(520, ahora, 0.12, 'square', 0.04, destino)
    } else if (nombre === 'jugar') {
      this.tono(523, ahora, 0.22, 'triangle', 0.08, destino)
      this.tono(659, ahora, 0.22, 'triangle', 0.06, destino)
      this.tono(784, ahora, 0.28, 'triangle', 0.06, destino)
    } else if (nombre === 'aviso') {
      this.tono(880, ahora, 0.08, 'sine', 0.04, destino)
    } else if (nombre === 'tic') {
      this.tono(990, ahora, 0.05, 'square', 0.03, destino)
    } else if (nombre === 'enviado') {
      this.tono(660, ahora, 0.08, 'sine', 0.06, destino)
    } else if (nombre === 'correcto') {
      this.tono(523, ahora, 0.12, 'triangle', 0.07, destino)
      this.tono(784, ahora + 0.09, 0.18, 'triangle', 0.07, destino)
    } else if (nombre === 'incorrecto') {
      this.tono(196, ahora, 0.18, 'sine', 0.05, destino)
    } else if (nombre === 'tiempo') {
      this.tono(330, ahora, 0.12, 'triangle', 0.06, destino)
      this.tono(220, ahora + 0.1, 0.2, 'triangle', 0.06, destino)
    } else if (nombre === 'clasificacion') {
      this.tono(392, ahora, 0.1, 'sine', 0.05, destino)
      this.tono(523, ahora + 0.08, 0.14, 'sine', 0.05, destino)
    } else if (nombre === 'podio') {
      this.tono(523, ahora, 0.16, 'triangle', 0.07, destino)
      this.tono(659, ahora + 0.12, 0.16, 'triangle', 0.06, destino)
      this.tono(784, ahora + 0.24, 0.28, 'triangle', 0.07, destino)
    }
  }

  private tono(frecuencia: number, cuando: number, duracion: number, tipo: OscillatorType, ganancia: number, destino: AudioNode) {
    if (!this.ctx) return
    const osc = this.ctx.createOscillator()
    const gan = this.ctx.createGain()
    osc.type = tipo
    osc.frequency.setValueAtTime(frecuencia, cuando)
    gan.gain.setValueAtTime(0.0001, cuando)
    gan.gain.exponentialRampToValueAtTime(Math.max(0.0001, ganancia), cuando + 0.02)
    gan.gain.exponentialRampToValueAtTime(0.0001, cuando + duracion)
    osc.connect(gan)
    gan.connect(destino)
    osc.start(cuando)
    osc.stop(cuando + duracion + 0.03)
  }
}

export const audio = new MotorAudio()
