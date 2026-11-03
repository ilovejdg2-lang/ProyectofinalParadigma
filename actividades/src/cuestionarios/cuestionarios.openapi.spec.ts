import { Test } from '@nestjs/testing';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { validate } from 'class-validator';
import { CuestionariosController } from './cuestionarios.controller';
import { CuestionariosService } from './cuestionarios.service';
import { IdentidadGuard } from '../autenticacion/identidad.guard';
import { EntradaCuestionarioDto } from './dto/entrada-cuestionario.dto';

describe('OpenAPI de cuestionarios', () => {
  let app: Awaited<
    ReturnType<
      ReturnType<typeof Test.createTestingModule>['createNestApplication']
    >
  >;
  let document: ReturnType<typeof SwaggerModule.createDocument>;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [CuestionariosController],
      providers: [
        {
          provide: CuestionariosService,
          useValue: {
            listar: jest.fn(),
            mios: jest.fn(),
            obtener: jest.fn(),
            crear: jest.fn(),
            actualizar: jest.fn(),
            eliminar: jest.fn(),
          },
        },
      ],
    })
      .overrideGuard(IdentidadGuard)
      .useValue({ canActivate: () => true })
      .compile();

    app = moduleRef.createNestApplication();
    await app.init();
    document = SwaggerModule.createDocument(
      app,
      new DocumentBuilder()
        .setTitle('API de prueba')
        .setVersion('1.0.0')
        .addBearerAuth()
        .build(),
    );
  });

  afterAll(async () => {
    await app?.close();
  });

  it('documenta el catálogo, sus filtros y el cuestionario de respuesta', () => {
    expect(document.paths['/cuestionarios']?.get).toMatchObject({
      parameters: expect.arrayContaining([
        expect.objectContaining({ name: 'texto', in: 'query' }),
        expect.objectContaining({ name: 'categoria', in: 'query' }),
        expect.objectContaining({ name: 'dificultad', in: 'query' }),
        expect.objectContaining({ name: 'autor', in: 'query' }),
      ]),
      responses: {
        '200': {
          content: {
            'application/json': {
              schema: {
                type: 'array',
                items: { $ref: '#/components/schemas/CuestionarioResponseDto' },
              },
            },
          },
        },
      },
    });
  });

  it('alinea los límites OpenAPI del cuestionario con sus validaciones', () => {
    expect(document.components?.schemas?.EntradaCuestionarioDto).toMatchObject({
      properties: {
        titulo: { minLength: 3, maxLength: 80 },
        descripcion: { maxLength: 400 },
      },
    });
    expect(
      document.components?.schemas?.EntradaCuestionarioDto?.properties?.id,
    ).not.toHaveProperty('minLength');
    expect(
      document.components?.schemas?.EntradaCuestionarioDto?.properties?.id,
    ).not.toHaveProperty('maxLength');
  });

  it('exige títulos de al menos tres caracteres', async () => {
    const corto = Object.assign(new EntradaCuestionarioDto(), { titulo: 'ab' });
    const errores = await validate(corto, { skipMissingProperties: true });
    expect(
      errores.find((error) => error.property === 'titulo')?.constraints,
    ).toHaveProperty('minLength');

    const valido = Object.assign(new EntradaCuestionarioDto(), {
      titulo: 'abc',
    });
    const erroresValidos = await validate(valido, {
      skipMissingProperties: true,
    });
    expect(
      erroresValidos.find((error) => error.property === 'titulo'),
    ).toBeUndefined();
  });

  it('documenta autenticación, respuestas, ruta individual y eliminación 204', () => {
    expect(document.paths['/mis-cuestionarios']?.get).toMatchObject({
      security: [{ bearer: [] }],
    });
    expect(document.paths['/cuestionarios/{id}']?.get).toMatchObject({
      parameters: expect.arrayContaining([
        expect.objectContaining({ name: 'id', in: 'path', required: true }),
        expect.objectContaining({
          name: 'authorization',
          in: 'header',
          required: false,
        }),
      ]),
    });
    expect(document.paths['/cuestionarios']?.post).toMatchObject({
      security: [{ bearer: [] }],
      requestBody: {
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/EntradaCuestionarioDto' },
          },
        },
      },
      responses: {
        '201': {
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/CuestionarioResponseDto' },
            },
          },
        },
      },
    });
    expect(
      document.paths['/cuestionarios/{id}']?.delete?.responses,
    ).toHaveProperty('204');
    expect(
      document.paths['/cuestionarios/{id}']?.delete?.responses['204'],
    ).not.toHaveProperty('content');
  });
});
