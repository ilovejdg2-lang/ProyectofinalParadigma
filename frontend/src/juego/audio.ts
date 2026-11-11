import type { Paisaje } from './ronda.ts'

export type Efecto =
  | 'ingreso'
  | 'cuenta'
  | 'jugar'
  | 'aviso'
  | 'tic'
  | 'countdown-final'
  | 'enviado'
  | 'correcto'
  | 'incorrecto'
  | 'tiempo'
  | 'clasificacion'
  | 'transicion'
  | 'racha'
  | 'podio-tercero'
  | 'podio-segundo'
  | 'podio-primero'
  | 'podio'
  | 'fanfarria'
  | 'moneda'
  | 'premio'
  | 'fallo-juego'
  | 'suspenso'

interface Preferencia {
  musicaSilenciada: boolean
  efectosSilenciados: boolean
  volumenMusica: number
  volumenEfectos: number
  /** Compatibilidad con preferencia antigua */
  silenciado?: boolean
  volumen?: number
}

const CLAVE = 'profelink.audio'
const BPM_PREGUNTA = 136
const BPM_VICTORIA = 118
const BPM_ESPERA = 92

function leerPreferencia(): Preferencia {
  try {
    const crudo = localStorage.getItem(CLAVE)
    if (!crudo) {
      return { musicaSilenciada: false, efectosSilenciados: false, volumenMusica: 0.42, volumenEfectos: 0.7 }
    }
    const dato = JSON.parse(crudo) as Partial<Preferencia>
    const volumenLegacy = typeof dato.volumen === 'number' ? dato.volumen : undefined
    const silencioLegacy = typeof dato.silenciado === 'boolean' ? dato.silenciado : undefined
    return {
      musicaSilenciada: Boolean(dato.musicaSilenciada ?? silencioLegacy ?? false),
      efectosSilenciados: Boolean(dato.efectosSilenciados ?? silencioLegacy ?? false),
      volumenMusica: clamp(Number(dato.volumenMusica ?? volumenLegacy ?? 0.42)),
      volumenEfectos: clamp(Number(dato.volumenEfectos ?? volumenLegacy ?? 0.7)),
    }
  } catch {
    return { musicaSilenciada: false, efectosSilenciados: false, volumenMusica: 0.42, volumenEfectos: 0.7 }
  }
}

function clamp(valor: number) {
  return Math.min(1, Math.max(0, Number.isFinite(valor) ? valor : 0))
}

class MotorAudio {
  private ctx: AudioContext | null = null
  private master: GainNode | null = null
  private busMusica: GainNode | null = null
  private busEfectos: GainNode | null = null
  private duckMusica: GainNode | null = null
  private paisaje: Paisaje = 'silencio'
  private tension = false
  private ducking = false
  private listo = false
  private cursor = 0
  private paso = 0
  private reloj = 0
  private pendiente: Efecto | null = null
  private preferencia = leerPreferencia()
  private oyentes = new Set<() => void>()
  private instalado = false
  private ultimosEfectos = new Map<string, number>()

  instalar() {
    if (this.instalado || typeof window === 'undefined') return
    this.instalado = true
    const desbloquear = () => void this.desbloquear()
    window.addEventListener('pointerdown', desbloquear, { capture: true })
    window.addEventListener('keydown', desbloquear, { capture: true })
  }

  suscribir(oyente: () => void) {
    this.oyentes.add(oyente)
    return () => {
      this.oyentes.delete(oyente)
    }
  }

  snapshot() {
    return {
      paisaje: this.paisaje,
      tension: this.tension,
      ducking: this.ducking,
      musicaSilenciada: this.preferencia.musicaSilenciada,
      efectosSilenciados: this.preferencia.efectosSilenciados,
      volumenMusica: this.preferencia.volumenMusica,
      volumenEfectos: this.preferencia.volumenEfectos,
      /** Compat: silenciar total */
      silenciado: this.preferencia.musicaSilenciada && this.preferencia.efectosSilenciados,
      volumen: this.preferencia.volumenMusica,
      contexto: this.ctx?.state ?? 'cerrado',
      listo: this.listo,
    }
  }

  async desbloquear() {
    this.listo = true
    const ctx = this.asegurar()
    if (!ctx) return
    if (ctx.state === 'suspended') {
      try {
        await ctx.resume()
      } catch {
        /* autoplay bloqueado: el control de usuario lo reintenta */
      }
    }
    this.aplicarVolumenes()
    this.arrancar()
    if (this.pendiente && ctx.state === 'running') {
      this.tocar(this.pendiente)
      this.pendiente = null
    }
    this.emitir()
  }

