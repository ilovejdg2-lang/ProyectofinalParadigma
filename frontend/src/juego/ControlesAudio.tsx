import { Music2, Volume2, VolumeX } from 'lucide-react'
import { useEffect, useState } from 'react'
import { audio } from './audio.ts'
import type { Paisaje } from './ronda.ts'

export function ControlesAudio({ paisaje, tension = false }: { paisaje: Paisaje; tension?: boolean }) {
  const [estado, setEstado] = useState(() => audio.snapshot())
  const [abierto, setAbierto] = useState(false)

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

  const necesitaActivar = estado.contexto !== 'running' && estado.listo === false

  return (
    <div
      className={`audio-controles${abierto ? ' abierto' : ''}`}
      data-testid="audio-estado"
      data-paisaje={estado.paisaje}
      data-contexto={estado.contexto}
      data-silenciado={estado.musicaSilenciada && estado.efectosSilenciados ? 'si' : 'no'}
    >
      {necesitaActivar || estado.contexto === 'suspended' ? (
        <button
          className="boton-fantasma audio-activar"
          type="button"
          aria-label="Activar audio"
          onClick={() => void audio.desbloquear()}
        >
          <Volume2 size={18} aria-hidden="true" />
          <span className="audio-texto-largo">Activar audio</span>
          <span className="audio-texto-corto">Audio</span>
        </button>
      ) : null}

      <button
        className="boton-fantasma audio-icono"
        type="button"
        aria-pressed={estado.musicaSilenciada}
        aria-label={estado.musicaSilenciada ? 'Activar música' : 'Silenciar música'}
        title={estado.musicaSilenciada ? 'Activar música' : 'Silenciar música'}
        onClick={() => {
          void audio.desbloquear()
          audio.silenciarMusica(!estado.musicaSilenciada)
        }}
      >
        <Music2 size={18} aria-hidden="true" className={estado.musicaSilenciada ? 'audio-icono-off' : undefined} />
      </button>

      <button
        className="boton-fantasma audio-icono"
        type="button"
        aria-pressed={estado.efectosSilenciados}
        aria-label={estado.efectosSilenciados ? 'Activar efectos' : 'Silenciar efectos'}
        title={estado.efectosSilenciados ? 'Activar efectos' : 'Silenciar efectos'}
        onClick={() => {
          void audio.desbloquear()
          audio.silenciarEfectos(!estado.efectosSilenciados)
        }}
      >
        {estado.efectosSilenciados ? <VolumeX size={18} aria-hidden="true" /> : <Volume2 size={18} aria-hidden="true" />}
      </button>

      <button
        className="boton-fantasma audio-icono"
        type="button"
        aria-expanded={abierto}
        aria-label="Ajustar volúmenes"
        onClick={() => {
          void audio.desbloquear()
          setAbierto((valor) => !valor)
        }}
      >
        <span className="audio-texto-corto">Vol</span>
        <span className="audio-texto-largo">Volumen</span>
      </button>

      {abierto ? (
        <div className="audio-sliders">
          <label className="volumen">
            <span>Música</span>
            <input
              type="range"
              min={0}
              max={100}
              value={Math.round(estado.volumenMusica * 100)}
              aria-label="Volumen de música"
              onChange={(evento) => {
                void audio.desbloquear()
                audio.volumenMusica(Number(evento.target.value) / 100)
                if (estado.musicaSilenciada) audio.silenciarMusica(false)
              }}
            />
          </label>
          <label className="volumen">
            <span>Efectos</span>
            <input
              type="range"
              min={0}
              max={100}
              value={Math.round(estado.volumenEfectos * 100)}
              aria-label="Volumen de efectos"
              onChange={(evento) => {
                void audio.desbloquear()
                audio.volumenEfectos(Number(evento.target.value) / 100)
                if (estado.efectosSilenciados) audio.silenciarEfectos(false)
              }}
            />
          </label>
        </div>
      ) : null}
    </div>
  )
}
