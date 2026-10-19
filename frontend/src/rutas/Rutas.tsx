import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { EstadoCarga } from '../componentes/Interfaz.tsx'
import { Marco } from '../componentes/Marco.tsx'
import { useAutenticacion } from '../contexto/ProveedorAutenticacion.tsx'
import { InicioSesion, Registro } from '../paginas/Acceso.tsx'
import { Descubrir } from '../paginas/Descubrir.tsx'
import { DetalleCuestionario } from '../paginas/DetalleCuestionario.tsx'
import { Inicio } from '../paginas/Inicio.tsx'
import { Perfil } from '../paginas/Perfil.tsx'

export function RutaProtegida() {
  const { perfil, listo } = useAutenticacion()
  const ubicacion = useLocation()
  if (!listo) return <EstadoCarga texto="Comprobando la sesión…" />
  if (!perfil) return <Navigate to="/iniciar-sesion" replace state={{ desde: ubicacion.pathname }} />
  return <Outlet />
}

export function rutasAplicacion() {
  return [
    { path: '/iniciar-sesion', element: <InicioSesion /> },
    { path: '/registro', element: <Registro /> },
    {
      element: <RutaProtegida />,
      children: [
        {
          element: <Marco />,
          children: [
            { index: true, element: <Inicio /> },
            { path: '/descubrir', element: <Descubrir /> },
            { path: '/cuestionarios/:id', element: <DetalleCuestionario /> },
            { path: '/perfil', element: <Perfil /> },
          ],
        },
      ],
    },
    { path: '*', element: <Navigate to="/" replace /> },
  ]
}
