import type { INestApplication } from "@nestjs/common";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { apiReference } from "@scalar/nestjs-api-reference";

export function configureOpenApi(app: INestApplication): void {
  const config = new DocumentBuilder()
    .setTitle("ProfeLink Auth Service")
    .setDescription(
      "Servicio de autenticación, emisión y validación de tokens JWT (RS256) con políticas de correo.",
    )
    .setVersion("1.0")
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup("docs", app, document);
  SwaggerModule.setup("openapi", app, document, {
    ui: false,
    raw: ["json"],
    jsonDocumentUrl: "/openapi.json",
  });
  app.use("/reference", apiReference({ content: document }));
}
