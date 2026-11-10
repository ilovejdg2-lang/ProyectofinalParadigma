import { shutdownTelemetry } from './instrumentation.js';
import type { Server } from 'node:http';
import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableShutdownHooks();
  const server = app.getHttpServer() as Server;
  server.once('close', () => {
    void shutdownTelemetry().catch((error: unknown) => {
      Logger.error('Error shutting down OpenTelemetry', error, 'Bootstrap');
    });
  });

  const allowedOrigins = process.env.FRONTEND_URL
    ? process.env.FRONTEND_URL.split(',').map((o) => o.trim())
    : ['http://localhost:5173'];
  const origenLocal = /^https?:\/\/(localhost|127\.0\.0\.1|10(?:\.\d{1,3}){3}|192\.168(?:\.\d{1,3}){2}|172\.(?:1[6-9]|2\d|3[0-1])(?:\.\d{1,3}){2})(:\d+)?$/;

  app.enableCors({
    origin: (origin: string | undefined, callback: (error: Error | null, allow?: boolean) => void) => {
      if (!origin || allowedOrigins.includes(origin) || origenLocal.test(origin)) {
        callback(null, true);
        return;
      }
      callback(null, false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidUnknownValues: false,
    }),
  );

  // Documentación OpenAPI / Scalar
  const config = new DocumentBuilder()
    .setTitle('ProfeLink Auth Service')
    .setDescription('Servicio de autenticación, emisión y validación de tokens JWT (RS256) con políticas de correo.')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);

  const port = process.env.PORT || 5001;
  await app.listen(port);
  console.log(`[auth-service] Escuchando en http://localhost:${port}`);
  console.log(`[auth-service] JWKS disponible en http://localhost:${port}/.well-known/jwks.json`);
  console.log(`[auth-service] Swagger Docs en http://localhost:${port}/docs`);
}

bootstrap().catch((err) => {
  console.error('Error al arrancar auth-service:', err);
  process.exit(1);
});
