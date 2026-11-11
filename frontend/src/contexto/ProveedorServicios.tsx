import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { crearServicios, type Servicios } from '../servicios/crearServicios.ts'

const ContextoServicios = createContext<Servicios | null>(null)

export function ProveedorServicios({ servicios, children }: { servicios?: Servicios; children: ReactNode }) {
  const [valor, setValor] = useState(() => servicios ?? crearServicios())

  useEffect(() => {
    if (servicios) setValor(servicios)
  }, [servicios])

  return <ContextoServicios.Provider value={valor}>{children}</ContextoServicios.Provider>
}

export function useServicios(): Servicios {
  const servicios = useContext(ContextoServicios)
  if (!servicios) throw new Error('Los servicios no están disponibles.')
  return servicios
}

// Si el cableado de servicios o el entorno cambia en caliente, recreamos el cliente real.
if (import.meta.hot) {
  import.meta.hot.accept('../servicios/autenticacion.ts', () => {
    import.meta.hot?.invalidate()
  })
  import.meta.hot.accept('../servicios/crearServicios.ts', () => {
    import.meta.hot?.invalidate()
  })
  import.meta.hot.accept('../configuracion/entorno.ts', () => {
    import.meta.hot?.invalidate()
  })
}
