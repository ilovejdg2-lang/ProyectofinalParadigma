import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { Buho } from '../componentes/Buho.tsx';
import { useAutenticacion } from '../contexto/ProveedorAutenticacion.tsx';
import { AVATARES, Avatar, avatarValido } from './avatares.tsx';
import { CasillasCodigo, LONGITUD_CODIGO } from './CasillasCodigo.tsx';
import { FondoJuego } from './FondoJuego.tsx';
export function FlujoIngreso({ codigoInicial = '', enviando, error, onEntrar, }) {
    const { perfil } = useAutenticacion();
    const [paso, setPaso] = useState(codigoInicial ? 'avatar' : 'codigo');
    const [codigo, setCodigo] = useState(codigoInicial.toUpperCase());
    const [avatarId, setAvatarId] = useState('robot');
    const [nombre, setNombre] = useState(perfil?.nombre ?? '');
    useEffect(() => {
        if (perfil?.nombre)
            setNombre((actual) => actual || perfil.nombre);
    }, [perfil]);
    const [local, setLocal] = useState(null);
    const aviso = local ?? error;
    const personaje = AVATARES.find((item) => item.id === avatarId) ?? AVATARES[0];
    function continuarCodigo(evento) {
        evento.preventDefault();
        if (codigo.trim().length < LONGITUD_CODIGO) {
            setLocal('El código de la sala tiene 6 caracteres.');
            return;
        }
        setLocal(null);
        setPaso('avatar');
    }
    function continuarAvatar() {
        if (!avatarValido(avatarId)) {
            setLocal('Elige un personaje de la lista.');
            return;
        }
        setLocal(null);
        setPaso('nombre');
    }
    function confirmar(evento) {
        evento.preventDefault();
        const limpio = nombre.trim();
        if (limpio.length < 2 || limpio.length > 24) {
            setLocal('El nombre debe tener entre 2 y 24 caracteres.');
            return;
        }
        setLocal(null);
        onEntrar(codigo.trim().toUpperCase(), { nombre: limpio, avatarId });
    }
    return (_jsxs("main", { className: "ingreso-partida", children: [_jsx(FondoJuego, {}), _jsxs("section", { className: "ingreso-tarjeta", children: [_jsxs("div", { className: "ingreso-marca", children: [_jsx(Buho, { tamano: 36 }), _jsx("strong", { children: "ProfeLink" })] }), _jsxs("ol", { className: "ingreso-pasos", "aria-label": "Progreso", children: [_jsx("li", { className: paso === 'codigo' ? 'actual' : 'hecho', children: "1 C\u00F3digo" }), _jsx("li", { className: paso === 'avatar' ? 'actual' : paso === 'nombre' ? 'hecho' : '', children: "2 Avatar" }), _jsx("li", { className: paso === 'nombre' ? 'actual' : '', children: "3 Nombre" })] }), paso === 'codigo' ? (_jsxs("form", { onSubmit: continuarCodigo, children: [_jsx("h1", { children: "\u00A1\u00DAnete a una partida!" }), _jsx("p", { children: "Ingresa el c\u00F3digo de la sala que te comparti\u00F3 tu docente." }), _jsx(CasillasCodigo, { valor: codigo, onChange: setCodigo, disabled: enviando }), aviso ? _jsx("p", { className: "error-texto", role: "alert", children: aviso }) : null, _jsx("button", { className: "boton boton-jugar", type: "submit", children: "Entrar a la sala \u2192" })] })) : null, paso === 'avatar' ? (_jsxs("div", { children: [_jsx("h1", { children: "Elige tu avatar" }), _jsx("p", { children: "Personaliza tu personaje para la partida." }), _jsx("div", { className: "rejilla-avatares", children: AVATARES.map((item) => (_jsxs("button", { type: "button", className: item.id === avatarId ? 'avatar-opcion elegido' : 'avatar-opcion', "aria-pressed": item.id === avatarId, "aria-label": item.nombre, onClick: () => setAvatarId(item.id), children: [_jsx(Avatar, { id: item.id, tamano: 64 }), item.id === avatarId ? _jsx("span", { className: "avatar-check", children: "\u2713" }) : null] }, item.id))) }), aviso ? _jsx("p", { className: "error-texto", role: "alert", children: aviso }) : null, _jsx("button", { className: "boton boton-jugar", type: "button", onClick: continuarAvatar, children: "Continuar \u2192" })] })) : null, paso === 'nombre' ? (_jsxs("form", { onSubmit: confirmar, children: [_jsx("div", { className: "avatar-hero", children: _jsx(Avatar, { id: avatarId, tamano: 120 }) }), _jsx("h1", { children: "\u00BFC\u00F3mo te llamas?" }), _jsxs("p", { children: ["Este ser\u00E1 tu nombre en la partida. ", personaje.nombre, " te representa."] }), _jsxs("label", { className: "campo-grupo", children: [_jsx("span", { children: "Nombre" }), _jsx("input", { className: "campo", value: nombre, maxLength: 24, onChange: (evento) => setNombre(evento.target.value) })] }), aviso ? _jsx("p", { className: "error-texto", role: "alert", children: aviso }) : null, _jsx("button", { className: "boton boton-jugar", type: "submit", disabled: enviando, children: enviando ? 'Entrando…' : '¡Listo!' })] })) : null] })] }));
}
