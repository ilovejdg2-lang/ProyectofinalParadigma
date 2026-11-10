import { jsx as _jsx } from "react/jsx-runtime";
import { createContext, useContext, useEffect, useState } from 'react';
import { crearServicios } from '../servicios/crearServicios.ts';
const ContextoServicios = createContext(null);
export function ProveedorServicios({ servicios, children }) {
    const [valor, setValor] = useState(() => servicios ?? crearServicios());
    useEffect(() => {
        if (servicios)
            setValor(servicios);
    }, [servicios]);
    return _jsx(ContextoServicios.Provider, { value: valor, children: children });
}
export function useServicios() {
    const servicios = useContext(ContextoServicios);
    if (!servicios)
        throw new Error('Los servicios no están disponibles.');
    return servicios;
}
// Si autenticacion.ts cambia en caliente, invalidamos este módulo para recrear el cliente.
if (import.meta.hot) {
    import.meta.hot.accept('../servicios/autenticacion.ts', () => {
        import.meta.hot?.invalidate();
    });
    import.meta.hot.accept('../servicios/crearServicios.ts', () => {
        import.meta.hot?.invalidate();
    });
}
