import { useEffect, useRef } from 'react'

export function useRevelar<T extends HTMLElement>() {
  const ref = useRef<T>(null)

  useEffect(() => {
    const nodo = ref.current
    if (!nodo) return
    const reduce =
      typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduce || typeof IntersectionObserver !== 'function') {
      nodo.classList.add('visible')
      return
    }
    const observador = new IntersectionObserver(
      (entradas) => {
        if (entradas.some((entrada) => entrada.isIntersecting)) {
          nodo.classList.add('visible')
          observador.disconnect()
        }
      },
      { threshold: 0.16, rootMargin: '0px 0px -6% 0px' },
    )
    observador.observe(nodo)
    const respaldo = window.setTimeout(() => nodo.classList.add('visible'), 1400)
    return () => {
      observador.disconnect()
      window.clearTimeout(respaldo)
    }
  }, [])

  return ref
}
