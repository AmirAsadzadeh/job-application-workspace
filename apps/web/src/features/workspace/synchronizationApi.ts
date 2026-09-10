import { SynchronizationPreviewSchema, SynchronizationResultSchema, type SynchronizationDirection, type SynchronizationPreview, type SynchronizationResult } from "@workspace/domain/onlineSchema";
import { WorkspaceCountsSchema, WorkspacePreviewSchema, WorkspaceRestoreResultSchema, type WorkspaceCounts, type WorkspaceRestoreResult } from "@workspace/domain/workspacePackageSchema";
import { z } from "zod";
import type { createDesktopOnlineApi } from "./desktopOnlineApi";

type RemoteApi = ReturnType<typeof createDesktopOnlineApi>;
type LocalSelection = { kind: "offline" } | { kind: "working_copy"; accountId: string };
const LocalSynchronizationPreviewSchema = WorkspacePreviewSchema.extend({
  target: z.enum(["offline", "online"]),
  destination: z.object({ revision: z.null(), updatedAt: z.iso.datetime(), counts: WorkspaceCountsSchema }).strict(),
}).strict();

export type SynchronizationPlan = {
  direction: SynchronizationDirection;
  source: { revision: number | null; updatedAt: string | null; checksum: string; counts: WorkspaceCounts };
  destination: { revision: number | null; updatedAt: string | null; counts: WorkspaceCounts };
  conflict: boolean;
  willReplace: "online" | "offline" | "working_copy";
  willMerge: false;
  backupRequired: true;
  expiresAt: string;
};

export type PreparedSynchronization = {
  preview: SynchronizationPlan;
  confirm(): Promise<(SynchronizationResult & { workingCopyRefreshed?: boolean; refreshError?: string }) | WorkspaceRestoreResult>;
  cancel(): Promise<void>;
};

async function checksum(blob: Blob) {
  const digest = await crypto.subtle.digest("SHA-256", await blob.arrayBuffer());
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function localRequest(baseUrl: string, path: string, init: RequestInit = {}) {
  const response = await fetch(new URL(path, baseUrl), { ...init, cache: "no-store" });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body?.error?.message ?? "The local synchronization request failed.");
  }
  return response;
}

function selectionQuery(name: "source" | "target", selection: LocalSelection, remoteRevision?: number) {
  const query = new URLSearchParams({ [name]: selection.kind });
  if (selection.kind === "working_copy") query.set("accountId", selection.accountId);
  if (remoteRevision !== undefined) query.set("remoteRevision", String(remoteRevision));
  return query;
}

export function createSynchronizationApi(remote: RemoteApi, localBaseUrl: string) {
  async function replaceWorkingCopy(accountId: string) {
    const exported = await remote.downloadWorkspace();
    const destination: LocalSelection = { kind: "working_copy", accountId };
    const query = selectionQuery("target", destination, exported.revision);
    const staged = LocalSynchronizationPreviewSchema.parse(await (await localRequest(localBaseUrl, `/api/synchronizations/local/import?${query}`, { method: "PUT", headers: { "content-type": "application/zip", "x-workspace-filename": encodeURIComponent(exported.fileName) }, body: exported.blob })).json());
    await localRequest(localBaseUrl, `/api/synchronizations/local/import/${encodeURIComponent(staged.importId)}/restore?${query}`, { method: "POST" });
  }

  async function previewLocalToOnline(direction: "offline_to_online" | "working_copy_to_online", accountId: string): Promise<PreparedSynchronization> {
    if (!accountId.trim()) throw new Error("An account is required for synchronization.");
    const source: LocalSelection = direction === "offline_to_online" ? { kind: "offline" } : { kind: "working_copy", accountId };
    const exported = await localRequest(localBaseUrl, `/api/synchronizations/local/export?${selectionQuery("source", source)}`);
    const packageBlob = await exported.blob();
    const mode = source.kind === "working_copy" ? await (await localRequest(localBaseUrl, "/api/workspace/mode")).json() : null;
    const lastConfirmedRevision = mode?.sync?.lastConfirmedRemoteRevision ?? null;
    const headers = new Headers({ "content-type": "application/zip", "idempotency-key": crypto.randomUUID(), "x-sync-direction": direction });
    if (lastConfirmedRevision !== null) {
      headers.set("x-last-confirmed-revision", String(lastConfirmedRevision));
      headers.set("x-source-revision", String(lastConfirmedRevision));
    }
    const preview = SynchronizationPreviewSchema.parse(await remote.request("/api/synchronizations/uploads", { method: "POST", headers, body: packageBlob }));
    return {
      preview: preview as SynchronizationPlan,
      confirm: async () => {
        const result = SynchronizationResultSchema.parse(await remote.request(`/api/synchronizations/${encodeURIComponent(preview.attemptId)}/confirm`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ sourceChecksum: preview.source.checksum, expectedDestinationRevision: preview.destination.revision, confirmReplacement: true }) }));
        try {
          await replaceWorkingCopy(accountId);
          return { ...result, workingCopyRefreshed: true };
        } catch {
          return { ...result, workingCopyRefreshed: false, refreshError: "Online replacement completed, but the local working copy still needs to be refreshed." };
        }
      },
      cancel: async () => { await remote.request(`/api/synchronizations/${encodeURIComponent(preview.attemptId)}`, { method: "DELETE" }); },
    };
  }

  async function previewOnlineToLocal(direction: "online_to_offline" | "online_to_working_copy", accountId?: string): Promise<PreparedSynchronization> {
    const destination: LocalSelection = direction === "online_to_offline" ? { kind: "offline" } : { kind: "working_copy", accountId: accountId ?? "" };
    if (destination.kind === "working_copy" && !destination.accountId) throw new Error("An account is required for the Online working copy.");
    const exported = await remote.downloadWorkspace();
    const query = selectionQuery("target", destination, exported.revision);
    const localPreviewResponse = await localRequest(localBaseUrl, `/api/synchronizations/local/import?${query}`, { method: "PUT", headers: { "content-type": "application/zip", "x-workspace-filename": encodeURIComponent(exported.fileName) }, body: exported.blob });
    const staged = LocalSynchronizationPreviewSchema.parse(await localPreviewResponse.json());
    const sourceChecksum = await checksum(exported.blob);
    const preview: SynchronizationPlan = {
      direction,
      source: { revision: exported.revision, updatedAt: staged.exportedAt, checksum: sourceChecksum, counts: staged.counts },
      destination: staged.destination,
      conflict: destination.kind === "working_copy" && Boolean((await (await localRequest(localBaseUrl, "/api/workspace/mode")).json())?.sync?.pending),
      willReplace: destination.kind,
      willMerge: false,
      backupRequired: true,
      expiresAt: staged.expiresAt,
    };
    const path = `/api/synchronizations/local/import/${encodeURIComponent(staged.importId)}`;
    return {
      preview,
      confirm: async () => WorkspaceRestoreResultSchema.parse(await (await localRequest(localBaseUrl, `${path}/restore?${query}`, { method: "POST" })).json()),
      cancel: async () => { await localRequest(localBaseUrl, `${path}?${query}`, { method: "DELETE" }); },
    };
  }

  return { previewLocalToOnline, previewOnlineToLocal };
}

export type { SynchronizationPreview };
