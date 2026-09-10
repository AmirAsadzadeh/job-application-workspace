import { randomUUID } from "node:crypto";
import { and, eq, sql } from "drizzle-orm";
import { fileTypeFromBuffer } from "file-type";
import type { FastifyInstance, FastifyRequest } from "fastify";
import { MAX_LOGO_BYTES } from "@workspace/domain/positionSchema";
import type { WorkspaceAuth } from "../auth/auth.js";
import { requireSession } from "../auth/requireSession.js";
import type { Database } from "../db/connection.js";
import { managedFiles, positions, workspaces } from "../db/schema/index.js";
import { immutableObjectKey, type ObjectStorage } from "../storage/objectStorage.js";

const MAX_RESUME_BYTES = 10 * 1024 * 1024;
const DOWNLOAD_TTL_SECONDS = 300;
const PDF = "application/pdf";
const DOCX = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
const supportedResumeTypes = new Set([PDF, DOCX]);
const supportedLogoTypes = new Set(["image/png", "image/jpeg", "image/svg+xml"]);

function failure(statusCode: number, code: string, message: string) {
  return Object.assign(new Error(message), { statusCode, code });
}

function expectedRevision(request: FastifyRequest) {
  const value = request.headers["if-match"];
  const revision = Number(Array.isArray(value) ? value[0] : value);
  if (!Number.isInteger(revision) || revision < 0) throw failure(422, "VALIDATION_FAILED", "A current workspace revision is required.");
  return revision;
}

function bodyBuffer(request: FastifyRequest, maximum: number) {
  if (!Buffer.isBuffer(request.body)) throw failure(422, "FILE_INVALID", "Choose a supported file.");
  if (request.body.byteLength === 0) throw failure(422, "FILE_INVALID", "The file is empty.");
  if (request.body.byteLength > maximum) throw failure(413, "FILE_INVALID", `The file exceeds the ${Math.floor(maximum / 1024 / 1024)} MB limit.`);
  return request.body;
}

function originalFileName(request: FastifyRequest, fallback: string) {
  const raw = request.headers["x-file-name"];
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (!value) return fallback;
  let decoded = value;
  try { decoded = decodeURIComponent(value); } catch { /* Keep the original header value. */ }
  const clean = decoded.replaceAll(/[\x00-\x1f\\/]/g, "_").trim();
  return clean.slice(0, 255) || fallback;
}

