import { randomUUID } from "node:crypto";
import { createReadStream } from "node:fs";
import { basename, join } from "node:path";
import { and, eq } from "drizzle-orm";
import type { Database } from "../db/connection.js";
import { managedFiles, workspaceGenerations, workspaces } from "../db/schema/index.js";
import { createOnlineWorkspaceRepository, OnlineWorkspaceError, type OnlineReplacementFile } from "../repositories/onlineWorkspaceRepository.js";
import { immutableObjectKey, type ObjectStorage } from "../storage/objectStorage.js";
import { createGenerationService } from "./generationService.js";
import { createSynchronizationRepository, SynchronizationRepositoryError } from "./synchronizationRepository.js";
import { stageSynchronizationUpload } from "./uploadService.js";

export function createReplacementService(database: Database, storage: ObjectStorage) {
  const attempts = createSynchronizationRepository(database);
  const generations = createGenerationService(database, storage);
  const repository = createOnlineWorkspaceRepository(database);

  return {
    async confirm(ownerId: string, input: { attemptId: string; sourceChecksum: string; expectedDestinationRevision: number; confirmReplacement: true }) {
      let attempt = await attempts.get(ownerId, input.attemptId);
      if (attempt.status === "completed") {
        const backup = attempt.backupGenerationId ? (await database.db.select().from(workspaceGenerations).where(eq(workspaceGenerations.id, attempt.backupGenerationId)).limit(1))[0] : null;
        return { attemptId: attempt.id, status: "completed" as const, revision: (attempt.expectedDestinationRevision ?? 0) + 1, backup: { id: attempt.backupGenerationId!, createdAt: backup?.createdAt.toISOString() ?? attempt.completedAt!.toISOString() }, counts: attempt.sourceCounts, completedAt: attempt.completedAt!.toISOString() };
      }
      if (attempt.status === "expired") throw new SynchronizationRepositoryError("SYNC_PREVIEW_EXPIRED", "Synchronization preview expired.");
      if (attempt.status !== "preview_ready") throw new SynchronizationRepositoryError("SYNC_SOURCE_INVALID", "Synchronization confirmation does not match its preview.");
      if (input.sourceChecksum !== attempt.sourceChecksum) throw Object.assign(new Error("Synchronization source changed after preview."), { statusCode: 409, code: "SYNC_SOURCE_CHANGED" });
      if (input.expectedDestinationRevision !== attempt.expectedDestinationRevision) throw Object.assign(new Error("Online data changed after preview."), { statusCode: 409, code: "SYNC_DESTINATION_CHANGED" });
      if (!attempt.stagingGenerationId) throw new SynchronizationRepositoryError("SYNC_SOURCE_INVALID", "Synchronization source is unavailable.");
      attempt = await attempts.transition(ownerId, attempt.id, ["preview_ready"], "confirming");
      const workspace = (await database.db.select().from(workspaces).where(eq(workspaces.ownerId, ownerId)).limit(1))[0];
      const generation = (await database.db.select().from(workspaceGenerations).where(and(eq(workspaceGenerations.id, attempt.stagingGenerationId!), eq(workspaceGenerations.workspaceId, workspace.id))).limit(1))[0];
      if (!workspace || !generation?.backupObjectKey) throw new SynchronizationRepositoryError("SYNC_SOURCE_INVALID", "Synchronization source is unavailable.");
      const oldFiles = await database.db.select({ objectKey: managedFiles.objectKey }).from(managedFiles).where(eq(managedFiles.workspaceId, workspace.id));
      const uploadedKeys: string[] = [];
      let staged: Awaited<ReturnType<typeof stageSynchronizationUpload>> | null = null;
      try {
        staged = await stageSynchronizationUpload(await storage.get(generation.backupObjectKey));
        if (staged.checksum !== attempt.sourceChecksum) throw Object.assign(new Error("Synchronization source changed after preview."), { statusCode: 409, code: "SYNC_SOURCE_CHANGED" });
        const backup = await generations.backupCurrent(ownerId).catch(() => { throw Object.assign(new Error("The Online backup could not be created."), { statusCode: 503, code: "SYNC_BACKUP_FAILED" }); });
        const replacementFiles: OnlineReplacementFile[] = [];
        for (const file of staged.manifest.files) {
          const id = randomUUID();
          const suffix = basename(file.archivePath).split(".").pop() ?? "bin";
          const objectKey = immutableObjectKey(ownerId, workspace.id, generation.id, `${id}.${suffix}`);
          await storage.putVerifiedStream(objectKey, createReadStream(join(staged.extractedPath, ...file.archivePath.split("/"))), file.mediaType, { byteLength: file.byteLength, sha256: file.sha256 });
          uploadedKeys.push(objectKey);
          replacementFiles.push({ id, positionId: file.ownerPositionId, kind: file.kind, originalFileName: file.originalFileName ?? basename(file.archivePath), mediaType: file.mediaType, byteLength: file.byteLength, sha256: file.sha256, objectKey });
        }
        const revision = await repository.replace(ownerId, staged.manifest.positionsDocument, staged.manifest.referenceData, input.expectedDestinationRevision, { files: replacementFiles, generationId: generation.id, attemptId: attempt.id, backupGenerationId: backup.id });
        await Promise.allSettled(oldFiles.map((file) => storage.remove(file.objectKey)));
        await storage.remove(generation.backupObjectKey).catch(() => undefined);
        const completedAt = new Date().toISOString();
        return { attemptId: attempt.id, status: "completed" as const, revision, backup: { id: backup.id, createdAt: backup.createdAt.toISOString() }, counts: attempt.sourceCounts, completedAt };
      } catch (error) {
        await Promise.allSettled(uploadedKeys.map((key) => storage.remove(key)));
        const failure = error as Error & { code?: string; statusCode?: number };
        const code = error instanceof OnlineWorkspaceError && error.code === "REVISION_CONFLICT" ? "SYNC_DESTINATION_CHANGED" : failure.code ?? "SYNC_REPLACEMENT_FAILED";
        await attempts.transition(ownerId, attempt.id, ["confirming"], "failed", { errorCode: code }).catch(() => undefined);
        if (error instanceof OnlineWorkspaceError && error.code === "REVISION_CONFLICT") throw Object.assign(new Error("Online data changed after preview."), { statusCode: 409, code });
        if (failure.statusCode && failure.code) throw error;
        throw Object.assign(new Error("The replacement could not be completed."), { statusCode: 500, code: "SYNC_REPLACEMENT_FAILED" });
      } finally {
        await staged?.cleanup();
      }
    },
  };
}
