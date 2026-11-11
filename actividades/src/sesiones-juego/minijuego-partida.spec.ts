import { IdentidadExterna } from '../autenticacion/identidad-externa';
import { PrismaService } from '../prisma/prisma.service';
import { AvisoSesionesLocal } from './aviso-sesiones';
import { SesionesJuegoService } from './sesiones-juego.service';
import { cuestionarioValido, esperarApertura, SesionMemoria } from '../../test/sesion-memoria';

const ana: IdentidadExterna = { id: 'ana', nombre: 'Ana', role: 'teacher' };
const luis: IdentidadExterna = { id: 'luis', nombre: 'Luis', role: 'student' };
const marta: IdentidadExterna = { id: 'marta', nombre: 'Marta', role: 'student' };

function servicioNuevo() {
  const memoria = new SesionMemoria();
  memoria.cuestionarios.push(cuestionarioValido());
  const prisma = { obtener: () => memoria, estaListo: () => true } as unknown as PrismaService;
  return new SesionesJuegoService(prisma, new AvisoSesionesLocal());
}

async function salaCompetitiva() {
  const servicio = servicioNuevo();
  const creada = await servicio.crear('quiz-1', ana, {
    modo: 'practica',
    modalidad: 'competitivo',
    minijuegosActivos: true,
    cadaPreguntas: 1,
    duracionMinijuego: 8,
    velocidadActiva: true,
  });
  await servicio.unirse(creada.codigo, luis, { nombre: 'Luis' });
  await servicio.unirse(creada.codigo, marta, { nombre: 'Marta' });
  const iniciada = await servicio.iniciar(creada.codigo, ana);
  await esperarApertura(iniciada);
  return { servicio, codigo: creada.codigo };
}

jest.setTimeout(20000);

describe('partida con minijuegos', () => {
  it('premia la respuesta rápida y no duplica el cofre', async () => {
    const { servicio, codigo } = await salaCompetitiva();
    await servicio.responder(codigo, luis, { opcionId: 'p1a' });
    await new Promise((resolver) => setTimeout(resolver, 700));
    const cerrada = await servicio.responder(codigo, marta, { opcionId: 'p1a' });
    const puntosLuis = cerrada.participantes.find((item) => item.perfilId === 'luis')?.puntaje ?? 0;
    const puntosMarta = cerrada.participantes.find((item) => item.perfilId === 'marta')?.puntaje ?? 0;
    expect(puntosLuis).toBeGreaterThan(puntosMarta);
    expect(puntosLuis).toBeGreaterThan(1000);
    expect(puntosMarta).toBeGreaterThan(1000);

    await servicio.avanzar(codigo, ana, 'cerrada');
    const mini = await servicio.avanzar(codigo, ana, 'clasificacion');
    expect(mini.estado).toBe('minijuego');
    expect(mini.juego?.tipo).toBe('cofres');

    const primera = await servicio.jugarMinijuego(codigo, luis, { indice: 1 });
    const ganados = primera.juego?.mio?.puntos ?? 0;
    expect(ganados).toBeGreaterThan(0);
    const segunda = await servicio.jugarMinijuego(codigo, luis, { indice: 0 });
    expect(segunda.juego?.mio?.puntos).toBe(ganados);
    expect(segunda.participantes.find((item) => item.perfilId === 'luis')?.puntaje).toBe(puntosLuis + ganados);
  });

  it('mantiene la nota académica aunque se gane el minijuego', async () => {
    const servicio = servicioNuevo();
    const creada = await servicio.crear('quiz-1', ana, {
      modo: 'practica',
      modalidad: 'academico',
      minijuegosActivos: true,
      cadaPreguntas: 1,
      velocidadActiva: true,
    });
    await servicio.unirse(creada.codigo, luis, { nombre: 'Luis' });
    const iniciada = await servicio.iniciar(creada.codigo, ana);
    await esperarApertura(iniciada);
    const cerrada = await servicio.responder(creada.codigo, luis, { opcionId: 'p1a' });
    const luisCerrado = cerrada.participantes.find((item) => item.perfilId === 'luis');
    expect(luisCerrado).toMatchObject({ puntaje: 1, aciertos: 1 });
    await servicio.avanzar(creada.codigo, ana, 'cerrada');
    const mini = await servicio.avanzar(creada.codigo, ana, 'clasificacion');
    expect(mini.juego?.modalidad).toBe('academico');
    const jugada = await servicio.jugarMinijuego(creada.codigo, luis, { indice: 2 });
    expect(jugada.juego?.mio?.puntos).toBe(0);
    expect(jugada.participantes.find((item) => item.perfilId === 'luis')?.puntaje).toBe(1);
  });
});