  ambiente(paisaje: Paisaje, tension = false) {
    const cambio = paisaje !== this.paisaje
    this.paisaje = paisaje
    this.tension = tension
    if (cambio) {
      this.cursor = 0
      this.paso = 0
      this.fadeMusica(cambio ? 0.08 : 0.04)
    } else {
      this.aplicarDuck()
    }
    if (this.listo) this.arrancar()
    this.emitir()
  }

  setTension(tension: boolean) {
    if (this.tension === tension) return
    this.tension = tension
    this.aplicarDuck()
    this.emitir()
  }

  setDucking(activo: boolean) {
    if (this.ducking === activo) return
    this.ducking = activo
    this.aplicarDuck()
    this.emitir()
  }

  silenciarMusica(valor: boolean) {
    this.preferencia = { ...this.preferencia, musicaSilenciada: valor }
    this.guardar()
    this.aplicarVolumenes()
    this.emitir()
  }

  silenciarEfectos(valor: boolean) {
    this.preferencia = { ...this.preferencia, efectosSilenciados: valor }
    this.guardar()
    this.aplicarVolumenes()
    this.emitir()
  }

  /** Compat: silencia música y efectos a la vez */
  silenciar(valor: boolean) {
    this.preferencia = { ...this.preferencia, musicaSilenciada: valor, efectosSilenciados: valor }
    this.guardar()
    this.aplicarVolumenes()
    this.emitir()
  }

  volumenMusica(valor: number) {
    this.preferencia = { ...this.preferencia, volumenMusica: clamp(valor) }
    this.guardar()
    this.aplicarVolumenes()
    this.emitir()
  }

  volumenEfectos(valor: number) {
    this.preferencia = { ...this.preferencia, volumenEfectos: clamp(valor) }
    this.guardar()
    this.aplicarVolumenes()
    this.emitir()
  }

  /** Compat */
  volumen(valor: number) {
    this.volumenMusica(valor)
  }

  efecto(nombre: Efecto, claveAntiDup?: string) {
    const llave = claveAntiDup ?? nombre
    const ahoraMs = performance.now()
    const previo = this.ultimosEfectos.get(llave) ?? 0
    if (ahoraMs - previo < 80 && nombre !== 'tic' && nombre !== 'countdown-final') return
    this.ultimosEfectos.set(llave, ahoraMs)

    if (!this.listo || !this.ctx || this.ctx.state !== 'running' || this.preferencia.efectosSilenciados) {
      if (nombre === 'ingreso' || nombre === 'jugar' || nombre === 'correcto' || nombre === 'fanfarria') {
        this.pendiente = nombre
      }
      return
    }
    this.tocar(nombre)
  }

  liberar() {
    if (this.reloj) window.clearInterval(this.reloj)
    this.reloj = 0
    this.paisaje = 'silencio'
    this.tension = false
    this.ducking = false
    this.cursor = 0
    this.paso = 0
    this.aplicarDuck()
    this.emitir()
  }

  private emitir() {
    for (const oyente of this.oyentes) oyente()
  }

  private guardar() {
    localStorage.setItem(
      CLAVE,
      JSON.stringify({
        musicaSilenciada: this.preferencia.musicaSilenciada,
        efectosSilenciados: this.preferencia.efectosSilenciados,
        volumenMusica: this.preferencia.volumenMusica,
        volumenEfectos: this.preferencia.volumenEfectos,
      }),
    )
  }

