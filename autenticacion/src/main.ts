import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const allowedOrigins = process.env.FRONTEND_URL
    ? process.env.FRONTEND_URL.split(',').map((o) => o.trim())
    : ['http://localhost:5173'];

  app.enableCors({
    origin: allowedOrigins,
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
