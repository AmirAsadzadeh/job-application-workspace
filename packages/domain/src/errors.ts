import { z } from "zod";

export const ApiErrorCodeSchema = z.enum([
  "AUTH_REQUIRED",
  "EMAIL_VERIFICATION_REQUIRED",
  "FORBIDDEN",
  "NOT_FOUND",
  "VALIDATION_FAILED",
  "REVISION_CONFLICT",
  "FILE_INVALID",
  "SYNC_SOURCE_INVALID",
  "SYNC_UPLOAD_TOO_LARGE",
  "SYNC_PREVIEW_EXPIRED",
  "SYNC_SOURCE_CHANGED",
  "SYNC_DESTINATION_CHANGED",
  "SYNC_BACKUP_FAILED",
  "SYNC_REPLACEMENT_FAILED",
  "SYNC_ATTEMPT_NOT_FOUND",
  "SYNC_DIRECTION_INVALID",
  "STORAGE_UNAVAILABLE",
  "INTERNAL_ERROR",
]);

export const ApiErrorEnvelopeSchema = z.object({
  error: z.object({
    code: ApiErrorCodeSchema,
    message: z.string(),
    issues: z.array(z.object({ path: z.string(), message: z.string() })).optional(),
  }).strict(),
}).strict();

export type ApiErrorCode = z.infer<typeof ApiErrorCodeSchema>;
