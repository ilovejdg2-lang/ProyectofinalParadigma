import { jsx as _jsx } from "react/jsx-runtime";
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAutenticacion } from '../contexto/ProveedorAutenticacion.tsx';
import { useServicios } from '../contexto/ProveedorServicios.tsx';
import { mensajeDe } from '../dominio/errores.ts';
import { avatarValido, guardarFichaLocal } from '../juego/avatares.tsx';
import { FlujoIngreso } from '../juego/FlujoIngreso.tsx';
export function Unirse() {
    const { sala } = useServicios();
    const { token, perfil } = useAutenticacion();
    const navegar = useNavigate();
    const [error, setError] = useState(null);
    const [enviando, setEnviando] = useState(false);
    async function entrar(codigo, ficha) {
        if (!token || !perfil)
            return;
        setEnviando(true);
        try {
            if (avatarValido(ficha.avatarId))
                guardarFichaLocal(perfil.id, ficha.avatarId);
            const encontrada = await sala.unirse(token, codigo, ficha);
            const destino = encontrada.anfitrionId === perfil.id ? `/sala/${encontrada.codigo}` : `/partida/${encontrada.codigo}`;
            navegar(destino);
        }
        catch (err) {
            setError(mensajeDe(err));
        }
        finally {
            setEnviando(false);
        }
    }
    return _jsx(FlujoIngreso, { enviando: enviando, error: error, onEntrar: (codigo, ficha) => void entrar(codigo, ficha) });
}
