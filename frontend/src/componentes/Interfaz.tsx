import type { ReactNode } from 'react'

export function EstadoCarga({ texto = 'Cargando…' }: { texto?: string }) {
  return (
    <div className="estado" role="status">
      {texto}
    </div>
  )
}

export function EstadoVacio({ titulo, detalle }: { titulo: string; detalle?: string }) {
  return (
    <div className="estado">
      <strong>{titulo}</strong>
      {detalle ? <p>{detalle}</p> : null}
    </div>
  )
}

export function EstadoError({ mensaje, onReintentar }: { mensaje: string; onReintentar?: () => void }) {
  return (
    <div className="estado error" role="alert">
      <strong>{mensaje}</strong>
      {onReintentar ? (
        <p>
          <button className="boton" type="button" onClick={onReintentar}>
            Reintentar
          </button>
        </p>
      ) : null}
    </div>
  )
}

export function Dialogo({
  abierto,
  titulo,
  mensaje,
  confirmar,
  peligro = false,
  onConfirmar,
  onCancelar,
}: {
  abierto: boolean
  titulo: string
  mensaje: string
  confirmar: string
  peligro?: boolean
  onConfirmar: () => void
  onCancelar: () => void
}) {
  if (!abierto) return null
  return (
    <div className="dialogo" role="dialog" aria-modal="true" aria-labelledby="titulo-dialogo">
      <div className="panel">
        <h2 id="titulo-dialogo">{titulo}</h2>
        <p>{mensaje}</p>
        <div className="acciones">
          <button className="boton-fantasma" type="button" onClick={onCancelar}>
            Volver
          </button>
          <button className={peligro ? 'boton-peligro' : 'boton'} type="button" onClick={onConfirmar}>
            {confirmar}
          </button>
        </div>
      </div>
    </div>
  )
}

export function AvisoSimulacion({ children }: { children: ReactNode }) {
  return <div className="aviso">{children}</div>
}
