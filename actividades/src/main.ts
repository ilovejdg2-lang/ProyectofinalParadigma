import { shutdownTelemetry } from './instrumentation.js';
import type { Server } from 'node:http';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { SwaggerModule } from '@nestjs/swagger';
import { apiReference } from '@scalar/nestjs-api-reference';
import { createOpenApiConfig } from './openapi/openapi.config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableShutdownHooks();
  const server = app.getHttpServer() as Server;
  server.once('close', () => {
    void shutdownTelemetry().catch((error: unknown) => {
      Logger.error('Error shutting down OpenTelemetry', error, 'Bootstrap');
    });
  });
  const config = app.get(ConfigService);
  const origen = config.get<string>('FRONTEND_URL') ?? 'http://localhost:5173';

  app.enableCors({
    origin: origen,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  });

  const openApiConfig = createOpenApiConfig();
  const openApiDocument = SwaggerModule.createDocument(app, openApiConfig);

  SwaggerModule.setup('docs', app, openApiDocument, {
    ui: false,
    raw: ['json'],
    jsonDocumentUrl: '/openapi.json',
  });

  app.use(
    '/reference',
    apiReference({
      content: openApiDocument,
    }),
  );

  const puerto = Number(config.get<string>('PORT') ?? 5002);
  await app.listen(puerto);
  Logger.log(
    `API de actividades escuchando en el puerto ${puerto}`,
    'Bootstrap',
  );
}

bootstrap().catch((err) => {
  console.error('Error starting actividades:', err);
});
