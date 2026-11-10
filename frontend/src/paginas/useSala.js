import { useCallback, useEffect, useState } from 'react';
import { useAutenticacion } from '../contexto/ProveedorAutenticacion.tsx';
import { useServicios } from '../contexto/ProveedorServicios.tsx';
import { mensajeDe } from '../dominio/errores.ts';
export function useSala(codigo) {
    const { sala: cliente } = useServicios();
    const { token } = useAutenticacion();
    const [sala, setSala] = useState(null);
    const [error, setError] = useState(null);
    const [cargando, setCargando] = useState(true);
    const [conexion, setConexion] = useState(cliente.estadoConexion());
    const recargar = useCallback(async () => {
        if (!token)
            return;
        try {
            const siguiente = await cliente.obtener(token, codigo);
            setSala(siguiente);
            setError(null);
            setConexion(cliente.estadoConexion());
        }
        catch (err) {
            setError(mensajeDe(err));
            setConexion(cliente.estadoConexion());
        }
        finally {
            setCargando(false);
        }
    }, [cliente, codigo, token]);
    useEffect(() => {
        void recargar();
        if (!token)
            return;
        return cliente.suscribir(codigo, token, (siguiente) => {
            setSala(siguiente);
            setError(null);
            setConexion('conectado');
        }, setConexion);
    }, [cliente, codigo, recargar, token]);
    useEffect(() => {
        const alVolver = () => {
            if (document.visibilityState === 'visible')
                void recargar();
        };
        document.addEventListener('visibilitychange', alVolver);
        window.addEventListener('online', alVolver);
        return () => {
            document.removeEventListener('visibilitychange', alVolver);
            window.removeEventListener('online', alVolver);
        };
    }, [recargar]);
    return { sala, error, cargando, conexion, recargar, setError, setConexion };
}
