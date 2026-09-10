import { randomUUID } from "node:crypto";
import { createWriteStream } from "node:fs";
import { cp, mkdir, readFile, rename, rm, stat } from "node:fs/promises";
import { basename, dirname, join } from "node:path";
import { Readable, Transform } from "node:stream";
import { pipeline } from "node:stream/promises";
import type { PositionsRepository } from "./positionsRepository.js";
import { createWorkspacePackage, validateWorkspacePackage, WorkspacePackageError } from "./workspacePackage.js";
import { workspacePackageLimits, type WorkspacePreview, type WorkspaceRestoreResult } from "@workspace/domain/workspacePackageSchema";

type TransferErrorCode = "IMPORT_SESSION_NOT_FOUND" | "IMPORT_SESSION_EXPIRED" | "IMPORT_IN_PROGRESS" | "BACKUP_FAILED" | "RESTORE_FAILED" | "IMPORT_STORAGE_FAILED" | "IMPORT_TOO_LARGE";
export class WorkspaceTransferError extends Error {
  constructor(public readonly code: TransferErrorCode, message: string, public readonly cause?: unknown) { super(message); this.name = "WorkspaceTransferError"; }
}

type Session = { id: string; sourceFileName: string; rootPath: string; archivePath: string; workspacePath: string; preview: WorkspacePreview; state: "validated" | "restoring" };
type Options = { repository: PositionsRepository; transferDirectoryPath: string; backupDirectoryPath: string; bundledLogoDirectoryPath: string; now?: () => Date; createId?: () => string; renamePath?: typeof rename };

async function exists(path: string) { try { await stat(path); return true; } catch { return false; } }
async function moveIfPresent(source: string, destination: string, renamePath: typeof rename) { if (await exists(source)) { await mkdir(dirname(destination), { recursive: true }); await renamePath(source, destination); return true; } return false; }

