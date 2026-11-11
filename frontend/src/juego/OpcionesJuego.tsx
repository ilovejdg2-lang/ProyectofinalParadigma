import { opcionesDe } from '../dominio/opciones.ts'
import type { Pregunta } from '../dominio/tipos.ts'
import { audio } from './audio.ts'

const simbolos = ['▲', '◆', '●', '■']

function esVerdaderoFalso(opciones: Array<{ texto: string }>) {
  if (opciones.length !== 2) return false
  const textos = opciones.map((opcion) => opcion.texto.trim().toLowerCase())
  return textos.includes('verdadero') && textos.includes('falso')
}

export function OpcionesJuego({
  pregunta,
  elegida,
  bloqueada,
  onElegir,
}: {
  pregunta: Pregunta
  elegida?: string
  bloqueada?: boolean
  onElegir?: (opcionId: string) => void
}) {
  const opciones = opcionesDe(pregunta)
  const verdaderoFalso = esVerdaderoFalso(opciones)
  return (
    <div className={verdaderoFalso ? 'respuestas respuestas-vf' : 'respuestas'}>
      {opciones.map((opcion, numero) => {
        const marca = verdaderoFalso
          ? opcion.texto.trim().toLowerCase() === 'verdadero'
            ? ' es-verdadero'
            : ' es-falso'
          : ''
        const clase = `respuesta tono-${numero % 4}${marca}${elegida === opcion.id ? ' elegida' : ''}`
        const contenido = (
          <>
            <span className="simbolo" aria-hidden="true">
              {simbolos[numero % simbolos.length]}
            </span>
            <span>{opcion.texto}</span>
          </>
        )
        if (!onElegir) {
          return (
            <div className={clase} key={opcion.id}>
              {contenido}
            </div>
          )
        }
        return (
          <button
            className={clase}
            type="button"
            key={opcion.id}
            aria-label={opcion.texto}
            disabled={bloqueada}
            onClick={() => {
              if (bloqueada || elegida) return
              audio.efecto('enviado', `select-${opcion.id}`)
              onElegir(opcion.id)
            }}
          >
            {contenido}
          </button>
        )
      })}
    </div>
  )
}
