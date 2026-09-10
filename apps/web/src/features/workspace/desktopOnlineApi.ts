import { OnlineWorkspaceSchema } from "@workspace/domain/onlineSchema";

export type DesktopOnlineFailure = "offline" | "authentication" | "conflict" | "validation" | "server";

export class DesktopOnlineApiError extends Error {
  constructor(message: string, public readonly kind: DesktopOnlineFailure, public readonly status: number | null) { super(message); }
}

export function createDesktopOnlineApi(baseUrl: string) {
  let accessToken: string | null = null;

  function classify(status: number): DesktopOnlineFailure {
    return status === 401 || status === 403 ? "authentication" : status === 409 ? "conflict" : status === 400 || status === 422 ? "validation" : "server";
  }

  async function fetchAuthenticated(path: string, init: RequestInit = {}) {
    if (!accessToken) throw new DesktopOnlineApiError("Sign in to use the Online workspace.", "authentication", 401);
    const headers = new Headers(init.headers);
    headers.set("authorization", `Bearer ${accessToken}`);
    try {
      const response = await fetch(new URL(path, baseUrl), { ...init, headers, cache: "no-store" });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new DesktopOnlineApiError(body?.error?.message ?? "The Online request failed.", classify(response.status), response.status);
      }
      return response;
    } catch (error) {
      if (error instanceof DesktopOnlineApiError) throw error;
      throw new DesktopOnlineApiError("The Online service is unavailable.", "offline", null);
    }
  }

  async function request(path: string, init: RequestInit = {}, expectedRevision?: number) {
    const headers = new Headers(init.headers);
    if (expectedRevision !== undefined) headers.set("if-match", String(expectedRevision));
    return (await fetchAuthenticated(path, { ...init, headers })).json().catch(() => ({}));
  }

  return {
    setAccessToken(token: string) { accessToken = token; },
    clearAccessToken() { accessToken = null; },
    hasAccessToken() { return accessToken !== null; },
    async getWorkspace() { return OnlineWorkspaceSchema.parse(await request("/api/workspace")); },
    async getRevision() {
      const body = await request("/api/workspace/revision");
      if (!Number.isInteger(body.revision) || body.revision < 0) throw new DesktopOnlineApiError("The Online revision response is invalid.", "server", 500);
      return body.revision as number;
    },
    async downloadWorkspace() {
      const response = await fetchAuthenticated("/api/workspace/export");
      const revision = Number(response.headers.get("x-workspace-revision"));
      if (!Number.isInteger(revision) || revision < 0) throw new DesktopOnlineApiError("The Online export revision is invalid.", "server", 500);
      const disposition = response.headers.get("content-disposition") ?? "";
      return { blob: await response.blob(), revision, fileName: disposition.match(/filename="([^"]+)"/)?.[1] ?? "online-workspace.zip" };
    },
    request,
  };
}
