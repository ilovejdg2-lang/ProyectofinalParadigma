import { Controller, Get, Module } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import request = require("supertest");
import { configureOpenApi } from "./openapi.config";

jest.mock("@scalar/nestjs-api-reference", () => ({
  apiReference:
    () => (_request: unknown, response: { send: (body: string) => void }) => {
      response.send("scalar reference");
    },
}));

@Controller("probe")
class ProbeController {
  @Get()
  probe() {
    return { ok: true };
  }
}

@Module({ controllers: [ProbeController] })
class ProbeModule {}

describe("authentication API documentation", () => {
  it("serves OpenAPI JSON, Scalar, and the existing Swagger UI", async () => {
    const app = await NestFactory.create(ProbeModule, { logger: false });

    try {
      configureOpenApi(app);
      await app.init();

      const server = app.getHttpServer() as Parameters<typeof request>[0];
      const openApi = await request(server).get("/openapi.json").expect(200);
      expect(openApi.body.info.title).toBe("ProfeLink Auth Service");
      expect(openApi.body.paths).toHaveProperty("/probe");

      const existingJson = await request(server).get("/docs-json").expect(200);
      expect(existingJson.body.info.title).toBe("ProfeLink Auth Service");

      const scalar = await request(server).get("/reference").expect(200);
      expect(scalar.text).toContain("scalar");

      const swagger = await request(server).get("/docs").expect(200);
      expect(swagger.text).toContain("swagger");
    } finally {
      await app.close();
    }
  });
});
