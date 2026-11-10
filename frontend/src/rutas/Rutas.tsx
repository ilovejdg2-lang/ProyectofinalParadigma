import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { EstadoCarga } from '../componentes/Interfaz.tsx'
import { Marco } from '../componentes/Marco.tsx'
import { useAutenticacion } from '../contexto/ProveedorAutenticacion.tsx'
import { InicioSesion, Registro } from '../paginas/Acceso.tsx'
import {
  LandingPublica,
  PaginaAyuda,
  PaginaContacto,
  PaginaDocumentacion,
  PaginaPrivacidad,
  PaginaTerminos,
} from '../paginas/publico/LandingPublica.tsx'
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
  if (!perfil) {
    if (ubicacion.pathname === '/') return <LandingPublica />
    return <Navigate to="/iniciar-sesion" replace state={{ desde: ubicacion.pathname }} />
  }
  return <Outlet />
}

export function RutaDocente() {
  const { perfil, listo } = useAutenticacion()
  if (!listo) return <EstadoCarga texto="Comprobando permisos…" />
  if (!perfil) return <Navigate to="/iniciar-sesion" replace />
  const esDocente = perfil.rol === 'teacher' || perfil.rol === 'admin'
  if (!esDocente) return <Navigate to="/" replace />
  return <Outlet />
}

export function rutasAplicacion() {
  return [
    { path: '/iniciar-sesion', element: <InicioSesion /> },
    { path: '/registro', element: <Registro /> },
    { path: '/contacto', element: <PaginaContacto /> },
    { path: '/ayuda', element: <PaginaAyuda /> },
    { path: '/documentacion', element: <PaginaDocumentacion /> },
    { path: '/privacidad', element: <PaginaPrivacidad /> },
    { path: '/terminos', element: <PaginaTerminos /> },
    {
      element: <RutaProtegida />,
      children: [
        { path: '/partida/:codigo', element: <Partida /> },
        { path: '/unirse', element: <Unirse /> },
        {
          element: <Marco />,
          children: [
            { index: true, element: <Inicio /> },
            { path: '/descubrir', element: <Descubrir /> },
            { path: '/cuestionarios/:id', element: <DetalleCuestionario /> },
            { path: '/resultados/:codigo', element: <Resultados /> },
            { path: '/historial', element: <Historial /> },
            { path: '/perfil', element: <Perfil /> },
            {
              // Rutas exclusivas para docentes y administradores
              element: <RutaDocente />,
              children: [
                { path: '/mis-cuestionarios', element: <MisCuestionarios /> },
                { path: '/cuestionarios/nuevo', element: <EditorCuestionario /> },
                { path: '/cuestionarios/:id/editar', element: <EditorCuestionario /> },
                { path: '/sala/:codigo', element: <SalaAnfitrion /> },
              ],
            },
          ],
        },
      ],
    },
    { path: '*', element: <Navigate to="/" replace /> },
  ]
}
