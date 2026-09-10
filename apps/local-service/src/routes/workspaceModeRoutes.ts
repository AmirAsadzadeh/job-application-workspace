import type { IncomingMessage, ServerResponse } from "node:http";
import { WorkspaceModeSchema } from "@workspace/domain/onlineSchema";
import { z } from "zod";
import { loadOnlineSyncState } from "../onlineSyncState.js";
import { loadWorkspaceState, saveWorkspaceState } from "../workspaceModeState.js";

const ModeSelectionSchema = z.object({
  mode: WorkspaceModeSchema,
  accountId: z.string().trim().min(1).nullable(),
}).strict().superRefine((value, context) => {
  if (value.mode === "online" && !value.accountId) context.addIssue({ code: "custom", path: ["accountId"], message: "Online mode requires an account." });
});

async function readJson(request: IncomingMessage) {
  const chunks: Uint8Array[] = [];
  for await (const chunk of request) chunks.push(chunk);
  return JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
}

function sendJson(response: ServerResponse, status: number, value: unknown) {
  response.writeHead(status, { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" });
  response.end(JSON.stringify(value));
}

export function createWorkspaceModeHandler(workspaceRoot: string) {
  return async (request: IncomingMessage, response: ServerResponse) => {
    const path = new URL(request.url ?? "/", "http://127.0.0.1").pathname;
    if (request.method === "GET" && path === "/api/workspace/mode") {
      const state = await loadWorkspaceState(workspaceRoot);
      const sync = state.selectedAccountId ? await loadOnlineSyncState(workspaceRoot, state.selectedAccountId) : null;
      sendJson(response, 200, { state, sync });
      return true;
    }
    if (request.method === "PUT" && path === "/api/workspace/mode") {
      const input = ModeSelectionSchema.safeParse(await readJson(request));
      if (!input.success) {
        sendJson(response, 400, { error: { code: "VALIDATION_FAILED", message: "Choose a valid workspace mode." } });
        return true;
      }
      const state = { version: 1 as const, selectedMode: input.data.mode, selectedAccountId: input.data.mode === "online" ? input.data.accountId : null, updatedAt: new Date().toISOString() };
      await saveWorkspaceState(workspaceRoot, state);
      sendJson(response, 200, { state });
      return true;
    }
    if (request.method === "GET" && path === "/api/workspace/pending") {
      const state = await loadWorkspaceState(workspaceRoot);
      const sync = state.selectedAccountId ? await loadOnlineSyncState(workspaceRoot, state.selectedAccountId) : null;
      sendJson(response, 200, { pending: sync?.pending ?? false, sync });
      return true;
    }
    return false;
  };
}
