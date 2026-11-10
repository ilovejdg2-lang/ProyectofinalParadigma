import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { useBlocker, useNavigate, useParams } from 'react-router-dom';
import { Dialogo } from '../componentes/Interfaz.tsx';
import { useAutenticacion } from '../contexto/ProveedorAutenticacion.tsx';
import { useServicios } from '../contexto/ProveedorServicios.tsx';
import { mensajeDe } from '../dominio/errores.ts';
import { validarCuestionario } from '../dominio/validacion.ts';
const categorias = ['Kanban', 'Paradigma funcional', 'Paradigma lógico', 'Orientado a objetos', 'Concurrente', 'General'];
function preguntaVacia() {
    return {
        id: crypto.randomUUID(),
        enunciado: '',
        respuestaCorrecta: null,
        opciones: [
            { id: crypto.randomUUID(), texto: 'Verdadero' },
            { id: crypto.randomUUID(), texto: 'Falso' },
        ],
        opcionCorrectaId: null,
        imagenSimulada: false,
        segundos: 20,
    };
}
function borradorVacio() {
    return {
        titulo: '',
        descripcion: '',
        categoria: 'General',
        etiquetas: '',
        dificultad: 'medio',
        imagenSimulada: false,
        preguntas: [preguntaVacia()],
    };
}
export function EditorCuestionario() {
    const { id } = useParams();
    const edicion = Boolean(id);
    const { actividades } = useServicios();
    const { token, perfil } = useAutenticacion();
    const navegar = useNavigate();
    const [borrador, setBorrador] = useState(borradorVacio);
    const [errores, setErrores] = useState([]);
    const [sucio, setSucio] = useState(false);
    const [guardando, setGuardando] = useState(false);
    const [destino, setDestino] = useState(null);
    const [cargando, setCargando] = useState(edicion);
    const [confirmarSalida, setConfirmarSalida] = useState(false);
    const [preguntaPorBorrar, setPreguntaPorBorrar] = useState(null);
    const [preguntaAbierta, setPreguntaAbierta] = useState(null);
    const [editandoInfo, setEditandoInfo] = useState(false);
    const [mostrandoTiempo, setMostrandoTiempo] = useState(false);
    const [arrastrando, setArrastrando] = useState(null);
    const bloqueo = useBlocker(sucio && !guardando && !destino);
    useEffect(() => {
        if (destino)
            navegar(`/cuestionarios/${destino}`);
    }, [destino, navegar]);
    useEffect(() => {
        if (!id)
            return;
        let activo = true;
        actividades
            .obtener(id)
            .then((cuestionario) => {
            if (!activo)
                return;
            if (perfil && cuestionario.autorId !== perfil.id) {
                setErrores(['Solo quien creó el cuestionario puede editarlo.']);
                return;
            }
            setBorrador({
                titulo: cuestionario.titulo,
                descripcion: cuestionario.descripcion,
                categoria: cuestionario.categoria,
                etiquetas: cuestionario.etiquetas.join(', '),
                dificultad: cuestionario.dificultad,
                imagenUrl: cuestionario.imagenUrl,
                imagenSimulada: false,
                preguntas: cuestionario.preguntas.map((pregunta) => ({
                    id: pregunta.id,
                    enunciado: pregunta.enunciado,
                    respuestaCorrecta: pregunta.respuestaCorrecta,
                    opciones: pregunta.opciones?.map((opcion) => ({ id: opcion.id, texto: opcion.texto })) ?? [
                        { id: `${pregunta.id}:verdadero`, texto: 'Verdadero' },
                        { id: `${pregunta.id}:falso`, texto: 'Falso' },
                    ],
                    opcionCorrectaId: pregunta.opciones?.find((opcion) => opcion.correcta)?.id ??
                        (pregunta.respuestaCorrecta ? `${pregunta.id}:verdadero` : `${pregunta.id}:falso`),
                    imagenUrl: pregunta.imagenUrl,
                    imagenSimulada: false,
                    segundos: pregunta.segundos ?? 20,
                })),
            });
        })
            .catch((error) => setErrores([mensajeDe(error)]))
            .finally(() => {
            if (activo)
                setCargando(false);
        });
        return () => {
            activo = false;
        };
    }, [actividades, id, perfil]);
    function actualizar(parcial) {
        setBorrador((actual) => ({ ...actual, ...parcial }));
        setSucio(true);
    }
    function actualizarPregunta(preguntaId, parcial) {
        setBorrador((actual) => ({
            ...actual,
            preguntas: actual.preguntas.map((pregunta) => (pregunta.id === preguntaId ? { ...pregunta, ...parcial } : pregunta)),
        }));
        setSucio(true);
    }
    async function cargarImagen(archivo, destino) {
        if (!token)
            return;
        try {
            const resultado = await actividades.cargarImagen(token, archivo);
            if (destino === 'portada') {
                actualizar({ imagenUrl: resultado.url, imagenSimulada: resultado.origen === 'simulado' });
            }
            else {
                actualizarPregunta(destino, { imagenUrl: resultado.url, imagenSimulada: resultado.origen === 'simulado' });
            }
        }
        catch (error) {
            setErrores([mensajeDe(error)]);
        }
    }
    function eliminarPregunta(preguntaId) {
        actualizar({ preguntas: borrador.preguntas.filter((pregunta) => pregunta.id !== preguntaId) });
        if (preguntaAbierta === preguntaId)
            setPreguntaAbierta(null);
    }
    function duplicarPregunta(preguntaId) {
        const indice = borrador.preguntas.findIndex((pregunta) => pregunta.id === preguntaId);
        const origen = borrador.preguntas[indice];
        if (!origen)
            return;
        const ids = new Map(origen.opciones.map((opcion) => [opcion.id, crypto.randomUUID()]));
        const copia = {
            ...origen,
            id: crypto.randomUUID(),
            opciones: origen.opciones.map((opcion) => ({ ...opcion, id: ids.get(opcion.id) ?? crypto.randomUUID() })),
            opcionCorrectaId: origen.opcionCorrectaId ? (ids.get(origen.opcionCorrectaId) ?? null) : null,
        };
        const preguntas = [...borrador.preguntas];
        preguntas.splice(indice + 1, 0, copia);
        actualizar({ preguntas });
    }
    function cambiarOpcion(preguntaId, opcionId, texto) {
        setBorrador((actual) => ({
            ...actual,
            preguntas: actual.preguntas.map((pregunta) => pregunta.id === preguntaId
                ? { ...pregunta, opciones: pregunta.opciones.map((opcion) => (opcion.id === opcionId ? { ...opcion, texto } : opcion)) }
                : pregunta),
        }));
        setSucio(true);
    }
    function agregarOpcion(preguntaId) {
        setBorrador((actual) => ({
            ...actual,
            preguntas: actual.preguntas.map((pregunta) => pregunta.id === preguntaId && pregunta.opciones.length < 6
                ? { ...pregunta, opciones: [...pregunta.opciones, { id: crypto.randomUUID(), texto: `Respuesta ${pregunta.opciones.length + 1}` }] }
                : pregunta),
        }));
        setSucio(true);
    }
    function quitarOpcion(preguntaId, opcionId) {
        setBorrador((actual) => ({
            ...actual,
            preguntas: actual.preguntas.map((pregunta) => {
                if (pregunta.id !== preguntaId || pregunta.opciones.length <= 2)
                    return pregunta;
                return {
                    ...pregunta,
                    opciones: pregunta.opciones.filter((opcion) => opcion.id !== opcionId),
                    opcionCorrectaId: pregunta.opcionCorrectaId === opcionId ? null : pregunta.opcionCorrectaId,
                    respuestaCorrecta: pregunta.opcionCorrectaId === opcionId ? null : pregunta.respuestaCorrecta,
                };
            }),
        }));
        setSucio(true);
    }
    function soltarPregunta(indice) {
        if (arrastrando === null || arrastrando === indice) {
            setArrastrando(null);
            return;
        }
        const preguntas = [...borrador.preguntas];
        const [pregunta] = preguntas.splice(arrastrando, 1);
        if (!pregunta)
            return;
        preguntas.splice(indice, 0, pregunta);
        actualizar({ preguntas });
        setArrastrando(null);
    }
    function agregarPregunta() {
        const nueva = preguntaVacia();
        actualizar({ preguntas: [...borrador.preguntas, nueva] });
        setPreguntaAbierta(nueva.id);
    }
    async function guardar() {
        const validacion = validarCuestionario(borrador);
        setErrores(validacion);
        if (validacion.length > 0 || !token)
            return;
        setGuardando(true);
        try {
            const guardado = await actividades.guardar(token, {
                id,
                titulo: borrador.titulo,
                descripcion: borrador.descripcion,
                categoria: borrador.categoria,
                etiquetas: borrador.etiquetas
                    .split(',')
                    .map((etiqueta) => etiqueta.trim())
                    .filter(Boolean),
                dificultad: borrador.dificultad,
                imagenUrl: borrador.imagenUrl,
                preguntas: borrador.preguntas.map((pregunta, indice) => ({
                    id: pregunta.id,
                    enunciado: pregunta.enunciado.trim(),
                    respuestaCorrecta: pregunta.opciones.find((opcion) => opcion.id === pregunta.opcionCorrectaId)?.texto.trim().toLowerCase() === 'verdadero',
                    opciones: pregunta.opciones.map((opcion) => ({
                        id: opcion.id,
                        texto: opcion.texto.trim(),
                        correcta: opcion.id === pregunta.opcionCorrectaId,
                    })),
                    imagenUrl: pregunta.imagenUrl,
                    orden: indice + 1,
                    segundos: pregunta.segundos ?? 20,
                })),
            });
            setSucio(false);
            setDestino(guardado.id);
        }
        catch (error) {
            setErrores([mensajeDe(error)]);
        }
        finally {
            setGuardando(false);
        }
    }
    if (cargando)
        return _jsx("p", { children: "Cargando cuestionario\u2026" });
    return (_jsxs("form", { className: "editor-conjunto", onSubmit: (evento) => {
            evento.preventDefault();
            void guardar();
        }, children: [_jsxs("div", { className: "editor-guardar", children: [_jsx("button", { className: "boton", type: "submit", disabled: guardando, children: "Guardar cuestionario" }), _jsx("button", { className: "boton-fantasma", type: "button", onClick: () => (sucio ? setConfirmarSalida(true) : navegar('/mis-cuestionarios')), children: "Cancelar" })] }), _jsxs("div", { className: "editor-lienzo-conjunto", children: [_jsxs("aside", { className: "editor-lateral", children: [_jsxs("label", { className: "portada portada-editable editor-portada", children: [_jsx("span", { className: "fondo-portada", style: { backgroundImage: borrador.imagenUrl ? `url("${borrador.imagenUrl.replaceAll('"', '')}")` : undefined } }), _jsx("input", { type: "file", accept: "image/png,image/jpeg,image/webp,image/gif,image/svg+xml,.jpg,.jpeg,.png,.webp,.gif,.svg", "aria-label": "Imagen de portada", onChange: (evento) => {
                                            const archivo = evento.target.files?.[0];
                                            evento.target.value = '';
                                            if (archivo)
                                                void cargarImagen(archivo, 'portada');
                                        } }), _jsxs("span", { className: "conjunto-cuenta", children: [borrador.preguntas.length, " ", borrador.preguntas.length === 1 ? 'pregunta' : 'preguntas'] })] }), _jsx("h1", { children: borrador.titulo.trim() || 'Sin título' }), _jsx("p", { children: borrador.descripcion.trim() || 'Agrega una descripción.' }), _jsxs("div", { className: "editor-atajos", children: [_jsxs("button", { type: "button", onClick: () => setEditandoInfo(true), children: [_jsx(IconoLapiz, {}), "Editar informaci\u00F3n"] }), _jsxs("button", { type: "button", onClick: () => setMostrandoTiempo(true), children: [_jsx(IconoReloj, {}), "L\u00EDmite de tiempo"] })] }), _jsx("button", { className: "boton editor-agregar", type: "button", onClick: agregarPregunta, children: "+ Agregar pregunta" }), borrador.imagenSimulada ? (_jsx("p", { className: "aviso", children: "Vista previa local. Los otros dispositivos la ver\u00E1n cuando la API de actividades devuelva una URL." })) : null] }), _jsx("div", { className: "editor-lista", children: borrador.preguntas.map((pregunta, indice) => (_jsxs("article", { className: "fila-pregunta", draggable: true, onDragStart: () => setArrastrando(indice), onDragOver: (evento) => evento.preventDefault(), onDrop: () => soltarPregunta(indice), children: [_jsx("span", { className: "asa", "aria-hidden": "true", children: _jsx(IconoAsa, {}) }), _jsxs("button", { className: "boton-editar-fila", type: "button", onClick: () => setPreguntaAbierta(pregunta.id), children: [_jsx(IconoLapiz, {}), " Editar"] }), _jsxs("div", { className: "fila-texto", children: [_jsxs("strong", { children: ["Pregunta ", indice + 1] }), _jsx("p", { children: pregunta.enunciado.trim() || 'Sin enunciado' }), _jsx("span", { className: "meta", children: pregunta.opciones.find((opcion) => opcion.id === pregunta.opcionCorrectaId)?.texto ?? 'Sin elegir' })] }), _jsx("button", { className: "icono-fila", type: "button", "aria-label": `Eliminar pregunta ${indice + 1}`, onClick: () => setPreguntaPorBorrar(pregunta.id), children: _jsx(IconoBasura, {}) }), _jsx("button", { className: "icono-fila", type: "button", "aria-label": `Duplicar pregunta ${indice + 1}`, onClick: () => duplicarPregunta(pregunta.id), children: _jsx(IconoCopiar, {}) }), _jsxs("button", { className: "tiempo-pregunta", type: "button", onClick: () => setPreguntaAbierta(pregunta.id), children: [_jsx(IconoReloj, {}), " ", pregunta.segundos ?? 20, " segundos"] })] }, pregunta.id))) })] }), editandoInfo ? (_jsx("div", { className: "modal-pregunta", role: "dialog", "aria-modal": "true", "aria-labelledby": "titulo-info", children: _jsxs("div", { className: "panel pregunta-editor", children: [_jsxs("div", { className: "editor-cabeza", children: [_jsx("h2", { id: "titulo-info", children: "Informaci\u00F3n del cuestionario" }), _jsx("button", { className: "boton", type: "button", onClick: () => setEditandoInfo(false), children: "Listo" })] }), _jsxs("label", { className: "campo-grupo", children: [_jsx("span", { children: "T\u00EDtulo" }), _jsx("input", { className: "campo", value: borrador.titulo, onChange: (evento) => actualizar({ titulo: evento.target.value }) })] }), _jsxs("label", { className: "campo-grupo", children: [_jsx("span", { children: "Descripci\u00F3n" }), _jsx("textarea", { className: "area", value: borrador.descripcion, onChange: (evento) => actualizar({ descripcion: evento.target.value }) })] }), _jsxs("div", { className: "fila", children: [_jsxs("label", { className: "campo-grupo", children: [_jsx("span", { children: "Categor\u00EDa" }), _jsx("select", { className: "seleccion", value: borrador.categoria, onChange: (evento) => actualizar({ categoria: evento.target.value }), children: categorias.map((categoria) => (_jsx("option", { children: categoria }, categoria))) })] }), _jsxs("label", { className: "campo-grupo", children: [_jsx("span", { children: "Dificultad" }), _jsxs("select", { className: "seleccion", value: borrador.dificultad, onChange: (evento) => actualizar({ dificultad: evento.target.value }), children: [_jsx("option", { value: "facil", children: "F\u00E1cil" }), _jsx("option", { value: "medio", children: "Medio" }), _jsx("option", { value: "dificil", children: "Dif\u00EDcil" })] })] })] }), _jsxs("label", { className: "campo-grupo", children: [_jsx("span", { children: "Etiquetas, separadas por coma" }), _jsx("input", { className: "campo", value: borrador.etiquetas, onChange: (evento) => actualizar({ etiquetas: evento.target.value }) })] })] }) })) : null, preguntaAbierta
                ? borrador.preguntas.map((pregunta, indice) => pregunta.id === preguntaAbierta ? (_jsx("div", { className: "modal-pregunta", role: "dialog", "aria-modal": "true", "aria-labelledby": "titulo-pregunta", children: _jsxs("div", { className: "panel pregunta-editor", children: [_jsxs("div", { className: "editor-cabeza", children: [_jsxs("h2", { id: "titulo-pregunta", children: ["Pregunta ", indice + 1] }), _jsx("button", { className: "boton", type: "button", onClick: () => setPreguntaAbierta(null), children: "Listo" })] }), _jsxs("div", { className: "editor-lienzo", children: [_jsxs("label", { className: "zona-media", children: [_jsx("span", { children: "Imagen opcional" }), _jsx("input", { type: "file", accept: "image/png,image/jpeg,image/webp,image/gif,image/svg+xml", onChange: (evento) => {
                                                    const archivo = evento.target.files?.[0];
                                                    if (archivo)
                                                        void cargarImagen(archivo, pregunta.id);
                                                } }), pregunta.imagenUrl ? _jsx("img", { className: "vista-imagen", src: pregunta.imagenUrl, alt: "" }) : null, pregunta.imagenSimulada ? _jsx("p", { className: "aviso", children: "Imagen simulada en este navegador." }) : null] }), _jsx("textarea", { className: "enunciado-editor", "aria-label": `Enunciado de la pregunta ${indice + 1}`, placeholder: "Escribe la pregunta de verdadero o falso", value: pregunta.enunciado, onChange: (evento) => actualizarPregunta(pregunta.id, { enunciado: evento.target.value }) })] }), _jsxs("label", { className: "campo-grupo", children: [_jsx("span", { children: "Segundos para responder" }), _jsx("input", { className: "campo", type: "number", min: 5, max: 120, "aria-label": `Segundos de la pregunta ${indice + 1}`, value: pregunta.segundos ?? 20, onChange: (evento) => actualizarPregunta(pregunta.id, { segundos: Number(evento.target.value) }) })] }), _jsx("div", { className: "respuestas-editor", role: "radiogroup", "aria-label": `Respuesta correcta de la pregunta ${indice + 1}`, children: pregunta.opciones.map((opcion, numero) => (_jsxs("div", { className: `respuesta-editor tono-${numero % 4}${pregunta.opcionCorrectaId === opcion.id ? ' activa' : ''}`, children: [_jsx("input", { "aria-label": `Respuesta ${numero + 1} de la pregunta ${indice + 1}`, value: opcion.texto, onChange: (evento) => cambiarOpcion(pregunta.id, opcion.id, evento.target.value) }), _jsx("button", { type: "button", onClick: () => actualizarPregunta(pregunta.id, { opcionCorrectaId: opcion.id }), children: pregunta.opcionCorrectaId === opcion.id ? 'Correcta' : 'Marcar' }), pregunta.opciones.length > 2 ? (_jsx("button", { type: "button", "aria-label": `Quitar respuesta ${numero + 1}`, onClick: () => quitarOpcion(pregunta.id, opcion.id), children: "Quitar" })) : null] }, opcion.id))) }), _jsx("button", { className: "boton", type: "button", disabled: pregunta.opciones.length >= 6, onClick: () => agregarOpcion(pregunta.id), children: "Agregar respuesta" })] }) }, pregunta.id)) : null)
                : null, errores.length > 0 ? (_jsx("ul", { className: "lista-errores", children: errores.map((error) => (_jsx("li", { children: error }, error))) })) : null, _jsx(Dialogo, { abierto: mostrandoTiempo, titulo: "L\u00EDmite de tiempo", mensaje: "Cada pregunta puede durar entre 5 y 120 segundos. El tiempo se edita al abrir la pregunta y lo aplica el servidor al iniciar esa ronda.", confirmar: "Entendido", onConfirmar: () => setMostrandoTiempo(false), onCancelar: () => setMostrandoTiempo(false) }), _jsx(Dialogo, { abierto: preguntaPorBorrar !== null, titulo: "Eliminar pregunta", mensaje: "La pregunta se quitar\u00E1 del cuestionario. Puedes deshacerlo si cancelas sin guardar.", confirmar: "Eliminar pregunta", peligro: true, onConfirmar: () => {
                    if (preguntaPorBorrar)
                        eliminarPregunta(preguntaPorBorrar);
                    setPreguntaPorBorrar(null);
                }, onCancelar: () => setPreguntaPorBorrar(null) }), _jsx(Dialogo, { abierto: confirmarSalida || bloqueo.state === 'blocked', titulo: "Hay cambios sin guardar", mensaje: "Si sales ahora, se perder\u00E1 lo que no hayas guardado.", confirmar: "Descartar cambios", peligro: true, onConfirmar: () => {
                    setSucio(false);
                    setConfirmarSalida(false);
                    if (bloqueo.state === 'blocked')
                        bloqueo.proceed();
                    else
                        navegar('/mis-cuestionarios');
                }, onCancelar: () => {
                    setConfirmarSalida(false);
                    if (bloqueo.state === 'blocked')
                        bloqueo.reset();
                } })] }));
}
function IconoLapiz() {
    return (_jsxs("svg", { viewBox: "0 0 24 24", "aria-hidden": "true", children: [_jsx("path", { d: "M4 20h4l10.5-10.5a2.1 2.1 0 0 0-3-3L5 17v3z" }), _jsx("path", { d: "M13.5 6.5l3 3" })] }));
}
function IconoReloj() {
    return (_jsxs("svg", { viewBox: "0 0 24 24", "aria-hidden": "true", children: [_jsx("circle", { cx: "12", cy: "12", r: "8" }), _jsx("path", { d: "M12 8v5l3 2" })] }));
}
function IconoAsa() {
    return (_jsx("svg", { viewBox: "0 0 24 24", "aria-hidden": "true", children: _jsx("path", { d: "M8 7h.01M8 12h.01M8 17h.01M14 7h.01M14 12h.01M14 17h.01" }) }));
}
function IconoBasura() {
    return (_jsxs("svg", { viewBox: "0 0 24 24", "aria-hidden": "true", children: [_jsx("path", { d: "M5 7h14" }), _jsx("path", { d: "M9 7V5h6v2" }), _jsx("path", { d: "M8 7l1 13h6l1-13" })] }));
}
function IconoCopiar() {
    return (_jsxs("svg", { viewBox: "0 0 24 24", "aria-hidden": "true", children: [_jsx("rect", { x: "8", y: "8", width: "11", height: "11", rx: "2" }), _jsx("path", { d: "M6 16H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" })] }));
}
