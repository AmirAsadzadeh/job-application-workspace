import type { FastifyRequest } from "fastify";
import { fromNodeHeaders } from "better-auth/node";
import type { WorkspaceAuth } from "./auth.js";

export type AuthenticatedAccount = {
  id: string;
  email?: string;
};

declare module "fastify" {
  interface FastifyRequest {
    account?: AuthenticatedAccount;
  }
}

export async function resolveAuthenticatedAccount(auth: WorkspaceAuth, request: FastifyRequest): Promise<AuthenticatedAccount | null> {
  const headers = fromNodeHeaders(request.headers);
  const session = await auth.api.getSession({ headers });
  if (session?.user?.id) return { id: session.user.id, email: session.user.email };

  if (!request.headers.authorization) return null;
  try {
    const claims: unknown = await auth.api.oauth2UserInfo({ headers });
    if (!claims || typeof claims !== "object" || !("sub" in claims) || typeof claims.sub !== "string") return null;
    const email = "email" in claims && typeof claims.email === "string" ? claims.email : undefined;
    return { id: claims.sub, email };
  } catch {
    return null;
  }
}

export function requireSession(auth: WorkspaceAuth) {
  return async (request: FastifyRequest) => {
    const account = await resolveAuthenticatedAccount(auth, request);
    if (!account) {
      const error = new Error("Sign in to use the Online workspace.") as Error & { statusCode: number; code: string };
      error.statusCode = 401;
      error.code = "AUTH_REQUIRED";
      throw error;
    }
    request.account = account;
  };
}
