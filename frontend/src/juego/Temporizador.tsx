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
      audio.setDucking(false)
      return
    }

    const critico = segundos > 0 && segundos <= 5
    audio.setDucking(critico)
    audio.setTension(segundos > 0 && segundos <= 10)

    if (previo.current === segundos) return
    const anterior = previo.current
    previo.current = segundos

    // Reconexión a mitad del countdown: tocar el segundo real restante.
    if (anterior === null) {
      if (segundos > 0 && segundos <= 5) {
        audio.efecto(segundos === 1 ? 'countdown-final' : 'tic', `tic-${segundos}`)
      }
      return
    }

    if (segundos === 10) audio.efecto('aviso', 'aviso-10')
    if (segundos > 1 && segundos <= 5) audio.efecto('tic', `tic-${segundos}`)
    if (segundos === 1) audio.efecto('countdown-final', 'tic-1')
    if (segundos === 0) {
      audio.setDucking(false)
      audio.efecto('tiempo', 'tiempo-agotado')
    }
  }, [activo, segundos])

  useEffect(() => () => audio.setDucking(false), [])

  if (!activo) return null
  return (
    <div className={`temporizador-fila ${tono}`} data-segundos={segundos}>
      <div className="temporizador" aria-hidden="true">
        <span style={{ width: `${porcentaje}%` }} />
      </div>
      <strong className={`tiempo-restante ${tono}${segundos <= 5 ? ' late' : ''}`} aria-label="Tiempo restante">
        {segundos}
        <span className="tiempo-unidad">s</span>
      </strong>
    </div>
  )
}
