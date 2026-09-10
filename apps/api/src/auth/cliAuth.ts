import { oauthProvider } from "@better-auth/oauth-provider";
import { betterAuth } from "better-auth";
import { DESKTOP_OAUTH_CLIENT_ID } from "./oauth.js";

// Schema-generation configuration. Runtime secrets and providers live in auth.ts.
export const auth = betterAuth({
  appName: "Job Application Workspace",
  secret: "schema-generation-only-secret-with-no-runtime-use",
  baseURL: "http://127.0.0.1:4174",
  emailAndPassword: { enabled: true, requireEmailVerification: true },
  plugins: [oauthProvider({
    disableJwtPlugin: true,
    loginPage: "http://127.0.0.1:4173/sign-in",
    consentPage: "http://127.0.0.1:4173/consent",
    scopes: ["openid", "profile", "email", "offline_access", "workspace:read", "workspace:write"],
    cachedTrustedClients: new Set([DESKTOP_OAUTH_CLIENT_ID]),
  })],
});
