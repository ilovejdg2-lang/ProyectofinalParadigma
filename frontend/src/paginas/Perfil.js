import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { useAutenticacion } from '../contexto/ProveedorAutenticacion.tsx';
import { useServicios } from '../contexto/ProveedorServicios.tsx';
import { mensajeDe } from '../dominio/errores.ts';
export function Perfil() {
    const { autenticacion } = useServicios();
    const { perfil, token, salir } = useAutenticacion();
    const esDocente = perfil?.rol === 'teacher' || perfil?.rol === 'admin';
    const rolEtiqueta = perfil?.rol === 'admin' ? 'Administrador' : esDocente ? 'Docente' : 'Estudiante';
    const [contrasenaActual, setContrasenaActual] = useState('');
    const [nuevaContrasena, setNuevaContrasena] = useState('');
    const [confirmarContrasena, setConfirmarContrasena] = useState('');
    const [guardando, setGuardando] = useState(false);
    const [mensajeExito, setMensajeExito] = useState(null);
    const [error, setError] = useState(null);
    async function manejarCambioPassword(evento) {
        evento.preventDefault();
        setError(null);
        setMensajeExito(null);
        if (!contrasenaActual) {
            setError('Debes ingresar tu contraseña actual.');
            return;
        }
        if (nuevaContrasena.length < 8) {
            setError('La nueva contraseña debe tener al menos 8 caracteres.');
            return;
        }
        if (nuevaContrasena !== confirmarContrasena) {
            setError('La nueva contraseña y su confirmación no coinciden.');
            return;
        }
        if (!token) {
            setError('No hay una sesión activa para realizar esta acción.');
            return;
        }
        setGuardando(true);
        try {
            await autenticacion.cambiarContrasena(token, contrasenaActual, nuevaContrasena);
            setMensajeExito('¡Contraseña actualizada correctamente!');
            setContrasenaActual('');
            setNuevaContrasena('');
            setConfirmarContrasena('');
        }
        catch (err) {
            setError(mensajeDe(err));
        }
        finally {
            setGuardando(false);
        }
    }
    return (_jsxs("div", { className: "perfil-rejilla", children: [_jsxs("section", { className: "perfil-tarjeta", style: { display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }, children: [_jsxs("div", { children: [_jsx("h1", { style: { margin: '0 0 0.5rem', fontSize: '1.6rem' }, children: "Perfil de Usuario" }), _jsx("p", { style: { margin: '0 0 1.5rem', color: 'var(--suave)', fontSize: '0.92rem' }, children: "Informaci\u00F3n de tu identidad y credenciales en ProfeLink." }), _jsxs("div", { style: { display: 'flex', flexDirection: 'column', gap: '1rem' }, children: [_jsxs("div", { children: [_jsx("span", { className: "perfil-kicker", children: "Nombre completo" }), _jsx("p", { className: "perfil-valor", children: perfil?.nombre })] }), _jsxs("div", { children: [_jsx("span", { className: "perfil-kicker", children: "Correo electr\u00F3nico" }), _jsx("p", { className: "perfil-correo", children: perfil?.correo })] }), _jsxs("div", { children: [_jsx("span", { className: "perfil-kicker", children: "Rol institucional" }), _jsx("div", { style: { marginTop: '0.35rem' }, children: _jsxs("span", { style: {
                                                        display: 'inline-flex',
                                                        alignItems: 'center',
                                                        gap: '0.4rem',
                                                        padding: '0.35rem 0.85rem',
                                                        borderRadius: '9999px',
                                                        fontSize: '0.85rem',
                                                        fontWeight: 700,
                                                        background: esDocente ? 'rgba(56, 189, 248, 0.15)' : 'rgba(52, 211, 153, 0.15)',
                                                        color: esDocente ? '#38bdf8' : '#34d399',
                                                        border: `1px solid ${esDocente ? 'rgba(56, 189, 248, 0.4)' : 'rgba(52, 211, 153, 0.4)'}`,
                                                    }, children: [_jsx("span", { style: {
                                                                width: '8px',
                                                                height: '8px',
                                                                borderRadius: '50%',
                                                                background: esDocente ? '#38bdf8' : '#34d399',
                                                            } }), rolEtiqueta, " (", perfil?.rol ?? 'student', ")"] }) })] }), _jsxs("div", { children: [_jsx("span", { className: "perfil-kicker", children: "Permisos del sistema" }), _jsx("p", { className: "perfil-nota", children: esDocente
                                                    ? '✅ Diseñar cuestionarios, crear y editar preguntas V/F, iniciar salas de juego en vivo y moderar tableros de resultados.'
                                                    : '✅ Descubrir actividades públicas, ingresar a salas en vivo mediante PIN numérico, responder en tiempo real y consultar tu historial personal.' })] })] })] }), _jsxs("div", { style: { marginTop: '2rem', paddingTop: '1.25rem', borderTop: '1px solid var(--borde)' }, children: [_jsxs("p", { style: { margin: '0 0 1rem', fontSize: '0.8rem', color: 'var(--suave)' }, children: ["Autenticado criptogr\u00E1ficamente con tokens RS256 emitidos por ", _jsx("code", { children: "auth-service" }), "."] }), _jsx("button", { className: "boton-peligro", type: "button", onClick: () => void salir(), children: "Cerrar sesi\u00F3n" })] })] }), _jsxs("section", { className: "perfil-tarjeta", children: [_jsx("h2", { style: { margin: '0 0 0.5rem', fontSize: '1.4rem' }, children: "Seguridad de la Cuenta" }), _jsx("p", { style: { margin: '0 0 1.5rem', color: 'var(--suave)', fontSize: '0.92rem' }, children: "Actualiza tu contrase\u00F1a peri\u00F3dicamente. Se verificar\u00E1 tu clave actual antes de aplicar el cambio." }), mensajeExito && (_jsxs("div", { style: {
                            padding: '0.85rem 1rem',
                            marginBottom: '1.2rem',
                            borderRadius: '10px',
                            background: 'rgba(52, 211, 153, 0.15)',
                            border: '1px solid rgba(52, 211, 153, 0.35)',
                            color: '#34d399',
                            fontSize: '0.9rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                        }, children: [_jsx("span", { children: "\u2713" }), " ", mensajeExito] })), error && (_jsxs("div", { style: {
                            padding: '0.85rem 1rem',
                            marginBottom: '1.2rem',
                            borderRadius: '10px',
                            background: 'rgba(244, 63, 94, 0.15)',
                            border: '1px solid rgba(244, 63, 94, 0.35)',
                            color: '#f87171',
                            fontSize: '0.9rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                        }, children: [_jsx("span", { children: "\u26A0" }), " ", error] })), _jsxs("form", { onSubmit: (e) => void manejarCambioPassword(e), style: { display: 'grid', gap: '1.1rem' }, children: [_jsxs("div", { children: [_jsx("label", { htmlFor: "contrasena-actual", className: "perfil-ayuda", children: "Contrase\u00F1a actual" }), _jsx("input", { id: "contrasena-actual", type: "password", className: "campo", placeholder: "Ingresa tu clave actual", value: contrasenaActual, onChange: (e) => setContrasenaActual(e.target.value), required: true })] }), _jsxs("div", { children: [_jsx("label", { htmlFor: "nueva-contrasena", className: "perfil-ayuda", children: "Nueva contrase\u00F1a" }), _jsx("input", { id: "nueva-contrasena", type: "password", className: "campo", placeholder: "M\u00EDnimo 8 caracteres", value: nuevaContrasena, onChange: (e) => setNuevaContrasena(e.target.value), minLength: 8, required: true }), _jsx("span", { style: { fontSize: '0.78rem', color: 'var(--suave)', marginTop: '0.25rem', display: 'block' }, children: "Debe contener al menos 8 caracteres." })] }), _jsxs("div", { children: [_jsx("label", { htmlFor: "confirmar-contrasena", className: "perfil-ayuda", children: "Confirmar nueva contrase\u00F1a" }), _jsx("input", { id: "confirmar-contrasena", type: "password", className: "campo", placeholder: "Repite la nueva clave", value: confirmarContrasena, onChange: (e) => setConfirmarContrasena(e.target.value), minLength: 8, required: true })] }), _jsx("div", { style: { marginTop: '0.5rem' }, children: _jsx("button", { className: "boton", type: "submit", disabled: guardando, style: { width: '100%' }, children: guardando ? 'Actualizando contraseña...' : 'Cambiar Contraseña' }) })] })] })] }));
}