async function identifyFile(body: Buffer, declaredType: string | undefined) {
  const detected = await fileTypeFromBuffer(body);
  if (detected) return detected.mime;
  if (declaredType === "image/svg+xml") {
    const text = body.toString("utf8").trimStart();
    if (/^<svg(?:\s|>)/i.test(text) && !/<script\b|\bon\w+\s*=|(?:href|src)\s*=\s*["']\s*(?:https?:|data:)/i.test(text)) return declaredType;
  }
  return null;
}

async function ownedPosition(database: Database, ownerId: string, positionId: string) {
  const workspace = (await database.db.select().from(workspaces).where(eq(workspaces.ownerId, ownerId)).limit(1))[0];
  if (!workspace) throw failure(404, "NOT_FOUND", "Workspace was not found.");
  const position = (await database.db.select().from(positions).where(and(eq(positions.workspaceId, workspace.id), eq(positions.id, positionId))).limit(1))[0];
  if (!position) throw failure(404, "NOT_FOUND", "Position was not found.");
  return { workspace, position };
}

export function registerManagedFileRoutes(server: FastifyInstance, auth: WorkspaceAuth, database: Database, storage: ObjectStorage) {
  const authenticated = requireSession(auth);

  server.put("/api/positions/:positionId/application/resume", { preHandler: authenticated }, async (request) => {
    const positionId = (request.params as { positionId: string }).positionId;
    const body = bodyBuffer(request, MAX_RESUME_BYTES);
    const declaredType = request.headers["content-type"]?.split(";")[0];
    const mediaType = await identifyFile(body, declaredType);
    if (!mediaType || !supportedResumeTypes.has(mediaType) || mediaType !== declaredType) throw failure(422, "FILE_INVALID", "Choose a valid PDF or DOCX file.");
    const { workspace } = await ownedPosition(database, request.account!.id, positionId);
    const revision = expectedRevision(request);
    const fileId = randomUUID();
    const extension = mediaType === PDF ? "pdf" : "docx";
    const key = immutableObjectKey(request.account!.id, workspace.id, `revision-${revision + 1}`, `${fileId}.${extension}`);
    const stored = await storage.putImmutable(key, body, mediaType).catch(() => { throw failure(503, "STORAGE_UNAVAILABLE", "The resume could not be stored."); });
    let previousKey: string | null = null;
    let nextRevision: number;
    try {
      nextRevision = await database.db.transaction(async (tx) => {
        const current = (await tx.select().from(workspaces).where(eq(workspaces.id, workspace.id)).limit(1))[0];
        if (!current || current.revision !== revision) throw failure(409, "REVISION_CONFLICT", "Online data changed. Reload and try again.");
        const previous = (await tx.select().from(managedFiles).where(and(eq(managedFiles.workspaceId, workspace.id), eq(managedFiles.positionId, positionId), eq(managedFiles.kind, "submitted_resume"))).limit(1))[0];
        previousKey = previous?.objectKey ?? null;
        if (previous) await tx.delete(managedFiles).where(eq(managedFiles.id, previous.id));
        await tx.insert(managedFiles).values({ id: fileId, workspaceId: workspace.id, positionId, kind: "submitted_resume", originalFileName: originalFileName(request, `resume.${extension}`), mediaType, byteLength: stored.byteLength, sha256: stored.sha256, objectKey: stored.key });
        const updated = await tx.update(workspaces).set({ revision: sql`${workspaces.revision} + 1`, updatedAt: new Date() }).where(and(eq(workspaces.id, workspace.id), eq(workspaces.revision, revision))).returning({ revision: workspaces.revision });
        if (!updated[0]) throw failure(409, "REVISION_CONFLICT", "Online data changed. Reload and try again.");
        return updated[0].revision;
      });
    } catch (error) {
      await storage.remove(stored.key).catch(() => undefined);
      throw error;
    }
    if (previousKey) await storage.remove(previousKey).catch(() => undefined);
    return { file: { id: fileId, fileName: originalFileName(request, `resume.${extension}`), mediaType, byteLength: stored.byteLength, sha256: stored.sha256 }, workspaceRevision: nextRevision };
  });

  server.get("/api/positions/:positionId/application/resume", { preHandler: authenticated }, async (request, reply) => {
    const positionId = (request.params as { positionId: string }).positionId;
    const { workspace } = await ownedPosition(database, request.account!.id, positionId);
    const file = (await database.db.select().from(managedFiles).where(and(eq(managedFiles.workspaceId, workspace.id), eq(managedFiles.positionId, positionId), eq(managedFiles.kind, "submitted_resume"))).limit(1))[0];
    if (!file) throw failure(404, "NOT_FOUND", "Submitted resume was not found.");
    const url = await storage.signedDownloadUrl(file.objectKey, DOWNLOAD_TTL_SECONDS);
    if ((request.query as { download?: string }).download === "1") return reply.redirect(url);
    return { url, expiresAt: new Date(Date.now() + DOWNLOAD_TTL_SECONDS * 1000).toISOString(), fileName: file.originalFileName, mediaType: file.mediaType };
  });

  server.delete("/api/positions/:positionId/application/resume", { preHandler: authenticated }, async (request, reply) => {
    const positionId = (request.params as { positionId: string }).positionId;
    const { workspace } = await ownedPosition(database, request.account!.id, positionId);
    const revision = expectedRevision(request);
    const file = (await database.db.select().from(managedFiles).where(and(eq(managedFiles.workspaceId, workspace.id), eq(managedFiles.positionId, positionId), eq(managedFiles.kind, "submitted_resume"))).limit(1))[0];
    if (!file) throw failure(404, "NOT_FOUND", "Submitted resume was not found.");
    const updated = await database.db.transaction(async (tx) => {
      await tx.delete(managedFiles).where(eq(managedFiles.id, file.id));
      const rows = await tx.update(workspaces).set({ revision: sql`${workspaces.revision} + 1`, updatedAt: new Date() }).where(and(eq(workspaces.id, workspace.id), eq(workspaces.revision, revision))).returning({ revision: workspaces.revision });
      if (!rows[0]) throw failure(409, "REVISION_CONFLICT", "Online data changed. Reload and try again.");
      return rows[0].revision;
    });
    await storage.remove(file.objectKey).catch(() => undefined);
    return reply.status(200).send({ workspaceRevision: updated });
  });

  server.put("/api/positions/:positionId/company-logo", { preHandler: authenticated }, async (request) => {
    const positionId = (request.params as { positionId: string }).positionId;
    const body = bodyBuffer(request, MAX_LOGO_BYTES);
    const declaredType = request.headers["content-type"]?.split(";")[0];
    const mediaType = await identifyFile(body, declaredType);
    if (!mediaType || !supportedLogoTypes.has(mediaType) || mediaType !== declaredType) throw failure(422, "FILE_INVALID", "Choose a valid PNG, JPEG, or safe SVG image.");
    const { workspace, position } = await ownedPosition(database, request.account!.id, positionId);
    const revision = expectedRevision(request);
    const fileId = randomUUID();
    const extension = mediaType === "image/png" ? "png" : mediaType === "image/jpeg" ? "jpg" : "svg";
    const key = immutableObjectKey(request.account!.id, workspace.id, `revision-${revision + 1}`, `${fileId}.${extension}`);
    const stored = await storage.putImmutable(key, body, mediaType).catch(() => { throw failure(503, "STORAGE_UNAVAILABLE", "The logo could not be stored."); });
    let previousKey: string | null = null;
    let nextRevision: number;
    try {
      nextRevision = await database.db.transaction(async (tx) => {
        const current = (await tx.select().from(workspaces).where(eq(workspaces.id, workspace.id)).limit(1))[0];
        if (!current || current.revision !== revision) throw failure(409, "REVISION_CONFLICT", "Online data changed. Reload and try again.");
        if (position.companyLogoFileId) {
          const previous = (await tx.select().from(managedFiles).where(and(eq(managedFiles.workspaceId, workspace.id), eq(managedFiles.id, position.companyLogoFileId))).limit(1))[0];
          previousKey = previous?.objectKey ?? null;
          if (previous) await tx.delete(managedFiles).where(eq(managedFiles.id, previous.id));
        }
        await tx.insert(managedFiles).values({ id: fileId, workspaceId: workspace.id, positionId, kind: "company_logo", originalFileName: originalFileName(request, `logo.${extension}`), mediaType, byteLength: stored.byteLength, sha256: stored.sha256, objectKey: stored.key });
        await tx.update(positions).set({ companyLogoFileId: fileId, companyLogoUrl: null, updatedAt: new Date() }).where(and(eq(positions.workspaceId, workspace.id), eq(positions.id, positionId)));
        const updated = await tx.update(workspaces).set({ revision: sql`${workspaces.revision} + 1`, updatedAt: new Date() }).where(and(eq(workspaces.id, workspace.id), eq(workspaces.revision, revision))).returning({ revision: workspaces.revision });
        if (!updated[0]) throw failure(409, "REVISION_CONFLICT", "Online data changed. Reload and try again.");
        return updated[0].revision;
      });
    } catch (error) {
      await storage.remove(stored.key).catch(() => undefined);
      throw error;
    }
    if (previousKey) await storage.remove(previousKey).catch(() => undefined);
    return { file: { id: fileId, fileName: originalFileName(request, `logo.${extension}`), mediaType, byteLength: stored.byteLength, sha256: stored.sha256 }, workspaceRevision: nextRevision };
  });

  server.get("/api/positions/:positionId/company-logo", { preHandler: authenticated }, async (request) => {
    const positionId = (request.params as { positionId: string }).positionId;
    const { workspace, position } = await ownedPosition(database, request.account!.id, positionId);
    if (!position.companyLogoFileId) throw failure(404, "NOT_FOUND", "Company logo was not found.");
    const file = (await database.db.select().from(managedFiles).where(and(eq(managedFiles.workspaceId, workspace.id), eq(managedFiles.id, position.companyLogoFileId))).limit(1))[0];
    if (!file) throw failure(404, "NOT_FOUND", "Company logo was not found.");
    return { url: await storage.signedDownloadUrl(file.objectKey, DOWNLOAD_TTL_SECONDS), expiresAt: new Date(Date.now() + DOWNLOAD_TTL_SECONDS * 1000).toISOString(), fileName: file.originalFileName, mediaType: file.mediaType };
  });

  server.delete("/api/positions/:positionId/company-logo", { preHandler: authenticated }, async (request) => {
    const positionId = (request.params as { positionId: string }).positionId;
    const { workspace, position } = await ownedPosition(database, request.account!.id, positionId);
    const revision = expectedRevision(request);
    if (!position.companyLogoFileId) throw failure(404, "NOT_FOUND", "Company logo was not found.");
    const file = (await database.db.select().from(managedFiles).where(and(eq(managedFiles.workspaceId, workspace.id), eq(managedFiles.id, position.companyLogoFileId))).limit(1))[0];
    if (!file) throw failure(404, "NOT_FOUND", "Company logo was not found.");
    const nextRevision = await database.db.transaction(async (tx) => {
      await tx.update(positions).set({ companyLogoFileId: null, updatedAt: new Date() }).where(and(eq(positions.workspaceId, workspace.id), eq(positions.id, positionId)));
      await tx.delete(managedFiles).where(eq(managedFiles.id, file.id));
      const rows = await tx.update(workspaces).set({ revision: sql`${workspaces.revision} + 1`, updatedAt: new Date() }).where(and(eq(workspaces.id, workspace.id), eq(workspaces.revision, revision))).returning({ revision: workspaces.revision });
      if (!rows[0]) throw failure(409, "REVISION_CONFLICT", "Online data changed. Reload and try again.");
      return rows[0].revision;
    });
    await storage.remove(file.objectKey).catch(() => undefined);
    return { workspaceRevision: nextRevision };
  });
}
