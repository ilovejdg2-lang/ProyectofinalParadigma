export function opcionesDe(pregunta) {
    if (pregunta.opciones && pregunta.opciones.length >= 2) {
        return pregunta.opciones.map((opcion) => ({ ...opcion }));
    }
    return [
        { id: `${pregunta.id}:verdadero`, texto: 'Verdadero', correcta: pregunta.respuestaCorrecta === true },
        { id: `${pregunta.id}:falso`, texto: 'Falso', correcta: pregunta.respuestaCorrecta === false },
    ];
}
export function textoCorrecto(pregunta) {
    return opcionesDe(pregunta).find((opcion) => opcion.correcta)?.texto ?? 'Sin elegir';
}
