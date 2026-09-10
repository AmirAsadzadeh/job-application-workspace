import { oauthProvider } from "@better-auth/oauth-provider";
import type { ApiConfig } from "../config.js";

export const DESKTOP_OAUTH_CLIENT_ID = "job-application-workspace-desktop";
export const DESKTOP_REDIRECT_URI = "job-application-workspace://auth/callback";

export function createOAuthProviderPlugin(config: ApiConfig) {
  return oauthProvider({
    disableJwtPlugin: true,
    loginPage: `${config.APP_ORIGIN}/sign-in`,
    consentPage: `${config.APP_ORIGIN}/consent`,
    scopes: ["openid", "profile", "email", "offline_access", "workspace:read", "workspace:write"],
    cachedTrustedClients: new Set([DESKTOP_OAUTH_CLIENT_ID]),
    accessTokenExpiresIn: 15 * 60,
    refreshTokenExpiresIn: 60 * 60 * 24 * 30,
    codeExpiresIn: 5 * 60,
  });
}
