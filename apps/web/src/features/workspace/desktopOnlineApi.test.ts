import { afterEach, describe, expect, it, vi } from "vitest";
import { createDesktopOnlineApi, DesktopOnlineApiError } from "./desktopOnlineApi";

describe("desktopOnlineApi", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("keeps the access token in memory and sends revision headers", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ revision: 3 }), { status: 200, headers: { "content-type": "application/json" } }));
    vi.stubGlobal("fetch", fetchMock);
    const api = createDesktopOnlineApi("https://api.example.test");
    api.setAccessToken("private-token");
    await api.request("/api/example", { method: "PATCH" }, 2);
    const headers = new Headers(fetchMock.mock.calls[0][1].headers);
    expect(headers.get("authorization")).toBe("Bearer private-token");
    expect(headers.get("if-match")).toBe("2");
    api.clearAccessToken();
    expect(api.hasAccessToken()).toBe(false);
  });

  it("classifies connectivity failures without including credentials", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("private-token socket failure")));
    const api = createDesktopOnlineApi("https://api.example.test");
    api.setAccessToken("private-token");
    await expect(api.getRevision()).rejects.toMatchObject<Partial<DesktopOnlineApiError>>({ kind: "offline", message: "The Online service is unavailable." });
  });
});
