import { useEffect, useMemo, useState, type CSSProperties } from 'react'
import type { Sala, TipoMinijuego } from '../dominio/tipos.ts'
import { audio } from './audio.ts'
import { Confeti } from './Confeti.tsx'

const SIMBOLOS = ['★', '◆', '●', '▲', '♥', '☀']
const NOMBRES: Record<TipoMinijuego, string> = {
  cofres: 'Cofres misteriosos',
  ruleta: 'Ruleta de la suerte',
  estrellas: 'Atrapa las estrellas',
  memoria: 'Memoria relámpago',
  bomba: 'Bomba de puntos',
}

interface AccionMinijuego {
  indice?: number
  fichas?: string[]
  cartas?: number[]
}

export function EscenaMinijuego({
  sala,
  ahora,
  academico,
  onJugar,
  anfitrion = false,
}: {
  sala: Sala
  ahora: number
  academico: boolean
  onJugar: (accion: AccionMinijuego) => Promise<void>
  anfitrion?: boolean
}) {
  const juego = sala.juego
  const tipo = juego?.tipo
  const restante = sala.cierraEn ? Math.max(0, new Date(sala.cierraEn).getTime() - ahora) : 0
  const segundos = Math.ceil(restante / 1000)
  const mio = juego?.mio
  const [ocupado, setOcupado] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [abierto, setAbierto] = useState<number | null>(null)
  const [girando, setGirando] = useState(false)
  const [giro, setGiro] = useState(0)
  const [capturadas, setCapturadas] = useState<string[]>([])
  const [volteadas, setVolteadas] = useState<number[]>([])

  useEffect(() => {
    audio.efecto('suspenso', `mini-inicio-${juego?.ronda}`)
  }, [juego?.ronda, tipo])

  useEffect(() => {
    if (segundos > 0 && segundos <= 5) audio.efecto('countdown-final', `mini-cuenta-${juego?.ronda}-${segundos}`)
  }, [juego?.ronda, segundos])

  useEffect(() => {
    if (!mio) return
    if (tipo === 'ruleta') setGiro(1440 + Number(mio.detalle.indice ?? 0) * 60)
    audio.efecto(mio.puntos > 0 || academico ? 'premio' : 'fallo-juego', `mini-premio-${juego?.ronda}-${mio.titulo}`)
  }, [academico, juego?.ronda, mio, tipo])

  async function enviar(accion: AccionMinijuego) {
    if (ocupado || anfitrion) return
    setOcupado(true)
    setError(null)
    try {
      await onJugar(accion)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo registrar el minijuego.')
    } finally {
      setOcupado(false)
    }
  }

  const reveladas = useMemo(() => {
    const lista = mio?.detalle.reveladas
    if (!Array.isArray(lista)) return new Map<number, number>()
    return new Map(
      lista
        .filter((item): item is { indice: number; simbolo: number } => !!item && typeof item === 'object' && 'indice' in item)
        .map((item) => [Number(item.indice), Number(item.simbolo)]),
    )
  }, [mio])

  const parejas = Array.isArray(mio?.detalle.parejasHalladas) ? mio.detalle.parejasHalladas.length : Number(mio?.detalle.parejas ?? 0)

  return (
    <section className={`minijuego tipo-${tipo ?? 'espera'}`} aria-live="polite">
      {mio && (mio.puntos > 0 || academico) ? <Confeti modo="explosion" /> : null}
      <header className="minijuego-cabeza">
        <p>{academico ? 'Pausa recreativa · no cambia la nota' : 'Desafío de la partida'}</p>
        <h1>{tipo ? NOMBRES[tipo] : 'Minijuego'}</h1>
        <strong className={segundos <= 5 ? 'minijuego-tiempo urgente' : 'minijuego-tiempo'}>{segundos}s</strong>
      </header>
      {anfitrion ? <p className="minijuego-aviso">Los estudiantes juegan ahora. La partida sigue sola al terminar el tiempo.</p> : null}
      {error ? <p className="error-texto" role="alert">{error}</p> : null}

      {tipo === 'cofres' ? (
        <div className="minijuego-cofres">
          {[0, 1, 2].map((indice) => {
            const elegido = abierto === indice || (mio && Number(mio.detalle.indice) === indice)
            return (
              <button
                key={indice}
                type="button"
                className={elegido ? 'cofre abierto' : 'cofre'}
                disabled={ocupado || Boolean(mio) || anfitrion}
                onClick={() => {
                  setAbierto(indice)
                  audio.efecto('moneda', `cofre-${indice}`)
                  void enviar({ indice })
                }}
              >
                <span aria-hidden="true">{elegido ? '✦' : '▣'}</span>
                Cofre {indice + 1}
              </button>
            )
          })}
        </div>
      ) : null}

      {tipo === 'ruleta' ? (
        <div className="minijuego-ruleta">
          <div className="ruleta-disco" style={{ transform: `rotate(${giro}deg)` }} aria-hidden="true">
            <span>+100</span><span>+200</span><span>+500</span><span>+200</span><span>+100</span><span>+500</span>
          </div>
          <button
            className="boton grande"
            type="button"
            disabled={ocupado || Boolean(mio) || anfitrion || girando}
            onClick={() => {
              setGirando(true)
              setGiro((valor) => valor + 720)
              void enviar({}).finally(() => setGirando(false))
            }}
          >
            Girar
          </button>
        </div>
      ) : null}

      {tipo === 'estrellas' ? (
        <div className="minijuego-estrellas">
          <p>{capturadas.length} estrellas</p>
          {(juego?.fichas ?? []).map((ficha, indice) => (
            <button
              key={ficha}
              type="button"
              className={capturadas.includes(ficha) ? 'estrella tomada' : 'estrella'}
              style={{ '--estrella-i': indice } as CSSProperties}
              disabled={capturadas.includes(ficha) || anfitrion}
              onClick={() => {
                const siguientes = [...capturadas, ficha]
                setCapturadas(siguientes)
                audio.efecto('moneda', `estrella-${ficha}`)
                void enviar({ fichas: siguientes })
              }}
            >
              ★
            </button>
          ))}
        </div>
      ) : null}

      {tipo === 'memoria' ? (
        <div className="minijuego-memoria">
          {Array.from({ length: juego?.cartas ?? 6 }, (_, indice) => {
            const simbolo = reveladas.get(indice)
            const abierta = simbolo !== undefined || volteadas.includes(indice)
            const hallada = simbolo !== undefined && [...reveladas.values()].filter((item) => item === simbolo).length > 1 && parejas > 0
            return (
              <button
                key={indice}
                type="button"
                className={abierta ? 'carta volteada' : 'carta'}
                disabled={abierta || anfitrion || ocupado}
                onClick={() => {
                  const siguientes = [...volteadas, indice].slice(-2)
                  setVolteadas(siguientes)
                  if (siguientes.length === 2) {
                    void enviar({ cartas: siguientes }).then(() => setVolteadas([]))
                  }
                }}
              >
                {abierta && simbolo !== undefined ? SIMBOLOS[simbolo] ?? '✦' : hallada ? '✓' : '?'}
              </button>
            )
          })}
        </div>
      ) : null}

      {tipo === 'bomba' ? (
        <div className={`minijuego-bomba${segundos <= 3 ? ' tiembla' : ''}`}>
          <span aria-hidden="true">💣</span>
          <button
            className="boton grande"
            type="button"
            disabled={ocupado || Boolean(mio) || anfitrion}
            onClick={() => void enviar({})}
          >
            Detener
          </button>
        </div>
      ) : null}

      {mio ? (
        <p className="minijuego-resultado" role="status">
          {mio.titulo}
          {academico ? ' · insignia recreativa' : mio.puntos > 0 ? ` · +${mio.puntos}` : ''}
        </p>
      ) : null}
    </section>
  )
}
