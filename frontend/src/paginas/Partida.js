import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useRef, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { EstadoCarga, EstadoError } from '../componentes/Interfaz.tsx';
import { Podio } from '../componentes/Podio.tsx';
import { useAutenticacion } from '../contexto/ProveedorAutenticacion.tsx';
import { useServicios } from '../contexto/ProveedorServicios.tsx';
import { mensajeDe } from '../dominio/errores.ts';
import { textoCorrecto } from '../dominio/opciones.ts';
import { audio } from '../juego/audio.ts';
import { Avatar, avatarValido, avatarVisible, guardarFichaLocal } from '../juego/avatares.tsx';
import { ClasificacionRonda } from '../juego/ClasificacionRonda.tsx';
import { FlujoIngreso } from '../juego/FlujoIngreso.tsx';
import { ControlesAudio } from '../juego/ControlesAudio.tsx';
import { CuentaRegresiva } from '../juego/CuentaRegresiva.tsx';
import { FondoJuego } from '../juego/FondoJuego.tsx';
import { OpcionesJuego } from '../juego/OpcionesJuego.tsx';
import { cuentaActiva, paisajeDe } from '../juego/ronda.ts';
import { Temporizador } from '../juego/Temporizador.tsx';
import { useSala } from './useSala.ts';
export function Partida() {
    const { codigo = '' } = useParams();
    const { sala: cliente } = useServicios();
    const { token, perfil } = useAutenticacion();
    const { sala, error, cargando, conexion, recargar, setError } = useSala(codigo);
    const [enviando, setEnviando] = useState(false);
    const [uniendo, setUniendo] = useState(false);
    const [aviso, setAviso] = useState(null);
    const [ahora, setAhora] = useState(() => Date.now());
    const fase = useRef(null);
    useEffect(() => {
        const id = window.setInterval(() => setAhora(Date.now()), 200);
        return () => window.clearInterval(id);
    }, []);
    const marcaFase = sala ? `${sala.estado}:${sala.preguntaActual}` : '';
    useEffect(() => {
        if (!sala || !perfil)
            return;
        if (fase.current === marcaFase)
            return;
        const anterior = fase.current;
        fase.current = marcaFase;
        if (!anterior || sala.estado !== 'cerrada')
            return;
        const pregunta = sala.preguntas[sala.preguntaActual];
        const yo = sala.participantes.find((item) => item.perfilId === perfil.id);
        const respuesta = pregunta ? yo?.respuestas.find((item) => item.preguntaId === pregunta.id) : undefined;
        if (respuesta?.aceptada && respuesta.puntos > 0)
            audio.efecto('correcto');
        else if (respuesta?.aceptada)
            audio.efecto('incorrecto');
        window.setTimeout(() => audio.efecto('clasificacion'), 400);
    }, [marcaFase, perfil, sala]);
    if (cargando)
        return _jsx(EstadoCarga, { texto: "Entrando a la partida\u2026" });
    if (!sala)
        return _jsx(EstadoError, { mensaje: error ?? 'No se pudo entrar a la sala.', onReintentar: () => void recargar() });
    if (perfil && sala.anfitrionId === perfil.id)
        return _jsx(Navigate, { to: `/sala/${sala.codigo}`, replace: true });
    if (perfil && !sala.participantes.some((item) => item.perfilId === perfil.id)) {
        return (_jsx(FlujoIngreso, { codigoInicial: sala.codigo, enviando: uniendo, error: error, onEntrar: (_codigo, ficha) => void entrar(ficha) }));
    }
    const pregunta = sala.preguntas[sala.preguntaActual];
    const participante = sala.participantes.find((item) => item.perfilId === perfil?.id);
    const respuesta = pregunta
        ? participante?.respuestas.find((item) => item.preguntaId === pregunta.id && item.aceptada)
        : undefined;
    const enCuenta = cuentaActiva(sala, ahora);
    const restante = sala.cierraEn ? Math.max(0, new Date(sala.cierraEn).getTime() - ahora) : 0;
    const tiempoAgotado = sala.estado === 'pregunta' && !enCuenta && sala.cierraEn !== null && restante === 0;
    const bloqueada = Boolean(respuesta) || sala.estado !== 'pregunta' || enviando || tiempoAgotado || enCuenta;
    const paisaje = paisajeDe(sala, ahora, restante);
    const tension = paisaje === 'suspenso' && restante > 0 && restante <= 10_000;
    async function entrar(ficha) {
        if (!token || !perfil)
            return;
        setUniendo(true);
        try {
            if (avatarValido(ficha.avatarId))
                guardarFichaLocal(perfil.id, ficha.avatarId);
            await cliente.unirse(token, codigo, ficha);
            setError(null);
        }
        catch (err) {
            setError(mensajeDe(err));
        }
        finally {
            setUniendo(false);
        }
    }
    async function elegir(opcionId) {
        if (!token || bloqueada)
            return;
        void audio.desbloquear();
        setEnviando(true);
        try {
            await cliente.responder(token, sala.codigo, opcionId);
            audio.efecto('enviado');
            setAviso('Respuesta enviada. Espera a que el anfitrión avance.');
        }
        catch (err) {
            setAviso(mensajeDe(err));
        }
        finally {
            setEnviando(false);
        }
    }
    return (_jsxs("main", { className: "partida escenario", children: [_jsx(FondoJuego, {}), _jsxs("header", { className: "fila juego-barra", children: [_jsx("strong", { children: sala.titulo }), _jsxs("span", { className: "meta", children: ["C\u00F3digo ", sala.codigo] }), _jsx("span", { className: "meta", children: perfil?.nombre }), _jsx(ControlesAudio, { paisaje: paisaje, tension: tension }), _jsx(Link, { to: "/", children: "Salir" })] }), conexion !== 'conectado' || error ? (_jsx(EstadoError, { mensaje: error ?? 'Se perdió la conexión.', onReintentar: () => {
                    cliente.reconectar();
                    void recargar();
                } })) : null, sala.estado === 'esperando' ? (_jsxs("section", { className: "lobby-estudiante", children: [participante ? _jsx(Avatar, { id: avatarVisible(participante.perfilId, participante.avatarId), tamano: 120 }) : null, _jsx("h1", { children: "Esperando al docente" }), _jsxs("p", { children: [participante?.nombre, " \u00B7 ", sala.titulo] }), _jsx("p", { className: "codigo-sala", children: sala.codigo }), _jsxs("p", { "aria-live": "polite", children: [sala.participantes.length, " ", sala.participantes.length === 1 ? 'estudiante en la sala' : 'estudiantes en la sala'] })] })) : null, enCuenta && sala.abreEn ? _jsx(CuentaRegresiva, { abreEn: sala.abreEn, ahora: ahora }) : null, sala.estado === 'finalizada' ? (_jsxs("section", { className: "panel", children: [_jsx("h1", { children: "Partida terminada" }), _jsx(Podio, { participantes: sala.participantes, perfilId: perfil?.id }), _jsx(Link, { className: "boton", to: `/resultados/${sala.codigo}`, children: "Ver clasificaci\u00F3n" })] })) : null, pregunta && !enCuenta && (sala.estado === 'pregunta' || sala.estado === 'cerrada') ? (_jsxs("section", { className: "panel pregunta-estudiante", children: [_jsxs("p", { className: "meta", children: ["Pregunta ", sala.preguntaActual + 1, " de ", sala.preguntas.length] }), sala.estado === 'pregunta' ? _jsx(Temporizador, { restante: restante, total: sala.segundos, activo: true }) : null, _jsx("h1", { className: "enunciado", children: pregunta.enunciado }), pregunta.imagenUrl ? _jsx("img", { className: "vista-imagen", src: pregunta.imagenUrl, alt: "" }) : null, _jsx(OpcionesJuego, { pregunta: pregunta, elegida: respuesta?.opcionId, bloqueada: bloqueada, onElegir: (opcionId) => void elegir(opcionId) }), respuesta ? _jsx("p", { className: "confirmacion", role: "status", children: "Respuesta enviada. No puedes cambiarla." }) : null, tiempoAgotado && !respuesta ? _jsx("p", { role: "status", children: "El tiempo termin\u00F3. Si env\u00EDas ahora, la respuesta se rechaza." }) : null, sala.estado === 'cerrada' ? (_jsxs("div", { children: [(() => {
                                const puntos = participante?.respuestas.find((item) => item.preguntaId === pregunta.id)?.puntos ?? 0;
                                const acerto = puntos > 0;
                                return (_jsxs("div", { className: acerto ? 'feedback-ronda bien' : 'feedback-ronda mal', role: "status", children: [_jsx("strong", { children: acerto ? '¡Correcto!' : '¡Incorrecto!' }), _jsx("p", { children: acerto ? `Sumaste ${puntos} punto` : `La respuesta correcta es ${textoCorrecto(pregunta)}` }), _jsxs("p", { children: ["Tus puntos: ", participante?.puntaje ?? 0] })] }));
                            })(), _jsx(ClasificacionRonda, { participantes: sala.participantes, preguntaId: pregunta.id, perfilId: perfil?.id }), _jsx("p", { children: "Espera a que el anfitri\u00F3n avance." })] })) : null, aviso ? _jsx("p", { role: "status", children: aviso }) : null] })) : null] }));
}
