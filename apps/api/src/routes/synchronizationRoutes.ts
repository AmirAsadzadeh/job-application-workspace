import type { Readable } from "node:stream";
import type { FastifyInstance, FastifyRequest } from "fastify";
import { z } from "zod";
import { workspacePackageLimits } from "@workspace/domain/workspacePackageSchema";
import type { WorkspaceAuth } from "../auth/auth.js";
import { requireSession } from "../auth/requireSession.js";
import type { Database } from "../db/connection.js";
import type { ObjectStorage } from "../storage/objectStorage.js";
import { createGenerationService } from "../sync/generationService.js";
import { createPreviewService } from "../sync/previewService.js";
import { createReplacementService } from "../sync/replacementService.js";
import { createSynchronizationRepository, SynchronizationRepositoryError } from "../sync/synchronizationRepository.js";
import { stageSynchronizationUpload } from "../sync/uploadService.js";

const UploadHeadersSchema = z.object({
  idempotencyKey: z.uuid(),
  direction: z.enum(["offline_to_online", "working_copy_to_online"]),
  lastConfirmedRevision: z.number().int().nonnegative().nullable(),
  sourceRevision: z.number().int().nonnegative().nullable(),
}).strict();

const ConfirmationSchema = z.object({
  sourceChecksum: z.string().regex(/^[a-f0-9]{64}$/),
  expectedDestinationRevision: z.number().int().nonnegative(),
  confirmReplacement: z.literal(true),
}).strict();

function header(request: FastifyRequest, name: string) {
  const value = request.headers[name];
  return Array.isArray(value) ? value[0] : value;
}

function optionalRevision(value: string | undefined) {
  if (value === undefined || value === "") return null;
  const revision = Number(value);
  if (!Number.isInteger(revision) || revision < 0) throw new SynchronizationRepositoryError("SYNC_SOURCE_INVALID", "Synchronization revision headers must be non-negative integers.");
  return revision;
}

function uploadHeaders(request: FastifyRequest) {
  const direction = header(request, "x-sync-direction");
  const parsed = UploadHeadersSchema.safeParse({
    idempotencyKey: header(request, "idempotency-key"),
    direction,
    lastConfirmedRevision: optionalRevision(header(request, "x-last-confirmed-revision")),
    sourceRevision: optionalRevision(header(request, "x-source-revision")),
  });
  if (!parsed.success) {
    const code = direction && !["offline_to_online", "working_copy_to_online"].includes(direction) ? "SYNC_DIRECTION_INVALID" : "SYNC_SOURCE_INVALID";
    throw new SynchronizationRepositoryError(code, code === "SYNC_DIRECTION_INVALID" ? "This synchronization direction is not supported by the upload endpoint." : "Synchronization upload headers are invalid.");
  }
  return parsed.data;
}

export function registerSynchronizationRoutes(server: FastifyInstance, auth: WorkspaceAuth, database: Database, storage: ObjectStorage) {
  const authenticated = requireSession(auth);
  const attempts = createSynchronizationRepository(database);
  const generations = createGenerationService(database, storage);
  const previews = createPreviewService(database);
  const replacements = createReplacementService(database, storage);

  server.post("/api/synchronizations/uploads", {
    preHandler: authenticated,
    bodyLimit: workspacePackageLimits.maxCompressedBytes + 1,
  }, async (request, reply) => {
    const headers = uploadHeaders(request);
    const body = request.body as Readable | undefined;
    if (!body || typeof body[Symbol.asyncIterator] !== "function") throw new SynchronizationRepositoryError("SYNC_SOURCE_INVALID", "Choose a workspace ZIP package.");

    const staged = await stageSynchronizationUpload(body);
    let generationId: string | null = null;
    try {
      const expiresAt = new Date(Date.now() + 30 * 60 * 1000);
      const generation = await generations.stageSourcePackage(request.account!.id, staged, headers.sourceRevision, expiresAt);
      generationId = generation.id;
      const preview = await previews.create(request.account!.id, {
        attemptId: headers.idempotencyKey,
        direction: headers.direction,
        sourceRevision: headers.sourceRevision,
        lastConfirmedRevision: headers.lastConfirmedRevision,
        checksum: staged.checksum,
        sourceCounts: staged.counts,
        sourceUpdatedAt: staged.manifest.exportedAt,
        stagingGenerationId: generation.id,
      });
      if (preview.stagingGenerationId !== generation.id) await generations.discard(generation.id);
      generationId = null;
      const { stagingGenerationId: _internal, ...publicPreview } = preview;
      return reply.status(201).send(publicPreview);
    } catch (error) {
      if (generationId) await generations.discard(generationId);
      throw error;
    } finally {
      await staged.cleanup();
    }
  });

  server.post("/api/synchronizations/:attemptId/confirm", { preHandler: authenticated }, async (request) => {
    const attemptId = z.uuid().safeParse((request.params as { attemptId?: string }).attemptId);
    const confirmation = ConfirmationSchema.safeParse(request.body);
    if (!attemptId.success || !confirmation.success) throw new SynchronizationRepositoryError("SYNC_SOURCE_INVALID", "Synchronization confirmation is invalid.");
    return replacements.confirm(request.account!.id, { attemptId: attemptId.data, ...confirmation.data });
  });

  server.delete("/api/synchronizations/:attemptId", { preHandler: authenticated }, async (request, reply) => {
    const attemptId = z.uuid().safeParse((request.params as { attemptId?: string }).attemptId);
    if (!attemptId.success) throw new SynchronizationRepositoryError("SYNC_ATTEMPT_NOT_FOUND", "Synchronization attempt was not found.");
    const attempt = await attempts.get(request.account!.id, attemptId.data);
    const cancelled = await attempts.transition(request.account!.id, attempt.id, ["preview_ready"], "cancelled");
    if (cancelled.stagingGenerationId) await generations.discard(cancelled.stagingGenerationId);
    return reply.status(204).send();
  });
}
