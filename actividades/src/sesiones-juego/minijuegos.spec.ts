import {
  bonusRacha,
  configInicial,
  puntosCompetitivos,
  resolverMinijuego,
  semillaDe,
  tocaMinijuego,
} from './minijuegos';

describe('puntos y minijuegos', () => {
  it('da más puntos a la respuesta correcta más rápida y cero si falla', () => {
    const rapida = puntosCompetitivos(true, 2000, 20000, true);
    const media = puntosCompetitivos(true, 10000, 20000, true);
    const lenta = puntosCompetitivos(true, 18000, 20000, true);
    expect(rapida.total).toBe(1450);
    expect(media.total).toBe(1250);
    expect(lenta.total).toBe(1050);
    expect(puntosCompetitivos(false, 1000, 20000, true).total).toBe(0);
    expect(puntosCompetitivos(true, 2000, 20000, false)).toEqual({ total: 1000, velocidad: 0 });
  });

  it('no deja que el modo académico convierta un minijuego en nota', () => {
    const semilla = semillaDe('sala', 1, 'ana');
    const cofre = resolverMinijuego('cofres', semilla, { indice: 1 }, true);
    const ruleta = resolverMinijuego('ruleta', semilla, {}, true);
    const estrellas = resolverMinijuego('estrellas', semilla, { capturas: 99 }, true);
    expect(cofre.puntos).toBe(0);
    expect(ruleta.puntos).toBe(0);
    expect(estrellas.puntos).toBe(0);
    expect(estrellas.detalle.capturas).toBe(12);
  });

  it('paga una sola vez el mismo premio y limita las estrellas', () => {
    const semilla = semillaDe('sala', 2, 'ana');
    const competitivo = resolverMinijuego('estrellas', semilla, { capturas: 12 }, false);
    expect(competitivo.puntos).toBe(480);
    const bomba = resolverMinijuego('bomba', semilla, { detenidaEnMs: 2000 }, false);
    expect(bomba.puntos).toBe(300);
    expect(resolverMinijuego('bomba', semilla, { detenidaEnMs: 9000 }, false).puntos).toBe(0);
    expect(bonusRacha(3, true)).toBe(150);
    expect(bonusRacha(3, false)).toBe(0);
  });

  it('aparece cada 3 preguntas y no después de la última', () => {
    const juego = configInicial({ activos: true, cada: 3 }, false);
    expect(tocaMinijuego(juego, 2, 6)).toBe(true);
    expect(tocaMinijuego(juego, 0, 6)).toBe(false);
    expect(tocaMinijuego(juego, 5, 6)).toBe(false);
    expect(configInicial(undefined, true).velocidad).toBe(false);
    expect(configInicial({ activos: true, velocidad: true }, false)).toMatchObject({
      modalidad: 'competitivo',
      activos: true,
      cada: 3,
      velocidad: true,
    });
  });
});
