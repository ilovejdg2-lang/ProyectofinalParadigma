import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { IdentidadExterna } from '../autenticacion/identidad-externa';
import { ImagenesService } from '../imagenes/imagenes.service';
import { PreguntasService } from '../preguntas/preguntas.service';
import { PrismaMemoria } from '../../test/prisma-memoria';
import { CuestionariosService } from './cuestionarios.service';
import { PrismaService } from '../prisma/prisma.service';

const ana: IdentidadExterna = { id: 'ana', nombre: 'Ana' };
const luis: IdentidadExterna = { id: 'luis', nombre: 'Luis' };

function entrada(cambios: Record<string, unknown> = {}) {
  return {
    titulo: 'Paradigma de prueba',
    descripcion: 'Una descripción suficientemente larga para validar.',
    categoria: 'General',
    etiquetas: ['prueba'],
    dificultad: 'facil' as const,
    preguntas: [
      {
        id: 'p1',
        enunciado: 'Una función pura no tiene efectos externos.',
        respuestaCorrecta: true,
        orden: 1,
        opciones: [
          { id: 'p1a', texto: 'Verdadero', correcta: true },
          { id: 'p1b', texto: 'Falso', correcta: false },
        ],
      },
      {
        id: 'p2',
        enunciado: 'La herencia obliga a copiar cada método a mano.',
        respuestaCorrecta: false,
        orden: 2,
        opciones: [
          { id: 'p2a', texto: 'Sí', correcta: false },
          { id: 'p2b', texto: 'No', correcta: true },
        ],
      },
    ],
    ...cambios,
  };
}

function conPrefijo(prefijo: string, cambios: Record<string, unknown> = {}) {
  const base = entrada();
  return entrada({
    preguntas: base.preguntas.map((pregunta) => ({
      ...pregunta,
      id: `${prefijo}-${pregunta.id}`,
      opciones: pregunta.opciones.map((opcion) => ({
        ...opcion,
        id: `${prefijo}-${opcion.id}`,
      })),
    })),
    ...cambios,
  });
}
function servicioCon(memoria: PrismaMemoria) {
  const verificador = {
    verificar: (token: string) => {
      if (token === 'token-ana') return Promise.resolve(ana);
      if (token === 'token-luis') return Promise.resolve(luis);
      return Promise.resolve(null);
    },
  };
  return new CuestionariosService(
    {
      obtener: () => memoria,
      estaListo: () => true,
    } as unknown as PrismaService,
    new PreguntasService(),
    new ImagenesService(),
    verificador,
  );
}

