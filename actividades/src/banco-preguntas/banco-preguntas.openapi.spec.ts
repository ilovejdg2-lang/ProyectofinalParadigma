import { Test } from '@nestjs/testing';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { BancoPreguntasController } from './banco-preguntas.controller';
import { BancoPreguntasService } from './banco-preguntas.service';

describe('OpenAPI del banco de preguntas', () => {
  let app: Awaited<ReturnType<ReturnType<typeof Test.createTestingModule>['createNestApplication']>>;
  let document: ReturnType<typeof SwaggerModule.createDocument>;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [BancoPreguntasController],
      providers: [
        {
          provide: BancoPreguntasService,
          useValue: {
            listarPreguntas: jest.fn().mockResolvedValue([]),
            obtenerBancoKanban: jest.fn(),
            obtenerModosDemostracion: jest.fn(),
          },
        },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();

    document = SwaggerModule.createDocument(
      app,
      new DocumentBuilder()
        .setTitle('API de prueba')
        .setVersion('1.0.0')
        .build(),
    );
  });

  afterAll(async () => {
    await app.close();
  });

  it('documenta el cuerpo de respuesta como una lista con opciones anidadas', () => {
    expect(document.paths['/banco-preguntas']?.get).toMatchObject({
      responses: {
        '200': {
          description: 'Lista de preguntas reutilizables del banco.',
          content: {
            'application/json': {
              schema: {
                type: 'array',
                items: {
                  $ref: '#/components/schemas/PreguntaReutilizableDto',
                },
              },
            },
          },
        },
      },
    });

    expect(document.components?.schemas).toEqual(
      expect.objectContaining({
        PreguntaReutilizableDto: expect.objectContaining({
          properties: expect.objectContaining({
            id: expect.any(Object),
            dificultad: expect.objectContaining({
              enum: ['facil', 'medio', 'dificil'],
            }),
            modoRecomendado: expect.objectContaining({
              enum: ['en-vivo', 'practica', 'evaluacion', 'desafio'],
            }),
            opciones: expect.objectContaining({
              type: 'array',
              items: {
                $ref: '#/components/schemas/OpcionPreguntaReutilizableDto',
              },
            }),
          }),
        }),
        OpcionPreguntaReutilizableDto: expect.objectContaining({
          properties: expect.objectContaining({
            id: expect.any(Object),
            texto: expect.any(Object),
            orden: expect.any(Object),
          }),
        }),
      }),
    );
  });

  it('documenta el resumen Kanban con cuestionarios y preguntas anidadas', () => {
    expect(document.paths['/banco-preguntas/kanban']?.get).toMatchObject({
      responses: {
        '200': {
          description: 'Resumen del banco de preguntas de Kanban.',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/BancoKanbanDto',
              },
            },
          },
        },
      },
    });

    expect(document.components?.schemas).toEqual(
      expect.objectContaining({
        BancoKanbanDto: expect.objectContaining({
          properties: expect.objectContaining({
            cuestionarios: expect.objectContaining({
              items: {
                $ref: '#/components/schemas/CuestionarioKanbanDto',
              },
            }),
          }),
        }),
        CuestionarioKanbanDto: expect.objectContaining({
          properties: expect.objectContaining({
            preguntas: expect.objectContaining({
              items: {
                $ref: '#/components/schemas/PreguntaKanbanDto',
              },
            }),
          }),
        }),
        PreguntaKanbanDto: expect.objectContaining({
          properties: expect.objectContaining({
            opciones: expect.objectContaining({
              items: {
                $ref: '#/components/schemas/OpcionPreguntaReutilizableDto',
              },
            }),
          }),
        }),
      }),
    );
  });

  it('documenta los modos de demostración como una lista con sus recursos', () => {
    expect(document.paths['/banco-preguntas/modos']?.get).toMatchObject({
      responses: {
        '200': {
          description: 'Modos de juego y recursos de demostración disponibles.',
          content: {
            'application/json': {
              schema: {
                type: 'array',
                items: {
                  $ref: '#/components/schemas/ModoDemostracionDto',
                },
              },
            },
          },
        },
      },
    });

    expect(document.components?.schemas).toEqual(
      expect.objectContaining({
        ModoDemostracionDto: expect.objectContaining({
          properties: expect.objectContaining({
            cuestionarios: expect.objectContaining({
              items: {
                $ref: '#/components/schemas/CuestionarioModoDto',
              },
            }),
            sesionesDemostracion: expect.objectContaining({
              items: {
                $ref: '#/components/schemas/SesionDemostracionDto',
              },
            }),
          }),
        }),
      }),
    );
  });
});
