import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { EstadoCarga, EstadoError, EstadoVacio } from '../componentes/Interfaz.tsx';
import { useAutenticacion } from '../contexto/ProveedorAutenticacion.tsx';
import { useServicios } from '../contexto/ProveedorServicios.tsx';
import { mensajeDe } from '../dominio/errores.ts';
function esMismoUsuario(a, b) {
    if (!a || !b)
        return false;
    if (a === b)
        return true;
    const demos = new Set(['perfil-demo', 'perfil-demo-docente']);
    return demos.has(a) && demos.has(b);
}
export function Historial() {
    const { sala } = useServicios();
    const { token, perfil } = useAutenticacion();
    const [lista, setLista] = useState([]);
    const [progreso, setProgreso] = useState(null);
    const [error, setError] = useState(null);
    const [cargando, setCargando] = useState(true);
    function cargar() {
        if (!token)
            return;
        setCargando(true);
        Promise.all([sala.historial(token), sala.progreso(token).catch(() => null)])
            .then(([datos, avance]) => {
            setLista(datos);
            setProgreso(avance);
            setError(null);
        })
            .catch((err) => setError(mensajeDe(err)))
            .finally(() => setCargando(false));
    }
    useEffect(() => {
        cargar();
    }, [sala, token]);
    if (cargando)
        return _jsx(EstadoCarga, {});
    if (error)
        return _jsx(EstadoError, { mensaje: error, onReintentar: cargar });
    if (lista.length === 0) {
        return _jsx(EstadoVacio, { titulo: "No hay partidas terminadas", detalle: "Cuando cierres una sesi\u00F3n, su clasificaci\u00F3n quedar\u00E1 aqu\u00ED." });
    }
    return (_jsxs("section", { children: [_jsx("h1", { children: "Historial de resultados" }), progreso ? (_jsxs("section", { className: "panel", "aria-label": "Progreso del usuario", style: { marginBottom: '1.25rem' }, children: [_jsxs("h2", { children: ["Progreso de ", progreso.nombre] }), _jsxs("p", { className: "meta", children: ["Partidas jugadas: ", _jsx("strong", { children: progreso.partidasJugadas }), " \u00B7 Puntaje total:", ' ', _jsx("strong", { children: progreso.puntajeTotal }), " \u00B7 Precisi\u00F3n:", ' ', _jsxs("strong", { children: [progreso.promedioPorcentaje, "%"] }), " \u00B7 Dominio Kanban:", ' ', _jsxs("strong", { children: [progreso.dominioKanban.porcentajeDominio, "%"] })] }), progreso.progresoPorCategoria.length > 0 ? (_jsx("div", { className: "fila", style: { flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.5rem' }, children: progreso.progresoPorCategoria.map((item) => (_jsxs("span", { className: "etiqueta", children: [item.categoria, ": ", item.porcentajeDominio, "% (", item.partidasCompletadas, ' ', item.partidasCompletadas === 1 ? 'partida' : 'partidas', ")"] }, item.categoria))) })) : null] })) : null, _jsx("div", { className: "clasificacion", children: lista.map((resultado) => {
                    const mio = resultado.participantes.find((participante) => esMismoUsuario(participante.perfilId, perfil?.id));
                    return (_jsxs("article", { className: "puesto", children: [_jsx("span", { className: "lugar", children: resultado.participantes.length }), _jsxs("div", { children: [_jsx("strong", { children: resultado.titulo }), _jsxs("p", { className: "meta", children: ["C\u00F3digo ", resultado.codigo, mio ? ` · ${mio.puntaje} puntos` : ''] })] }), _jsx(Link, { to: `/resultados/${resultado.codigo}`, children: "Ver" })] }, resultado.codigo));
                }) })] }));
}
