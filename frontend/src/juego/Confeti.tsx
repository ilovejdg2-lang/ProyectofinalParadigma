import { useEffect, useRef } from 'react'

const colores = ['#f5a524', '#2f7cf6', '#3dd68c', '#f07178', '#e8ce96', '#a78bfa', '#38bdf8', '#fb7185']

type ModoConfeti = 'rafaga' | 'continuo' | 'explosion'

interface Pieza {
  x: number
  y: number
  vx: number
  vy: number
  w: number
  h: number
  giro: number
  giroV: number
  color: string
  vida: number
}

function crearPieza(modo: ModoConfeti, desdeLado?: 'izq' | 'der' | 'centro'): Pieza {
  const lado = desdeLado ?? (Math.random() < 0.5 ? 'izq' : 'der')
  if (modo === 'explosion') {
    const angulo = Math.random() * Math.PI * 2
    const fuerza = 0.35 + Math.random() * 0.55
    return {
      x: 0.5 + (Math.random() - 0.5) * 0.08,
      y: 0.35 + Math.random() * 0.1,
      vx: Math.cos(angulo) * fuerza * 0.35,
      vy: Math.sin(angulo) * fuerza * 0.25 - 0.15,
      w: 5 + Math.random() * 8,
      h: 7 + Math.random() * 10,
      giro: Math.random() * Math.PI,
      giroV: (Math.random() - 0.5) * 0.25,
      color: colores[Math.floor(Math.random() * colores.length)] ?? colores[0],
      vida: 1,
    }
  }
  if (modo === 'continuo') {
    return {
      x: lado === 'izq' ? -0.02 : 1.02,
      y: Math.random() * 0.45,
      vx: (lado === 'izq' ? 1 : -1) * (0.08 + Math.random() * 0.12),
      vy: 0.08 + Math.random() * 0.16,
      w: 4 + Math.random() * 7,
      h: 6 + Math.random() * 9,
      giro: Math.random() * Math.PI,
      giroV: (Math.random() - 0.5) * 0.2,
      color: colores[Math.floor(Math.random() * colores.length)] ?? colores[0],
      vida: 1,
    }
  }
  return {
    x: Math.random(),
    y: -Math.random() * 0.35,
    vx: (Math.random() - 0.5) * 0.12,
    vy: 0.14 + Math.random() * 0.22,
    w: 4 + Math.random() * 7,
    h: 6 + Math.random() * 9,
    giro: Math.random() * Math.PI,
    giroV: (Math.random() - 0.5) * 0.18,
    color: colores[Math.floor(Math.random() * colores.length)] ?? colores[0],
    vida: 1,
  }
}

export function Confeti({ modo = 'rafaga', rafagaId = 0 }: { modo?: ModoConfeti; rafagaId?: number }) {
  const lienzo = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = lienzo.current
    const padre = canvas?.parentElement
    const contexto = canvas?.getContext('2d')
    if (!canvas || !padre || !contexto) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    const ctx = contexto
    const movil = window.matchMedia('(max-width: 700px)').matches
    const tope = movil ? (modo === 'continuo' ? 28 : 22) : modo === 'continuo' ? 64 : modo === 'explosion' ? 80 : 48
    const piezas: Pieza[] = Array.from({ length: modo === 'continuo' ? Math.floor(tope * 0.55) : tope }, () =>
      crearPieza(modo === 'continuo' ? 'continuo' : modo === 'explosion' ? 'explosion' : 'rafaga'),
    )

    let marco = 0
    let ancho = 0
    let alto = 0
    let ultimoSpawn = performance.now()
    const inicio = performance.now()
    const duracionRafaga = modo === 'rafaga' ? 2800 : modo === 'explosion' ? 3200 : Number.POSITIVE_INFINITY

    function medir() {
      const rect = padre!.getBoundingClientRect()
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      ancho = rect.width
      alto = rect.height
      canvas!.width = Math.max(1, Math.floor(ancho * dpr))
      canvas!.height = Math.max(1, Math.floor(alto * dpr))
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }

    function dibujar(tiempo: number) {
      if (modo !== 'continuo' && tiempo - inicio > duracionRafaga) {
        ctx.clearRect(0, 0, ancho, alto)
        return
      }

      if (modo === 'continuo' && tiempo - ultimoSpawn > (movil ? 220 : 140) && piezas.length < tope) {
        piezas.push(crearPieza('continuo', Math.random() < 0.5 ? 'izq' : 'der'))
        if (Math.random() < 0.25) piezas.push(crearPieza('continuo', Math.random() < 0.5 ? 'izq' : 'der'))
        ultimoSpawn = tiempo
      }

      ctx.clearRect(0, 0, ancho, alto)
      for (let i = piezas.length - 1; i >= 0; i -= 1) {
        const pieza = piezas[i]!
        pieza.x += pieza.vx * 0.016
        pieza.y += pieza.vy * 0.016
        pieza.vy += 0.0035
        pieza.giro += pieza.giroV
        pieza.vida -= modo === 'continuo' ? 0.0012 : 0.0022

        if (pieza.y > 1.15 || pieza.vida <= 0 || pieza.x < -0.1 || pieza.x > 1.1) {
          if (modo === 'continuo') {
            piezas[i] = crearPieza('continuo', Math.random() < 0.5 ? 'izq' : 'der')
          } else {
            piezas.splice(i, 1)
          }
          continue
        }

        ctx.save()
        ctx.globalAlpha = Math.max(0, Math.min(1, pieza.vida + 0.25))
        ctx.translate(pieza.x * ancho, pieza.y * alto)
        ctx.rotate(pieza.giro)
        ctx.fillStyle = pieza.color
        ctx.fillRect(-pieza.w / 2, -pieza.h / 2, pieza.w, pieza.h)
        ctx.restore()
      }

      marco = requestAnimationFrame(dibujar)
    }

    medir()
    const onResize = () => medir()
    window.addEventListener('resize', onResize)
    marco = requestAnimationFrame(dibujar)
    return () => {
      cancelAnimationFrame(marco)
      window.removeEventListener('resize', onResize)
    }
  }, [modo, rafagaId])

  return <canvas ref={lienzo} className="confeti" aria-hidden="true" />
}
