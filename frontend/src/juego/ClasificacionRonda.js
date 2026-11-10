import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Avatar, avatarVisible } from './avatares.tsx';
import { mensajesDeRonda } from './ronda.ts';
export function ClasificacionRonda({ participantes, preguntaId, perfilId, }) {
    const { mensajes, actual, previo } = mensajesDeRonda(participantes, preguntaId, perfilId);
    return (_jsxs("section", { className: "clasificacion-ronda", "aria-label": "Clasificaci\u00F3n de la ronda", children: [mensajes.length > 0 ? (_jsx("ul", { className: "mensajes-ronda", children: mensajes.map((mensaje) => (_jsx("li", { children: mensaje }, mensaje))) })) : null, _jsx("h2", { children: "Ranking en vivo" }), _jsx("ol", { className: "puestos-ronda", children: actual.map((participante, indice) => {
                    const antes = previo.findIndex((item) => item.id === participante.id);
                    const subio = antes > indice;
                    return (_jsxs("li", { className: `puesto-juego lugar-${Math.min(indice + 1, 3)}${participante.perfilId === perfilId ? ' mio' : ''}`, children: [_jsx("span", { children: indice + 1 }), _jsx(Avatar, { id: avatarVisible(participante.perfilId, participante.avatarId), tamano: 36 }), _jsx("strong", { children: participante.nombre }), _jsxs("span", { children: [participante.puntaje, " pts", subio ? ' · subió' : ''] })] }, participante.id));
                }) })] }));
}
