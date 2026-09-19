import { oauthProvider } from "@better-auth/oauth-provider";
import type { ApiConfig } from "../config.js";

export function createOAuthProviderPlugin(config: ApiConfig) {
  return oauthProvider({
    disableJwtPlugin: true,
    loginPage: `${config.APP_ORIGIN}/sign-in`,
    consentPage: `${config.APP_ORIGIN}/consent`,
    scopes: ["openid", "profile", "email", "offline_access", "workspace:read", "workspace:write"],
    accessTokenExpiresIn: 15 * 60,
    refreshTokenExpiresIn: 60 * 60 * 24 * 30,
    codeExpiresIn: 5 * 60,
  });
}
