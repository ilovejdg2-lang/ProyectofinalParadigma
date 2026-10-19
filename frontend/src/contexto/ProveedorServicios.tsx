import { createContext, useContext, useState, type ReactNode } from 'react'
import { crearServicios, type Servicios } from '../servicios/crearServicios.ts'

const ContextoServicios = createContext<Servicios | null>(null)

export function ProveedorServicios({ servicios, children }: { servicios?: Servicios; children: ReactNode }) {
  const [valor] = useState(() => servicios ?? crearServicios())
  return <ContextoServicios.Provider value={valor}>{children}</ContextoServicios.Provider>
}

export function useServicios(): Servicios {
  const servicios = useContext(ContextoServicios)
  if (!servicios) throw new Error('Los servicios no están disponibles.')
  return servicios
}
