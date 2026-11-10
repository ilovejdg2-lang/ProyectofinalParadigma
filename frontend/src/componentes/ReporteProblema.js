import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
const categorias = ['Interfaz', 'Cuestionarios', 'Partida', 'Cuenta', 'Otro'];
const prioridades = ['Baja', 'Media', 'Alta'];
export function ReporteProblema({ abierto, onCerrar }) {
    const ubicacion = useLocation();
    const [asunto, setAsunto] = useState('');
    const [descripcion, setDescripcion] = useState('');
    const [categoria, setCategoria] = useState('');
    const [prioridad, setPrioridad] = useState('Media');
    const [enviado, setEnviado] = useState(false);
    const [error, setError] = useState(null);
    function cerrar() {
        setAsunto('');
        setDescripcion('');
        setCategoria('');
        setPrioridad('Media');
        setEnviado(false);
        setError(null);
        onCerrar();
    }
    function enviar(evento) {
        evento.preventDefault();
        if (asunto.trim().length < 3) {
            setError('El asunto necesita al menos 3 caracteres.');
            return;
        }
        if (descripcion.trim().length < 10) {
            setError('Describe el problema con al menos 10 caracteres.');
            return;
        }
        const guardados = JSON.parse(localStorage.getItem('profelink.reportes') ?? '[]');
        guardados.unshift({
            asunto: asunto.trim(),
            descripcion: descripcion.trim(),
            categoria,
            prioridad,
            ruta: ubicacion.pathname,
            navegador: navigator.userAgent,
            creadoEn: new Date().toISOString(),
        });
        localStorage.setItem('profelink.reportes', JSON.stringify(guardados.slice(0, 20)));
        setError(null);
        setEnviado(true);
    }
    useEffect(() => {
        if (!abierto)
            return;
        function alTeclado(evento) {
            if (evento.key === 'Escape')
                cerrar();
        }
        window.addEventListener('keydown', alTeclado);
        return () => window.removeEventListener('keydown', alTeclado);
    }, [abierto, onCerrar]);
    if (!abierto)
        return null;
    return (_jsx("div", { className: "dialogo", role: "dialog", "aria-modal": "true", "aria-labelledby": "titulo-reporte", children: _jsxs("form", { className: "panel reporte", onSubmit: enviar, children: [_jsxs("div", { className: "reporte-cabeza", children: [_jsx("span", { className: "reporte-icono", "aria-hidden": "true", children: _jsxs("svg", { viewBox: "0 0 24 24", children: [_jsx("circle", { cx: "12", cy: "13", r: "5" }), _jsx("path", { d: "M12 8V5M9 3h6M5 13H3M21 13h-2M7 18l-2 2M17 18l2 2" })] }) }), _jsx("h2", { id: "titulo-reporte", children: "Reportar un Problema" }), _jsx("button", { className: "reporte-cerrar", type: "button", "aria-label": "Cerrar", onClick: cerrar, children: "\u00D7" })] }), enviado ? (_jsx("p", { children: "Reporte enviado. Qued\u00F3 guardado en este navegador porque el servicio de reportes todav\u00EDa se simula." })) : (_jsxs(_Fragment, { children: [_jsx("p", { children: "Ay\u00FAdanos a mejorar ProfeLink reportando cualquier problema que encuentres." }), _jsxs("label", { className: "campo-grupo", children: [_jsx("span", { children: "Asunto *" }), _jsx("input", { className: "campo", value: asunto, maxLength: 120, placeholder: "Ej: Error al cargar la lista de estudiantes", onChange: (evento) => setAsunto(evento.target.value) })] }), _jsxs("label", { className: "campo-grupo", children: [_jsx("span", { children: "Descripci\u00F3n del problema *" }), _jsx("textarea", { className: "area", value: descripcion, maxLength: 5000, placeholder: "Describe detalladamente qu\u00E9 problema encontraste, qu\u00E9 estabas haciendo cuando ocurri\u00F3, y cualquier otro detalle relevante...", onChange: (evento) => setDescripcion(evento.target.value) }), _jsxs("small", { className: "reporte-cuenta", children: [descripcion.length, "/5000"] })] }), _jsxs("div", { className: "reporte-fila", children: [_jsxs("label", { className: "campo-grupo", children: [_jsx("span", { children: "Categor\u00EDa" }), _jsxs("select", { className: "seleccion", value: categoria, onChange: (evento) => setCategoria(evento.target.value), children: [_jsx("option", { value: "", children: "Seleccionar..." }), categorias.map((item) => (_jsx("option", { children: item }, item)))] })] }), _jsxs("label", { className: "campo-grupo", children: [_jsx("span", { children: "Prioridad" }), _jsx("select", { className: "seleccion reporte-prioridad", value: prioridad, onChange: (evento) => setPrioridad(evento.target.value), children: prioridades.map((item) => (_jsx("option", { children: item }, item))) })] })] }), _jsx("p", { className: "reporte-nota", children: "La informaci\u00F3n de tu navegador y la p\u00E1gina actual se incluir\u00E1n autom\u00E1ticamente para ayudarnos a diagnosticar el problema." }), error ? _jsx("p", { className: "error-texto", children: error }) : null] })), _jsxs("div", { className: "reporte-acciones", children: [_jsx("button", { className: "boton-fantasma", type: "button", onClick: cerrar, children: enviado ? 'Cerrar' : 'Cancelar' }), enviado ? null : (_jsx("button", { className: "boton reporte-enviar", type: "submit", children: "Enviar Reporte" }))] })] }) }));
}
