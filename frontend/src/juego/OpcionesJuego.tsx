import { opcionesDe } from '../dominio/opciones.ts'
import type { Pregunta } from '../dominio/tipos.ts'

const simbolos = ['▲', '◆', '●', '■']

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
  return (
    <div className="respuestas">
      {opcionesDe(pregunta).map((opcion, numero) => {
        const clase = `respuesta tono-${numero % 4}${elegida === opcion.id ? ' elegida' : ''}`
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
            onClick={() => onElegir(opcion.id)}
          >
            {contenido}
          </button>
        )
      })}
    </div>
  )
}
