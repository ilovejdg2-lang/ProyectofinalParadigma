import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { EstadoCarga } from '../componentes/Interfaz.tsx'
import { Marco } from '../componentes/Marco.tsx'
import { useAutenticacion } from '../contexto/ProveedorAutenticacion.tsx'
import { InicioSesion, Registro } from '../paginas/Acceso.tsx'
import { Descubrir } from '../paginas/Descubrir.tsx'
import { DetalleCuestionario } from '../paginas/DetalleCuestionario.tsx'
import { EditorCuestionario } from '../paginas/EditorCuestionario.tsx'
import { Historial } from '../paginas/Historial.tsx'
import { Inicio } from '../paginas/Inicio.tsx'
import { MisCuestionarios } from '../paginas/MisCuestionarios.tsx'
import { Partida } from '../paginas/Partida.tsx'
import { Perfil } from '../paginas/Perfil.tsx'
import { Resultados } from '../paginas/Resultados.tsx'
import { SalaAnfitrion } from '../paginas/SalaAnfitrion.tsx'
import { Unirse } from '../paginas/Unirse.tsx'

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
        { path: '/partida/:codigo', element: <Partida /> },
        {
          element: <Marco />,
          children: [
            { index: true, element: <Inicio /> },
            { path: '/descubrir', element: <Descubrir /> },
            { path: '/cuestionarios/:id', element: <DetalleCuestionario /> },
            { path: '/mis-cuestionarios', element: <MisCuestionarios /> },
            { path: '/cuestionarios/nuevo', element: <EditorCuestionario /> },
            { path: '/cuestionarios/:id/editar', element: <EditorCuestionario /> },
            { path: '/unirse', element: <Unirse /> },
            { path: '/sala/:codigo', element: <SalaAnfitrion /> },
            { path: '/resultados/:codigo', element: <Resultados /> },
            { path: '/historial', element: <Historial /> },
            { path: '/perfil', element: <Perfil /> },
          ],
        },
      ],
    },
    { path: '*', element: <Navigate to="/" replace /> },
  ]
}
