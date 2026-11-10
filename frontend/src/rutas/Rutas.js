import { jsx as _jsx } from "react/jsx-runtime";
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { EstadoCarga } from '../componentes/Interfaz.tsx';
import { Marco } from '../componentes/Marco.tsx';
import { useAutenticacion } from '../contexto/ProveedorAutenticacion.tsx';
import { InicioSesion, Registro } from '../paginas/Acceso.tsx';
import { Descubrir } from '../paginas/Descubrir.tsx';
import { DetalleCuestionario } from '../paginas/DetalleCuestionario.tsx';
import { EditorCuestionario } from '../paginas/EditorCuestionario.tsx';
import { Historial } from '../paginas/Historial.tsx';
import { Inicio } from '../paginas/Inicio.tsx';
import { MisCuestionarios } from '../paginas/MisCuestionarios.tsx';
import { Partida } from '../paginas/Partida.tsx';
import { Perfil } from '../paginas/Perfil.tsx';
import { Resultados } from '../paginas/Resultados.tsx';
import { SalaAnfitrion } from '../paginas/SalaAnfitrion.tsx';
import { Unirse } from '../paginas/Unirse.tsx';
export function RutaProtegida() {
    const { perfil, listo } = useAutenticacion();
    const ubicacion = useLocation();
    if (!listo)
        return _jsx(EstadoCarga, { texto: "Comprobando la sesi\u00F3n\u2026" });
    if (!perfil)
        return _jsx(Navigate, { to: "/iniciar-sesion", replace: true, state: { desde: ubicacion.pathname } });
    return _jsx(Outlet, {});
}
export function RutaDocente() {
    const { perfil, listo } = useAutenticacion();
    if (!listo)
        return _jsx(EstadoCarga, { texto: "Comprobando permisos\u2026" });
    if (!perfil)
        return _jsx(Navigate, { to: "/iniciar-sesion", replace: true });
    const esDocente = perfil.rol === 'teacher' || perfil.rol === 'admin';
    if (!esDocente)
        return _jsx(Navigate, { to: "/", replace: true });
    return _jsx(Outlet, {});
}
export function rutasAplicacion() {
    return [
        { path: '/iniciar-sesion', element: _jsx(InicioSesion, {}) },
        { path: '/registro', element: _jsx(Registro, {}) },
        {
            element: _jsx(RutaProtegida, {}),
            children: [
                { path: '/partida/:codigo', element: _jsx(Partida, {}) },
                {
                    element: _jsx(Marco, {}),
                    children: [
                        { index: true, element: _jsx(Inicio, {}) },
                        { path: '/descubrir', element: _jsx(Descubrir, {}) },
                        { path: '/cuestionarios/:id', element: _jsx(DetalleCuestionario, {}) },
                        { path: '/unirse', element: _jsx(Unirse, {}) },
                        { path: '/resultados/:codigo', element: _jsx(Resultados, {}) },
                        { path: '/historial', element: _jsx(Historial, {}) },
                        { path: '/perfil', element: _jsx(Perfil, {}) },
                        {
                            // Rutas exclusivas para docentes y administradores
                            element: _jsx(RutaDocente, {}),
                            children: [
                                { path: '/mis-cuestionarios', element: _jsx(MisCuestionarios, {}) },
                                { path: '/cuestionarios/nuevo', element: _jsx(EditorCuestionario, {}) },
                                { path: '/cuestionarios/:id/editar', element: _jsx(EditorCuestionario, {}) },
                                { path: '/sala/:codigo', element: _jsx(SalaAnfitrion, {}) },
                            ],
                        },
                    ],
                },
            ],
        },
        { path: '*', element: _jsx(Navigate, { to: "/", replace: true }) },
    ];
}
