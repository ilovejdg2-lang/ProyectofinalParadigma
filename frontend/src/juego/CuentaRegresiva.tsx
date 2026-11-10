import { useEffect, useRef } from 'react'
import { audio } from './audio.ts'
import { faseCuenta } from './ronda.ts'

const textos = { '3': '3', '2': '2', '1': '1', ya: '¡A JUGAR!' }

export function CuentaRegresiva({ abreEn, ahora }: { abreEn: string; ahora: number }) {
  const fase = faseCuenta(abreEn, ahora)
  const previa = useRef<string | null>(null)

  useEffect(() => {
    if (!fase || previa.current === fase) return
    previa.current = fase
    audio.efecto(fase === 'ya' ? 'jugar' : 'cuenta')
  }, [fase])

  if (!fase) return null
  return (
    <section className={`cuenta fase-${fase}`} data-testid="cuenta-regresiva" aria-live="assertive">
      <strong key={fase}>{textos[fase]}</strong>
    </section>
  )
}
