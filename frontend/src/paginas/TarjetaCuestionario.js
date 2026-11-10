import { jsxs as _jsxs, jsx as _jsx } from "react/jsx-runtime";
import { Link } from 'react-router-dom';
import { acentoDeDificultad, etiquetaDificultad } from '../dominio/filtros.ts';
export function TarjetaCuestionario({ cuestionario }) {
    return (_jsxs(Link, { className: `descubrimiento acento-${acentoDeDificultad(cuestionario.dificultad)}`, to: `/cuestionarios/${cuestionario.id}`, children: [_jsx("div", { className: "descubrimiento-portada", style: { backgroundImage: cuestionario.imagenUrl ? `url("${cuestionario.imagenUrl.replaceAll('"', '')}")` : undefined }, children: _jsxs("span", { className: "conjunto-cuenta", children: [cuestionario.preguntas.length, " ", cuestionario.preguntas.length === 1 ? 'pregunta' : 'preguntas'] }) }), _jsxs("div", { className: "descubrimiento-cuerpo", children: [cuestionario.esDemostracion ? _jsx("span", { className: "etiqueta-demo", children: "Datos de prueba" }) : null, _jsx("h2", { children: cuestionario.titulo }), _jsxs("p", { children: [_jsx("span", { className: "nivel", children: etiquetaDificultad(cuestionario.dificultad) }), " \u00B7 ", cuestionario.autorNombre] })] })] }));
}
