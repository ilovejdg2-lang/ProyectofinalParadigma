import { jsx as _jsx } from "react/jsx-runtime";
import { createContext, useContext, useEffect, useState } from 'react';
import { useServicios } from './ProveedorServicios.tsx';
const CLAVE_TOKEN = 'profelink.token';
const ContextoAutenticacion = createContext(null);
export function ProveedorAutenticacion({ children }) {
    const { autenticacion } = useServicios();
    const guardadoInicial = sessionStorage.getItem(CLAVE_TOKEN);
    const [perfil, setPerfil] = useState(null);
    const [token, setToken] = useState(guardadoInicial);
    const [listo, setListo] = useState(guardadoInicial === null);
    useEffect(() => {
        const guardado = sessionStorage.getItem(CLAVE_TOKEN);
        if (!guardado)
            return;
        let activo = true;
        autenticacion
            .sesionActual(guardado)
            .then((sesion) => {
            if (!activo)
                return;
            if (!sesion) {
                sessionStorage.removeItem(CLAVE_TOKEN);
                setPerfil(null);
                setToken(null);
                return;
            }
            setPerfil(sesion.perfil);
            setToken(sesion.token);
        })
            .catch(() => {
            if (!activo)
                return;
            sessionStorage.removeItem(CLAVE_TOKEN);
            setPerfil(null);
            setToken(null);
        })
            .finally(() => {
            if (activo)
                setListo(true);
        });
        return () => {
            activo = false;
        };
    }, [autenticacion]);
    const valor = {
        perfil,
        token,
        listo,
        entrar(sesion) {
            sessionStorage.setItem(CLAVE_TOKEN, sesion.token);
            setToken(sesion.token);
            setPerfil(sesion.perfil);
        },
        async salir() {
            if (token)
                await autenticacion.cerrarSesion(token);
            sessionStorage.removeItem(CLAVE_TOKEN);
            setToken(null);
            setPerfil(null);
        },
    };
    return _jsx(ContextoAutenticacion.Provider, { value: valor, children: children });
}
export function useAutenticacion() {
    const valor = useContext(ContextoAutenticacion);
    if (!valor)
        throw new Error('La autenticación de la interfaz no está disponible.');
    return valor;
}
