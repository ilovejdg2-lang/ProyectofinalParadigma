import { Navigate } from 'react-router-dom'
import { Marco } from '../componentes/Marco.tsx'
import { Inicio } from '../paginas/Inicio.tsx'

export function rutasAplicacion() {
  return [
    {
      element: <Marco />,
      children: [{ index: true, element: <Inicio /> }],
    },
    { path: '*', element: <Navigate to="/" replace /> },
  ]
}
