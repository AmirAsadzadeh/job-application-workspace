import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import type { ApiConfig } from "../config.js";
import type { Database } from "../db/connection.js";
import * as schema from "../db/schema/index.js";
import type { EmailProvider } from "../email/emailProvider.js";
import type { ObjectStorage } from "../storage/objectStorage.js";
import { eq } from "drizzle-orm";
import { managedFiles, workspaces } from "../db/schema/index.js";
import { createOAuthProviderPlugin } from "./oauth.js";

export function createAuth(config: ApiConfig, database: Database["db"], email: EmailProvider, storage: ObjectStorage) {
  const deletionObjects = new Map<string, string[]>();
  return betterAuth({
    appName: "Job Application Workspace",
    baseURL: config.APP_ORIGIN,
    basePath: "/api/auth",
    secret: config.BETTER_AUTH_SECRET,
    database: drizzleAdapter(database, { provider: "pg", schema }),
    trustedOrigins: [config.APP_ORIGIN, "job-application-workspace://"],
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: true,
      minPasswordLength: 12,
      sendResetPassword: async ({ user, url }) => {
        void email.send({ to: user.email, subject: "Reset your password", text: `Reset your password: ${url}` });
      },
    },
    emailVerification: {
      sendOnSignUp: true,
      sendOnSignIn: true,
      sendVerificationEmail: async ({ user, url }) => {
        void email.send({ to: user.email, subject: "Verify your email", text: `Verify your email: ${url}` });
      },
    },
    session: {
      expiresIn: 60 * 60 * 24 * 30,
      updateAge: 60 * 60 * 24,
      freshAge: 60 * 10,
    },
    user: {
      deleteUser: {
        enabled: true,
        beforeDelete: async (user) => {
          const workspace = (await database.select().from(workspaces).where(eq(workspaces.ownerId, user.id)).limit(1))[0];
          if (!workspace) return;
          const files = await database.select({ objectKey: managedFiles.objectKey }).from(managedFiles).where(eq(managedFiles.workspaceId, workspace.id));
          deletionObjects.set(user.id, files.map((file) => file.objectKey));
        },
        afterDelete: async (user) => {
          const keys = deletionObjects.get(user.id) ?? [];
          deletionObjects.delete(user.id);
          await Promise.allSettled(keys.map((key) => storage.remove(key)));
        },
      },
    },
    rateLimit: {
      enabled: true,
      window: 60,
      max: 20,
    },
    plugins: [createOAuthProviderPlugin(config)],
  });
}

export type WorkspaceAuth = ReturnType<typeof createAuth>;
