import { DocumentBuilder } from '@nestjs/swagger';

export function createOpenApiConfig() {
  return new DocumentBuilder()
    .setTitle('ProfeLink - API de actividades')
    .setDescription(
      'API para cuestionarios, preguntas, sesiones de juego, resultados e imágenes.',
    )
    .setVersion('1.0.0')
    .addBearerAuth()
    .build();
}
