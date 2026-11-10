import { useEffect, useRef } from 'react'

const tonos = ['rgba(255,255,255,', 'rgba(126,176,255,', 'rgba(232,206,150,']

export function Particulas({ densidad = 42 }: { densidad?: number }) {
  const lienzo = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = lienzo.current
    const padre = canvas?.parentElement
    const contexto = canvas?.getContext('2d')
    if (!canvas || !padre || !contexto) return
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)')
    if (reduce.matches) return

    const ctx = contexto
    let marco = 0
    let ancho = 0
    let alto = 0
    const puntero = { x: 0.5, y: 0.35 }
    const cantidad = window.matchMedia('(max-width: 700px)').matches ? Math.round(densidad * 0.4) : densidad
    const partes = Array.from({ length: cantidad }, () => ({
      x: Math.random(),
      y: Math.random(),
      r: 0.7 + Math.random() * 1.7,
      v: 0.012 + Math.random() * 0.02,
      o: 0.28 + Math.random() * 0.5,
      tono: tonos[Math.floor(Math.random() * tonos.length)] ?? tonos[0],
      fase: Math.random() * Math.PI * 2,
    }))

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
      ctx.clearRect(0, 0, ancho, alto)
      for (const parte of partes) {
        const y = (parte.y + (tiempo / 1000) * parte.v) % 1
        const x = parte.x + Math.sin(tiempo / 1600 + parte.fase) * 0.012 + (puntero.x - 0.5) * 0.02
        const pulso = parte.o * (0.62 + 0.38 * Math.sin(tiempo / 900 + parte.fase))
        ctx.beginPath()
        ctx.fillStyle = `${parte.tono}${pulso})`
        ctx.arc(x * ancho, y * alto, parte.r, 0, Math.PI * 2)
        ctx.fill()
      }
      marco = requestAnimationFrame(dibujar)
    }

    function mover(evento: PointerEvent) {
      const rect = padre!.getBoundingClientRect()
      if (rect.width === 0) return
      puntero.x = (evento.clientX - rect.left) / rect.width
    }

    function alVisibilidad() {
      cancelAnimationFrame(marco)
      if (!document.hidden && !reduce.matches) marco = requestAnimationFrame(dibujar)
    }

    medir()
    marco = requestAnimationFrame(dibujar)
    const observador = new ResizeObserver(medir)
    observador.observe(padre)
    padre.addEventListener('pointermove', mover)
    document.addEventListener('visibilitychange', alVisibilidad)
    reduce.addEventListener('change', alVisibilidad)

    return () => {
      cancelAnimationFrame(marco)
      observador.disconnect()
      padre.removeEventListener('pointermove', mover)
      document.removeEventListener('visibilitychange', alVisibilidad)
      reduce.removeEventListener('change', alVisibilidad)
    }
  }, [densidad])

  return <canvas ref={lienzo} className="particulas" aria-hidden="true" />
}