  private asegurar() {
    if (this.ctx && this.master && this.busMusica && this.busEfectos && this.duckMusica) return this.ctx
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!Ctx) return null
    const ctx = new Ctx()
    const master = ctx.createGain()
    const duck = ctx.createGain()
    const musica = ctx.createGain()
    const efectos = ctx.createGain()
    duck.gain.value = 1
    musica.gain.value = 1
    efectos.gain.value = 1
    master.gain.value = 1
    musica.connect(duck)
    duck.connect(master)
    efectos.connect(master)
    master.connect(ctx.destination)
    this.ctx = ctx
    this.master = master
    this.duckMusica = duck
    this.busMusica = musica
    this.busEfectos = efectos
    this.aplicarVolumenes()
    this.aplicarDuck()
    return ctx
  }

  private aplicarVolumenes() {
    if (!this.ctx || !this.busMusica || !this.busEfectos) return
    const ahora = this.ctx.currentTime
    const musica = this.preferencia.musicaSilenciada ? 0 : this.preferencia.volumenMusica
    const efectos = this.preferencia.efectosSilenciados ? 0 : this.preferencia.volumenEfectos
    this.busMusica.gain.setTargetAtTime(musica, ahora, 0.05)
    this.busEfectos.gain.setTargetAtTime(efectos, ahora, 0.04)
  }

  private aplicarDuck() {
    if (!this.ctx || !this.duckMusica) return
    const factor = this.ducking ? 0.38 : this.tension && this.paisaje === 'suspenso' ? 0.92 : 1
    this.duckMusica.gain.setTargetAtTime(factor, this.ctx.currentTime, 0.08)
  }

  private fadeMusica(segundos: number) {
    if (!this.ctx || !this.duckMusica) return
    const ahora = this.ctx.currentTime
    const actual = this.duckMusica.gain.value
    this.duckMusica.gain.cancelScheduledValues(ahora)
    this.duckMusica.gain.setValueAtTime(Math.max(0.0001, actual), ahora)
    this.duckMusica.gain.linearRampToValueAtTime(0.0001, ahora + segundos)
    window.setTimeout(() => this.aplicarDuck(), Math.ceil(segundos * 1000) + 16)
  }

  private bpm() {
    if (this.paisaje === 'victoria') return BPM_VICTORIA
    if (this.paisaje === 'espera') return BPM_ESPERA
    return this.tension ? BPM_PREGUNTA + 8 : BPM_PREGUNTA
  }

  private arrancar() {
    if (!this.listo) return
    const ctx = this.asegurar()
    if (!ctx) return
    if (this.reloj) window.clearInterval(this.reloj)
    this.reloj = 0
    if (this.paisaje === 'silencio') return
    if (this.cursor < ctx.currentTime) this.cursor = ctx.currentTime + 0.04
    const bombear = () => this.compasarHasta(ctx.currentTime + 0.5)
    bombear()
    this.reloj = window.setInterval(bombear, 100)
  }

  private compasarHasta(horizonte: number) {
    if (!this.busMusica || this.paisaje === 'silencio') return
    const semi = 60 / this.bpm() / 2
    while (this.cursor < horizonte) {
      this.compasar(this.cursor, this.paso)
      this.paso += 1
      this.cursor += semi
    }
  }

  private compasar(cuando: number, paso: number) {
    if (!this.busMusica) return
    if (this.paisaje === 'espera') this.compasarEspera(cuando, paso)
    else if (this.paisaje === 'suspenso') this.compasarPregunta(cuando, paso)
    else if (this.paisaje === 'victoria') this.compasarVictoria(cuando, paso)
  }

  private compasarEspera(cuando: number, paso: number) {
    const destino = this.busMusica!
    const beat = paso % 8
    if (beat === 0 || beat === 4) this.bombo(cuando, 0.045, destino)
    if (beat === 2 || beat === 6) this.hihat(cuando, 0.02, destino)
    const pads = [196, 247, 294, 370]
    const nota = pads[paso % pads.length] ?? 196
    this.tono(nota, cuando, 0.55, 'sine', 0.028, destino)
  }

  private compasarPregunta(cuando: number, paso: number) {
    const destino = this.busMusica!
    const beat = paso % 8
    const intenso = this.tension
    const fuerzaKick = intenso ? 0.085 : 0.06
    const fuerzaHat = intenso ? 0.04 : 0.028

    if (beat === 0 || beat === 4) this.bombo(cuando, fuerzaKick, destino)
    if (beat === 2 || beat === 6) this.caja(cuando, intenso ? 0.05 : 0.035, destino)
    if (beat % 2 === 1) this.hihat(cuando, fuerzaHat, destino)
    if (intenso && beat % 2 === 0) this.hihat(cuando + 0.08, fuerzaHat * 0.7, destino)

    const bajo = [65.41, 65.41, 73.42, 82.41, 87.31, 82.41, 73.42, 65.41]
    const notaBajo = bajo[paso % bajo.length] ?? 65
    this.tono(notaBajo, cuando, 0.28, 'square', intenso ? 0.04 : 0.028, destino)
    this.tono(notaBajo * 2, cuando, 0.18, 'triangle', 0.018, destino)

    const lead = [392, 440, 494, 523, 587, 523, 494, 440]
    const nota = lead[(paso + (intenso ? 2 : 0)) % lead.length] ?? 392
    this.tono(nota, cuando, intenso ? 0.16 : 0.22, 'triangle', intenso ? 0.045 : 0.032, destino)
    if (intenso) this.tono(nota * 1.5, cuando + 0.04, 0.1, 'sawtooth', 0.012, destino)
  }

  private compasarVictoria(cuando: number, paso: number) {
    const destino = this.busMusica!
    const beat = paso % 8
    if (beat === 0 || beat === 4) this.bombo(cuando, 0.05, destino)
    if (beat === 2 || beat === 6) this.caja(cuando, 0.03, destino)
    if (beat % 2 === 1) this.hihat(cuando, 0.022, destino)
    const melodia = [523.25, 659.25, 783.99, 987.77, 880, 783.99, 659.25, 587.33]
    const nota = melodia[paso % melodia.length] ?? 523
    this.tono(nota, cuando, 0.32, 'triangle', 0.04, destino)
    this.tono(nota / 2, cuando, 0.4, 'sine', 0.02, destino)
  }

  private tocar(nombre: Efecto) {
    if (!this.busEfectos || !this.ctx) return
    const ahora = this.ctx.currentTime + 0.01
    const destino = this.busEfectos

    switch (nombre) {
      case 'ingreso':
        this.tono(523, ahora, 0.1, 'sine', 0.07, destino)
        this.tono(659, ahora + 0.07, 0.14, 'sine', 0.06, destino)
        break
      case 'cuenta':
        this.tono(640, ahora, 0.1, 'square', 0.045, destino)
        break
      case 'jugar':
        this.tono(392, ahora, 0.12, 'triangle', 0.06, destino)
        this.tono(523, ahora + 0.08, 0.14, 'triangle', 0.07, destino)
        this.tono(784, ahora + 0.16, 0.22, 'triangle', 0.08, destino)
        break
      case 'aviso':
        this.tono(880, ahora, 0.07, 'sine', 0.045, destino)
        break
      case 'tic':
        this.beepUrgente(ahora, false)
        break
      case 'countdown-final':
        this.beepUrgente(ahora, true)
        break
      case 'enviado':
        this.tono(720, ahora, 0.05, 'sine', 0.055, destino)
        this.tono(960, ahora + 0.04, 0.06, 'sine', 0.04, destino)
        break
      case 'correcto':
        this.tono(659, ahora, 0.1, 'triangle', 0.08, destino)
        this.tono(880, ahora + 0.1, 0.12, 'triangle', 0.08, destino)
        this.tono(1175, ahora + 0.22, 0.28, 'sine', 0.07, destino)
        break
      case 'incorrecto':
        this.tono(392, ahora, 0.18, 'sawtooth', 0.045, destino)
        this.tono(311, ahora + 0.2, 0.22, 'sawtooth', 0.04, destino)
        this.tono(233, ahora + 0.45, 0.45, 'triangle', 0.05, destino)
        break
      case 'tiempo':
        this.tono(330, ahora, 0.12, 'triangle', 0.06, destino)
        this.tono(220, ahora + 0.1, 0.22, 'triangle', 0.07, destino)
        this.ruido(ahora, 0.18, 0.04, destino)
        break
      case 'clasificacion':
        this.tono(392, ahora, 0.1, 'sine', 0.05, destino)
        this.tono(523, ahora + 0.08, 0.14, 'sine', 0.05, destino)
        break
      case 'transicion':
        this.whoosh(ahora)
        break
      case 'racha':
        this.tono(659, ahora, 0.08, 'triangle', 0.06, destino)
        this.tono(784, ahora + 0.08, 0.08, 'triangle', 0.06, destino)
        this.tono(988, ahora + 0.16, 0.1, 'triangle', 0.07, destino)
        this.tono(1319, ahora + 0.28, 0.28, 'sine', 0.08, destino)
        break
      case 'podio-tercero':
        this.tono(392, ahora, 0.14, 'triangle', 0.06, destino)
        this.tono(494, ahora + 0.12, 0.18, 'triangle', 0.05, destino)
        break
      case 'podio-segundo':
        this.tono(523, ahora, 0.14, 'triangle', 0.065, destino)
        this.tono(659, ahora + 0.12, 0.16, 'triangle', 0.06, destino)
        this.tono(784, ahora + 0.24, 0.22, 'sine', 0.055, destino)
        break
      case 'podio-primero':
      case 'podio':
      case 'fanfarria':
        this.tono(523, ahora, 0.14, 'triangle', 0.07, destino)
        this.tono(659, ahora + 0.12, 0.14, 'triangle', 0.07, destino)
        this.tono(784, ahora + 0.24, 0.16, 'triangle', 0.08, destino)
        this.tono(1047, ahora + 0.4, 0.4, 'sine', 0.09, destino)
        this.tono(1319, ahora + 0.55, 0.35, 'sine', 0.05, destino)
        break
      case 'moneda':
        this.tono(988, ahora, 0.06, 'square', 0.04, destino)
        this.tono(1319, ahora + 0.05, 0.1, 'sine', 0.05, destino)
        break
      case 'premio':
        this.tono(523, ahora, 0.08, 'triangle', 0.06, destino)
        this.tono(659, ahora + 0.08, 0.08, 'triangle', 0.06, destino)
        this.tono(784, ahora + 0.16, 0.16, 'sine', 0.07, destino)
        break
      case 'fallo-juego':
        this.tono(196, ahora, 0.16, 'sawtooth', 0.03, destino)
        this.tono(146, ahora + 0.1, 0.22, 'triangle', 0.05, destino)
        break
      case 'suspenso':
        this.tono(220, ahora, 0.12, 'sine', 0.04, destino)
        this.tono(233, ahora + 0.12, 0.12, 'sine', 0.03, destino)
        break
    }
  }

  private beepUrgente(cuando: number, final: boolean) {
    if (!this.busEfectos) return
    const destino = this.busEfectos
    const freq = final ? 1240 : 980
    const dur = final ? 0.28 : 0.09
    this.tono(freq, cuando, dur, 'square', final ? 0.07 : 0.055, destino)
    this.tono(freq * 1.5, cuando, dur * 0.7, 'sine', final ? 0.035 : 0.02, destino)
  }

  private whoosh(cuando: number) {
    if (!this.busEfectos || !this.ctx) return
    const filtro = this.ctx.createBiquadFilter()
    filtro.type = 'bandpass'
    filtro.frequency.setValueAtTime(400, cuando)
    filtro.frequency.exponentialRampToValueAtTime(2400, cuando + 0.22)
    filtro.Q.value = 0.8
    filtro.connect(this.busEfectos)
    this.ruido(cuando, 0.28, 0.05, filtro)
  }

  private bombo(cuando: number, ganancia: number, destino: AudioNode) {
    if (!this.ctx) return
    const osc = this.ctx.createOscillator()
    const gan = this.ctx.createGain()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(150, cuando)
    osc.frequency.exponentialRampToValueAtTime(42, cuando + 0.14)
    gan.gain.setValueAtTime(0.0001, cuando)
    gan.gain.exponentialRampToValueAtTime(Math.max(0.0001, ganancia), cuando + 0.01)
    gan.gain.exponentialRampToValueAtTime(0.0001, cuando + 0.2)
    osc.connect(gan)
    gan.connect(destino)
    osc.start(cuando)
    osc.stop(cuando + 0.22)
  }

  private caja(cuando: number, ganancia: number, destino: AudioNode) {
    this.ruido(cuando, 0.08, ganancia, destino)
    this.tono(180, cuando, 0.06, 'triangle', ganancia * 0.4, destino)
  }

  private hihat(cuando: number, ganancia: number, destino: AudioNode) {
    this.ruido(cuando, 0.035, ganancia, destino)
  }

  private ruido(cuando: number, duracion: number, ganancia: number, destino: AudioNode) {
    if (!this.ctx) return
    const muestras = Math.max(1, Math.floor(this.ctx.sampleRate * duracion))
    const buffer = this.ctx.createBuffer(1, muestras, this.ctx.sampleRate)
    const data = buffer.getChannelData(0)
    for (let i = 0; i < muestras; i += 1) data[i] = Math.random() * 2 - 1
    const src = this.ctx.createBufferSource()
    const gan = this.ctx.createGain()
    const filtro = this.ctx.createBiquadFilter()
    filtro.type = 'highpass'
    filtro.frequency.value = 1800
    src.buffer = buffer
    gan.gain.setValueAtTime(0.0001, cuando)
    gan.gain.exponentialRampToValueAtTime(Math.max(0.0001, ganancia), cuando + 0.005)
    gan.gain.exponentialRampToValueAtTime(0.0001, cuando + duracion)
    src.connect(filtro)
    filtro.connect(gan)
    gan.connect(destino)
    src.start(cuando)
    src.stop(cuando + duracion + 0.02)
  }

  private tono(
    frecuencia: number,
    cuando: number,
    duracion: number,
    tipo: OscillatorType,
    ganancia: number,
    destino: AudioNode,
  ) {
    if (!this.ctx) return
    const osc = this.ctx.createOscillator()
    const gan = this.ctx.createGain()
    osc.type = tipo
    osc.frequency.setValueAtTime(Math.max(20, frecuencia), cuando)
    gan.gain.setValueAtTime(0.0001, cuando)
    gan.gain.exponentialRampToValueAtTime(Math.max(0.0001, ganancia), cuando + 0.015)
    gan.gain.exponentialRampToValueAtTime(0.0001, cuando + Math.max(0.03, duracion))
    osc.connect(gan)
    gan.connect(destino)
    osc.start(cuando)
    osc.stop(cuando + duracion + 0.04)
  }
}

export const audio = new MotorAudio()
