import Fastify from "fastify";
import { loadConfig, type ApiConfig } from "./config.js";
import { createAuth } from "./auth/auth.js";
import { registerAuthRoutes } from "./auth/authRoutes.js";
import { createDatabase, type Database } from "./db/connection.js";
import { createSmtpEmailProvider } from "./email/smtpEmailProvider.js";
import { registerOpenApi } from "./openapi.js";
import { registerErrorHandler } from "./plugins/errors.js";
import { registerSecurityPlugins } from "./plugins/security.js";
import { registerWorkspaceRoutes } from "./routes/workspaceRoutes.js";
import { registerManagedFileRoutes } from "./routes/managedFileRoutes.js";
import { registerAccountRoutes } from "./routes/accountRoutes.js";
import { registerWorkspaceExportRoutes } from "./routes/workspaceExportRoutes.js";
import { registerSynchronizationRoutes } from "./routes/synchronizationRoutes.js";
import { createS3ObjectStorage, type ObjectStorage } from "./storage/objectStorage.js";

export function createApiServer(config: ApiConfig, providedDatabase?: Database, providedStorage?: ObjectStorage) {
  const server = Fastify({
    logger: {
      redact: ["req.headers.authorization", "req.headers.cookie", "password", "token", "secret"],
    },
    bodyLimit: 10 * 1024 * 1024,
  });

  const storage = providedStorage ?? createS3ObjectStorage(config);
  const database = providedDatabase ?? createDatabase(config.DATABASE_URL);
  const auth = createAuth(config, database.db, createSmtpEmailProvider(config), storage);

  registerErrorHandler(server);
  server.register(async (instance) => {
    await registerSecurityPlugins(instance, config);
    await registerOpenApi(instance);
    instance.addContentTypeParser("application/x-www-form-urlencoded", { parseAs: "string" }, (_request, body, done) => done(null, body));
    instance.addContentTypeParser("application/zip", (_request, payload, done) => done(null, payload));
    instance.addContentTypeParser(["application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "image/png", "image/jpeg", "image/svg+xml"], { parseAs: "buffer" }, (_request, body, done) => done(null, body));
    registerAuthRoutes(instance, auth);
    registerWorkspaceRoutes(instance, auth, database);
    registerManagedFileRoutes(instance, auth, database, storage);
    registerAccountRoutes(instance, auth, database);
    registerWorkspaceExportRoutes(instance, auth, database, storage);
    registerSynchronizationRoutes(instance, auth, database, storage);
    instance.get("/health", {
      schema: {
        response: { 200: { type: "object", required: ["status"], properties: { status: { type: "string", const: "ok" } } } },
      },
    }, async () => ({ status: "ok" as const }));
  });
  server.addHook("onClose", async () => database.close());

  return server;
}

async function main() {
  const config = loadConfig();
  const server = createApiServer(config);
  const shutdown = async () => {
    await server.close();
    process.exitCode = 0;
  };
  process.once("SIGINT", shutdown);
  process.once("SIGTERM", shutdown);
  await server.listen({ host: config.HOST, port: config.PORT });
}

if (process.argv[1] && import.meta.url === new URL(`file:///${process.argv[1].replaceAll("\\", "/")}`).href) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : "API startup failed.");
    process.exitCode = 1;
  });
}
