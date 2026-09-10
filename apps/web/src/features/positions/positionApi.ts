import { ListViewPreferenceSchema, PositionSchema, PositionSummarySchema, ReferenceDataSchema, type CreatePositionInput, type ListViewPreference, type PositionDetailsUpdate, type PositionQuestionInput, type PositionStatus, type ReadingItemInput, type ReorderPositionInput } from "@workspace/domain/positionSchema";
import { WorkspacePreviewSchema, WorkspaceRestoreResultSchema } from "@workspace/domain/workspacePackageSchema";

export type PositionApiIssue = { path: string; message: string };

export class PositionApiError extends Error {
  constructor(message: string, public readonly status: number, public readonly issues: PositionApiIssue[] = [], public readonly code = "REQUEST_FAILED") {
    super(message);
  }
}

async function requestJson(url: string, init?: RequestInit) {
  const response = await fetch(url, init);
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new PositionApiError(body?.error?.message ?? "Request failed.", response.status, Array.isArray(body?.error?.issues) ? body.error.issues : [], body?.error?.code ?? "REQUEST_FAILED");
  return body;
}

export async function listPositions(filters: { q?: string; status?: PositionStatus }) {
  const params = new URLSearchParams();
  if (filters.q?.trim()) params.set("q", filters.q.trim());
  if (filters.status) params.set("status", filters.status);
  const body = await requestJson(`/api/positions${params.size ? `?${params}` : ""}`);
  return {
    positions: PositionSummarySchema.array().parse(body.positions),
    listView: ListViewPreferenceSchema.parse(body.listView),
  };
}

export async function updateListView(input: ListViewPreference) {
  const body = await requestJson("/api/positions/list-view", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(input) });
  return ListViewPreferenceSchema.parse(body.listView);
}

export async function reorderPosition(input: ReorderPositionInput) {
  const body = await requestJson("/api/positions/order", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(input) });
  return PositionSummarySchema.array().parse(body.positions);
}

export async function getPosition(id: string) {
  const body = await requestJson(`/api/positions/${encodeURIComponent(id)}`);
  return PositionSchema.parse(body.position);
}

export async function getReferenceData() {
  return ReferenceDataSchema.parse(await requestJson("/api/reference-data"));
}

export async function updatePosition(id: string, update: PositionDetailsUpdate) {
  const body = await requestJson(`/api/positions/${encodeURIComponent(id)}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(update) });
  return PositionSchema.parse(body.position);
}

export async function createPosition(input: CreatePositionInput) {
  const body = await requestJson("/api/positions", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(input) });
  return PositionSchema.parse(body.position);
}

export async function createQuestion(positionId: string, input: PositionQuestionInput) {
  const body = await requestJson(`/api/positions/${encodeURIComponent(positionId)}/questions`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(input) });
  return PositionSchema.parse(body.position);
}

export async function updateQuestion(positionId: string, questionId: string, input: PositionQuestionInput) {
  const body = await requestJson(`/api/positions/${encodeURIComponent(positionId)}/questions/${encodeURIComponent(questionId)}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(input) });
  return PositionSchema.parse(body.position);
}

export async function deleteQuestion(positionId: string, questionId: string) {
  const body = await requestJson(`/api/positions/${encodeURIComponent(positionId)}/questions/${encodeURIComponent(questionId)}`, { method: "DELETE" });
  return PositionSchema.parse(body.position);
}

export async function createReading(positionId: string, input: ReadingItemInput) {
  const body = await requestJson(`/api/positions/${encodeURIComponent(positionId)}/readiness/readings`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(input) });
  return PositionSchema.parse(body.position);
}

export async function updateReading(positionId: string, readingId: string, input: ReadingItemInput) {
  const body = await requestJson(`/api/positions/${encodeURIComponent(positionId)}/readiness/readings/${encodeURIComponent(readingId)}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(input) });
  return PositionSchema.parse(body.position);
}

export async function deleteReading(positionId: string, readingId: string) {
  const body = await requestJson(`/api/positions/${encodeURIComponent(positionId)}/readiness/readings/${encodeURIComponent(readingId)}`, { method: "DELETE" });
  return PositionSchema.parse(body.position);
}

export async function uploadResume(positionId: string, file: File) {
  const body = await requestJson(`/api/positions/${encodeURIComponent(positionId)}/readiness/resume`, {
    method: "PUT",
    headers: { "content-type": file.type || "application/octet-stream", "x-resume-filename": encodeURIComponent(file.name) },
    body: file,
  });
  return PositionSchema.parse(body.position);
}

export function getResumeOpenUrl(positionId: string) {
  return `/api/positions/${encodeURIComponent(positionId)}/readiness/resume`;
}

export async function checkResumeAvailability(positionId: string) {
  const response = await fetch(getResumeOpenUrl(positionId), { method: "HEAD", cache: "no-store" });
  return response.ok;
}

export async function removeResume(positionId: string) {
  const body = await requestJson(getResumeOpenUrl(positionId), { method: "DELETE" });
  return PositionSchema.parse(body.position);
}

export async function exportWorkspace() {
  const response = await fetch("/api/workspace/export", { cache: "no-store" });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new PositionApiError(body?.error?.message ?? "Could not export the workspace.", response.status, [], body?.error?.code);
  }
  const disposition = response.headers.get("content-disposition") ?? "";
  const fileName = disposition.match(/filename="([^"]+)"/)?.[1] ?? "positions-workspace.zip";
  return { blob: await response.blob(), fileName };
}

export async function validateWorkspaceImport(file: File) {
  const body = await requestJson("/api/workspace/import", { method: "PUT", headers: { "content-type": "application/zip", "x-workspace-filename": encodeURIComponent(file.name) }, body: file });
  return WorkspacePreviewSchema.parse(body);
}

export async function cancelWorkspaceImport(importId: string) {
  const response = await fetch(`/api/workspace/import/${encodeURIComponent(importId)}`, { method: "DELETE" });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new PositionApiError(body?.error?.message ?? "Could not cancel the import.", response.status, [], body?.error?.code);
  }
}

export async function restoreWorkspaceImport(importId: string) {
  return WorkspaceRestoreResultSchema.parse(await requestJson(`/api/workspace/import/${encodeURIComponent(importId)}/restore`, { method: "POST" }));
}

export const positionApi = { listPositions, updateListView, reorderPosition, getPosition, getReferenceData, createPosition, updatePosition, createQuestion, updateQuestion, deleteQuestion, createReading, updateReading, deleteReading, uploadResume, getResumeOpenUrl, checkResumeAvailability, removeResume, exportWorkspace, validateWorkspaceImport, cancelWorkspaceImport, restoreWorkspaceImport };
