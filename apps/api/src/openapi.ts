import swagger from "@fastify/swagger";
import swaggerUi from "@fastify/swagger-ui";
import type { FastifyInstance } from "fastify";

export async function registerOpenApi(server: FastifyInstance) {
  await server.register(swagger, {
    openapi: {
      openapi: "3.1.0",
      info: { title: "Job Application Workspace API", version: "0.1.0" },
      components: {
        securitySchemes: {
          sessionCookie: { type: "apiKey", in: "cookie", name: "better-auth.session_token" },
          desktopBearer: { type: "http", scheme: "bearer" },
        },
      },
    },
  });
  await server.register(swaggerUi, { routePrefix: "/api/docs" });
}
