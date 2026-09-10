import { z } from "zod";

const TokenResponseSchema = z.object({
  access_token: z.string().min(1),
  refresh_token: z.string().min(1).optional(),
  expires_in: z.number().int().positive(),
  token_type: z.string().transform((value) => value.toLowerCase()).pipe(z.literal("bearer")),
}).passthrough();

const UserInfoSchema = z.object({ sub: z.string().min(1) }).passthrough();

export type DesktopCredentialVault = {
  registerAuthorization(input: { state: string; issuer: string; expiresAt: string }): Promise<void>;
  waitForCallback(): Promise<string>;
  saveRefreshCredential(accountId: string, issuer: string, credential: string): Promise<void>;
  readRefreshCredential(accountId: string, issuer: string): Promise<string | null>;
  deleteRefreshCredential(accountId: string, issuer: string): Promise<void>;
};

export type DesktopAuthConfig = {
  issuer: string;
  clientId: string;
  redirectUri: string;
  authorizationEndpoint: string;
  tokenEndpoint: string;
  revocationEndpoint: string;
  userInfoEndpoint: string;
};

function randomUrlSafe(byteLength: number) {
  const bytes = crypto.getRandomValues(new Uint8Array(byteLength));
  return btoa(String.fromCharCode(...bytes)).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

async function challenge(verifier: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier));
  return btoa(String.fromCharCode(...new Uint8Array(digest))).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

function callbackCode(raw: string, expected: { state: string; issuer: string; redirectUri: string }) {
  const callback = new URL(raw);
  const redirect = new URL(expected.redirectUri);
  if (callback.protocol !== redirect.protocol || callback.host !== redirect.host || callback.pathname !== redirect.pathname) throw new Error("The sign-in callback address is invalid.");
  const values = new Map<string, string>();
  for (const [key, value] of callback.searchParams) {
    if (values.has(key)) throw new Error("The sign-in callback contains duplicate parameters.");
    values.set(key, value);
  }
  if (values.get("state") !== expected.state) throw new Error("The sign-in callback state is invalid.");
  if (values.get("iss") !== expected.issuer) throw new Error("The sign-in callback issuer is invalid.");
  if (values.has("error")) throw new Error("Sign-in was not completed.");
  const code = values.get("code");
  if (!code) throw new Error("The sign-in callback has no authorization code.");
  return code;
}

export function createDesktopAuth(config: DesktopAuthConfig, vault: DesktopCredentialVault, openExternal: (url: string) => Promise<void>) {
  let accessToken: string | null = null;
  let accessTokenExpiresAt = 0;

  async function token(parameters: Record<string, string>) {
    const response = await fetch(config.tokenEndpoint, { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body: new URLSearchParams(parameters), cache: "no-store" });
    if (!response.ok) throw new Error("The authorization service did not accept the sign-in request.");
    return TokenResponseSchema.parse(await response.json());
  }

  async function identify(value: string) {
    const response = await fetch(config.userInfoEndpoint, { headers: { authorization: `Bearer ${value}` }, cache: "no-store" });
    if (!response.ok) throw new Error("The signed-in account could not be verified.");
    return UserInfoSchema.parse(await response.json()).sub;
  }

  async function signIn() {
    const state = randomUrlSafe(32);
    const verifier = randomUrlSafe(64);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
    await vault.registerAuthorization({ state, issuer: config.issuer, expiresAt });
    const callback = vault.waitForCallback();
    const authorization = new URL(config.authorizationEndpoint);
    authorization.search = new URLSearchParams({ response_type: "code", client_id: config.clientId, redirect_uri: config.redirectUri, scope: "openid profile email offline_access workspace:read workspace:write", state, code_challenge: await challenge(verifier), code_challenge_method: "S256" }).toString();
    await openExternal(authorization.href);
    const code = callbackCode(await callback, { state, issuer: config.issuer, redirectUri: config.redirectUri });
    const result = await token({ grant_type: "authorization_code", client_id: config.clientId, redirect_uri: config.redirectUri, code, code_verifier: verifier });
    const accountId = await identify(result.access_token);
    if (!result.refresh_token) throw new Error("The authorization service did not issue an offline credential.");
    await vault.saveRefreshCredential(accountId, config.issuer, result.refresh_token);
    accessToken = result.access_token;
    accessTokenExpiresAt = Date.now() + result.expires_in * 1000;
    return { accountId, accessToken: result.access_token, expiresAt: new Date(accessTokenExpiresAt).toISOString() };
  }

  async function refresh(accountId: string) {
    const credential = await vault.readRefreshCredential(accountId, config.issuer);
    if (!credential) return null;
    try {
      const result = await token({ grant_type: "refresh_token", client_id: config.clientId, refresh_token: credential });
      if (result.refresh_token) await vault.saveRefreshCredential(accountId, config.issuer, result.refresh_token);
      accessToken = result.access_token;
      accessTokenExpiresAt = Date.now() + result.expires_in * 1000;
      return { accountId, accessToken: result.access_token, expiresAt: new Date(accessTokenExpiresAt).toISOString() };
    } catch {
      accessToken = null;
      accessTokenExpiresAt = 0;
      return null;
    }
  }

  async function signOut(accountId: string) {
    const credential = await vault.readRefreshCredential(accountId, config.issuer);
    try {
      if (credential) await fetch(config.revocationEndpoint, { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ token: credential, token_type_hint: "refresh_token", client_id: config.clientId }), cache: "no-store" });
    } catch {
      // Local sign-out must still remove the protected credential when the service is unreachable.
    } finally {
      accessToken = null;
      accessTokenExpiresAt = 0;
      await vault.deleteRefreshCredential(accountId, config.issuer);
    }
  }

  return { signIn, refresh, signOut, getAccessToken: () => accessToken, accessTokenIsCurrent: () => Boolean(accessToken && accessTokenExpiresAt > Date.now()) };
}

export const desktopAuthInternals = { callbackCode };
