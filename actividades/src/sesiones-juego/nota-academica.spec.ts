import { aciertosAcademicos, aportePorcentual, notaDeAciertos } from './nota-academica';
import type { PreguntaInstantanea } from './presentacion-sala';

const pregunta = (id: string, correcta: string): PreguntaInstantanea => ({
  id,
  enunciado: id,
  orden: 1,
  respuestaCorrecta: true,
  segundos: 20,
  opciones: [
    { id: correcta, texto: 'sí', orden: 1, correcta: true },
    { id: `${id}-no`, texto: 'no', orden: 2, correcta: false },
  ],
});

describe('nota académica', () => {
  it('convierte 16 aciertos de 20 en 80 sobre 100 y 8 puntos del curso', () => {
    expect(notaDeAciertos(16, 20, 100)).toBe(80);
    expect(aportePorcentual(80, 100, 10)).toBe(8);
  });

  it('no deja que la velocidad cambie la nota: un acierto lento sigue contando', () => {
    const preguntas = [pregunta('p1', 'p1-si'), pregunta('p2', 'p2-si')];
    const aciertos = aciertosAcademicos(preguntas, [
      { preguntaId: 'p1', opcionId: 'p1-si', valor: null, aceptada: true },
    ]);
    expect(aciertos).toBe(1);
    expect(notaDeAciertos(aciertos, preguntas.length, 100)).toBe(50);
  });

  it('cuenta como incorrecta la pregunta sin respuesta y la respuesta rechazada', () => {
    const preguntas = [pregunta('p1', 'p1-si')];
    expect(
      aciertosAcademicos(preguntas, [
        { preguntaId: 'p1', opcionId: 'p1-si', valor: null, aceptada: false },
      ]),
    ).toBe(0);
    expect(aciertosAcademicos(preguntas, [])).toBe(0);
  });
});
