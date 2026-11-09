import { createOpenApiConfig } from './openapi.config';

describe('OpenAPI config', () => {
  it('registers the bearer security scheme referenced by protected routes', () => {
    const config = createOpenApiConfig();

    expect(config.components?.securitySchemes).toMatchObject({
      bearer: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
    });
  });
});
