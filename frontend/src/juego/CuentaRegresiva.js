import { jsx as _jsx } from "react/jsx-runtime";
import { useEffect, useRef } from 'react';
import { audio } from './audio.ts';
import { faseCuenta } from './ronda.ts';
const textos = { '3': '3', '2': '2', '1': '1', ya: '¡A JUGAR!' };
export function CuentaRegresiva({ abreEn, ahora }) {
    const fase = faseCuenta(abreEn, ahora);
    const previa = useRef(null);
    useEffect(() => {
        if (!fase || previa.current === fase)
            return;
        previa.current = fase;
        audio.efecto(fase === 'ya' ? 'jugar' : 'cuenta');
    }, [fase]);
    if (!fase)
        return null;
    return (_jsx("section", { className: `cuenta fase-${fase}`, "data-testid": "cuenta-regresiva", "aria-live": "assertive", children: _jsx("strong", { children: textos[fase] }, fase) }));
}
