import { createReadStream } from "node:fs";
import { mkdtemp, mkdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { createWorkspacePackage } from "../../../local-service/src/workspacePackage.js";
import { stageSynchronizationUpload } from "./uploadService.js";

const roots: string[] = [];
afterEach(async () => Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true }))));

describe("synchronization upload validation", () => {
  it("accepts the canonical Offline export and computes its preview data", async () => {
    const root = await mkdtemp(join(tmpdir(), "sync-upload-test-"));
    roots.push(root);
    const resumes = join(root, "resumes");
    const logos = join(root, "logos");
    const output = join(root, "output");
    await Promise.all([mkdir(resumes), mkdir(logos), mkdir(output)]);
    const archivePath = await createWorkspacePackage({
      document: { version: 6, listView: { mode: "manual", column: null, direction: null }, positions: [] },
      referenceData: { version: 1, departments: [], locations: [] },
      resumeDirectoryPath: resumes,
      logoDirectoryPath: logos,
      bundledLogoDirectoryPath: logos,
      outputDirectoryPath: output,
    });

    const staged = await stageSynchronizationUpload(createReadStream(archivePath));
    try {
      expect(staged.checksum).toMatch(/^[a-f0-9]{64}$/);
      expect(staged.counts.positions).toBe(0);
      expect(staged.manifest.formatVersion).toBe(1);
    } finally {
      await staged.cleanup();
    }
  });

  it("rejects data that is not a workspace ZIP", async () => {
    await expect(stageSynchronizationUpload((async function* () { yield Buffer.from("not a zip"); })())).rejects.toMatchObject({ code: "SYNC_SOURCE_INVALID", statusCode: 422 });
  });
});
