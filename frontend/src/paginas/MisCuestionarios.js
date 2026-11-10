import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Dialogo, EstadoCarga, EstadoError, EstadoVacio } from '../componentes/Interfaz.tsx';
import { useAutenticacion } from '../contexto/ProveedorAutenticacion.tsx';
import { useServicios } from '../contexto/ProveedorServicios.tsx';
import { mensajeDe } from '../dominio/errores.ts';
import { prepararPestanaSala, publicarSala } from '../juego/abrirSala.ts';
import { acentoDeDificultad, etiquetaDificultad } from '../dominio/filtros.ts';
function textoEditado(iso) {
    const fecha = new Date(iso);
    const minutos = Math.floor((Date.now() - fecha.getTime()) / 60000);
    if (Number.isNaN(minutos))
        return 'Editado recientemente';
    if (minutos < 1)
        return 'Editado ahora';
    if (minutos < 60)
        return `Editado hace ${minutos} min`;
    const horas = Math.floor(minutos / 60);
    if (horas < 24)
        return horas === 1 ? 'Editado hace 1 hora' : `Editado hace ${horas} horas`;
    const dias = Math.floor(horas / 24);
    if (dias < 30)
        return dias === 1 ? 'Editado hace 1 día' : `Editado hace ${dias} días`;
    const meses = Math.floor(dias / 30);
    if (meses < 12)
        return meses === 1 ? 'Editado hace 1 mes' : `Editado hace ${meses} meses`;
    const anos = Math.floor(meses / 12);
    return anos === 1 ? 'Editado hace 1 año' : `Editado hace ${anos} años`;
}
export function MisCuestionarios() {
    const { actividades, sala } = useServicios();
    const { token } = useAutenticacion();
    const navegar = useNavigate();
    const [lista, setLista] = useState([]);
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState(null);
    const [pendiente, setPendiente] = useState(null);
    const [menu, setMenu] = useState(null);
    const [abriendo, setAbriendo] = useState(null);
    const [enlaceManual, setEnlaceManual] = useState(null);
    function cargar() {
        if (!token)
            return;
        setCargando(true);
        actividades
            .mios(token)
            .then((datos) => {
            setLista(datos);
            setError(null);
        })
            .catch((err) => setError(mensajeDe(err)))
            .finally(() => setCargando(false));
    }
    useEffect(() => {
        cargar();
    }, [actividades, token]);
    async function anfitrion(id) {
        if (!token)
            return;
        const ventana = prepararPestanaSala();
        setAbriendo(id);
        try {
            const creada = await sala.crear(token, id);
            const publicada = publicarSala(ventana, creada.codigo);
            if (!publicada.abierta)
                setEnlaceManual(publicada.url);
            else
                setAbriendo(null);
        }
        catch (err) {
            if (ventana && !ventana.closed)
                ventana.close();
            setError(mensajeDe(err));
            setAbriendo(null);
        }
    }
    async function eliminar() {
        if (!token || !pendiente)
            return;
        try {
            await actividades.eliminar(token, pendiente.id);
            setPendiente(null);
            cargar();
        }
        catch (err) {
            setError(mensajeDe(err));
            setPendiente(null);
        }
    }
    return (_jsxs(_Fragment, { children: [_jsxs("header", { className: "encabezado-pagina", children: [_jsxs("div", { children: [_jsx("h1", { children: "Mis cuestionarios" }), _jsx("p", { children: "Solo puedes editar y eliminar los que creaste." })] }), _jsx(Link, { className: "boton", to: "/cuestionarios/nuevo", children: "Crear cuestionario" })] }), cargando ? _jsx(EstadoCarga, {}) : null, error ? _jsx(EstadoError, { mensaje: error, onReintentar: cargar }) : null, enlaceManual ? (_jsxs("p", { children: ["El navegador bloque\u00F3 la pesta\u00F1a nueva.", ' ', _jsx("a", { href: enlaceManual, target: "_blank", rel: "noreferrer", children: "Abrir la sala" })] })) : null, !cargando && !error && lista.length === 0 ? (_jsx(EstadoVacio, { titulo: "Todav\u00EDa no tienes cuestionarios", detalle: "Crea el primero para usarlo en clase." })) : null, _jsx("div", { className: "rejilla rejilla-mios", children: lista.map((cuestionario) => (_jsxs("article", { className: `conjunto acento-${acentoDeDificultad(cuestionario.dificultad)}`, children: [_jsx("div", { className: "conjunto-portada", style: { backgroundImage: cuestionario.imagenUrl ? `url("${cuestionario.imagenUrl.replaceAll('"', '')}")` : undefined }, children: _jsxs("span", { className: "conjunto-cuenta", children: [cuestionario.preguntas.length, " ", cuestionario.preguntas.length === 1 ? 'pregunta' : 'preguntas'] }) }), _jsxs("div", { className: "conjunto-cuerpo", children: [cuestionario.esDemostracion ? _jsx("span", { className: "etiqueta-demo", children: "Datos de prueba" }) : null, _jsx("h2", { children: cuestionario.titulo }), _jsx("p", { className: "conjunto-dato", children: etiquetaDificultad(cuestionario.dificultad) }), _jsx("p", { className: "conjunto-fecha", children: textoEditado(cuestionario.actualizadoEn) })] }), _jsxs("div", { className: "conjunto-iconos", children: [_jsx(Link, { to: `/cuestionarios/${cuestionario.id}/editar`, "aria-label": `Editar ${cuestionario.titulo}`, children: _jsx(IconoLapiz, {}) }), _jsx("button", { type: "button", "aria-label": `Eliminar ${cuestionario.titulo}`, onClick: () => setPendiente(cuestionario), children: _jsx(IconoBasura, {}) }), _jsxs("div", { className: "conjunto-mas", children: [_jsx("button", { type: "button", "aria-label": `Más opciones de ${cuestionario.titulo}`, "aria-expanded": menu === cuestionario.id, onClick: () => setMenu(menu === cuestionario.id ? null : cuestionario.id), children: _jsx(IconoPuntos, {}) }), menu === cuestionario.id ? (_jsx("div", { className: "conjunto-menu", children: _jsx("button", { type: "button", onClick: () => navegar(`/cuestionarios/${cuestionario.id}`), children: "Ver detalle" }) })) : null] })] }), _jsxs("div", { className: "conjunto-jugar", children: [_jsxs("button", { type: "button", className: "conjunto-solo", onClick: () => navegar(`/cuestionarios/${cuestionario.id}`), children: [_jsx(IconoPersona, {}), " Solo"] }), _jsxs("button", { type: "button", className: "conjunto-anfitrion", disabled: abriendo === cuestionario.id, onClick: () => void anfitrion(cuestionario.id), children: [_jsx(IconoPlay, {}), " ", abriendo === cuestionario.id ? 'Abriendo…' : 'Anfitrión'] })] })] }, cuestionario.id))) }), _jsx(Dialogo, { abierto: pendiente !== null, titulo: "Eliminar cuestionario", mensaje: `Se eliminará «${pendiente?.titulo ?? ''}». Esta acción no se puede deshacer.`, confirmar: "Eliminar", peligro: true, onConfirmar: () => void eliminar(), onCancelar: () => setPendiente(null) })] }));
}
function IconoLapiz() {
    return (_jsxs("svg", { viewBox: "0 0 24 24", "aria-hidden": "true", children: [_jsx("path", { d: "M4 20h4l10.5-10.5a2.1 2.1 0 0 0-3-3L5 17v3z" }), _jsx("path", { d: "M13.5 6.5l3 3" })] }));
}
function IconoBasura() {
    return (_jsxs("svg", { viewBox: "0 0 24 24", "aria-hidden": "true", children: [_jsx("path", { d: "M5 7h14" }), _jsx("path", { d: "M9 7V5h6v2" }), _jsx("path", { d: "M8 7l1 13h6l1-13" })] }));
}
function IconoPuntos() {
    return (_jsxs("svg", { viewBox: "0 0 24 24", "aria-hidden": "true", children: [_jsx("circle", { cx: "6", cy: "12", r: "1.4" }), _jsx("circle", { cx: "12", cy: "12", r: "1.4" }), _jsx("circle", { cx: "18", cy: "12", r: "1.4" })] }));
}
function IconoPersona() {
    return (_jsxs("svg", { viewBox: "0 0 24 24", "aria-hidden": "true", children: [_jsx("circle", { cx: "12", cy: "8", r: "3" }), _jsx("path", { d: "M6 19c1.2-3 3.2-4.5 6-4.5S16.8 16 18 19" })] }));
}
function IconoPlay() {
    return (_jsx("svg", { viewBox: "0 0 24 24", "aria-hidden": "true", children: _jsx("path", { d: "M8 5.5v13l11-6.5-11-6.5z" }) }));
}
