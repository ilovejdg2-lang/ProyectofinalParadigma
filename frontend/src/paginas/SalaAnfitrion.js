import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { CodigoQr, enlaceDePartida } from '../componentes/CodigoQr.tsx';
import { EstadoCarga, EstadoError, EstadoVacio } from '../componentes/Interfaz.tsx';
import { Podio } from '../componentes/Podio.tsx';
import { useAutenticacion } from '../contexto/ProveedorAutenticacion.tsx';
import { useServicios } from '../contexto/ProveedorServicios.tsx';
import { mensajeDe } from '../dominio/errores.ts';
import { textoCorrecto } from '../dominio/opciones.ts';
import { audio } from '../juego/audio.ts';
import { Avatar, avatarVisible } from '../juego/avatares.tsx';
import { ClasificacionRonda } from '../juego/ClasificacionRonda.tsx';
import { ControlesAudio } from '../juego/ControlesAudio.tsx';
import { CuentaRegresiva } from '../juego/CuentaRegresiva.tsx';
import { FondoJuego } from '../juego/FondoJuego.tsx';
import { OpcionesJuego } from '../juego/OpcionesJuego.tsx';
import { cuentaActiva, paisajeDe } from '../juego/ronda.ts';
import { Temporizador } from '../juego/Temporizador.tsx';
import { useSala } from './useSala.ts';
export function SalaAnfitrion() {
    const { codigo = '' } = useParams();
    const { sala: cliente } = useServicios();
    const { token, perfil } = useAutenticacion();
    const { sala, error, cargando, conexion, recargar, setError, setConexion } = useSala(codigo);
    const [copiado, setCopiado] = useState(false);
    const [ocupado, setOcupado] = useState(false);
    const [ahora, setAhora] = useState(() => Date.now());
    const previos = useRef(0);
    useEffect(() => {
        const id = window.setInterval(() => setAhora(Date.now()), 200);
        return () => window.clearInterval(id);
    }, []);
    useEffect(() => {
        if (!sala || sala.estado !== 'esperando')
            return;
        if (sala.participantes.length > previos.current)
            audio.efecto('ingreso');
        previos.current = sala.participantes.length;
    }, [sala]);
    async function accion(operacion) {
        void audio.desbloquear();
        setOcupado(true);
        try {
            await operacion();
            setError(null);
        }
        catch (err) {
            setError(mensajeDe(err));
        }
        finally {
            setOcupado(false);
        }
    }
    if (cargando)
        return _jsx(EstadoCarga, { texto: "Abriendo la sala\u2026" });
    if (!sala && error)
        return _jsx(EstadoError, { mensaje: error, onReintentar: () => void recargar() });
    if (!sala)
        return _jsx(EstadoError, { mensaje: "No se pudo cargar la sala." });
    if (perfil && sala.anfitrionId !== perfil.id) {
        return (_jsx(EstadoVacio, { titulo: "Esta sala la controla otra persona", detalle: "Puedes entrar como participante, sin iniciar ni avanzar la partida." }));
    }
    const pregunta = sala.preguntas[sala.preguntaActual];
    const canal = sala.canal === 'simulado' ? 'Canal simulado' : 'Canal en vivo';
    const enCuenta = cuentaActiva(sala, ahora);
    const restante = sala.cierraEn ? Math.max(0, new Date(sala.cierraEn).getTime() - ahora) : 0;
    const recibidas = pregunta
        ? sala.participantes.filter((item) => item.respuestas.some((respuesta) => respuesta.preguntaId === pregunta.id && respuesta.aceptada)).length
        : 0;
    const paisaje = paisajeDe(sala, ahora, restante);
    const tension = paisaje === 'suspenso' && restante > 0 && restante <= 10_000;
    const enlace = enlaceDePartida(sala.codigo);
    const enLocal = /^(localhost|127\.0\.0\.1)$/.test(window.location.hostname);
    return (_jsxs("section", { className: "sala-espera escenario", children: [_jsx(FondoJuego, {}), sala.estado === 'esperando' ? (_jsx("div", { className: "sala-lobby", children: _jsxs("article", { className: "sala-panel", children: [_jsxs("div", { children: [_jsxs("div", { className: "sala-kicker", children: [_jsx("h1", { children: "Sala en vivo" }), _jsx("span", { className: "pastilla viva", children: canal })] }), _jsx("p", { className: "pastilla", children: sala.titulo }), _jsx("p", { children: "Comparte este c\u00F3digo con tu grupo:" }), _jsx("p", { className: "pin-gigante", "data-testid": "codigo-sala", children: sala.codigo.split('').map((letra, indice) => (_jsx("span", { children: letra }, `${sala.codigo}-${indice}`))) }), _jsx("p", { className: "sala-qr-ayuda", children: "Tus estudiantes pueden unirse escaneando el QR o ingresando el c\u00F3digo en ProfeLink." })] }), _jsx(CodigoQr, { valor: enlace, etiqueta: `Código QR para entrar a la partida ${sala.codigo}` }), _jsxs("aside", { className: "sala-conteo-grande", "aria-live": "polite", children: [_jsx("span", { children: "Estudiantes en la sala" }), _jsx("strong", { children: sala.participantes.length }), _jsx("span", { className: "pastilla viva", children: conexion === 'conectado' ? 'Conectado' : 'Sin conexión' })] })] }) })) : (_jsxs("header", { className: "sala-banda", children: [_jsxs("div", { children: [_jsx("p", { children: "C\u00F3digo de la sala" }), _jsx("p", { className: "codigo-sala", "data-testid": "codigo-sala", children: sala.codigo })] }), _jsxs("p", { className: "sala-conteo", "aria-live": "polite", children: [sala.participantes.length, " ", sala.participantes.length === 1 ? 'estudiante' : 'estudiantes'] })] })), sala.estado === 'esperando' && enLocal ? (_jsx("p", { className: "meta", children: "Si el celular no abre el QR, entra a esta p\u00E1gina con la direcci\u00F3n de la red, no con localhost." })) : null, _jsxs("div", { className: "fila juego-barra", children: [_jsxs("p", { className: "meta", children: [sala.titulo, " \u00B7 ", canal, " \u00B7 ", conexion === 'conectado' ? 'Conectado' : 'Sin conexión', " \u00B7 ", sala.estado] }), _jsx(ControlesAudio, { paisaje: paisaje, tension: tension })] }), enCuenta && sala.abreEn ? _jsx(CuentaRegresiva, { abreEn: sala.abreEn, ahora: ahora }) : null, _jsxs("div", { className: "acciones controles-sala", children: [_jsx("button", { className: "boton", type: "button", onClick: () => {
                            void navigator.clipboard.writeText(sala.codigo).then(() => setCopiado(true));
                        }, children: copiado ? 'Código copiado' : 'Copiar código' }), sala.estado === 'esperando' ? (_jsx("button", { className: "boton grande boton-jugar", type: "button", disabled: ocupado || sala.participantes.length === 0, onClick: () => token && void accion(() => cliente.iniciar(token, sala.codigo)), children: "Comenzar partida" })) : null, sala.estado === 'pregunta' && !enCuenta ? (_jsx("button", { className: "boton", type: "button", disabled: ocupado, onClick: () => token && void accion(() => cliente.cerrarPregunta(token, sala.codigo)), children: "Cerrar pregunta" })) : null, sala.estado === 'cerrada' ? (_jsx("button", { className: "boton", type: "button", disabled: ocupado, onClick: () => token && void accion(() => cliente.avanzar(token, sala.codigo)), children: sala.preguntaActual + 1 >= sala.preguntas.length ? 'Ver resultados' : 'Siguiente pregunta' })) : null, sala.estado === 'finalizada' ? (_jsx(Link, { className: "boton", to: `/resultados/${sala.codigo}`, children: "Ver clasificaci\u00F3n" })) : null] }), conexion !== 'conectado' ? (_jsx(EstadoError, { mensaje: error ?? 'Se perdió la conexión con la sala.', onReintentar: () => {
                    cliente.reconectar();
                    setConexion(cliente.estadoConexion());
                    void recargar();
                } })) : null, error && conexion === 'conectado' ? _jsx("p", { className: "error-texto", role: "alert", children: error }) : null, sala.estado !== 'esperando' && sala.estado !== 'finalizada' && pregunta && !enCuenta ? (_jsxs("article", { className: "panel pregunta-docente", children: [_jsxs("p", { className: "meta", children: ["Pregunta ", sala.preguntaActual + 1, " de ", sala.preguntas.length] }), _jsx("div", { className: "progreso-juego", "aria-hidden": "true", children: sala.preguntas.map((item, indice) => (_jsx("span", { className: indice < sala.preguntaActual ? 'hecha' : indice === sala.preguntaActual ? 'actual' : '' }, item.id || indice))) }), sala.estado === 'pregunta' ? _jsx(Temporizador, { restante: restante, total: sala.segundos, activo: true }) : null, _jsxs("p", { className: "meta", "aria-live": "polite", children: [recibidas, " de ", sala.participantes.length, " respuestas"] }), _jsx("h2", { children: pregunta.enunciado }), pregunta.imagenUrl ? _jsx("img", { className: "vista-imagen", src: pregunta.imagenUrl, alt: "" }) : null, _jsx(OpcionesJuego, { pregunta: pregunta }), sala.estado === 'cerrada' ? (_jsxs(_Fragment, { children: [_jsxs("p", { children: ["Respuesta correcta: ", textoCorrecto(pregunta)] }), _jsx(ClasificacionRonda, { participantes: sala.participantes, preguntaId: pregunta.id, perfilId: perfil?.id })] })) : null] })) : null, sala.estado === 'finalizada' ? _jsx(Podio, { participantes: sala.participantes, perfilId: perfil?.id }) : null, _jsxs("h2", { children: ["Participantes (", sala.participantes.length, ")"] }), sala.participantes.length === 0 ? (_jsx(EstadoVacio, { titulo: "Todav\u00EDa no hay participantes", detalle: "La partida empieza cuando alguien escanee el QR o entre con el c\u00F3digo." })) : (_jsx("div", { className: "participantes-juego", children: sala.participantes.map((participante) => {
                    const respondio = pregunta
                        ? participante.respuestas.some((respuesta) => respuesta.preguntaId === pregunta.id && respuesta.aceptada)
                        : false;
                    return (_jsxs("div", { className: "participante-juego", children: [_jsx(Avatar, { id: avatarVisible(participante.perfilId, participante.avatarId), tamano: 48 }), _jsxs("span", { children: [_jsx("strong", { children: participante.nombre }), _jsxs("span", { children: [_jsx("i", { className: participante.conectado ? 'punto vivo' : 'punto fuera' }), ' ', !participante.conectado
                                                ? 'Desconectado'
                                                : sala.estado === 'esperando'
                                                    ? 'Conectado'
                                                    : respondio
                                                        ? 'Respondió'
                                                        : 'Esperando', sala.estado !== 'esperando' ? ` · ${participante.puntaje} pts` : ''] })] })] }, participante.id));
                }) })), sala.canal === 'simulado' ? (_jsx("button", { className: "boton-fantasma", type: "button", onClick: () => {
                    cliente.desconectar();
                    setConexion('desconectado');
                    setError('Conexión simulada interrumpida.');
                }, children: "Simular desconexi\u00F3n" })) : null] }));
}