describe('CuestionariosService', () => {
  let memoria: PrismaMemoria;
  let servicio: CuestionariosService;

  beforeEach(() => {
    memoria = new PrismaMemoria();
    servicio = servicioCon(memoria);
  });

  it('crea un cuestionario del usuario autenticado y lo lista sin la solución', async () => {
    const creado = await servicio.crear(entrada(), ana);
    expect(creado.autorId).toBe('ana');
    expect(creado.preguntas).toHaveLength(2);
    expect(creado.preguntas[0]?.opciones[0]?.correcta).toBe(true);

    const catalogo = await servicio.listar({});
    expect(JSON.stringify(catalogo)).not.toContain('"correcta"');
    expect(JSON.stringify(catalogo)).not.toContain('"respuestaCorrecta"');
    expect(catalogo[0]?.preguntas).toHaveLength(2);
  });

  it('entrega la solución solo al propietario', async () => {
    const creado = await servicio.crear(entrada(), ana);
    const publico = await servicio.obtener(creado.id);
    const dueno = await servicio.obtener(creado.id, 'Bearer token-ana');
    const ajeno = await servicio.obtener(creado.id, 'Bearer token-luis');
    expect(JSON.stringify(publico)).not.toContain('"correcta"');
    expect(
      dueno.preguntas[1]?.opciones.find((opcion) => opcion.correcta)?.texto,
    ).toBe('No');
    expect(JSON.stringify(ajeno)).not.toContain('"correcta"');
  });

  it('rechaza datos inválidos y varias respuestas correctas', async () => {
    await expect(
      servicio.crear(entrada({ titulo: 'No' }), ana),
    ).rejects.toBeInstanceOf(BadRequestException);
    const invalido = entrada();
    invalido.preguntas[0].opciones[1].correcta = true;
    await expect(servicio.crear(invalido, ana)).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(memoria.cuestionarios).toHaveLength(0);
  });

  it('rechaza una pregunta con menos de dos opciones', async () => {
    const invalido = entrada();
    invalido.preguntas[0].opciones = [invalido.preguntas[0].opciones[0]];
    await expect(servicio.crear(invalido, ana)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('arma verdadero y falso cuando no llegan opciones', async () => {
    const creado = await servicio.crear(
      entrada({
        preguntas: [
          {
            id: 'vf',
            enunciado: 'El polimorfismo comparte una interfaz.',
            respuestaCorrecta: true,
            orden: 1,
          },
        ],
      }),
      ana,
    );
    expect(creado.preguntas[0]?.opciones).toEqual([
      { id: 'vf:verdadero', texto: 'Verdadero', correcta: true },
      { id: 'vf:falso', texto: 'Falso', correcta: false },
    ]);
  });

  it('lista solo los cuestionarios del propietario', async () => {
    await servicio.crear(entrada(), ana);
    await servicio.crear(
      conPrefijo('luis', { titulo: 'Otro conjunto de clase' }),
      luis,
    );
    const mios = await servicio.mios(ana);
    expect(mios).toHaveLength(1);
    expect(mios[0]?.autorId).toBe('ana');
  });

  it('filtra el catálogo por texto', async () => {
    await servicio.crear(entrada(), ana);
    await servicio.crear(
      conPrefijo('curso', { titulo: 'Concurrencia básica del curso' }),
      ana,
    );
    const visibles = await servicio.listar({ texto: 'concurrencia' });
    expect(visibles).toHaveLength(1);
    expect(visibles[0]?.titulo).toContain('Concurrencia');
  });

  it('impide editar o borrar un cuestionario ajeno', async () => {
    const creado = await servicio.crear(entrada(), ana);
    await expect(
      servicio.actualizar(
        creado.id,
        entrada({ titulo: 'Título ajeno válido' }),
        luis,
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
    await expect(servicio.eliminar(creado.id, luis)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect((await servicio.obtener(creado.id)).titulo).toBe(
      'Paradigma de prueba',
    );
  });

  it('edita, agrega y quita preguntas sin respuestas', async () => {
    const creado = await servicio.crear(entrada(), ana);
    const editado = await servicio.actualizar(
      creado.id,
      entrada({
        titulo: 'Paradigma revisado',
        preguntas: [
          ...entrada().preguntas,
          {
            id: 'p3',
            enunciado: 'Un objeto combina estado y comportamiento.',
            respuestaCorrecta: true,
            orden: 3,
            opciones: [
              { id: 'p3a', texto: 'Verdadero', correcta: true },
              { id: 'p3b', texto: 'Falso', correcta: false },
            ],
          },
        ],
      }),
      ana,
    );
    expect(editado.titulo).toBe('Paradigma revisado');
    expect(editado.preguntas).toHaveLength(3);

    const reducido = await servicio.actualizar(creado.id, entrada(), ana);
    expect(reducido.preguntas).toHaveLength(2);
    expect(memoria.preguntas).toHaveLength(2);
  });

  it('no modifica una pregunta que ya fue respondida y revierte la transacción', async () => {
    const creado = await servicio.crear(entrada(), ana);
    memoria.agregarRespuesta({ id: 'r1', preguntaId: 'p1', opcionId: 'p1a' });
    const cambiado = entrada();
    cambiado.preguntas[0].enunciado =
      'Enunciado distinto que no debe guardarse.';
    cambiado.titulo = 'Título que debe revertirse ahora';
    const rechazo = servicio.actualizar(creado.id, cambiado, ana);
    await expect(rechazo).rejects.toBeInstanceOf(ConflictException);
    const error = await rechazo.catch((valor: unknown) => valor);
    expect(error).toBeInstanceOf(ConflictException);
    if (error instanceof ConflictException) {
      expect(error.getResponse()).toEqual({
        mensaje:
          'No se puede modificar una pregunta que ya tiene respuestas en una partida.',
      });
    }
    const vigente = await servicio.obtener(creado.id, 'Bearer token-ana');
    expect(vigente.titulo).toBe('Paradigma de prueba');
    expect(vigente.preguntas[0]?.enunciado).toBe(
      'Una función pura no tiene efectos externos.',
    );
  });

  it('elimina de forma lógica y conserva las preguntas', async () => {
    const creado = await servicio.crear(entrada(), ana);
    await servicio.eliminar(creado.id, ana);
    expect(memoria.preguntas).toHaveLength(2);
    expect(memoria.cuestionarios[0]?.eliminadoEn).toBeInstanceOf(Date);
    await expect(servicio.listar({})).resolves.toEqual([]);
    await expect(servicio.obtener(creado.id)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    await expect(servicio.eliminar(creado.id, ana)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('no deja un cuestionario parcial si falla la transacción', async () => {
    const original = memoria.pregunta.create;
    let llamadas = 0;
    memoria.pregunta.create = async (args) => {
      llamadas += 1;
      if (llamadas === 2) throw new Error('fallo de escritura');
      return original(args);
    };
    await expect(servicio.crear(entrada(), ana)).rejects.toThrow(
      'fallo de escritura',
    );
    expect(memoria.cuestionarios).toHaveLength(0);
    expect(memoria.preguntas).toHaveLength(0);
    expect(memoria.opciones).toHaveLength(0);
  });
});
