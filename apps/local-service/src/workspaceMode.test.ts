import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { loadWorkspaceState, saveWorkspaceState } from "./workspaceModeState.js";
import { accountWorkspacePaths, normalizeWorkspaceLayout } from "./workspaceLayout.js";

const roots: string[] = [];
afterEach(async () => Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true }))));

async function root() {
  const value = await mkdtemp(join(tmpdir(), "workspace-mode-"));
  roots.push(value);
  return value;
}

describe("workspace mode state", () => {
  it("defaults existing installations to Offline and persists explicit Online selection", async () => {
    const workspaceRoot = await root();
    expect(await loadWorkspaceState(workspaceRoot)).toMatchObject({ selectedMode: "offline", selectedAccountId: null });
    await saveWorkspaceState(workspaceRoot, { version: 1, selectedMode: "online", selectedAccountId: "account-a", updatedAt: new Date().toISOString() });
    expect(await loadWorkspaceState(workspaceRoot)).toMatchObject({ selectedMode: "online", selectedAccountId: "account-a" });
    expect(await readFile(join(workspaceRoot, "workspace-state.json"), "utf8")).not.toMatch(/token|password|secret/i);
  });

  it("isolates account working-copy directories", async () => {
    const workspaceRoot = await root();
    expect(accountWorkspacePaths(workspaceRoot, "account-a").root).not.toBe(accountWorkspacePaths(workspaceRoot, "account-b").root);
  });

  it("normalizes a legacy workspace once after creating a backup", async () => {
    const workspaceRoot = await root();
    await writeFile(join(workspaceRoot, "positions.json"), '{"version":6,"listView":{"mode":"manual","column":null,"direction":null},"positions":[]}');
    await writeFile(join(workspaceRoot, "reference-data.json"), '{"version":1,"departments":[],"locations":[]}');
    await mkdir(join(workspaceRoot, "resumes"));
    const first = await normalizeWorkspaceLayout(workspaceRoot);
    const second = await normalizeWorkspaceLayout(workspaceRoot);
    expect(first.migrated).toBe(true);
    expect(second.migrated).toBe(false);
    expect(await readFile(join(workspaceRoot, "offline", "positions.json"), "utf8")).toContain('"positions"');
    expect(first.backupPath).toBeTruthy();
  });
});
