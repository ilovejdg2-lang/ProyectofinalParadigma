import { useEffect, useRef } from 'react'

const colores = ['#f5a524', '#2f7cf6', '#3dd68c', '#f07178', '#e8ce96']

export function Confeti() {
  const lienzo = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = lienzo.current
    const padre = canvas?.parentElement
    const contexto = canvas?.getContext('2d')
    if (!canvas || !padre || !contexto) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const ctx = contexto
    const movil = window.matchMedia('(max-width: 700px)').matches
    const piezas = Array.from({ length: movil ? 16 : 42 }, () => ({
      x: Math.random(),
      y: -Math.random() * 0.4,
      v: 0.12 + Math.random() * 0.2,
      w: 4 + Math.random() * 6,
      h: 6 + Math.random() * 8,
      giro: Math.random() * Math.PI,
      color: colores[Math.floor(Math.random() * colores.length)] ?? colores[0],
    }))
    let marco = 0
    let ancho = 0
    let alto = 0
    const inicio = performance.now()

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
      if (tiempo - inicio > 4200) {
        ctx.clearRect(0, 0, ancho, alto)
        return
      }
      ctx.clearRect(0, 0, ancho, alto)
      for (const pieza of piezas) {
        pieza.y += pieza.v * 0.016
        pieza.giro += 0.08
        ctx.save()
        ctx.translate(pieza.x * ancho, pieza.y * alto)
        ctx.rotate(pieza.giro)
        ctx.fillStyle = pieza.color
        ctx.fillRect(-pieza.w / 2, -pieza.h / 2, pieza.w, pieza.h)
        ctx.restore()
      }
      marco = requestAnimationFrame(dibujar)
    }

    medir()
    marco = requestAnimationFrame(dibujar)
    return () => cancelAnimationFrame(marco)
  }, [])

  return <canvas ref={lienzo} className="confeti" aria-hidden="true" />
}
