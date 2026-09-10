import { OnlineSyncStateSchema, type OnlineSyncState } from "@workspace/domain/onlineSchema";
import { accountWorkspacePaths } from "./workspaceLayout.js";
import { readJsonFile, writeJsonFileAtomic } from "./atomicJson.js";

export function defaultOnlineSyncState(accountId: string): OnlineSyncState {
  return { version: 1, accountId, lastConfirmedRemoteRevision: null, pending: false, pendingSince: null, lastConfirmedAt: null, lastConnectivityCheckAt: null };
}

export async function loadOnlineSyncState(workspaceRoot: string, accountId: string): Promise<OnlineSyncState> {
  const value = await readJsonFile(accountWorkspacePaths(workspaceRoot, accountId).syncStatePath);
  const state = value === undefined ? defaultOnlineSyncState(accountId) : OnlineSyncStateSchema.parse(value);
  if (state.accountId !== accountId) throw new Error("Online working copy belongs to another account.");
  return state;
}

export async function saveOnlineSyncState(workspaceRoot: string, accountId: string, state: OnlineSyncState) {
  if (state.accountId !== accountId) throw new Error("Online working copy belongs to another account.");
  await writeJsonFileAtomic(accountWorkspacePaths(workspaceRoot, accountId).syncStatePath, OnlineSyncStateSchema.parse(state));
}