export function createWorkspaceTransferService(options: Options) {
  const now = options.now ?? (() => new Date()); const createId = options.createId ?? randomUUID; const renamePath = options.renamePath ?? rename;
  const sessions = new Map<string, Session>();
  let restoring = false;

  async function initialize() { await rm(options.transferDirectoryPath, { recursive: true, force: true }); await mkdir(options.transferDirectoryPath, { recursive: true }); await mkdir(options.backupDirectoryPath, { recursive: true }); }

  function getSession(id: string) {
    const session = sessions.get(id);
    if (!session) throw new WorkspaceTransferError("IMPORT_SESSION_NOT_FOUND", "Import session was not found.");
    if (Date.parse(session.preview.expiresAt) <= now().getTime()) { sessions.delete(id); void rm(session.rootPath, { recursive: true, force: true }); throw new WorkspaceTransferError("IMPORT_SESSION_EXPIRED", "Import session has expired."); }
    return session;
  }

  async function validateUpload(sourceFileName: string, body: AsyncIterable<Uint8Array>) {
    const id = createId(); const rootPath = join(options.transferDirectoryPath, id); const archivePath = join(rootPath, "upload.zip");
    await mkdir(rootPath, { recursive: true });
    let bytes = 0;
    const limiter = new Transform({ transform(chunk: Buffer, _encoding, callback) { bytes += chunk.byteLength; callback(bytes > workspacePackageLimits.maxCompressedBytes ? new WorkspaceTransferError("IMPORT_TOO_LARGE", "Package is larger than 512 MiB.") : null, chunk); } });
    try {
      await pipeline(Readable.from(body), limiter, createWriteStream(archivePath, { flags: "wx" }));
      const validated = await validateWorkspacePackage({ archivePath, stagingDirectoryPath: join(rootPath, "validated") });
      const created = now(); const expiresAt = new Date(created.getTime() + 30 * 60 * 1000);
      const preview = { importId: id, sourceFileName, formatVersion: 1 as const, applicationVersion: validated.manifest.application.version, exportedAt: validated.manifest.exportedAt, counts: validated.counts, notices: [], willReplaceWorkspace: true as const, expiresAt: expiresAt.toISOString() };
      sessions.set(id, { id, sourceFileName, rootPath, archivePath, workspacePath: validated.workspacePath, preview, state: "validated" });
      return preview;
    } catch (error) { await rm(rootPath, { recursive: true, force: true }); if (error instanceof WorkspacePackageError || error instanceof WorkspaceTransferError) throw error; throw new WorkspaceTransferError("IMPORT_STORAGE_FAILED", "Could not stage the workspace package.", error); }
  }

  async function cancel(id: string) { const session = getSession(id); if (session.state !== "validated") throw new WorkspaceTransferError("IMPORT_IN_PROGRESS", "Restore is already in progress."); sessions.delete(id); await rm(session.rootPath, { recursive: true, force: true }); }

  async function exportWorkspace(outputDirectoryPath: string, fileName?: string) {
    return options.repository.runExclusive(async ({ document, referenceData }) => createWorkspacePackage({ document, referenceData, resumeDirectoryPath: options.repository.paths.resumeDirectoryPath, logoDirectoryPath: options.repository.paths.logoDirectoryPath, bundledLogoDirectoryPath: options.bundledLogoDirectoryPath, outputDirectoryPath, fileName }));
  }

  async function promoteWorkspace(workspacePath: string, rollbackPath: string) {
    const targets = [
      [options.repository.paths.positionsPath, join(workspacePath, "positions.json"), join(rollbackPath, "positions.json")],
      [options.repository.paths.referenceDataPath, join(workspacePath, "reference-data.json"), join(rollbackPath, "reference-data.json")],
      [options.repository.paths.resumeDirectoryPath, join(workspacePath, "resumes"), join(rollbackPath, "resumes")],
      [options.repository.paths.logoDirectoryPath, join(workspacePath, "company-logos"), join(rollbackPath, "company-logos")],
    ] as const;
    const movedOld: Array<(typeof targets)[number]> = [];
    try {
      for (const target of targets) if (await moveIfPresent(target[0], target[2], renamePath)) movedOld.push(target);
      for (const target of targets) { await mkdir(dirname(target[0]), { recursive: true }); await renamePath(target[1], target[0]); }
      await Promise.all([readFile(options.repository.paths.positionsPath), readFile(options.repository.paths.referenceDataPath)]);
      await rm(rollbackPath, { recursive: true, force: true });
    } catch (error) {
      try {
        for (const target of targets) await rm(target[0], { recursive: true, force: true });
        for (const target of movedOld.reverse()) await renamePath(target[2], target[0]);
        await Promise.all([readFile(options.repository.paths.positionsPath), readFile(options.repository.paths.referenceDataPath)]);
      } catch (rollbackError) { throw new WorkspaceTransferError("RESTORE_FAILED", "Restore failed and direct rollback requires backup recovery.", { error, rollbackError }); }
      throw new WorkspaceTransferError("RESTORE_FAILED", "Workspace restore failed; the previous workspace was restored.", error);
    }
  }

  async function restore(id: string): Promise<WorkspaceRestoreResult> {
    const session = getSession(id); if (restoring) throw new WorkspaceTransferError("IMPORT_IN_PROGRESS", "Another restore is in progress.");
    restoring = true; session.state = "restoring"; sessions.delete(id);
    try {
      return await options.repository.runExclusive(async ({ document, referenceData }) => {
        const createdAt = now().toISOString(); const fileName = `positions-workspace-before-restore-${createdAt.replace(/[:.]/g, "-")}.zip`;
        let backupPath: string;
        try { backupPath = await createWorkspacePackage({ document, referenceData, resumeDirectoryPath: options.repository.paths.resumeDirectoryPath, logoDirectoryPath: options.repository.paths.logoDirectoryPath, bundledLogoDirectoryPath: options.bundledLogoDirectoryPath, outputDirectoryPath: options.backupDirectoryPath, fileName }); }
        catch (error) { throw new WorkspaceTransferError("BACKUP_FAILED", "Could not create the pre-restore backup.", error); }
        const rollbackPath = join(options.transferDirectoryPath, `.rollback-${createId()}`); await mkdir(rollbackPath, { recursive: true });
        try { await promoteWorkspace(session.workspacePath, rollbackPath); }
        catch (error) {
          if (error instanceof WorkspaceTransferError && String(error.message).includes("backup recovery")) {
            const fallbackRoot = join(options.transferDirectoryPath, `.fallback-${createId()}`);
            try { const fallback = await validateWorkspacePackage({ archivePath: backupPath, stagingDirectoryPath: fallbackRoot }); await promoteWorkspace(fallback.workspacePath, join(options.transferDirectoryPath, `.fallback-rollback-${createId()}`)); }
            catch (fallbackError) { throw new WorkspaceTransferError("RESTORE_FAILED", "Restore failed and the backup could not be rematerialized.", fallbackError); }
          }
          throw error;
        }
        return { restored: true as const, counts: session.preview.counts, backup: { fileName: basename(backupPath), relativePath: `data/backups/${basename(backupPath)}`, createdAt } };
      });
    } finally { restoring = false; await rm(session.rootPath, { recursive: true, force: true }); }
  }

  return { initialize, validateUpload, cancel, restore, exportWorkspace };
}
