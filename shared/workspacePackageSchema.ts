import { z } from "zod";
import { PositionsDocumentSchema, ReferenceDataSchema } from "./positionSchema.js";

export const WORKSPACE_FORMAT_VERSION = 1 as const;
export const workspacePackageLimits = {
  maxCompressedBytes: 512 * 1024 * 1024,
  maxExpandedBytes: 1024 * 1024 * 1024,
  maxEntries: 10_000,
  maxManifestBytes: 32 * 1024 * 1024,
} as const;

const safeArchivePath = z.string().min(1).refine((value) => {
  if (value.includes("\\") || value.startsWith("/") || /^[A-Za-z]:/.test(value) || /[\x00-\x1f\x7f]/.test(value)) return false;
  return value.split("/").every((part) => part && part !== "." && part !== "..");
}, "Archive path is unsafe.");

export const WorkspaceManagedFileSchema = z.object({
  kind: z.enum(["submitted_resume", "company_logo"]),
  ownerPositionId: z.string().trim().min(1),
  sourceRelativePath: z.string().trim().min(1),
  archivePath: safeArchivePath,
  mediaType: z.enum(["application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "image/png", "image/jpeg", "image/svg+xml"]),
  byteLength: z.number().int().nonnegative(),
  sha256: z.string().regex(/^[a-f0-9]{64}$/),
  originalFileName: z.string().trim().min(1).nullable(),
}).strict().superRefine((file, context) => {
  const expectedRoot = file.kind === "submitted_resume" ? "resume-files/" : "company-logo-files/";
  if (!file.archivePath.startsWith(expectedRoot)) context.addIssue({ code: "custom", path: ["archivePath"], message: "Archive path does not match file kind." });
  if (file.kind === "submitted_resume" && !file.originalFileName) context.addIssue({ code: "custom", path: ["originalFileName"], message: "Resume filename is required." });
  if (file.kind === "company_logo" && file.originalFileName !== null) context.addIssue({ code: "custom", path: ["originalFileName"], message: "Logo filename must be null." });
});

export const WorkspaceManifestSchema = z.object({
  formatVersion: z.literal(WORKSPACE_FORMAT_VERSION),
  exportedAt: z.string().datetime(),
  application: z.object({ name: z.literal("job-positions"), version: z.string().trim().min(1) }).strict(),
  positionsDocument: PositionsDocumentSchema,
  referenceData: ReferenceDataSchema,
  files: z.array(WorkspaceManagedFileSchema).max(workspacePackageLimits.maxEntries),
}).strict();

export const WorkspaceCountsSchema = z.object({
  positions: z.number().int().nonnegative(), platformLinks: z.number().int().nonnegative(), questions: z.number().int().nonnegative(),
  readings: z.number().int().nonnegative(), resumes: z.number().int().nonnegative(), logos: z.number().int().nonnegative(),
  departments: z.number().int().nonnegative(), teams: z.number().int().nonnegative(), locations: z.number().int().nonnegative(),
}).strict();

export const WorkspacePreviewSchema = z.object({
  importId: z.string().min(1), sourceFileName: z.string().min(1), formatVersion: z.literal(1), applicationVersion: z.string().min(1),
  exportedAt: z.string().datetime(), counts: WorkspaceCountsSchema, notices: z.array(z.string()), willReplaceWorkspace: z.literal(true), expiresAt: z.string().datetime(),
}).strict();

export const WorkspaceRestoreResultSchema = z.object({
  restored: z.literal(true), counts: WorkspaceCountsSchema,
  backup: z.object({ fileName: z.string().min(1), relativePath: z.string().regex(/^data\/backups\//), createdAt: z.string().datetime() }).strict(),
}).strict();

export type WorkspaceManifest = z.infer<typeof WorkspaceManifestSchema>;
export type WorkspaceCounts = z.infer<typeof WorkspaceCountsSchema>;
export type WorkspacePreview = z.infer<typeof WorkspacePreviewSchema>;
export type WorkspaceRestoreResult = z.infer<typeof WorkspaceRestoreResultSchema>;
