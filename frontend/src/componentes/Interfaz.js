import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect } from 'react';
export function EstadoCarga({ texto = 'Cargando…' }) {
    return (_jsx("div", { className: "estado", role: "status", children: texto }));
}
export function EstadoVacio({ titulo, detalle }) {
    return (_jsxs("div", { className: "estado", children: [_jsx("strong", { children: titulo }), detalle ? _jsx("p", { children: detalle }) : null] }));
}
export function EstadoError({ mensaje, onReintentar }) {
    return (_jsxs("div", { className: "estado error", role: "alert", children: [_jsx("strong", { children: mensaje }), onReintentar ? (_jsx("p", { children: _jsx("button", { className: "boton", type: "button", onClick: onReintentar, children: "Reintentar" }) })) : null] }));
}
export function Dialogo({ abierto, titulo, mensaje, confirmar, peligro = false, onConfirmar, onCancelar, }) {
    useEffect(() => {
        if (!abierto)
            return;
        function alTeclado(evento) {
            if (evento.key === 'Escape')
                onCancelar();
        }
        window.addEventListener('keydown', alTeclado);
        return () => window.removeEventListener('keydown', alTeclado);
    }, [abierto, onCancelar]);
    if (!abierto)
        return null;
    return (_jsx("div", { className: "dialogo", role: "dialog", "aria-modal": "true", "aria-labelledby": "titulo-dialogo", children: _jsxs("div", { className: "panel", children: [_jsx("h2", { id: "titulo-dialogo", children: titulo }), _jsx("p", { children: mensaje }), _jsxs("div", { className: "acciones", children: [_jsx("button", { className: "boton-fantasma", type: "button", onClick: onCancelar, children: "Volver" }), _jsx("button", { className: peligro ? 'boton-peligro' : 'boton', type: "button", onClick: onConfirmar, children: confirmar })] })] }) }));
}
export function AvisoSimulacion({ children }) {
    return _jsx("div", { className: "aviso", children: children });
}
