import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import multipart from "@fastify/multipart";
import rateLimit from "@fastify/rate-limit";
import type { FastifyInstance } from "fastify";
import type { ApiConfig } from "../config.js";

export async function registerSecurityPlugins(server: FastifyInstance, config: ApiConfig) {
  await server.register(helmet, { contentSecurityPolicy: config.NODE_ENV === "production" ? undefined : false });
  await server.register(cors, {
    origin: [config.APP_ORIGIN],
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["content-type", "authorization", "if-match", "idempotency-key", "x-sync-direction", "x-last-confirmed-revision", "x-source-revision", "x-workspace-filename", "x-resume-filename", "x-requested-with"],
  });
  await server.register(rateLimit, { max: 120, timeWindow: "1 minute" });
  await server.register(multipart, { limits: { fileSize: 25 * 1024 * 1024, files: 1, fields: 10 } });
}
