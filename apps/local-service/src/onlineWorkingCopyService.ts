import { OnlineWorkspaceSchema, type OnlineSyncState } from "@workspace/domain/onlineSchema";
import { accountWorkspacePaths } from "./workspaceLayout.js";
import { loadOnlineSyncState, saveOnlineSyncState } from "./onlineSyncState.js";
import { writeJsonFileAtomic } from "./atomicJson.js";

export function createOnlineWorkingCopyService(workspaceRoot: string, accountId: string) {
  const paths = accountWorkspacePaths(workspaceRoot, accountId);
  return {
    paths,
    state: () => loadOnlineSyncState(workspaceRoot, accountId),
    async confirmSnapshot(input: unknown) {
      const snapshot = OnlineWorkspaceSchema.parse(input);
      await writeJsonFileAtomic(paths.positionsPath, snapshot.positions);
      await writeJsonFileAtomic(paths.referenceDataPath, snapshot.referenceData);
      const now = new Date().toISOString();
      const state: OnlineSyncState = { version: 1, accountId, lastConfirmedRemoteRevision: snapshot.revision, pending: false, pendingSince: null, lastConfirmedAt: now, lastConnectivityCheckAt: now };
      await saveOnlineSyncState(workspaceRoot, accountId, state);
      return state;
    },
    async markPending() {
      const state = await loadOnlineSyncState(workspaceRoot, accountId);
      const pendingSince = state.pendingSince ?? new Date().toISOString();
      const next = { ...state, pending: true as const, pendingSince };
      await saveOnlineSyncState(workspaceRoot, accountId, next);
      return next;
    },
    async recordConnectivity(remoteRevision: number | null) {
      const state = await loadOnlineSyncState(workspaceRoot, accountId);
      const next = { ...state, lastConnectivityCheckAt: new Date().toISOString() };
      await saveOnlineSyncState(workspaceRoot, accountId, next);
      if (!state.pending) return { action: "none" as const, conflict: false, remoteRevision };
      return { action: "review_required" as const, conflict: state.lastConfirmedRemoteRevision !== null && remoteRevision !== state.lastConfirmedRemoteRevision, remoteRevision };
    },
    async saveWithFallback(options: { remoteSave: () => Promise<unknown>; saveLocally: () => Promise<void>; isConnectivityFailure: (error: unknown) => boolean }) {
      try {
        const snapshot = OnlineWorkspaceSchema.parse(await options.remoteSave());
        const state = await this.confirmSnapshot(snapshot);
        return { saved: "online" as const, state };
      } catch (error) {
        if (!options.isConnectivityFailure(error)) throw error;
        await options.saveLocally();
        const state = await this.markPending();
        return { saved: "working_copy" as const, state };
      }
    },
  };
}
