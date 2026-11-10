import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { EstadoCarga, EstadoError } from '../componentes/Interfaz.tsx';
import { Podio } from '../componentes/Podio.tsx';
import { ControlesAudio } from '../juego/ControlesAudio.tsx';
import { FondoJuego } from '../juego/FondoJuego.tsx';
import { useAutenticacion } from '../contexto/ProveedorAutenticacion.tsx';
import { useServicios } from '../contexto/ProveedorServicios.tsx';
import { mensajeDe } from '../dominio/errores.ts';
import { ordenarClasificacion } from '../dominio/filtros.ts';
export function Resultados() {
    const { codigo = '' } = useParams();
    const { sala } = useServicios();
    const { token, perfil } = useAutenticacion();
    const [resultado, setResultado] = useState(null);
    const [error, setError] = useState(null);
    function cargar() {
        if (!token)
            return;
        sala
            .obtenerResultado(token, codigo)
            .then((dato) => {
            setResultado(dato);
            setError(null);
        })
            .catch((err) => setError(mensajeDe(err)));
    }
    useEffect(() => {
        cargar();
    }, [codigo, sala, token]);
    if (error)
        return _jsx(EstadoError, { mensaje: error, onReintentar: cargar });
    if (!resultado)
        return _jsx(EstadoCarga, { texto: "Cargando resultados\u2026" });
    const orden = ordenarClasificacion(resultado.participantes);
    const mio = orden.find((participante) => participante.perfilId === perfil?.id);
    const puesto = mio ? orden.indexOf(mio) + 1 : null;
    return (_jsxs("section", { className: "escenario", children: [_jsx(FondoJuego, {}), _jsx(ControlesAudio, { paisaje: "victoria" }), _jsx("header", { className: "encabezado-pagina", children: _jsxs("div", { children: [_jsx("h1", { children: resultado.titulo }), _jsxs("p", { children: ["Clasificaci\u00F3n de la sesi\u00F3n ", resultado.codigo, ". El puntaje lo informa el servicio: 1 por acierto y 0 por error o falta de respuesta."] })] }) }), puesto && mio ? (_jsxs("article", { className: "panel", children: [_jsxs("p", { children: ["Tu puesto: ", puesto] }), _jsxs("p", { children: [mio.puntaje, " puntos \u00B7 ", mio.aciertos, " aciertos"] })] })) : null, _jsx(Podio, { participantes: orden, perfilId: perfil?.id }), _jsxs("div", { className: "acciones", children: [_jsx(Link, { className: "boton", to: "/", children: "Volver al inicio" }), _jsx(Link, { className: "boton-fantasma", to: "/historial", children: "Ver historial" })] })] }));
}
