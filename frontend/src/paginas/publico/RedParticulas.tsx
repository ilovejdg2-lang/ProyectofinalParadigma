import { useEffect, useRef } from 'react'

interface Nodo {
  x: number
  y: number
  vx: number
  vy: number
  fase: number
}

export function RedParticulas() {
  const lienzo = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = lienzo.current
    const padre = canvas?.parentElement
    const contexto = canvas?.getContext('2d')
    if (!canvas || !padre || !contexto) return
    if (typeof window.matchMedia !== 'function') return

    const ctx = contexto
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)')
    const estrecho = window.matchMedia('(max-width: 700px)')
    let marco = 0
    let ancho = 0
    let alto = 0
    const cantidad = estrecho.matches ? 36 : 92
    const nodos: Nodo[] = Array.from({ length: cantidad }, () => ({
      x: Math.random(),
      y: Math.random(),
      vx: (Math.random() - 0.5) * 0.028,
      vy: (Math.random() - 0.5) * 0.028,
      fase: Math.random() * Math.PI * 2,
    }))

    function paleta() {
      const claro = document.documentElement.dataset.tema === 'claro'
      if (claro) {
        return {
          punto: 'rgba(61, 132, 232, 0.62)',
          linea: 'rgba(74, 144, 226, 0.34)',
          figura: 'rgba(74, 144, 226, 0.07)',
          halo: 'rgba(61, 132, 232, 0.16)',
        }
      }
      return {
        punto: 'rgba(132, 186, 255, 0.88)',
        linea: 'rgba(110, 168, 245, 0.55)',
        figura: 'rgba(96, 156, 240, 0.1)',
        halo: 'rgba(77, 155, 255, 0.22)',
      }
    }

    const puntero = { x: -1, y: -1, activo: false }
    function alPuntero(evento: PointerEvent) {
      const rect = padre!.getBoundingClientRect()
      puntero.x = evento.clientX - rect.left
      puntero.y = evento.clientY - rect.top
      puntero.activo = puntero.x >= 0 && puntero.y >= 0 && puntero.x <= rect.width && puntero.y <= rect.height
    }
    function soltarPuntero() {
      puntero.activo = false
    }

    function medir() {
      const rect = padre!.getBoundingClientRect()
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5)
      ancho = rect.width
      alto = rect.height
      canvas!.width = Math.max(1, Math.floor(ancho * dpr))
      canvas!.height = Math.max(1, Math.floor(alto * dpr))
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }

    function mover(delta: number, ahora: number) {
      const factor = delta / 1000
      for (const nodo of nodos) {
        nodo.x += nodo.vx * factor + Math.sin(ahora / 1600 + nodo.fase) * 0.0012
        nodo.y += nodo.vy * factor + Math.cos(ahora / 1900 + nodo.fase) * 0.001
        if (puntero.activo && ancho > 0 && alto > 0) {
          const dx = puntero.x / ancho - nodo.x
          const dy = puntero.y / alto - nodo.y
          const distancia = Math.hypot(dx, dy)
          if (distancia < 0.3 && distancia > 0.001) {
            const fuerza = (1 - distancia / 0.3) * 0.55
            nodo.x += dx * fuerza * 0.08
            nodo.y += dy * fuerza * 0.08
          }
        }
        if (nodo.x < -0.04 || nodo.x > 1.04) nodo.vx *= -1
        if (nodo.y < -0.04 || nodo.y > 1.04) nodo.vy *= -1
      }
    }

    function dibujar(tiempo: number) {
      const colores = paleta()
      ctx.clearRect(0, 0, ancho, alto)
      if (puntero.activo) {
        const halo = ctx.createRadialGradient(puntero.x, puntero.y, 0, puntero.x, puntero.y, 220)
        halo.addColorStop(0, colores.halo)
        halo.addColorStop(1, 'transparent')
        ctx.fillStyle = halo
        ctx.beginPath()
        ctx.arc(puntero.x, puntero.y, 220, 0, Math.PI * 2)
        ctx.fill()
      }
      const umbral = Math.min(196, Math.max(110, Math.min(ancho, alto) * 0.18))
      const puntos = nodos.map((nodo) => ({ x: nodo.x * ancho, y: nodo.y * alto, fase: nodo.fase }))

      for (let i = 0; i < puntos.length; i += 1) {
        const origen = puntos[i]
        if (!origen) continue
        for (let j = i + 1; j < puntos.length; j += 1) {
          const destino = puntos[j]
          if (!destino) continue
          const distancia = Math.hypot(origen.x - destino.x, origen.y - destino.y)
          if (distancia > umbral) continue
          const cerca = puntero.activo
            ? Math.min(Math.hypot(origen.x - puntero.x, origen.y - puntero.y), Math.hypot(destino.x - puntero.x, destino.y - puntero.y))
            : 999
          ctx.globalAlpha = Math.min(1, (1 - distancia / umbral) * (cerca < 170 ? 1.55 : 1))
          ctx.strokeStyle = colores.linea
          ctx.lineWidth = cerca < 150 ? 1.7 : 1
          ctx.beginPath()
          ctx.moveTo(origen.x, origen.y)
          ctx.lineTo(destino.x, destino.y)
          ctx.stroke()

          if ((i + j) % 9 !== 0) continue
          for (let k = j + 1; k < puntos.length; k += 1) {
            const tercero = puntos[k]
            if (!tercero) continue
            if (
              Math.hypot(origen.x - tercero.x, origen.y - tercero.y) < umbral &&
              Math.hypot(destino.x - tercero.x, destino.y - tercero.y) < umbral
            ) {
              ctx.globalAlpha = 0.85
              ctx.fillStyle = colores.figura
              ctx.beginPath()
              ctx.moveTo(origen.x, origen.y)
              ctx.lineTo(destino.x, destino.y)
              ctx.lineTo(tercero.x, tercero.y)
              ctx.closePath()
              ctx.fill()
              break
            }
          }
        }
      }

      ctx.globalAlpha = 1
      for (const punto of puntos) {
        const cerca = puntero.activo ? Math.hypot(punto.x - puntero.x, punto.y - puntero.y) : 999
        const pulso = 0.72 + 0.28 * Math.sin(tiempo / 1400 + punto.fase)
        ctx.globalAlpha = Math.min(1, pulso + (cerca < 140 ? 0.35 : 0))
        ctx.fillStyle = colores.punto
        ctx.beginPath()
        ctx.arc(punto.x, punto.y, cerca < 140 ? 3.1 : 2.05, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.globalAlpha = 1
    }

    let ultimo = performance.now()
    function cuadro(ahora: number) {
      if (!reduce.matches) mover(Math.min(48, ahora - ultimo), ahora)
      ultimo = ahora
      dibujar(ahora)
      if (!reduce.matches && !document.hidden) marco = requestAnimationFrame(cuadro)
    }

    function alVisibilidad() {
      cancelAnimationFrame(marco)
      if (!document.hidden) {
        ultimo = performance.now()
        marco = requestAnimationFrame(cuadro)
      }
    }

    medir()
    marco = requestAnimationFrame(cuadro)
    const observador = new ResizeObserver(medir)
    observador.observe(padre)
    padre.addEventListener('pointermove', alPuntero)
    padre.addEventListener('pointerleave', soltarPuntero)
    document.addEventListener('visibilitychange', alVisibilidad)
    reduce.addEventListener('change', alVisibilidad)

    return () => {
      cancelAnimationFrame(marco)
      observador.disconnect()
      padre.removeEventListener('pointermove', alPuntero)
      padre.removeEventListener('pointerleave', soltarPuntero)
      document.removeEventListener('visibilitychange', alVisibilidad)
      reduce.removeEventListener('change', alVisibilidad)
    }
  }, [])

  return <canvas ref={lienzo} className="landing-red" aria-hidden="true" />
}
