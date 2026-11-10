import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
export const AVATARES = [
    { id: 'robot', nombre: 'Robot' },
    { id: 'astronauta', nombre: 'Astronauta' },
    { id: 'gatito', nombre: 'Gatito' },
    { id: 'mago', nombre: 'Mago' },
    { id: 'vikingo', nombre: 'Vikingo' },
    { id: 'dino', nombre: 'Dino' },
    { id: 'ninja', nombre: 'Ninja' },
    { id: 'panda', nombre: 'Panda' },
    { id: 'pollo', nombre: 'Pollo' },
    { id: 'rana', nombre: 'Rana' },
];
const ids = new Set(AVATARES.map((item) => item.id));
export function avatarValido(id) {
    return Boolean(id && ids.has(id));
}
export function avatarDePerfil(perfilId) {
    let total = 0;
    for (const letra of perfilId)
        total += letra.charCodeAt(0);
    return AVATARES[total % AVATARES.length].id;
}
const CLAVE = 'profelink.fichas.v1';
export function guardarFichaLocal(perfilId, avatarId) {
    const mapa = leerMapa();
    mapa[perfilId] = avatarId;
    localStorage.setItem(CLAVE, JSON.stringify(mapa));
}
export function fichaLocal(perfilId) {
    const id = leerMapa()[perfilId];
    return avatarValido(id) ? id : undefined;
}
function leerMapa() {
    try {
        const texto = localStorage.getItem(CLAVE);
        if (!texto)
            return {};
        const valor = JSON.parse(texto);
        return valor && typeof valor === 'object' ? valor : {};
    }
    catch {
        return {};
    }
}
export function avatarVisible(perfilId, avatarId) {
    if (avatarValido(avatarId))
        return avatarId;
    return fichaLocal(perfilId) ?? avatarDePerfil(perfilId);
}
export function Avatar({ id, tamano = 72, }) {
    return (_jsx("svg", { className: `avatar-juego avatar-${id}`, viewBox: "0 0 80 80", width: tamano, height: tamano, "aria-hidden": "true", children: _jsx(Dibujo, { id: id }) }));
}
function Dibujo({ id }) {
    if (id === 'robot') {
        return (_jsxs(_Fragment, { children: [_jsx("circle", { cx: "40", cy: "42", r: "28", fill: "#16325c" }), _jsx("rect", { x: "18", y: "24", width: "44", height: "36", rx: "12", fill: "#d7e7ff" }), _jsx("rect", { x: "24", y: "32", width: "32", height: "16", rx: "6", fill: "#102344" }), _jsx("circle", { cx: "32", cy: "40", r: "3", fill: "#00c8ff" }), _jsx("circle", { cx: "48", cy: "40", r: "3", fill: "#00c8ff" }), _jsx("rect", { x: "34", y: "14", width: "12", height: "10", rx: "3", fill: "#8eb6ff" }), _jsx("circle", { cx: "40", cy: "12", r: "4", fill: "#168bff" })] }));
    }
    if (id === 'astronauta') {
        return (_jsxs(_Fragment, { children: [_jsx("circle", { cx: "40", cy: "44", r: "26", fill: "#1d4ed8" }), _jsx("circle", { cx: "40", cy: "38", r: "16", fill: "#e8f1ff" }), _jsx("path", { d: "M24 40c6 10 26 10 32 0", fill: "#9ec5ff" }), _jsx("rect", { x: "22", y: "52", width: "36", height: "16", rx: "8", fill: "#f8fafc" }), _jsx("circle", { cx: "40", cy: "58", r: "4", fill: "#168bff" })] }));
    }
    if (id === 'gatito') {
        return (_jsxs(_Fragment, { children: [_jsx("circle", { cx: "40", cy: "46", r: "24", fill: "#ffd0e0" }), _jsx("path", { d: "M18 40 L24 18 L34 34", fill: "#ff9ec4" }), _jsx("path", { d: "M62 40 L56 18 L46 34", fill: "#ff9ec4" }), _jsx("circle", { cx: "32", cy: "46", r: "3", fill: "#102344" }), _jsx("circle", { cx: "48", cy: "46", r: "3", fill: "#102344" }), _jsx("path", { d: "M36 54h8", stroke: "#102344", strokeWidth: "2" }), _jsx("rect", { x: "18", y: "50", width: "10", height: "14", rx: "4", fill: "#8b5cf6" }), _jsx("rect", { x: "52", y: "50", width: "10", height: "14", rx: "4", fill: "#8b5cf6" })] }));
    }
    if (id === 'mago') {
        return (_jsxs(_Fragment, { children: [_jsx("circle", { cx: "40", cy: "50", r: "20", fill: "#c4b5fd" }), _jsx("path", { d: "M40 8 L58 48 H22 Z", fill: "#6d28d9" }), _jsx("circle", { cx: "40", cy: "22", r: "3", fill: "#ffb800" }), _jsx("circle", { cx: "32", cy: "52", r: "2.5", fill: "#102344" }), _jsx("circle", { cx: "48", cy: "52", r: "2.5", fill: "#102344" }), _jsx("path", { d: "M34 60h12", stroke: "#102344", strokeWidth: "2" })] }));
    }
    if (id === 'vikingo') {
        return (_jsxs(_Fragment, { children: [_jsx("circle", { cx: "40", cy: "46", r: "22", fill: "#f0c8a0" }), _jsx("path", { d: "M16 42c8-18 40-18 48 0", fill: "#8a5a2b" }), _jsx("path", { d: "M14 36c6 8 8 8 10-2", fill: "#d7e7ff" }), _jsx("path", { d: "M66 36c-6 8-8 8-10-2", fill: "#d7e7ff" }), _jsx("circle", { cx: "32", cy: "48", r: "2.5", fill: "#102344" }), _jsx("circle", { cx: "48", cy: "48", r: "2.5", fill: "#102344" }), _jsx("path", { d: "M30 44h8M42 44h8", stroke: "#8a5a2b", strokeWidth: "2" })] }));
    }
    if (id === 'dino') {
        return (_jsxs(_Fragment, { children: [_jsx("circle", { cx: "40", cy: "46", r: "24", fill: "#34d399" }), _jsx("path", { d: "M22 28c4-10 10-8 12 2M34 24c4-12 12-8 12 4M48 26c4-10 10-6 10 4", fill: "#059669" }), _jsx("circle", { cx: "32", cy: "46", r: "3", fill: "#102344" }), _jsx("circle", { cx: "48", cy: "46", r: "3", fill: "#102344" }), _jsx("path", { d: "M34 56c4 4 8 4 12 0", stroke: "#064e3b", strokeWidth: "2", fill: "none" })] }));
    }
    if (id === 'ninja') {
        return (_jsxs(_Fragment, { children: [_jsx("circle", { cx: "40", cy: "44", r: "24", fill: "#312e81" }), _jsx("rect", { x: "20", y: "36", width: "40", height: "14", rx: "4", fill: "#0f172a" }), _jsx("circle", { cx: "32", cy: "43", r: "3", fill: "#00c8ff" }), _jsx("circle", { cx: "48", cy: "43", r: "3", fill: "#00c8ff" }), _jsx("path", { d: "M28 22h24l-4 10H32z", fill: "#1e1b4b" })] }));
    }
    if (id === 'panda') {
        return (_jsxs(_Fragment, { children: [_jsx("circle", { cx: "40", cy: "46", r: "24", fill: "#f8fafc" }), _jsx("circle", { cx: "22", cy: "28", r: "8", fill: "#102344" }), _jsx("circle", { cx: "58", cy: "28", r: "8", fill: "#102344" }), _jsx("ellipse", { cx: "32", cy: "46", rx: "6", ry: "7", fill: "#102344" }), _jsx("ellipse", { cx: "48", cy: "46", rx: "6", ry: "7", fill: "#102344" }), _jsx("circle", { cx: "33", cy: "46", r: "2", fill: "#fff" }), _jsx("circle", { cx: "49", cy: "46", r: "2", fill: "#fff" }), _jsx("ellipse", { cx: "40", cy: "56", rx: "4", ry: "3", fill: "#102344" })] }));
    }
    if (id === 'pollo') {
        return (_jsxs(_Fragment, { children: [_jsx("circle", { cx: "40", cy: "48", r: "22", fill: "#fde68a" }), _jsx("path", { d: "M28 24c4-12 20-12 24 0", fill: "#f59e0b" }), _jsx("circle", { cx: "32", cy: "46", r: "3", fill: "#102344" }), _jsx("circle", { cx: "48", cy: "46", r: "3", fill: "#102344" }), _jsx("path", { d: "M36 56h8l-4 6z", fill: "#f97316" })] }));
    }
    return (_jsxs(_Fragment, { children: [_jsx("circle", { cx: "40", cy: "48", r: "22", fill: "#86efac" }), _jsx("circle", { cx: "28", cy: "30", r: "8", fill: "#4ade80" }), _jsx("circle", { cx: "52", cy: "30", r: "8", fill: "#4ade80" }), _jsx("circle", { cx: "32", cy: "48", r: "3", fill: "#102344" }), _jsx("circle", { cx: "48", cy: "48", r: "3", fill: "#102344" }), _jsx("path", { d: "M34 58c4 4 8 4 12 0", stroke: "#166534", strokeWidth: "2", fill: "none" })] }));
}
