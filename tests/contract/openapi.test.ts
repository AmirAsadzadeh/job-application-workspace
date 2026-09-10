// @vitest-environment node
import { afterEach, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { createApiServer } from "../../apps/api/src/server.js";
import type { ApiConfig } from "../../apps/api/src/config.js";

const config: ApiConfig = {
  NODE_ENV: "test",
  HOST: "127.0.0.1",
  PORT: 4174,
  APP_ORIGIN: "http://127.0.0.1:4173",
  DATABASE_URL: "postgresql://workspace:workspace@127.0.0.1:5432/workspace_test",
  BETTER_AUTH_SECRET: "test-secret-with-high-entropy-0123456789abcdef",
  S3_ENDPOINT: "http://127.0.0.1:9000",
  S3_REGION: "us-east-1",
  S3_BUCKET: "workspace-test",
  S3_ACCESS_KEY_ID: "workspace",
  S3_SECRET_ACCESS_KEY: "workspace-development-secret",
  SMTP_HOST: "127.0.0.1",
  SMTP_PORT: 1025,
  SMTP_FROM: "noreply@example.test",
};

describe("OpenAPI infrastructure", () => {
  let server: FastifyInstance | undefined;
  afterEach(async () => server?.close());

  it("publishes a generated OpenAPI 3.1 document", async () => {
    server = createApiServer(config);
    const response = await server.inject({ method: "GET", url: "/api/docs/json" });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({ openapi: "3.1.0", info: { title: "Job Application Workspace API" } });
  });
});
