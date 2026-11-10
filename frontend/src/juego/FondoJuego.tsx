import { Particulas } from '../componentes/Particulas.tsx'

export function FondoJuego() {
  return (
    <div className="fondo-juego" aria-hidden="true">
      <Particulas densidad={26} />
      <span className="forma forma-a" />
      <span className="forma forma-b" />
      <span className="forma forma-c" />
    </div>
  )
}
