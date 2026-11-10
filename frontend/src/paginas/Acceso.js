import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Buho } from '../componentes/Buho.tsx';
import { Particulas } from '../componentes/Particulas.tsx';
import { useAutenticacion } from '../contexto/ProveedorAutenticacion.tsx';
import { useServicios } from '../contexto/ProveedorServicios.tsx';
import { CONTRASENA_DEMO, CORREO_DEMO } from '../datos/demostracion.ts';
import { mensajeDe } from '../dominio/errores.ts';
import { codigoDeInvitacion } from '../componentes/CodigoQr.tsx';
import { validarAcceso } from '../dominio/validacion.ts';
export function InicioSesion() {
    return _jsx(FormularioAcceso, { registro: false });
}
export function Registro() {
    return _jsx(FormularioAcceso, { registro: true });
}
function FormularioAcceso({ registro }) {
    const { autenticacion, simulacion } = useServicios();
    const { perfil, entrar } = useAutenticacion();
    const navegar = useNavigate();
    const ubicacion = useLocation();
    const destino = ubicacion.state?.desde ?? '/';
    const codigoInvitacion = codigoDeInvitacion(destino);
    const [nombre, setNombre] = useState('');
    const [correo, setCorreo] = useState('');
    const [contrasena, setContrasena] = useState('');
    const [verContrasena, setVerContrasena] = useState(false);
    const [errores, setErrores] = useState([]);
    const [enviando, setEnviando] = useState(false);
    const [recuperar, setRecuperar] = useState(false);
    if (perfil)
        return _jsx(Navigate, { to: destino, replace: true });
    async function enviar(evento) {
        evento.preventDefault();
        const validacion = validarAcceso({ nombre, correo, contrasena, registro });
        setErrores(validacion);
        if (validacion.length > 0)
            return;
        setEnviando(true);
        try {
            const sesion = registro
                ? await autenticacion.registrar({ nombre, correo, contrasena })
                : await autenticacion.iniciarSesion(correo, contrasena);
            entrar(sesion);
            navegar(destino, { replace: true });
        }
        catch (error) {
            setErrores([mensajeDe(error)]);
        }
        finally {
            setEnviando(false);
        }
    }
    return (_jsxs("main", { className: "acceso", children: [_jsx("section", { className: "acceso-panel", children: _jsxs("form", { className: "acceso-formulario", onSubmit: (evento) => void enviar(evento), children: [_jsxs("div", { className: "acceso-marca", children: [_jsx("span", { className: "acceso-logo", children: _jsx(Buho, { tamano: 72 }) }), _jsx("strong", { children: "ProfeLink" }), _jsx("p", { children: "Tu lugar seguro para aprender" })] }), _jsx("h1", { children: registro ? 'Crea tu cuenta' : 'Bienvenido de vuelta' }), _jsx("p", { className: "acceso-ayuda", children: codigoInvitacion
                                ? registro
                                    ? `Crea tu cuenta para entrar a la partida ${codigoInvitacion}. No necesitas escribir el código.`
                                    : `Inicia sesión para entrar a la partida ${codigoInvitacion}. No necesitas escribir el código.`
                                : registro
                                    ? 'Registra tu perfil para crear cuestionarios y jugar.'
                                    : 'Inicia sesión para acceder a tu cuenta' }), registro ? (_jsxs("label", { className: "acceso-campo", children: [_jsx("span", { children: "Nombre" }), _jsx("input", { value: nombre, onChange: (evento) => setNombre(evento.target.value) })] })) : null, _jsxs("label", { className: "acceso-campo", children: [_jsx("span", { children: "Correo electr\u00F3nico" }), _jsxs("span", { className: "acceso-input", children: [_jsx(IconoSobre, {}), _jsx("input", { type: "email", value: correo, onChange: (evento) => setCorreo(evento.target.value) })] })] }), _jsxs("label", { className: "acceso-campo", children: [_jsx("span", { children: "Contrase\u00F1a" }), _jsxs("span", { className: "acceso-input", children: [_jsx(IconoCandado, {}), _jsx("input", { type: verContrasena ? 'text' : 'password', value: contrasena, onChange: (evento) => setContrasena(evento.target.value) }), _jsx("button", { className: "acceso-ojo", type: "button", "aria-label": verContrasena ? 'Ocultar contraseña' : 'Mostrar contraseña', onClick: () => setVerContrasena((valor) => !valor), children: _jsx(IconoOjo, {}) })] })] }), errores.length > 0 ? (_jsx("ul", { className: "lista-errores acceso-errores", children: errores.map((error) => (_jsx("li", { children: error }, error))) })) : null, _jsx("button", { className: "acceso-enviar", type: "submit", disabled: enviando, children: registro ? 'Crear cuenta' : 'Iniciar Sesión' }), registro ? null : (_jsx("button", { className: "acceso-olvido", type: "button", onClick: () => setRecuperar(true), children: "\u00BFOlvidaste tu contrase\u00F1a?" })), _jsx("p", { className: "acceso-cambio", children: registro ? (_jsx(Link, { to: "/iniciar-sesion", state: { desde: destino }, children: "Ya tengo cuenta" })) : (_jsxs(_Fragment, { children: ["\u00BFA\u00FAn no tienes cuenta? ", _jsx(Link, { to: "/registro", state: { desde: destino }, children: "Crea tu cuenta gratis \u2192" })] })) }), simulacion ? (_jsxs("p", { className: "etiqueta-demo", children: ["Cuenta de prueba: ", CORREO_DEMO, " / ", CONTRASENA_DEMO] })) : null] }) }), _jsxs("aside", { className: "acceso-hero", "aria-hidden": "true", children: [_jsx(Particulas, { densidad: 32 }), _jsxs("div", { className: "acceso-burbuja", children: [_jsx("span", { className: "acceso-avatar", children: _jsx(Buho, { tamano: 168 }) }), _jsxs("div", { className: "acceso-globo", children: [_jsxs("strong", { children: ["\u00A1Muy bien! ", _jsx("span", { children: "\u00A1Empecemos!" })] }), _jsx("p", { children: "Listo para ayudarte con la clase." })] })] })] }), _jsx(DialogoRecuperacion, { abierto: recuperar, correoInicial: correo, onCerrar: () => setRecuperar(false) })] }));
}
function DialogoRecuperacion({ abierto, correoInicial, onCerrar, }) {
    const { autenticacion } = useServicios();
    const [paso, setPaso] = useState('correo');
    const [correo, setCorreo] = useState(correoInicial);
    const [codigo, setCodigo] = useState('');
    const [nueva, setNueva] = useState('');
    const [confirmar, setConfirmar] = useState('');
    const [mensaje, setMensaje] = useState('');
    const [error, setError] = useState('');
    const [enviando, setEnviando] = useState(false);
    useEffect(() => {
        if (!abierto)
            return;
        setPaso('correo');
        setCorreo(correoInicial);
        setCodigo('');
        setNueva('');
        setConfirmar('');
        setMensaje('');
        setError('');
        setEnviando(false);
    }, [abierto, correoInicial]);
    useEffect(() => {
        if (!abierto)
            return;
        function alTeclado(evento) {
            if (evento.key === 'Escape')
                onCerrar();
        }
        window.addEventListener('keydown', alTeclado);
        return () => window.removeEventListener('keydown', alTeclado);
    }, [abierto, onCerrar]);
    if (!abierto)
        return null;
    async function solicitar(evento) {
        evento.preventDefault();
        const correoLimpio = correo.trim().toLowerCase();
        if (!correoLimpio.includes('@')) {
            setError('Escribe un correo válido.');
            return;
        }
        setEnviando(true);
        setError('');
        try {
            const respuesta = await autenticacion.solicitarRecuperacion(correoLimpio);
            setMensaje(respuesta.mensaje);
            if (respuesta.codigo)
                setCodigo(respuesta.codigo);
            setPaso('codigo');
        }
        catch (err) {
            setError(mensajeDe(err));
        }
        finally {
            setEnviando(false);
        }
    }
    async function restablecer(evento) {
        evento.preventDefault();
        if (!codigo.trim()) {
            setError('Escribe el código de recuperación.');
            return;
        }
        if (nueva.length < 8) {
            setError('La nueva contraseña debe tener al menos 8 caracteres.');
            return;
        }
        if (nueva !== confirmar) {
            setError('Las contraseñas no coinciden.');
            return;
        }
        setEnviando(true);
        setError('');
        try {
            await autenticacion.restablecerContrasena(codigo.trim(), nueva);
            onCerrar();
        }
        catch (err) {
            setError(mensajeDe(err));
        }
        finally {
            setEnviando(false);
        }
    }
    return (_jsx("div", { className: "dialogo", role: "dialog", "aria-modal": "true", "aria-labelledby": "titulo-recuperacion", children: _jsxs("div", { className: "panel", children: [_jsx("h2", { id: "titulo-recuperacion", children: "Recuperar contrase\u00F1a" }), paso === 'correo' ? (_jsxs("form", { className: "acceso-formulario", onSubmit: (evento) => void solicitar(evento), children: [_jsx("p", { className: "acceso-ayuda", children: "Te daremos un c\u00F3digo para definir una nueva contrase\u00F1a." }), _jsxs("label", { className: "acceso-campo", children: [_jsx("span", { children: "Correo electr\u00F3nico" }), _jsx("input", { type: "email", value: correo, onChange: (evento) => setCorreo(evento.target.value), autoFocus: true })] }), error ? _jsx("p", { className: "lista-errores", children: error }) : null, _jsxs("div", { className: "acciones", children: [_jsx("button", { className: "boton-fantasma", type: "button", onClick: onCerrar, children: "Volver" }), _jsx("button", { className: "boton", type: "submit", disabled: enviando, children: "Continuar" })] })] })) : (_jsxs("form", { className: "acceso-formulario", onSubmit: (evento) => void restablecer(evento), children: [_jsx("p", { className: "acceso-ayuda", children: mensaje }), _jsxs("label", { className: "acceso-campo", children: [_jsx("span", { children: "C\u00F3digo de recuperaci\u00F3n" }), _jsx("input", { value: codigo, onChange: (evento) => setCodigo(evento.target.value), autoFocus: true })] }), _jsxs("label", { className: "acceso-campo", children: [_jsx("span", { children: "Nueva contrase\u00F1a" }), _jsx("input", { type: "password", value: nueva, onChange: (evento) => setNueva(evento.target.value) })] }), _jsxs("label", { className: "acceso-campo", children: [_jsx("span", { children: "Confirmar contrase\u00F1a" }), _jsx("input", { type: "password", value: confirmar, onChange: (evento) => setConfirmar(evento.target.value) })] }), error ? _jsx("p", { className: "lista-errores", children: error }) : null, _jsxs("div", { className: "acciones", children: [_jsx("button", { className: "boton-fantasma", type: "button", onClick: () => setPaso('correo'), children: "Volver" }), _jsx("button", { className: "boton", type: "submit", disabled: enviando, children: "Guardar contrase\u00F1a" })] })] }))] }) }));
}
function IconoSobre() {
    return (_jsxs("svg", { viewBox: "0 0 24 24", "aria-hidden": "true", children: [_jsx("rect", { x: "3", y: "5", width: "18", height: "14", rx: "2", fill: "none", stroke: "currentColor", strokeWidth: "1.8" }), _jsx("path", { d: "M4 7l8 6 8-6", fill: "none", stroke: "currentColor", strokeWidth: "1.8" })] }));
}
function IconoCandado() {
    return (_jsxs("svg", { viewBox: "0 0 24 24", "aria-hidden": "true", children: [_jsx("rect", { x: "5", y: "10", width: "14", height: "10", rx: "2", fill: "none", stroke: "currentColor", strokeWidth: "1.8" }), _jsx("path", { d: "M8 10V7a4 4 0 0 1 8 0v3", fill: "none", stroke: "currentColor", strokeWidth: "1.8" })] }));
}
function IconoOjo() {
    return (_jsxs("svg", { viewBox: "0 0 24 24", "aria-hidden": "true", children: [_jsx("path", { d: "M2 12s4-6 10-6 10 6 10 6-4 6-10 6S2 12 2 12z", fill: "none", stroke: "currentColor", strokeWidth: "1.8" }), _jsx("circle", { cx: "12", cy: "12", r: "2.5", fill: "none", stroke: "currentColor", strokeWidth: "1.8" })] }));
}
