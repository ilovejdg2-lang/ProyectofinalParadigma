import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { ordenarClasificacion } from '../dominio/filtros.ts';
import { Avatar, avatarVisible } from '../juego/avatares.tsx';
import { Confeti } from '../juego/Confeti.tsx';
const medallas = ['Oro', 'Plata', 'Bronce'];
export function Podio({ participantes, perfilId }) {
    const orden = ordenarClasificacion(participantes);
    const cima = orden.slice(0, 3);
    const hayEmpate = orden.some((item, indice) => {
        const siguiente = orden[indice + 1];
        return Boolean(siguiente && item.puntaje === siguiente.puntaje && item.aciertos === siguiente.aciertos);
    });
    return (_jsxs("div", { className: "podio-bloque", children: [_jsx(Confeti, {}), _jsx("ol", { className: "podio", "aria-label": "Podio", children: cima.map((participante, indice) => (_jsxs("li", { className: `podio-puesto lugar-${indice + 1}${participante.perfilId === perfilId ? ' mio' : ''}`, children: [_jsx(Avatar, { id: avatarVisible(participante.perfilId, participante.avatarId), tamano: 72 }), _jsx("span", { className: `medalla medalla-${indice + 1}`, "aria-hidden": "true", children: indice + 1 }), _jsx("span", { className: "podio-medalla", children: medallas[indice] }), _jsx("strong", { children: participante.nombre }), _jsxs("span", { children: [participante.puntaje, " pts \u00B7 ", participante.aciertos, " aciertos"] })] }, participante.id))) }), hayEmpate ? (_jsx("p", { className: "meta", children: "Si empatan en puntos y aciertos, el puesto lo define el nombre en orden alfab\u00E9tico." })) : null, _jsx("ol", { className: "clasificacion-completa", "aria-label": "Clasificaci\u00F3n completa", children: orden.map((participante, indice) => (_jsxs("li", { className: participante.perfilId === perfilId ? 'mio' : '', children: [_jsx("span", { children: indice + 1 }), _jsx("strong", { children: participante.nombre }), _jsxs("span", { children: [participante.puntaje, " pts \u00B7 ", participante.aciertos, " aciertos"] })] }, participante.id))) })] }));
}
