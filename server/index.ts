import { createReadStream } from "node:fs";
import { rm, stat } from "node:fs/promises";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { dirname, extname, join, normalize, resolve, sep } from "node:path";
import { CreatePositionInputSchema, ListViewPreferenceSchema, PositionDetailsUpdateSchema, PositionQuestionInputSchema, PositionStatusSchema, ReadingItemInputSchema, ReorderPositionInputSchema } from "../shared/positionSchema.js";
import { createPositionsRepository, PositionsRepositoryError, type PositionsRepository } from "./positionsRepository.js";
import { WorkspacePackageError } from "./workspacePackage.js";
import { createWorkspaceTransferService, WorkspaceTransferError } from "./workspaceTransfer.js";
import { initializeWorkspaceFiles } from "./desktopRuntime.js";

type ApiHandler = (request: IncomingMessage, response: ServerResponse) => Promise<boolean>;

function sendJson(response: ServerResponse, status: number, body: unknown) {
  response.writeHead(status, { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" });
  response.end(JSON.stringify(body));
}

class RequestTooLargeError extends Error {}

async function readJson(request: IncomingMessage) {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of request) {
    const buffer = Buffer.from(chunk);
    size += buffer.length;
    if (size > 2_850_000) throw new RequestTooLargeError("Request body is too large.");
    chunks.push(buffer);
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
}

function sendError(response: ServerResponse, error: unknown) {
  if (error instanceof RequestTooLargeError) {
    sendJson(response, 413, { error: { code: "REQUEST_TOO_LARGE", message: error.message } });
    return;
  }
  if (error instanceof PositionsRepositoryError) {
    const status = error.code === "POSITION_NOT_FOUND" || error.code === "QUESTION_NOT_FOUND" || error.code === "READING_NOT_FOUND" || error.code === "RESUME_NOT_FOUND" ? 404 : error.code === "CREATE_INVALID" || error.code === "LIST_VIEW_INVALID" || error.code === "REORDER_INVALID" || error.code === "UPDATE_INVALID" || error.code === "QUESTION_INVALID" || error.code === "READING_INVALID" || error.code === "RESUME_INVALID" || error.code === "DATA_RELATION_INVALID" ? 400 : 500;
    const publicCode = error.code === "WRITE_FAILED" ? "POSITION_WRITE_FAILED" : error.code === "DATA_INVALID" ? "POSITIONS_DATA_INVALID" : error.code === "CREATE_INVALID" ? "POSITION_CREATE_INVALID" : error.code;
    const cause = error.cause as { issues?: Array<{ path: string | PropertyKey[]; message: string }> } | undefined;
    const issues = cause?.issues?.map((issue) => ({
      path: Array.isArray(issue.path) ? issue.path.join(".") : issue.path,
      message: issue.message,
    })) ?? (error.code === "CREATE_INVALID" ? [{ path: "companyLogo", message: error.message }] : undefined);
    sendJson(response, status, { error: { code: publicCode, message: error.message, ...(issues ? { issues } : {}) } });
    return;
  }
  if (error instanceof WorkspacePackageError || error instanceof WorkspaceTransferError) {
    const status = error.code === "IMPORT_TOO_LARGE" ? 413
      : error.code === "IMPORT_SESSION_NOT_FOUND" || error.code === "IMPORT_SESSION_EXPIRED" ? 404
        : error.code === "IMPORT_IN_PROGRESS" ? 409
          : error.code === "BACKUP_FAILED" || error.code === "RESTORE_FAILED" || error.code === "IMPORT_STORAGE_FAILED" ? 500
            : error.code === "IMPORT_FILE_MISSING" ? 409 : 400;
    sendJson(response, status, { error: { code: error.code, message: error.message } });
    return;
  }
  sendJson(response, 400, { error: { code: "BAD_REQUEST", message: error instanceof Error ? error.message : "Invalid request." } });
}

export function createApiHandler(repository: PositionsRepository, providedTransfer?: ReturnType<typeof createWorkspaceTransferService>): ApiHandler {
  const dataDirectory = dirname(repository.paths.positionsPath);
  const transfer = providedTransfer ?? createWorkspaceTransferService({ repository, transferDirectoryPath: join(dataDirectory, ".workspace-transfer"), backupDirectoryPath: join(dataDirectory, "backups"), bundledLogoDirectoryPath: join(dirname(dataDirectory), "public", "company-logos") });
  const transferReady = transfer.initialize();
  return async (request, response) => {
    const url = new URL(request.url ?? "/", "http://localhost");
    if (!url.pathname.startsWith("/api/")) return false;
    try {
      await transferReady;
      if (request.method === "GET" && url.pathname === "/api/workspace/export") {
        const archivePath = await transfer.exportWorkspace(join(dataDirectory, ".workspace-transfer", "exports"));
        const details = await stat(archivePath);
        const fileName = archivePath.split(/[\\/]/).pop() ?? "positions-workspace.zip";
        response.writeHead(200, { "content-type": "application/zip", "content-length": String(details.size), "content-disposition": `attachment; filename="${fileName}"`, "cache-control": "no-store", "x-content-type-options": "nosniff" });
        const stream = createReadStream(archivePath);
        stream.on("close", () => void rm(archivePath, { force: true }));
        stream.pipe(response);
        return true;
      }
      if (request.method === "PUT" && url.pathname === "/api/workspace/import") {
        if (!String(request.headers["content-type"] ?? "").toLowerCase().startsWith("application/zip")) throw new WorkspacePackageError("IMPORT_ARCHIVE_INVALID", "Choose a ZIP workspace package.");
        const encodedName = request.headers["x-workspace-filename"];
        let sourceFileName = "workspace.zip";
        if (typeof encodedName === "string") { try { sourceFileName = decodeURIComponent(encodedName); } catch { throw new WorkspacePackageError("IMPORT_ARCHIVE_INVALID", "Workspace filename is invalid."); } }
        sendJson(response, 200, await transfer.validateUpload(sourceFileName, request));
        return true;
      }
      const importMatch = url.pathname.match(/^\/api\/workspace\/import\/([^/]+)$/);
      if (importMatch && request.method === "DELETE") { await transfer.cancel(decodeURIComponent(importMatch[1])); response.writeHead(204, { "cache-control": "no-store" }); response.end(); return true; }
      const restoreMatch = url.pathname.match(/^\/api\/workspace\/import\/([^/]+)\/restore$/);
      if (restoreMatch && request.method === "POST") { sendJson(response, 200, await transfer.restore(decodeURIComponent(restoreMatch[1]))); return true; }
      if (request.method === "GET" && url.pathname === "/api/positions") {
        const statusValue = url.searchParams.get("status") || undefined;
        const status = statusValue ? PositionStatusSchema.parse(statusValue) : undefined;
        sendJson(response, 200, await repository.list({ q: url.searchParams.get("q") || undefined, status }));
        return true;
      }
      if (request.method === "PATCH" && url.pathname === "/api/positions/list-view") {
        const input = ListViewPreferenceSchema.safeParse(await readJson(request));
        if (!input.success) throw new PositionsRepositoryError("LIST_VIEW_INVALID", "List view preference is invalid.", input.error);
        sendJson(response, 200, { listView: await repository.updateListView(input.data) });
        return true;
      }
      if (request.method === "PATCH" && url.pathname === "/api/positions/order") {
        const input = ReorderPositionInputSchema.safeParse(await readJson(request));
        if (!input.success) throw new PositionsRepositoryError("REORDER_INVALID", "Position reorder request is invalid.", input.error);
        sendJson(response, 200, { positions: await repository.reorder(input.data) });
        return true;
      }
      if (request.method === "POST" && url.pathname === "/api/positions") {
        const input = CreatePositionInputSchema.safeParse(await readJson(request));
        if (!input.success) {
          sendJson(response, 400, {
            error: {
              code: "POSITION_CREATE_INVALID",
              message: "Check the highlighted fields.",
              issues: input.error.issues.map((issue) => ({ path: issue.path.join("."), message: issue.message })),
            },
          });
          return true;
        }
        sendJson(response, 201, { position: await repository.create(input.data) });
        return true;
      }
      if (request.method === "GET" && url.pathname === "/api/reference-data") {
        sendJson(response, 200, await repository.getReferenceData());
        return true;
      }
      const questionCollectionMatch = url.pathname.match(/^\/api\/positions\/([^/]+)\/questions$/);
      if (questionCollectionMatch && request.method === "POST") {
        let body: unknown;
        try { body = await readJson(request); } catch (error) {
          if (error instanceof RequestTooLargeError) throw error;
          throw new PositionsRepositoryError("QUESTION_INVALID", "Question request is invalid.", error);
        }
        const input = PositionQuestionInputSchema.safeParse(body);
        if (!input.success) throw new PositionsRepositoryError("QUESTION_INVALID", "Check the highlighted fields.", input.error);
        sendJson(response, 201, { position: await repository.createQuestion(decodeURIComponent(questionCollectionMatch[1]), input.data) });
        return true;
      }
      const questionItemMatch = url.pathname.match(/^\/api\/positions\/([^/]+)\/questions\/([^/]+)$/);
      if (questionItemMatch && request.method === "PATCH") {
        let body: unknown;
        try { body = await readJson(request); } catch (error) {
          if (error instanceof RequestTooLargeError) throw error;
          throw new PositionsRepositoryError("QUESTION_INVALID", "Question request is invalid.", error);
        }
        const input = PositionQuestionInputSchema.safeParse(body);
        if (!input.success) throw new PositionsRepositoryError("QUESTION_INVALID", "Check the highlighted fields.", input.error);
        sendJson(response, 200, { position: await repository.updateQuestion(decodeURIComponent(questionItemMatch[1]), decodeURIComponent(questionItemMatch[2]), input.data) });
        return true;
      }
      if (questionItemMatch && request.method === "DELETE") {
        sendJson(response, 200, { position: await repository.deleteQuestion(decodeURIComponent(questionItemMatch[1]), decodeURIComponent(questionItemMatch[2])) });
        return true;
      }
      const readingCollectionMatch = url.pathname.match(/^\/api\/positions\/([^/]+)\/readiness\/readings$/);
      if (readingCollectionMatch && request.method === "POST") {
        let body: unknown;
        try { body = await readJson(request); } catch (error) {
          if (error instanceof RequestTooLargeError) throw error;
          throw new PositionsRepositoryError("READING_INVALID", "Reading request is invalid.", error);
        }
        const input = ReadingItemInputSchema.safeParse(body);
        if (!input.success) throw new PositionsRepositoryError("READING_INVALID", "Check the highlighted fields.", input.error);
        sendJson(response, 201, { position: await repository.createReading(decodeURIComponent(readingCollectionMatch[1]), input.data) });
        return true;
      }
      const readingItemMatch = url.pathname.match(/^\/api\/positions\/([^/]+)\/readiness\/readings\/([^/]+)$/);
      if (readingItemMatch && request.method === "PATCH") {
        let body: unknown;
        try { body = await readJson(request); } catch (error) {
          if (error instanceof RequestTooLargeError) throw error;
          throw new PositionsRepositoryError("READING_INVALID", "Reading request is invalid.", error);
        }
        const input = ReadingItemInputSchema.safeParse(body);
        if (!input.success) throw new PositionsRepositoryError("READING_INVALID", "Check the highlighted fields.", input.error);
        sendJson(response, 200, { position: await repository.updateReading(decodeURIComponent(readingItemMatch[1]), decodeURIComponent(readingItemMatch[2]), input.data) });
        return true;
      }
      if (readingItemMatch && request.method === "DELETE") {
        sendJson(response, 200, { position: await repository.deleteReading(decodeURIComponent(readingItemMatch[1]), decodeURIComponent(readingItemMatch[2])) });
        return true;
      }
      const resumeMatch = url.pathname.match(/^\/api\/positions\/([^/]+)\/readiness\/resume$/);
      if (resumeMatch && request.method === "PUT") {
        const encodedFileName = request.headers["x-resume-filename"];
        if (typeof encodedFileName !== "string") throw new PositionsRepositoryError("RESUME_INVALID", "Resume filename is required.");
        let fileName: string;
        try { fileName = decodeURIComponent(encodedFileName); } catch (error) { throw new PositionsRepositoryError("RESUME_INVALID", "Resume filename is invalid.", error); }
        sendJson(response, 200, { position: await repository.importResume(decodeURIComponent(resumeMatch[1]), fileName, request) });
        return true;
      }
      if (resumeMatch && (request.method === "GET" || request.method === "HEAD")) {
        const opened = await repository.openResume(decodeURIComponent(resumeMatch[1]));
        const fallbackName = opened.metadata.originalFileName.replace(/[^\x20-\x7E]|["\\]/g, "_");
        response.writeHead(200, {
          "content-type": opened.metadata.mediaType,
          "content-length": String(opened.size),
          "content-disposition": `inline; filename="${fallbackName}"; filename*=UTF-8''${encodeURIComponent(opened.metadata.originalFileName)}`,
          "x-content-type-options": "nosniff",
          "cache-control": "private, no-store",
          "content-security-policy": "default-src 'none'; sandbox",
        });
        if (request.method === "HEAD") {
          opened.stream.destroy();
          response.end();
        } else opened.stream.pipe(response);
        return true;
      }
      if (resumeMatch && request.method === "DELETE") {
        sendJson(response, 200, { position: await repository.removeResume(decodeURIComponent(resumeMatch[1])) });
        return true;
      }
      const match = url.pathname.match(/^\/api\/positions\/([^/]+)$/);
      if (match && request.method === "GET") {
        sendJson(response, 200, { position: await repository.get(decodeURIComponent(match[1])) });
        return true;
      }
      if (match && request.method === "PATCH") {
        const update = PositionDetailsUpdateSchema.safeParse(await readJson(request));
        if (!update.success) throw new PositionsRepositoryError("UPDATE_INVALID", "Check the highlighted fields.", update.error);
        sendJson(response, 200, { position: await repository.update(decodeURIComponent(match[1]), update.data) });
        return true;
      }
      sendJson(response, 404, { error: { code: "ENDPOINT_NOT_FOUND", message: "Endpoint not found." } });
      return true;
    } catch (error) {
      sendError(response, error);
      return true;
    }
  };
}

const contentTypes: Record<string, string> = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".ico": "image/x-icon" };

export async function serveFile(root: string, requestPath: string, response: ServerResponse, restrictedImage = false) {
  const normalized = normalize(decodeURIComponent(requestPath)).replace(/^(\.\.[/\\])+/, "");
  const target = resolve(root, `.${normalized}`);
  const resolvedRoot = resolve(root);
  if (target !== resolvedRoot && !target.startsWith(`${resolvedRoot}${sep}`)) return false;
  try {
    if (!(await stat(target)).isFile()) return false;
    const headers: Record<string, string> = { "content-type": contentTypes[extname(target).toLowerCase()] ?? "application/octet-stream" };
    if (restrictedImage) {
      headers["x-content-type-options"] = "nosniff";
      headers["content-security-policy"] = "default-src 'none'; sandbox";
      headers["cache-control"] = "private, max-age=3600";
    }
    response.writeHead(200, headers);
    createReadStream(target).pipe(response);
    return true;
  } catch {
    return false;
  }
}

export type StartServerOptions = {
  projectRoot?: string;
  workspacePath?: string;
  resourcesPath?: string;
  host?: "127.0.0.1";
  port?: number;
  production?: boolean;
  desktop?: boolean;
  log?: (message: string) => void;
};

export async function startServer(options: StartServerOptions = {}) {
  const projectRoot = options.projectRoot ?? options.resourcesPath ?? resolve(process.cwd());
  const dataDirectoryPath = options.workspacePath ?? join(projectRoot, "data");
  const resourcesPath = options.resourcesPath ?? projectRoot;
  const templatePath = options.resourcesPath ? resourcesPath : join(projectRoot, "data");
  await initializeWorkspaceFiles(dataDirectoryPath, templatePath);
  const logoDirectoryPath = join(dataDirectoryPath, "company-logos");
  const repository = createPositionsRepository({ positionsPath: join(dataDirectoryPath, "positions.json"), referenceDataPath: join(dataDirectoryPath, "reference-data.json"), logoDirectoryPath, resumeDirectoryPath: join(dataDirectoryPath, "resumes") });
  const apiHandler = createApiHandler(repository);
  const production = options.production ?? process.argv.includes("--production");
  const vite = production ? null : await (await import("vite")).createServer({ root: projectRoot, configLoader: "native", server: { middlewareMode: true }, appType: "spa" });
  const server = createServer(async (request, response) => {
    if (options.desktop) {
      const host = request.headers.host?.split(":")[0];
      const origin = request.headers.origin;
      let originIsLocal = true;
      if (origin) {
        try { originIsLocal = new URL(origin).hostname === "127.0.0.1"; }
        catch { originIsLocal = false; }
      }
      if (host !== "127.0.0.1" || !originIsLocal) {
        sendJson(response, 403, { error: { code: "LOCAL_REQUEST_REQUIRED", message: "Desktop requests must remain local." } });
        return;
      }
    }
    if (await apiHandler(request, response)) return;
    const pathname = new URL(request.url ?? "/", "http://localhost").pathname;
    if (pathname === "/data" || pathname.startsWith("/data/")) {
      sendJson(response, 404, { error: { code: "NOT_FOUND", message: "Not found." } });
      return;
    }
    if (pathname.startsWith("/company-logos/")) {
      const logoName = pathname.slice("/company-logos".length);
      if (await serveFile(logoDirectoryPath, logoName, response, true)) return;
      const bundledRoot = production ? join(resourcesPath, "dist", "company-logos") : join(projectRoot, "public", "company-logos");
      if (await serveFile(bundledRoot, logoName, response, true)) return;
      sendJson(response, 404, { error: { code: "NOT_FOUND", message: "Not found." } });
      return;
    }
    if (vite) {
      vite.middlewares(request, response, () => sendJson(response, 404, { error: { code: "NOT_FOUND", message: "Not found." } }));
      return;
    }
    if (pathname.startsWith("/assets/")) {
      if (await serveFile(join(resourcesPath, "dist"), pathname, response)) return;
    }
    await serveFile(join(resourcesPath, "dist"), "/index.html", response);
  });
  const port = options.port ?? Number(process.env.PORT ?? 4173);
  const host = options.host ?? "127.0.0.1";
  await new Promise<void>((resolveListen) => server.listen(port, host, resolveListen));
  const address = server.address();
  const selectedPort = typeof address === "object" && address ? address.port : port;
  const origin = `http://${host}:${selectedPort}`;
  (options.log ?? console.log)(`Positions workspace: ${origin}`);
  server.once("close", () => void vite?.close());
  return { server, origin };
}
