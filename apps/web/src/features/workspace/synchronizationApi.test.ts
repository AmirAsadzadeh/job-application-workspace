import { afterEach, describe, expect, it, vi } from "vitest";
import { createSynchronizationApi } from "./synchronizationApi";

const counts = { positions: 1, platformLinks: 0, questions: 0, readings: 0, resumes: 0, logos: 0, departments: 0, teams: 0, locations: 0 };
const preview = {
  attemptId: "14927f8c-0b06-489f-8a4b-5df6adf294df",
  direction: "offline_to_online",
  source: { revision: null, updatedAt: "2026-09-10T10:00:00.000Z", checksum: "a".repeat(64), counts },
  destination: { revision: 2, updatedAt: "2026-09-10T09:00:00.000Z", counts: { ...counts, positions: 0 } },
  conflict: false, willReplace: "online", willMerge: false, backupRequired: true, expiresAt: "2026-09-10T10:30:00.000Z",
} as const;
const localPreview = { importId: "import-1", sourceFileName: "workspace.zip", formatVersion: 1, applicationVersion: "0.1.0", exportedAt: "2026-09-10T10:00:00.000Z", counts, notices: [], willReplaceWorkspace: true, expiresAt: "2026-09-10T10:30:00.000Z" } as const;

afterEach(() => vi.unstubAllGlobals());

describe("synchronization orchestration", () => {
  it("confirms local-to-Online replacement and refreshes the account working copy", async () => {
    const fetchMock = vi.fn(async (input: string | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.includes("/export?source=offline")) return new Response(new Blob(["local"]), { status: 200, headers: { "content-type": "application/zip" } });
      if (url.includes("/local/import?") && init?.method === "PUT") return Response.json({ ...localPreview, target: "online", destination: { revision: null, updatedAt: "2026-09-10T09:00:00.000Z", counts } });
      if (url.includes("/restore?") && init?.method === "POST") return Response.json({ restored: true });
      throw new Error(`Unexpected local request: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);
    const remote = {
      request: vi.fn(async (path: string) => path.endsWith("/confirm") ? { attemptId: preview.attemptId, status: "completed", revision: 3, backup: { id: "c10f41b1-ac8e-4ed9-9fbb-dc916604b08c", createdAt: "2026-09-10T10:01:00.000Z" }, counts, completedAt: "2026-09-10T10:01:01.000Z" } : preview),
      downloadWorkspace: vi.fn(async () => ({ blob: new Blob(["remote"]), revision: 3, fileName: "online.zip" })),
    };
    const prepared = await createSynchronizationApi(remote as never, "http://local/").previewLocalToOnline("offline_to_online", "account-a");
    const result = await prepared.confirm();
    expect(result).toMatchObject({ status: "completed", revision: 3, workingCopyRefreshed: true });
    expect(fetchMock.mock.calls.some(([url]) => String(url).includes("target=working_copy") && String(url).includes("accountId=account-a"))).toBe(true);
  });

  it("previews and completes Online-to-Offline replacement locally", async () => {
    const fetchMock = vi.fn(async (input: string | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.includes("/local/import?") && init?.method === "PUT") return Response.json({ ...localPreview, target: "offline", destination: { revision: null, updatedAt: "2026-09-10T09:00:00.000Z", counts: { ...counts, positions: 0 } } });
      if (url.includes("/restore?") && init?.method === "POST") return Response.json({ restored: true, counts, backup: { fileName: "before.zip", relativePath: "data/backups/before.zip", createdAt: "2026-09-10T10:01:00.000Z" } });
      throw new Error(`Unexpected local request: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);
    const remote = { downloadWorkspace: vi.fn(async () => ({ blob: new Blob(["remote"]), revision: 8, fileName: "online.zip" })) };
    const prepared = await createSynchronizationApi(remote as never, "http://local/").previewOnlineToLocal("online_to_offline");
    expect(prepared.preview).toMatchObject({ direction: "online_to_offline", willReplace: "offline", source: { revision: 8 }, destination: { revision: null } });
    await expect(prepared.confirm()).resolves.toMatchObject({ restored: true });
  });
});
