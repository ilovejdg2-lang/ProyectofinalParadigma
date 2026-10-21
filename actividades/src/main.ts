import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);
  const origen = config.get<string>('FRONTEND_URL') ?? 'http://localhost:5173';

  app.enableCors({
    origin: origen,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  });

  const puerto = Number(config.get<string>('PORT') ?? 5002);
  await app.listen(puerto);
  Logger.log(
    `API de actividades escuchando en el puerto ${puerto}`,
    'Bootstrap',
  );
}
void bootstrap();
