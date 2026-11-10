import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { opcionesDe } from '../dominio/opciones.ts';
const simbolos = ['▲', '●', '■', '◆'];
export function OpcionesJuego({ pregunta, elegida, bloqueada, onElegir, }) {
    return (_jsx("div", { className: "respuestas", children: opcionesDe(pregunta).map((opcion, numero) => {
            const clase = `respuesta tono-${numero % 4}${elegida === opcion.id ? ' elegida' : ''}`;
            const contenido = (_jsxs(_Fragment, { children: [_jsx("span", { className: "simbolo", "aria-hidden": "true", children: simbolos[numero % simbolos.length] }), _jsx("span", { children: opcion.texto })] }));
            if (!onElegir) {
                return (_jsx("div", { className: clase, children: contenido }, opcion.id));
            }
            return (_jsx("button", { className: clase, type: "button", "aria-label": opcion.texto, disabled: bloqueada, onClick: () => onElegir(opcion.id), children: contenido }, opcion.id));
        }) }));
}
