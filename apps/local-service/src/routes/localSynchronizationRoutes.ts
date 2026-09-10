import { createReadStream } from "node:fs";
import { rm } from "node:fs/promises";
import type { IncomingMessage, ServerResponse } from "node:http";
import type { LocalWorkspaceSelection, LocalWorkspaceTarget, createLocalSynchronizationService } from "../localSynchronizationService.js";

type Service = ReturnType<typeof createLocalSynchronizationService>;

function sendJson(response: ServerResponse, status: number, value: unknown) {
  response.writeHead(status, { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" });
  response.end(JSON.stringify(value));
}

function selection(url: URL, key: "source" | "target"): LocalWorkspaceSelection {
  const value = url.searchParams.get(key);
  if (value === "offline") return { mode: "offline" };
  if (value === "working_copy") {
    const accountId = url.searchParams.get("accountId")?.trim();
    if (accountId) return { mode: "online", accountId };
  }
  throw new Error(`A valid ${key} workspace is required.`);
}

function target(url: URL): LocalWorkspaceTarget {
  const chosen = selection(url, "target");
  if (chosen.mode === "offline") return chosen;
  const remoteRevision = Number(url.searchParams.get("remoteRevision"));
  if (!Number.isInteger(remoteRevision) || remoteRevision < 0) throw new Error("A valid remote revision is required.");
  return { ...chosen, remoteRevision };
}

function sourceFileName(request: IncomingMessage) {
  const value = request.headers["x-workspace-filename"];
  if (typeof value !== "string") return "online-workspace.zip";
  try { return decodeURIComponent(value); } catch { throw new Error("Workspace filename is invalid."); }
}

export function createLocalSynchronizationHandler(service: Service, ensureWorkspace: (target: LocalWorkspaceSelection) => Promise<void>) {
  return async (request: IncomingMessage, response: ServerResponse) => {
    const url = new URL(request.url ?? "/", "http://127.0.0.1");
    if (!url.pathname.startsWith("/api/synchronizations/local")) return false;

    if (request.method === "GET" && url.pathname === "/api/synchronizations/local/export") {
      const source = selection(url, "source");
      await ensureWorkspace(source);
      const exported = await service.exportSource(source);
      response.writeHead(200, { "content-type": "application/zip", "content-length": String(exported.byteLength), "content-disposition": 'attachment; filename="positions-workspace.zip"', "cache-control": "no-store" });
      const stream = createReadStream(exported.archivePath);
      stream.on("close", () => void rm(exported.archivePath, { force: true }));
      stream.pipe(response);
      return true;
    }

    if (request.method === "PUT" && url.pathname === "/api/synchronizations/local/import") {
      if (!String(request.headers["content-type"] ?? "").toLowerCase().startsWith("application/zip")) throw new Error("Choose a ZIP workspace package.");
      const destination = target(url);
      await ensureWorkspace(destination);
      sendJson(response, 200, await service.prepare(destination, sourceFileName(request), request));
      return true;
    }

    const match = url.pathname.match(/^\/api\/synchronizations\/local\/import\/([^/]+)(\/restore)?$/);
    if (!match) return false;
    const destination = target(url);
    await ensureWorkspace(destination);
    const importId = decodeURIComponent(match[1]);
    if (request.method === "DELETE" && !match[2]) {
      await service.cancel(destination, importId);
      response.writeHead(204, { "cache-control": "no-store" });
      response.end();
      return true;
    }
    if (request.method === "POST" && match[2] === "/restore") {
      sendJson(response, 200, await service.confirm(destination, importId));
      return true;
    }
    return false;
  };
}
