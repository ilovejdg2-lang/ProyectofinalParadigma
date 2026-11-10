import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { EstadoCarga, EstadoError } from '../componentes/Interfaz.tsx';
import { useAutenticacion } from '../contexto/ProveedorAutenticacion.tsx';
import { useServicios } from '../contexto/ProveedorServicios.tsx';
import { mensajeDe } from '../dominio/errores.ts';
import { prepararPestanaSala, publicarSala } from '../juego/abrirSala.ts';
import { acentoDeDificultad, etiquetaDificultad } from '../dominio/filtros.ts';
const etiquetasModo = {
    'en-vivo': 'En vivo',
    practica: 'Práctica',
    evaluacion: 'Evaluación',
    desafio: 'Desafío',
};
function opcionesDePregunta(pregunta) {
    if (pregunta.opciones && pregunta.opciones.length >= 2)
        return pregunta.opciones;
    return [
        { id: `${pregunta.id}:verdadero`, texto: 'Verdadero', correcta: pregunta.respuestaCorrecta },
        { id: `${pregunta.id}:falso`, texto: 'Falso', correcta: !pregunta.respuestaCorrecta },
    ];
}
export function DetalleCuestionario() {
    const { id = '' } = useParams();
    const { actividades, sala } = useServicios();
    const { token, perfil } = useAutenticacion();
    const esDocente = perfil?.rol === 'teacher' || perfil?.rol === 'admin';
    const navegar = useNavigate();
    const [cuestionario, setCuestionario] = useState(null);
    const [error, setError] = useState(null);
    const [cargando, setCargando] = useState(true);
    const [abriendo, setAbriendo] = useState(false);
    const [enlaceManual, setEnlaceManual] = useState(null);
    const [practicando, setPracticando] = useState(false);
    const [modoSeleccionado, setModoSeleccionado] = useState('practica');
    const [selecciones, setSelecciones] = useState({});
    const [guardandoPartida, setGuardandoPartida] = useState(false);
    useEffect(() => {
        let activo = true;
        actividades
            .obtener(id)
            .then((dato) => {
            if (activo) {
                setCuestionario(dato);
                if (dato.modo)
                    setModoSeleccionado(dato.modo);
            }
        })
            .catch((err) => {
            if (activo)
                setError(mensajeDe(err));
        })
            .finally(() => {
            if (activo)
                setCargando(false);
        });
        return () => {
            activo = false;
        };
    }, [actividades, id]);
    async function iniciar() {
        if (!token)
            return;
        const ventana = prepararPestanaSala();
        setAbriendo(true);
        setEnlaceManual(null);
        try {
            const creada = await sala.crear(token, id);
            const publicada = publicarSala(ventana, creada.codigo);
            if (!publicada.abierta)
                setEnlaceManual(publicada.url);
        }
        catch (err) {
            if (ventana && !ventana.closed)
                ventana.close();
            setError(mensajeDe(err));
        }
        finally {
            setAbriendo(false);
        }
    }
    function elegirOpcion(preguntaId, opcionId) {
        setSelecciones((actual) => ({ ...actual, [preguntaId]: opcionId }));
        setError(null);
    }
    async function finalizarPractica() {
        if (!token || !cuestionario)
            return;
        const respuestas = cuestionario.preguntas
            .filter((pregunta) => Boolean(selecciones[pregunta.id]))
            .map((pregunta) => ({
            preguntaId: pregunta.id,
            opcionId: selecciones[pregunta.id],
        }));
        if (respuestas.length === 0) {
            setError('Responde al menos una pregunta antes de guardar la partida.');
            return;
        }
        setGuardandoPartida(true);
        try {
            const guardado = await sala.guardarPartida(token, {
                cuestionarioId: cuestionario.id,
                modo: modoSeleccionado,
                respuestas,
            });
            navegar(`/resultados/${guardado.codigo}`);
        }
        catch (err) {
            setError(mensajeDe(err));
        }
        finally {
            setGuardandoPartida(false);
        }
    }
    if (cargando)
        return _jsx(EstadoCarga, {});
    if (error && !cuestionario)
        return _jsx(EstadoError, { mensaje: error });
    if (!cuestionario)
        return _jsx(EstadoError, { mensaje: "No se encontr\u00F3 el cuestionario." });
    return (_jsxs("div", { className: `descubrir-detalle acento-${acentoDeDificultad(cuestionario.dificultad)}`, children: [_jsxs("aside", { className: "descubrir-ficha", children: [_jsx("div", { className: "descubrimiento-portada", style: { backgroundImage: cuestionario.imagenUrl ? `url("${cuestionario.imagenUrl.replaceAll('"', '')}")` : undefined }, children: _jsxs("span", { className: "conjunto-cuenta", children: [cuestionario.preguntas.length, " ", cuestionario.preguntas.length === 1 ? 'pregunta' : 'preguntas'] }) }), _jsx("h1", { children: cuestionario.titulo }), _jsx("p", { className: "meta", children: cuestionario.autorNombre }), _jsxs("p", { children: [_jsx("span", { className: "nivel", children: etiquetaDificultad(cuestionario.dificultad) }), " \u00B7 ", cuestionario.categoria, cuestionario.modo ? ` · ${etiquetasModo[cuestionario.modo]}` : ''] }), cuestionario.esDemostracion ? _jsx("p", { className: "etiqueta-demo", children: "Datos de prueba" }) : null, _jsx("p", { children: cuestionario.descripcion || 'Este cuestionario no tiene descripción.' }), error ? _jsx("p", { className: "error-texto", children: error }) : null, enlaceManual ? (_jsxs("p", { children: ["El navegador bloque\u00F3 la pesta\u00F1a nueva.", ' ', _jsx("a", { href: enlaceManual, target: "_blank", rel: "noreferrer", children: "Abrir la sala" })] })) : null, esDocente ? (_jsx("button", { className: "conjunto-anfitrion", type: "button", onClick: () => void iniciar(), disabled: abriendo, children: abriendo ? 'Abriendo…' : 'Juego anfitrión' })) : (_jsx(Link, { className: "conjunto-anfitrion", to: "/unirse", style: { textAlign: 'center', textDecoration: 'none' }, children: "Unirse a partida con c\u00F3digo" })), _jsx("button", { className: "boton", type: "button", onClick: () => {
                            setPracticando((actual) => !actual);
                            setError(null);
                        }, children: practicando ? 'Cerrar práctica' : 'Practicar cuestionario' }), practicando ? (_jsx("button", { className: "boton", type: "button", onClick: () => void finalizarPractica(), disabled: guardandoPartida, children: guardandoPartida ? 'Guardando…' : 'Guardar partida' })) : null, _jsx(Link, { className: "boton-fantasma", to: "/descubrir", children: "Volver" })] }), _jsx("div", { className: "vista-preguntas", children: cuestionario.preguntas.map((pregunta, indice) => {
                    const opciones = opcionesDePregunta(pregunta);
                    const elegida = selecciones[pregunta.id];
                    return (_jsxs("article", { className: "vista-pregunta", children: [_jsxs("div", { children: [_jsxs("strong", { children: ["Pregunta ", indice + 1] }), _jsx("p", { children: pregunta.enunciado }), practicando ? (_jsx("div", { className: "fila", role: "group", "aria-label": `Opciones de la pregunta ${indice + 1}`, children: opciones.map((opcion) => (_jsx("button", { type: "button", className: elegida === opcion.id ? 'boton' : 'boton-fantasma', onClick: () => elegirOpcion(pregunta.id, opcion.id), children: opcion.texto }, opcion.id))) })) : null, practicando && elegida && pregunta.explicacion ? (_jsx("p", { className: "meta", children: pregunta.explicacion })) : null] }), pregunta.imagenUrl ? _jsx("img", { src: pregunta.imagenUrl, alt: "" }) : null, _jsxs("span", { className: "tiempo-pregunta", children: [pregunta.segundos ?? 20, " segundos"] })] }, pregunta.id));
                }) })] }));
}
