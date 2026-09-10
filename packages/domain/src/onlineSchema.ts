import { z } from "zod";
import { PositionSchema, PositionsDocumentSchema, ReferenceDataSchema } from "./positionSchema.js";
import { WorkspaceCountsSchema } from "./workspacePackageSchema.js";

export const WorkspaceModeSchema = z.enum(["offline", "online"]);
export const WorkspaceStateSchema = z.object({
  version: z.literal(1),
  selectedMode: WorkspaceModeSchema,
  selectedAccountId: z.string().min(1).nullable(),
  updatedAt: z.iso.datetime(),
}).strict().superRefine((value, context) => {
  if (value.selectedMode === "online" && !value.selectedAccountId) {
    context.addIssue({ code: "custom", path: ["selectedAccountId"], message: "Online mode requires an account." });
  }
});

export const OnlineSyncStateSchema = z.object({
  version: z.literal(1),
  accountId: z.string().min(1),
  lastConfirmedRemoteRevision: z.number().int().nonnegative().nullable(),
  pending: z.boolean(),
  pendingSince: z.iso.datetime().nullable(),
  lastConfirmedAt: z.iso.datetime().nullable(),
  lastConnectivityCheckAt: z.iso.datetime().nullable(),
}).strict().superRefine((value, context) => {
  if (value.pending !== Boolean(value.pendingSince)) {
    context.addIssue({ code: "custom", path: ["pendingSince"], message: "Pending state requires a matching timestamp." });
  }
});

export const OnlineWorkspaceSchema = z.object({
  revision: z.number().int().nonnegative(),
  updatedAt: z.iso.datetime().optional(),
  positions: PositionsDocumentSchema,
  referenceData: ReferenceDataSchema,
}).strict();

export const RevisionedPositionSchema = z.object({
  workspaceRevision: z.number().int().nonnegative(),
  position: PositionSchema,
}).strict();

export const SynchronizationDirectionSchema = z.enum(["offline_to_online", "working_copy_to_online", "online_to_offline", "online_to_working_copy"]);
export const SynchronizationPreviewSchema = z.object({
  attemptId: z.uuid(),
  direction: SynchronizationDirectionSchema,
  source: z.object({ revision: z.number().int().nonnegative().nullable(), counts: WorkspaceCountsSchema, updatedAt: z.iso.datetime().nullable(), checksum: z.string().regex(/^[a-f0-9]{64}$/) }).strict(),
  destination: z.object({ revision: z.number().int().nonnegative().nullable(), counts: WorkspaceCountsSchema, updatedAt: z.iso.datetime().nullable() }).strict(),
  conflict: z.boolean(),
  willReplace: z.literal("online"),
  willMerge: z.literal(false),
  backupRequired: z.literal(true),
  expiresAt: z.iso.datetime(),
}).strict();

export const SynchronizationResultSchema = z.object({
  attemptId: z.uuid(),
  status: z.literal("completed"),
  revision: z.number().int().positive(),
  backup: z.object({ id: z.uuid(), createdAt: z.iso.datetime() }).strict(),
  counts: WorkspaceCountsSchema,
  completedAt: z.iso.datetime(),
}).strict();

export type WorkspaceState = z.infer<typeof WorkspaceStateSchema>;
export type OnlineSyncState = z.infer<typeof OnlineSyncStateSchema>;
export type SynchronizationDirection = z.infer<typeof SynchronizationDirectionSchema>;
export type SynchronizationPreview = z.infer<typeof SynchronizationPreviewSchema>;
export type SynchronizationResult = z.infer<typeof SynchronizationResultSchema>;
