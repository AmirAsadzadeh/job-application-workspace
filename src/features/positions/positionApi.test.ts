import { afterEach, describe, expect, it, vi } from "vitest";
import { positionApi, PositionApiError } from "./positionApi";

afterEach(() => vi.unstubAllGlobals());

describe("workspace position API", () => {
  it("downloads exports and parses import previews", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(new Blob(["zip"]), { status: 200, headers: { "content-disposition": 'attachment; filename="backup.zip"' } }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ importId: "id", sourceFileName: "backup.zip", formatVersion: 1, applicationVersion: "0.1.0", exportedAt: "2026-09-09T12:00:00.000Z", counts: { positions: 0, platformLinks: 0, questions: 0, readings: 0, resumes: 0, logos: 0, departments: 0, teams: 0, locations: 0 }, notices: [], willReplaceWorkspace: true, expiresAt: "2026-09-09T12:30:00.000Z" }), { status: 200, headers: { "content-type": "application/json" } }));
    vi.stubGlobal("fetch", fetchMock);
    expect((await positionApi.exportWorkspace()).fileName).toBe("backup.zip");
    expect((await positionApi.validateWorkspaceImport(new File(["zip"], "backup.zip", { type: "application/zip" }))).importId).toBe("id");
    expect(fetchMock).toHaveBeenLastCalledWith("/api/workspace/import", expect.objectContaining({ method: "PUT" }));
  });

  it("preserves categorized server errors", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: { code: "IMPORT_FILE_INVALID", message: "Bad package" } }), { status: 400 })));
    await expect(positionApi.cancelWorkspaceImport("id")).rejects.toMatchObject<Partial<PositionApiError>>({ code: "IMPORT_FILE_INVALID", message: "Bad package" });
  });
});
