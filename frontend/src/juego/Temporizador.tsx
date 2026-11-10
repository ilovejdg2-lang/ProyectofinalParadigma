import { useEffect, useRef } from 'react'
import { audio } from './audio.ts'

export function Temporizador({ restante, total, activo }: { restante: number; total: number; activo: boolean }) {
  const segundos = Math.max(0, Math.ceil(restante / 1000))
  const porcentaje = total > 0 ? Math.min(100, Math.max(0, (restante / (total * 1000)) * 100)) : 0
  const tono = segundos <= 5 ? 'critico' : segundos <= 10 ? 'urgente' : 'calmo'
  const previo = useRef<number | null>(null)

  useEffect(() => {
    if (!activo) {
      previo.current = null
      return
    }
    if (previo.current === segundos) return
    const anterior = previo.current
    previo.current = segundos
    if (anterior === null) return
    if (segundos === 10) audio.efecto('aviso')
    if (segundos > 0 && segundos <= 5) audio.efecto('tic')
    if (segundos === 0) audio.efecto('tiempo')
  }, [activo, segundos])

  if (!activo) return null
  return (
    <div className={`temporizador-fila ${tono}`}>
      <div className="temporizador" aria-hidden="true">
        <span style={{ width: `${porcentaje}%` }} />
      </div>
      <strong className={`tiempo-restante ${tono}`} aria-label="Tiempo restante">
        {segundos} s
      </strong>
    </div>
  )
}
