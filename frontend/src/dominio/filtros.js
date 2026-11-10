export function acentoDeDificultad(dificultad) {
    if (dificultad === 'facil')
        return 'verde';
    if (dificultad === 'dificil')
        return 'naranja';
    return 'azul';
}
export function etiquetaDificultad(dificultad) {
    if (dificultad === 'facil')
        return 'Fácil';
    if (dificultad === 'dificil')
        return 'Difícil';
    return 'Medio';
}
export function filtrarCuestionarios(lista, filtros) {
    const texto = filtros.texto.trim().toLowerCase();
    return lista.filter((item) => {
        const contenido = [item.titulo, item.descripcion, item.autorNombre, item.categoria, ...item.etiquetas]
            .join(' ')
            .toLowerCase();
        const coincideTexto = texto.length === 0 || contenido.includes(texto);
        const coincideCategoria = !filtros.categoria || item.categoria === filtros.categoria;
        const coincideDificultad = !filtros.dificultad || item.dificultad === filtros.dificultad;
        const coincideAutor = !filtros.autor || item.autorNombre === filtros.autor;
        return coincideTexto && coincideCategoria && coincideDificultad && coincideAutor;
    });
}
export function ordenarClasificacion(participantes) {
    return [...participantes].sort((a, b) => b.puntaje - a.puntaje || b.aciertos - a.aciertos || a.nombre.localeCompare(b.nombre, 'es'));
}
