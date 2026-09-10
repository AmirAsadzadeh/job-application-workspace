import { stat } from "node:fs/promises";
import { join } from "node:path";
import type { PositionsDocument, ReferenceData } from "@workspace/domain/positionSchema";
import type { WorkspaceCounts } from "@workspace/domain/workspacePackageSchema";
import { createOnlineWorkingCopyService } from "./onlineWorkingCopyService.js";
import { createWorkspaceRepositoryFactory } from "./workspaceRepositoryFactory.js";
import { createWorkspaceTransferService } from "./workspaceTransfer.js";
import { accountWorkspacePaths, offlineWorkspacePaths } from "./workspaceLayout.js";

export type LocalWorkspaceSelection = { mode: "offline" } | { mode: "online"; accountId: string };
export type LocalWorkspaceTarget = { mode: "offline" } | { mode: "online"; accountId: string; remoteRevision: number };

function counts(document: PositionsDocument, referenceData: ReferenceData): WorkspaceCounts {
  return {
    positions: document.positions.length,
    platformLinks: document.positions.reduce((total, position) => total + position.jobPlatformLinks.length, 0),
    questions: document.positions.reduce((total, position) => total + position.questions.length, 0),
    readings: document.positions.reduce((total, position) => total + position.readingItems.length, 0),
    resumes: document.positions.filter((position) => position.submittedResume).length,
    logos: document.positions.filter((position) => position.company.logoPath).length,
    departments: referenceData.departments.length,
    teams: referenceData.departments.reduce((total, department) => total + department.teams.length, 0),
    locations: referenceData.locations.length,
  };
}

export function createLocalSynchronizationService(workspaceRoot: string, bundledLogoDirectoryPath: string) {
  const repositories = createWorkspaceRepositoryFactory(workspaceRoot);
  const transfers = new Map<string, ReturnType<typeof createWorkspaceTransferService>>();
  const ready = new Map<string, Promise<void>>();

  function key(target: LocalWorkspaceSelection) { return target.mode === "offline" ? "offline" : `online:${target.accountId}`; }
  function transferFor(target: LocalWorkspaceSelection) {
    const targetKey = key(target);
    const existing = transfers.get(targetKey);
    if (existing) return existing;
    const paths = target.mode === "offline" ? offlineWorkspacePaths(workspaceRoot) : accountWorkspacePaths(workspaceRoot, target.accountId);
    const repository = target.mode === "offline" ? repositories.offline() : repositories.online(target.accountId);
    const transfer = createWorkspaceTransferService({ repository, transferDirectoryPath: join(paths.root, ".synchronization"), backupDirectoryPath: paths.backupDirectoryPath, bundledLogoDirectoryPath });
    transfers.set(targetKey, transfer);
    ready.set(targetKey, transfer.initialize());
    return transfer;
  }

  async function summarize(target: LocalWorkspaceSelection) {
    const repository = target.mode === "offline" ? repositories.offline() : repositories.online(target.accountId);
    const paths = target.mode === "offline" ? offlineWorkspacePaths(workspaceRoot) : accountWorkspacePaths(workspaceRoot, target.accountId);
    return repository.runExclusive(async ({ document, referenceData }) => {
      const details = await Promise.all([stat(paths.positionsPath), stat(paths.referenceDataPath)]);
      return { revision: null, updatedAt: new Date(Math.max(...details.map((value) => value.mtimeMs))).toISOString(), counts: counts(document, referenceData) };
    });
  }

  async function exportSource(source: LocalWorkspaceSelection) {
    const transfer = transferFor(source);
    await ready.get(key(source));
    const paths = source.mode === "offline" ? offlineWorkspacePaths(workspaceRoot) : accountWorkspacePaths(workspaceRoot, source.accountId);
    const archivePath = await transfer.exportWorkspace(join(paths.root, ".synchronization", "exports"));
    const details = await stat(archivePath);
    return { archivePath, byteLength: details.size };
  }

  async function prepare(target: LocalWorkspaceTarget, sourceFileName: string, body: AsyncIterable<Uint8Array>) {
    const transfer = transferFor(target);
    await ready.get(key(target));
    const destination = await summarize(target);
    return { target: target.mode, destination, ...(await transfer.validateUpload(sourceFileName, body)) };
  }

  async function cancel(target: LocalWorkspaceSelection, importId: string) {
    const transfer = transferFor(target);
    await ready.get(key(target));
    await transfer.cancel(importId);
  }

  async function confirm(target: LocalWorkspaceTarget, importId: string) {
    const transfer = transferFor(target);
    await ready.get(key(target));
    const result = await transfer.restore(importId);
    if (target.mode === "online") {
      const repository = repositories.online(target.accountId);
      const snapshot = await repository.runExclusive(async ({ document, referenceData }) => ({ revision: target.remoteRevision, positions: document, referenceData }));
      await createOnlineWorkingCopyService(workspaceRoot, target.accountId).confirmSnapshot(snapshot);
    }
    return result;
  }

  return { summarize, exportSource, prepare, cancel, confirm };
}
