import { afterEach, describe, expect, it, vi } from "vitest";
import { createOnlinePositionApi, setOnlineAuthenticationFailureHandler } from "./onlinePositionApi";

const manual = { mode: "manual" as const, column: null, direction: null };

describe("onlinePositionApi", () => {
  afterEach(() => { vi.unstubAllGlobals(); setOnlineAuthenticationFailureHandler(null); });

  it("loads the current revision before a write and advances it from the response", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ revision: 4 }), { status: 200, headers: { "content-type": "application/json" } }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ listView: manual, revision: 5 }), { status: 200, headers: { "content-type": "application/json" } }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ listView: manual, revision: 6 }), { status: 200, headers: { "content-type": "application/json" } }));
    vi.stubGlobal("fetch", fetchMock);
    const api = createOnlinePositionApi();

    await api.updateListView(manual);
    await api.updateListView(manual);

    expect(new Headers(fetchMock.mock.calls[1][1].headers).get("if-match")).toBe("4");
    expect(new Headers(fetchMock.mock.calls[2][1].headers).get("if-match")).toBe("5");
  });

  it("invalidates its cached revision after a conflict", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ revision: 2 }), { status: 200, headers: { "content-type": "application/json" } }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ error: { code: "REVISION_CONFLICT", message: "changed" } }), { status: 409, headers: { "content-type": "application/json" } }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ revision: 7 }), { status: 200, headers: { "content-type": "application/json" } }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ listView: manual, revision: 8 }), { status: 200, headers: { "content-type": "application/json" } }));
    vi.stubGlobal("fetch", fetchMock);
    const api = createOnlinePositionApi();

    await expect(api.updateListView(manual)).rejects.toMatchObject({ status: 409, code: "REVISION_CONFLICT" });
    await api.updateListView(manual);

    expect(new Headers(fetchMock.mock.calls[3][1].headers).get("if-match")).toBe("7");
  });

  it("requests session recovery after an authenticated route expires", async () => {
    const recover = vi.fn();
    setOnlineAuthenticationFailureHandler(recover);
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: { code: "AUTH_REQUIRED", message: "expired" } }), { status: 401, headers: { "content-type": "application/json" } })));
    await expect(createOnlinePositionApi().listPositions({})).rejects.toMatchObject({ status: 401 });
    expect(recover).toHaveBeenCalledOnce();
  });
});
