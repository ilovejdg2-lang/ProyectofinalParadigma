import { jsx as _jsx } from "react/jsx-runtime";
import { RouterProvider, createBrowserRouter } from 'react-router-dom';
import { ProveedorAutenticacion } from './contexto/ProveedorAutenticacion.tsx';
import { ProveedorServicios } from './contexto/ProveedorServicios.tsx';
import { rutasAplicacion } from './rutas/Rutas.tsx';
const enrutador = createBrowserRouter(rutasAplicacion());
export default function App() {
    return (_jsx(ProveedorServicios, { children: _jsx(ProveedorAutenticacion, { children: _jsx(RouterProvider, { router: enrutador }) }) }));
}
