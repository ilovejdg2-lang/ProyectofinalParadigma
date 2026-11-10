import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { EstadoCarga, EstadoError, EstadoVacio } from '../componentes/Interfaz.tsx';
import { useServicios } from '../contexto/ProveedorServicios.tsx';
import { mensajeDe } from '../dominio/errores.ts';
import { filtrarCuestionarios } from '../dominio/filtros.ts';
import { TarjetaCuestionario } from './TarjetaCuestionario.tsx';
export function Descubrir() {
    const { actividades } = useServicios();
    const [cuestionarios, setCuestionarios] = useState([]);
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState(null);
    const [texto, setTexto] = useState('');
    const [categoria, setCategoria] = useState('');
    const [dificultad, setDificultad] = useState('');
    const [autor, setAutor] = useState('');
    function cargar() {
        setCargando(true);
        actividades
            .listar()
            .then((lista) => {
            setCuestionarios(lista);
            setError(null);
        })
            .catch((err) => setError(mensajeDe(err)))
            .finally(() => setCargando(false));
    }
    useEffect(() => {
        cargar();
    }, [actividades]);
    const visibles = filtrarCuestionarios(cuestionarios, { texto, categoria, dificultad, autor });
    const categorias = [...new Set(cuestionarios.map((item) => item.categoria))];
    const autores = [...new Set(cuestionarios.map((item) => item.autorNombre))];
    return (_jsxs(_Fragment, { children: [_jsx("header", { className: "encabezado-pagina", children: _jsxs("div", { children: [_jsx("h1", { children: "Descubrir" }), _jsx("p", { children: "Elige un cuestionario y \u00E1brelo para jugar como anfitri\u00F3n." })] }) }), _jsx("div", { className: "descubrir-busca", children: _jsx("input", { className: "buscador", placeholder: "Buscar un cuestionario...", value: texto, onChange: (evento) => setTexto(evento.target.value), "aria-label": "Buscar un cuestionario" }) }), _jsxs("div", { className: "filtros", children: [_jsxs("select", { className: "seleccion", "aria-label": "Categor\u00EDa", value: categoria, onChange: (evento) => setCategoria(evento.target.value), children: [_jsx("option", { value: "", children: "Todas las categor\u00EDas" }), categorias.map((item) => (_jsx("option", { children: item }, item)))] }), _jsxs("select", { className: "seleccion", "aria-label": "Dificultad", value: dificultad, onChange: (evento) => setDificultad(evento.target.value), children: [_jsx("option", { value: "", children: "Cualquier dificultad" }), _jsx("option", { value: "facil", children: "F\u00E1cil" }), _jsx("option", { value: "medio", children: "Medio" }), _jsx("option", { value: "dificil", children: "Dif\u00EDcil" })] }), _jsxs("select", { className: "seleccion", "aria-label": "Autor", value: autor, onChange: (evento) => setAutor(evento.target.value), children: [_jsx("option", { value: "", children: "Cualquier autor" }), autores.map((item) => (_jsx("option", { children: item }, item)))] })] }), cargando ? _jsx(EstadoCarga, {}) : null, error ? _jsx(EstadoError, { mensaje: error, onReintentar: cargar }) : null, !cargando && !error && visibles.length === 0 ? (_jsx(EstadoVacio, { titulo: "No hay cuestionarios para esta b\u00FAsqueda", detalle: "Prueba con otro texto o quita un filtro." })) : null, _jsx("div", { className: "rejilla rejilla-descubrir", children: visibles.map((cuestionario) => (_jsx(TarjetaCuestionario, { cuestionario: cuestionario }, cuestionario.id))) }), _jsxs("p", { className: "meta", children: ["\u00BFNo encuentras el tuyo? ", _jsx(Link, { to: "/cuestionarios/nuevo", children: "Crear cuestionario" })] })] }));
}
