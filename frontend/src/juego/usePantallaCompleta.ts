import { useEffect, useState, type RefObject } from 'react'

export function usePantallaCompleta(ref: RefObject<HTMLElement | null>) {
  const [activa, setActiva] = useState(false)

  useEffect(() => {
    const alCambiar = () => setActiva(document.fullscreenElement === ref.current)
    document.addEventListener('fullscreenchange', alCambiar)
    return () => document.removeEventListener('fullscreenchange', alCambiar)
  }, [ref])

  async function alternar() {
    const nodo = ref.current
    if (!nodo) return
    try {
      if (document.fullscreenElement) await document.exitFullscreen()
      else await nodo.requestFullscreen()
    } catch {
      setActiva(false)
    }
  }

  return { activa, alternar }
}
