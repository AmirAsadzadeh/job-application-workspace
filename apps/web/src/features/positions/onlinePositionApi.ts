import {
  ListViewPreferenceSchema,
  PositionSchema,
  PositionSummarySchema,
  ReferenceDataSchema,
  type CreatePositionInput,
  type ListViewPreference,
  type PositionDetailsUpdate,
  type PositionQuestionInput,
  type PositionStatus,
  type ReadingItemInput,
  type ReorderPositionInput,
} from "@workspace/domain/positionSchema";
import { PositionApiError } from "./positionApi";

type Json = Record<string, unknown>;
let authenticationFailureHandler: (() => void) | null = null;

export function setOnlineAuthenticationFailureHandler(handler: (() => void) | null) {
  authenticationFailureHandler = handler;
}

export function createOnlinePositionApi() {
  let revision: number | null = null;

  async function request(url: string, init: RequestInit = {}) {
    const headers = new Headers(init.headers);
    if (init.method && init.method !== "GET" && init.method !== "HEAD") {
      if (revision === null) await refreshRevision();
      headers.set("if-match", String(revision));
    }
    const response = await fetch(url, { ...init, headers, credentials: "include" });
    const body = await response.json().catch(() => ({})) as Json;
    if (!response.ok) {
      if (response.status === 409) revision = null;
      if (response.status === 401) authenticationFailureHandler?.();
      const envelope = body.error as { message?: string; code?: string; issues?: Array<{ path: string; message: string }> } | undefined;
      throw new PositionApiError(envelope?.message ?? "Request failed.", response.status, envelope?.issues ?? [], envelope?.code ?? "REQUEST_FAILED");
    }
    const nextRevision = body.workspaceRevision ?? body.revision;
    if (typeof nextRevision === "number") revision = nextRevision;
    return body;
  }

  async function refreshRevision() {
    const response = await fetch("/api/workspace/revision", { credentials: "include", cache: "no-store" });
    const body = await response.json().catch(() => ({})) as Json;
    if (!response.ok || typeof body.revision !== "number") throw new PositionApiError("Could not read the Online workspace revision.", response.status);
    revision = body.revision;
    return revision;
  }

  async function listPositions(filters: { q?: string; status?: PositionStatus }) {
    const params = new URLSearchParams();
    if (filters.q?.trim()) params.set("q", filters.q.trim());
    if (filters.status) params.set("status", filters.status);
    const body = await request(`/api/positions${params.size ? `?${params}` : ""}`);
    return { positions: PositionSummarySchema.array().parse(body.positions), listView: ListViewPreferenceSchema.parse(body.listView) };
  }

  async function updateListView(input: ListViewPreference) {
    const body = await request("/api/positions/list-view", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(input) });
    return ListViewPreferenceSchema.parse(body.listView);
  }

  async function reorderPosition(input: ReorderPositionInput) {
    const listed = await listPositions({});
    const ids = listed.positions.map((position) => position.id).filter((id) => id !== input.positionId);
    const target = input.beforePositionId === null ? ids.length : ids.indexOf(input.beforePositionId);
    ids.splice(target < 0 ? ids.length : target, 0, input.positionId);
    await request("/api/positions/order", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ orderedIds: ids }) });
    return (await listPositions({})).positions;
  }

  async function getPosition(id: string) {
    return PositionSchema.parse((await request(`/api/positions/${encodeURIComponent(id)}`)).position);
  }

  async function getReferenceData() {
    return ReferenceDataSchema.parse(await request("/api/reference-data"));
  }

  async function updatePosition(id: string, update: PositionDetailsUpdate) {
    return PositionSchema.parse((await request(`/api/positions/${encodeURIComponent(id)}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(update) })).position);
  }

  async function createPosition(input: CreatePositionInput) {
    const logo = input.companyLogo;
    const initial = logo.kind === "upload" ? { ...input, companyLogo: { kind: "none" as const } } : input;
    const body = await request("/api/positions", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(initial) });
    const position = PositionSchema.parse(body.position);
    if (logo.kind !== "upload") return position;
    const bytes = Uint8Array.from(atob(logo.dataBase64), (character) => character.charCodeAt(0));
    await request(`/api/positions/${encodeURIComponent(position.id)}/company-logo`, { method: "PUT", headers: { "content-type": logo.mediaType, "x-file-name": encodeURIComponent(logo.fileName) }, body: bytes });
    return getPosition(position.id);
  }

  async function mutateNested(positionId: string, path: string, method: string, input?: unknown) {
    const body = await request(`/api/positions/${encodeURIComponent(positionId)}/${path}`, { method, headers: input ? { "content-type": "application/json" } : undefined, body: input ? JSON.stringify(input) : undefined });
    return PositionSchema.parse(body.position);
  }

  const createQuestion = (positionId: string, input: PositionQuestionInput) => mutateNested(positionId, "questions", "POST", input);
  const updateQuestion = (positionId: string, questionId: string, input: PositionQuestionInput) => mutateNested(positionId, `questions/${encodeURIComponent(questionId)}`, "PATCH", input);
  const deleteQuestion = (positionId: string, questionId: string) => mutateNested(positionId, `questions/${encodeURIComponent(questionId)}`, "DELETE");
  const createReading = (positionId: string, input: ReadingItemInput) => mutateNested(positionId, "readiness/readings", "POST", input);
  const updateReading = (positionId: string, readingId: string, input: ReadingItemInput) => mutateNested(positionId, `readiness/readings/${encodeURIComponent(readingId)}`, "PATCH", input);
  const deleteReading = (positionId: string, readingId: string) => mutateNested(positionId, `readiness/readings/${encodeURIComponent(readingId)}`, "DELETE");

  async function uploadResume(positionId: string, file: File) {
    await request(`/api/positions/${encodeURIComponent(positionId)}/application/resume`, { method: "PUT", headers: { "content-type": file.type, "x-file-name": encodeURIComponent(file.name) }, body: file });
    return getPosition(positionId);
  }
  const getResumeMetadataUrl = (positionId: string) => `/api/positions/${encodeURIComponent(positionId)}/application/resume`;
  const getResumeOpenUrl = (positionId: string) => `${getResumeMetadataUrl(positionId)}?download=1`;
  async function checkResumeAvailability(positionId: string) {
    const response = await fetch(getResumeMetadataUrl(positionId), { credentials: "include", cache: "no-store" });
    return response.ok;
  }
  async function removeResume(positionId: string) {
    await request(getResumeMetadataUrl(positionId), { method: "DELETE" });
    return getPosition(positionId);
  }

  async function exportWorkspace() {
    const response = await fetch("/api/workspace/export", { credentials: "include", cache: "no-store" });
    if (!response.ok) {
      const body = await response.json().catch(() => ({})) as { error?: { message?: string; code?: string } };
      throw new PositionApiError(body.error?.message ?? "Could not export the Online workspace.", response.status, [], body.error?.code);
    }
    const disposition = response.headers.get("content-disposition") ?? "";
    const fileName = disposition.match(/filename="([^"]+)"/)?.[1] ?? "positions-workspace.zip";
    return { blob: await response.blob(), fileName };
  }

  return { listPositions, updateListView, reorderPosition, getPosition, getReferenceData, updatePosition, createPosition, createQuestion, updateQuestion, deleteQuestion, createReading, updateReading, deleteReading, uploadResume, getResumeOpenUrl, checkResumeAvailability, removeResume, exportWorkspace, refreshRevision };
}

export const onlinePositionApi = createOnlinePositionApi();
