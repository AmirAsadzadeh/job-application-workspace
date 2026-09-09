import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { Readable } from "node:stream";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { createPositionsRepository } from "./positionsRepository";
import { createWorkspacePackage } from "./workspacePackage";
import { createWorkspaceTransferService } from "./workspaceTransfer";

const roots: string[] = [];
afterEach(async () => Promise.all(roots.splice(0).map((path) => rm(path, { recursive: true, force: true }))));

describe("workspace transfer", () => {
  it("validates, restores once, and reports a durable backup path", async () => {
    const root = await mkdtemp(join(tmpdir(), "workspace-transfer-")); roots.push(root);
    const positionsPath = join(root, "data", "positions.json"); const referenceDataPath = join(root, "data", "reference-data.json");
    await (await import("node:fs/promises")).mkdir(join(root, "data"), { recursive: true });
    await writeFile(positionsPath, JSON.stringify({ version: 6, listView: { mode: "manual", column: null, direction: null }, positions: [] }));
    await writeFile(referenceDataPath, JSON.stringify({ version: 1, departments: [], locations: [] }));
    const repository = createPositionsRepository({ positionsPath, referenceDataPath, resumeDirectoryPath: join(root, "data", "resumes"), logoDirectoryPath: join(root, "data", "company-logos") });
    const source = await createWorkspacePackage({ document: { version: 6, listView: { mode: "manual", column: null, direction: null }, positions: [] }, referenceData: { version: 1, departments: [], locations: [] }, resumeDirectoryPath: join(root, "data", "resumes"), logoDirectoryPath: join(root, "data", "company-logos"), bundledLogoDirectoryPath: join(root, "public", "company-logos"), outputDirectoryPath: root });
    const service = createWorkspaceTransferService({ repository, transferDirectoryPath: join(root, "transfer"), backupDirectoryPath: join(root, "data", "backups"), bundledLogoDirectoryPath: join(root, "public", "company-logos") });
    const preview = await service.validateUpload("backup.zip", Readable.from(await readFile(source)));
    const result = await service.restore(preview.importId);
    expect(result.backup.relativePath).toMatch(/^data\/backups\//);
    await expect(service.restore(preview.importId)).rejects.toMatchObject({ code: "IMPORT_SESSION_NOT_FOUND" });
  });
});
