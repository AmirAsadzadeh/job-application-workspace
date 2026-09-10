import { and, eq, lt } from "drizzle-orm";
import { SynchronizationDirectionSchema } from "@workspace/domain/onlineSchema";
import { WorkspaceCountsSchema, type WorkspaceCounts } from "@workspace/domain/workspacePackageSchema";
import type { Database } from "../db/connection.js";
import { synchronizationAttempts, workspaces } from "../db/schema/index.js";

type AttemptStatus = typeof synchronizationAttempts.$inferSelect.status;
const terminal = new Set<AttemptStatus>(["completed", "cancelled", "failed", "expired"]);

export class SynchronizationRepositoryError extends Error {
  readonly statusCode: number;
  constructor(public readonly code: "SYNC_ATTEMPT_NOT_FOUND" | "SYNC_PREVIEW_EXPIRED" | "SYNC_SOURCE_INVALID" | "SYNC_DIRECTION_INVALID", message: string) {
    super(message);
    this.statusCode = code === "SYNC_ATTEMPT_NOT_FOUND" ? 404 : code === "SYNC_PREVIEW_EXPIRED" ? 410 : 422;
  }
}

export function createSynchronizationRepository(database: Database) {
  async function ownerWorkspace(ownerId: string) {
    const workspace = (await database.db.select().from(workspaces).where(eq(workspaces.ownerId, ownerId)).limit(1))[0];
    if (!workspace) throw new SynchronizationRepositoryError("SYNC_ATTEMPT_NOT_FOUND", "Synchronization attempt was not found.");
    return workspace;
  }

  async function get(ownerId: string, attemptId: string) {
    const workspace = await ownerWorkspace(ownerId);
    const attempt = (await database.db.select().from(synchronizationAttempts).where(and(eq(synchronizationAttempts.id, attemptId), eq(synchronizationAttempts.workspaceId, workspace.id))).limit(1))[0];
    if (!attempt) throw new SynchronizationRepositoryError("SYNC_ATTEMPT_NOT_FOUND", "Synchronization attempt was not found.");
    if (!terminal.has(attempt.status) && attempt.expiresAt <= new Date()) {
      const expired = (await database.db.update(synchronizationAttempts).set({ status: "expired" }).where(and(eq(synchronizationAttempts.id, attempt.id), eq(synchronizationAttempts.workspaceId, workspace.id))).returning())[0];
      return expired;
    }
    return attempt;
  }

  async function create(ownerId: string, input: { id: string; direction: string; sourceRevision: number | null; expectedDestinationRevision: number | null; sourceChecksum: string; sourceCounts: WorkspaceCounts; destinationCounts: WorkspaceCounts; conflict: boolean; expiresAt: Date; stagingGenerationId?: string | null }) {
    const workspace = await ownerWorkspace(ownerId);
    const direction = SynchronizationDirectionSchema.parse(input.direction);
    const sourceCounts = WorkspaceCountsSchema.parse(input.sourceCounts);
    const destinationCounts = WorkspaceCountsSchema.parse(input.destinationCounts);
    if (!/^[a-f0-9]{64}$/.test(input.sourceChecksum)) throw new SynchronizationRepositoryError("SYNC_SOURCE_INVALID", "Synchronization checksum is invalid.");
    const sameSource = () => database.db.select().from(synchronizationAttempts).where(and(eq(synchronizationAttempts.workspaceId, workspace.id), eq(synchronizationAttempts.direction, direction), eq(synchronizationAttempts.sourceChecksum, input.sourceChecksum))).limit(1);
    const existing = (await sameSource())[0];
    if (existing && !terminal.has(existing.status)) return existing;
    if (existing) {
      return (await database.db.update(synchronizationAttempts).set({
        status: "preview_ready", sourceRevision: input.sourceRevision, expectedDestinationRevision: input.expectedDestinationRevision,
        sourceCounts, destinationCounts, conflict: input.conflict, stagingGenerationId: input.stagingGenerationId ?? null,
        backupGenerationId: null, errorCode: null, expiresAt: input.expiresAt, completedAt: null,
      }).where(and(eq(synchronizationAttempts.id, existing.id), eq(synchronizationAttempts.workspaceId, workspace.id), eq(synchronizationAttempts.status, existing.status))).returning())[0] ?? (await sameSource())[0];
    }
    const inserted = (await database.db.insert(synchronizationAttempts).values({ ...input, direction, workspaceId: workspace.id, sourceCounts, destinationCounts, status: "preview_ready" }).onConflictDoNothing().returning())[0];
    return inserted ?? (await sameSource())[0] ?? get(ownerId, input.id);
  }

  async function transition(ownerId: string, attemptId: string, from: AttemptStatus[], to: AttemptStatus, values: { errorCode?: string | null; backupGenerationId?: string | null; stagingGenerationId?: string | null } = {}) {
    const attempt = await get(ownerId, attemptId);
    if (attempt.status === "expired") throw new SynchronizationRepositoryError("SYNC_PREVIEW_EXPIRED", "Synchronization preview expired.");
    if (!from.includes(attempt.status)) {
      if (attempt.status === to) return attempt;
      throw new SynchronizationRepositoryError("SYNC_SOURCE_INVALID", "Synchronization state transition is invalid.");
    }
    const workspace = await ownerWorkspace(ownerId);
    return (await database.db.update(synchronizationAttempts).set({ status: to, ...values, completedAt: to === "completed" ? new Date() : attempt.completedAt }).where(and(eq(synchronizationAttempts.id, attemptId), eq(synchronizationAttempts.workspaceId, workspace.id), eq(synchronizationAttempts.status, attempt.status))).returning())[0]
      ?? get(ownerId, attemptId);
  }

  async function expireDue(now = new Date()) {
    return database.db.update(synchronizationAttempts).set({ status: "expired" }).where(and(lt(synchronizationAttempts.expiresAt, now), eq(synchronizationAttempts.status, "preview_ready"))).returning({ id: synchronizationAttempts.id });
  }

  return { create, get, transition, expireDue };
}
