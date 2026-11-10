import { useEffect, useState } from 'react'
import { audio } from './audio.ts'
import type { Paisaje } from './ronda.ts'

export function ControlesAudio({ paisaje, tension = false }: { paisaje: Paisaje; tension?: boolean }) {
  const [estado, setEstado] = useState(() => audio.snapshot())

  useEffect(() => {
    audio.instalar()
    const cancelar = audio.suscribir(() => setEstado(audio.snapshot()))
    return () => {
      cancelar()
    }
  }, [])

  useEffect(() => {
    audio.ambiente(paisaje, tension)
  }, [paisaje, tension])

  useEffect(() => () => audio.ambiente('silencio', false), [])

  return (
    <div
      className="audio-controles"
      data-testid="audio-estado"
      data-paisaje={estado.paisaje}
      data-contexto={estado.contexto}
      data-silenciado={estado.silenciado ? 'si' : 'no'}
    >
      <button
        className="boton-fantasma"
        type="button"
        aria-pressed={estado.silenciado}
        onClick={() => {
          void audio.desbloquear()
          audio.silenciar(!estado.silenciado)
        }}
      >
        {estado.silenciado ? 'Activar música' : 'Silenciar música'}
      </button>
      <label className="volumen">
        Volumen
        <input
          type="range"
          min={0}
          max={100}
          value={Math.round(estado.volumen * 100)}
          aria-label="Volumen"
          onChange={(evento) => {
            void audio.desbloquear()
            audio.volumen(Number(evento.target.value) / 100)
          }}
        />
      </label>
    </div>
  )
}
