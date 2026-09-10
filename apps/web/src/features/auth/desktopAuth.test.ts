import { afterEach, describe, expect, it, vi } from "vitest";
import { createDesktopAuth, desktopAuthInternals, type DesktopAuthConfig, type DesktopCredentialVault } from "./desktopAuth";

const config: DesktopAuthConfig = {
  issuer: "https://accounts.example.test",
  clientId: "desktop-client",
  redirectUri: "job-application-workspace://auth/callback",
  authorizationEndpoint: "https://accounts.example.test/api/auth/oauth2/authorize",
  tokenEndpoint: "https://accounts.example.test/api/auth/oauth2/token",
  revocationEndpoint: "https://accounts.example.test/api/auth/oauth2/revoke",
  userInfoEndpoint: "https://accounts.example.test/api/auth/oauth2/userinfo",
};

function vault(): DesktopCredentialVault & { saved: Map<string, string> } {
  const saved = new Map<string, string>();
  let registered = { state: "", issuer: "", expiresAt: "" };
  return {
    saved,
    async registerAuthorization(input) { registered = input; },
    async waitForCallback() { return `${config.redirectUri}?code=one-time-code&state=${registered.state}&iss=${encodeURIComponent(registered.issuer)}`; },
    async saveRefreshCredential(accountId, issuer, credential) { saved.set(`${issuer}:${accountId}`, credential); },
    async readRefreshCredential(accountId, issuer) { return saved.get(`${issuer}:${accountId}`) ?? null; },
    async deleteRefreshCredential(accountId, issuer) { saved.delete(`${issuer}:${accountId}`); },
  };
}

afterEach(() => vi.unstubAllGlobals());

describe("desktop OAuth", () => {
  it("uses S256 PKCE and keeps only the access token in memory", async () => {
    const storage = vault();
    const open = vi.fn(async (_url: string) => undefined);
    const fetchMock = vi.fn(async (input: string | URL) => String(input).endsWith("/userinfo")
      ? Response.json({ sub: "account-a" })
      : Response.json({ access_token: "access-secret", refresh_token: "refresh-secret", expires_in: 900, token_type: "Bearer" }));
    vi.stubGlobal("fetch", fetchMock);
    const auth = createDesktopAuth(config, storage, open);
    const result = await auth.signIn();
    const authorization = new URL(open.mock.calls[0][0]);
    expect(authorization.searchParams.get("code_challenge_method")).toBe("S256");
    expect(authorization.searchParams.get("code_challenge")).not.toBe(authorization.searchParams.get("state"));
    expect(result).toMatchObject({ accountId: "account-a", accessToken: "access-secret" });
    expect(auth.getAccessToken()).toBe("access-secret");
    expect(storage.saved.get(`${config.issuer}:account-a`)).toBe("refresh-secret");
  });

  it("rejects callback replay shapes and mismatched state or issuer", () => {
    const expected = { state: "expected", issuer: config.issuer, redirectUri: config.redirectUri };
    expect(() => desktopAuthInternals.callbackCode(`${config.redirectUri}?code=x&state=wrong&iss=${encodeURIComponent(config.issuer)}`, expected)).toThrow("state");
    expect(() => desktopAuthInternals.callbackCode(`${config.redirectUri}?code=x&state=expected&iss=https%3A%2F%2Fevil.test`, expected)).toThrow("issuer");
    expect(() => desktopAuthInternals.callbackCode(`${config.redirectUri}?code=x&code=y&state=expected&iss=${encodeURIComponent(config.issuer)}`, expected)).toThrow("duplicate");
  });

  it("always deletes the protected credential when remote revocation is unavailable", async () => {
    const storage = vault();
    await storage.saveRefreshCredential("account-a", config.issuer, "refresh-secret");
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network includes refresh-secret")));
    const auth = createDesktopAuth(config, storage, async () => undefined);
    await auth.signOut("account-a");
    expect(storage.saved.size).toBe(0);
    expect(auth.getAccessToken()).toBeNull();
  });
});
