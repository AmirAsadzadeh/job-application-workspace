import type { FastifyInstance } from "fastify";
import type { WorkspaceAuth } from "../auth/auth.js";
import { requireSession } from "../auth/requireSession.js";
import type { Database } from "../db/connection.js";
import type { ObjectStorage } from "../storage/objectStorage.js";
import { createOnlineWorkspaceExport } from "../workspace/onlineWorkspaceExport.js";

export function registerWorkspaceExportRoutes(server: FastifyInstance, auth: WorkspaceAuth, database: Database, storage: ObjectStorage) {
  server.get("/api/workspace/export", { preHandler: requireSession(auth) }, async (request, reply) => {
    const exported = await createOnlineWorkspaceExport(request.account!.id, database, storage);
    return reply
      .header("content-type", "application/zip")
      .header("content-disposition", `attachment; filename="${exported.fileName}"`)
      .header("x-workspace-revision", String(exported.revision))
      .send(exported.stream);
  });
}
