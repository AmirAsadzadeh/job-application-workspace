import { join } from "node:path";
import { WorkspaceStateSchema, type WorkspaceState } from "@workspace/domain/onlineSchema";
import { readJsonFile, writeJsonFileAtomic } from "./atomicJson.js";

export const DEFAULT_WORKSPACE_STATE: WorkspaceState = {
  version: 1,
  selectedMode: "offline",
  selectedAccountId: null,
  updatedAt: new Date(0).toISOString(),
};

export async function loadWorkspaceState(workspaceRoot: string): Promise<WorkspaceState> {
  const value = await readJsonFile(join(workspaceRoot, "workspace-state.json"));
  return value === undefined ? DEFAULT_WORKSPACE_STATE : WorkspaceStateSchema.parse(value);
}

export async function saveWorkspaceState(workspaceRoot: string, state: WorkspaceState) {
  await writeJsonFileAtomic(join(workspaceRoot, "workspace-state.json"), WorkspaceStateSchema.parse(state));
}
