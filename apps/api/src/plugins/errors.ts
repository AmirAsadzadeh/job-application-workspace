import type { FastifyInstance } from "fastify";
import type { ApiErrorCode } from "@workspace/domain/errors";

const KNOWN_CODES = new Set<ApiErrorCode>([
  "AUTH_REQUIRED", "EMAIL_VERIFICATION_REQUIRED", "FORBIDDEN", "NOT_FOUND", "VALIDATION_FAILED", "REVISION_CONFLICT", "FILE_INVALID",
  "SYNC_SOURCE_INVALID", "SYNC_UPLOAD_TOO_LARGE", "SYNC_PREVIEW_EXPIRED", "SYNC_SOURCE_CHANGED", "SYNC_DESTINATION_CHANGED",
  "SYNC_BACKUP_FAILED", "SYNC_REPLACEMENT_FAILED", "SYNC_ATTEMPT_NOT_FOUND", "SYNC_DIRECTION_INVALID", "STORAGE_UNAVAILABLE", "INTERNAL_ERROR",
]);

export function registerErrorHandler(server: FastifyInstance) {
  server.setErrorHandler((error, request, reply) => {
    const failure = error as Error & { statusCode?: number; code?: string };
    const status = typeof failure.statusCode === "number" && failure.statusCode >= 400 ? failure.statusCode : 500;
    const candidate = failure.code ?? "INTERNAL_ERROR";
    const code: ApiErrorCode = KNOWN_CODES.has(candidate as ApiErrorCode) ? candidate as ApiErrorCode : "INTERNAL_ERROR";
    if (status >= 500) request.log.error({ err: failure }, "Request failed");
    return reply.status(status).send({ error: { code, message: status >= 500 ? "The operation could not be completed." : failure.message } });
  });
}
