import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { createOnlineWorkingCopyService } from "./onlineWorkingCopyService.js";
import { loadOnlineSyncState } from "./onlineSyncState.js";

const roots: string[] = [];
afterEach(async () => Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true }))));

describe("Online working copy", () => {
  it("persists confirmed revisions and pending outage state across restart", async () => {
    const root = await mkdtemp(join(tmpdir(), "online-copy-"));
    roots.push(root);
    const service = createOnlineWorkingCopyService(root, "account-a");
    await service.confirmSnapshot({ revision: 4, positions: { version: 6, listView: { mode: "manual", column: null, direction: null }, positions: [] }, referenceData: { version: 1, departments: [], locations: [] } });
    await service.markPending();
    expect(await loadOnlineSyncState(root, "account-a")).toMatchObject({ lastConfirmedRemoteRevision: 4, pending: true });
    expect(await readFile(service.paths.positionsPath, "utf8")).toContain('"version": 6');
  });

  it("checks revision on reconnect without uploading or clearing pending work", async () => {
    const root = await mkdtemp(join(tmpdir(), "online-copy-"));
    roots.push(root);
    const service = createOnlineWorkingCopyService(root, "account-a");
    await service.markPending();
    const action = await service.recordConnectivity(9);
    expect(action).toEqual({ action: "review_required", conflict: false, remoteRevision: 9 });
    expect((await service.state()).pending).toBe(true);
  });

  it("updates the working copy after a confirmed save and uses local pending state only for connectivity failures", async () => {
    const root = await mkdtemp(join(tmpdir(), "online-copy-"));
    roots.push(root);
    const service = createOnlineWorkingCopyService(root, "account-a");
    let localSaves = 0;
    const snapshot = { revision: 8, positions: { version: 6, listView: { mode: "manual", column: null, direction: null }, positions: [] }, referenceData: { version: 1, departments: [], locations: [] } };
    const confirmed = await service.saveWithFallback({ remoteSave: async () => snapshot, saveLocally: async () => { localSaves += 1; }, isConnectivityFailure: () => false });
    expect(confirmed.saved).toBe("online");
    expect(localSaves).toBe(0);
    expect((await service.state()).lastConfirmedRemoteRevision).toBe(8);

    const pending = await service.saveWithFallback({ remoteSave: async () => { throw new TypeError("network"); }, saveLocally: async () => { localSaves += 1; }, isConnectivityFailure: (error) => error instanceof TypeError });
    expect(pending.saved).toBe("working_copy");
    expect(localSaves).toBe(1);
    expect((await service.state()).pending).toBe(true);
  });
});
