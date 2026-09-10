import type { FastifyInstance } from "fastify";
import type { WorkspaceAuth } from "./auth.js";

export function registerAuthRoutes(server: FastifyInstance, auth: WorkspaceAuth) {
  server.route({
    method: ["GET", "POST"],
    url: "/api/auth/*",
    async handler(request, reply) {
      const url = new URL(request.url, `${request.protocol}://${request.headers.host}`);
      const headers = new Headers();
      for (const [key, value] of Object.entries(request.headers)) {
        if (value !== undefined) headers.set(key, Array.isArray(value) ? value.join(",") : String(value));
      }
      const body = request.method === "GET" ? undefined : typeof request.body === "string" ? request.body : JSON.stringify(request.body ?? {});
      const response = await auth.handler(new Request(url, { method: request.method, headers, body }));
      reply.status(response.status);
      response.headers.forEach((value, key) => reply.header(key, value));
      return reply.send(response.body ? await response.text() : null);
    },
  });
}
