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
import { ConfigurarSesion } from '../paginas/ConfigurarSesion.tsx'
import { Cursos } from '../paginas/Cursos.tsx'
import { VistaCurso } from '../paginas/VistaCurso.tsx'
import { ElegirEspacio } from '../paginas/ElegirEspacio.tsx'
import { Inicio } from '../paginas/Inicio.tsx'
import { MisCuestionarios } from '../paginas/MisCuestionarios.tsx'
import { Partida } from '../paginas/Partida.tsx'
import { Perfil } from '../paginas/Perfil.tsx'
import { ResultadoEvaluacion } from '../paginas/ResultadoEvaluacion.tsx'
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
        { path: '/elegir', element: <ElegirEspacio /> },
        { path: '/partida/:codigo', element: <Partida /> },
        { path: '/unirse', element: <Unirse /> },
        {
          element: <Marco />,
          children: [
            { index: true, element: <Inicio /> },
            { path: '/cursos', element: <Cursos /> },
            { path: '/cursos/paradigmas', element: <VistaCurso /> },
            { path: '/cursos/paradigmas/:seccion', element: <VistaCurso /> },
            { path: '/descubrir', element: <Descubrir /> },
            { path: '/cuestionarios/:id', element: <DetalleCuestionario /> },
            { path: '/resultados/:codigo', element: <Resultados /> },
            { path: '/evaluaciones/:codigo', element: <ResultadoEvaluacion /> },
            { path: '/historial', element: <Historial /> },
            { path: '/perfil', element: <Perfil /> },
            { path: '/mis-cuestionarios', element: <MisCuestionarios /> },
            { path: '/cuestionarios/nuevo', element: <EditorCuestionario /> },
            { path: '/cuestionarios/:id/editar', element: <EditorCuestionario /> },
            { path: '/cuestionarios/:id/configurar', element: <ConfigurarSesion /> },
            { path: '/sala/:codigo', element: <SalaAnfitrion /> },
          ],
        },
      ],
    },
    { path: '*', element: <Navigate to="/" replace /> },
  ]
}
