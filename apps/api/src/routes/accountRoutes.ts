import { and, eq, gt } from "drizzle-orm";
import { fromNodeHeaders } from "better-auth/node";
import type { FastifyInstance } from "fastify";
import type { WorkspaceAuth } from "../auth/auth.js";
import { requireSession } from "../auth/requireSession.js";
import type { Database } from "../db/connection.js";
import { oauthAccessToken, oauthRefreshToken, session } from "../db/schema/index.js";

function failure(statusCode: number, code: string, message: string) {
  return Object.assign(new Error(message), { statusCode, code });
}

export function registerAccountRoutes(server: FastifyInstance, auth: WorkspaceAuth, database: Database) {
  const authenticated = requireSession(auth);

  server.get("/api/account/sessions", { preHandler: authenticated }, async (request) => {
    const current = await auth.api.getSession({ headers: fromNodeHeaders(request.headers) });
    const rows = await database.db.select({ id: session.id, createdAt: session.createdAt, updatedAt: session.updatedAt, expiresAt: session.expiresAt, ipAddress: session.ipAddress, userAgent: session.userAgent })
      .from(session)
      .where(and(eq(session.userId, request.account!.id), gt(session.expiresAt, new Date())));
    return { sessions: rows.map((row) => ({ ...row, createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString(), expiresAt: row.expiresAt.toISOString(), current: row.id === current?.session.id })) };
  });

  server.delete("/api/account/sessions/:sessionId", { preHandler: authenticated }, async (request) => {
    const sessionId = (request.params as { sessionId: string }).sessionId;
    const target = (await database.db.select({ id: session.id }).from(session).where(and(eq(session.id, sessionId), eq(session.userId, request.account!.id))).limit(1))[0];
    if (!target) throw failure(404, "NOT_FOUND", "Session was not found.");
    await database.db.transaction(async (tx) => {
      const revokedAt = new Date();
      await tx.update(oauthAccessToken).set({ revoked: revokedAt }).where(and(eq(oauthAccessToken.sessionId, sessionId), eq(oauthAccessToken.userId, request.account!.id)));
      await tx.update(oauthRefreshToken).set({ revoked: revokedAt }).where(and(eq(oauthRefreshToken.sessionId, sessionId), eq(oauthRefreshToken.userId, request.account!.id)));
      await tx.delete(session).where(and(eq(session.id, sessionId), eq(session.userId, request.account!.id)));
    });
    return { revoked: true };
  });

  server.delete("/api/account", { preHandler: authenticated }, async (request) => {
    const password = (request.body as { password?: unknown } | undefined)?.password;
    return auth.api.deleteUser({ headers: fromNodeHeaders(request.headers), body: typeof password === "string" && password ? { password } : {} });
  });
}
