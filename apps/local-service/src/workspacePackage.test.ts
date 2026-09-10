import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { createWorkspacePackage, validateWorkspacePackage } from "./workspacePackage";
import type { PositionsDocument, ReferenceData } from "@workspace/domain/positionSchema";

const directories: string[] = [];
afterEach(async () => Promise.all(directories.splice(0).map((path) => rm(path, { recursive: true, force: true }))));

describe("workspace package", () => {
  it("round-trips an empty workspace with all canonical CSV files", async () => {
    const root = await mkdtemp(join(tmpdir(), "workspace-package-")); directories.push(root);
    const document = { version: 6, listView: { mode: "manual", column: null, direction: null }, positions: [] } as PositionsDocument;
    const referenceData = { version: 1, departments: [], locations: [] } as ReferenceData;
    const archivePath = await createWorkspacePackage({ document, referenceData, resumeDirectoryPath: join(root, "resumes"), logoDirectoryPath: join(root, "logos"), bundledLogoDirectoryPath: join(root, "public"), outputDirectoryPath: root, now: () => new Date("2026-09-09T12:00:00.000Z") });
    const validated = await validateWorkspacePackage({ archivePath, stagingDirectoryPath: join(root, "staged") });
    expect(validated.counts).toMatchObject({ positions: 0, questions: 0, resumes: 0, logos: 0 });
    expect(await readFile(join(validated.workspacePath, "positions.json"), "utf8")).toContain('"version": 6');
  });

  it("packages managed files and rejects a tampered canonical CSV", async () => {
    const root = await mkdtemp(join(tmpdir(), "workspace-files-")); directories.push(root);
    await mkdir(join(root, "resumes", "p1"), { recursive: true });
    await mkdir(join(root, "logos"), { recursive: true });
    await writeFile(join(root, "resumes", "p1", "resume.pdf"), Buffer.from("%PDF-1.7\n"));
    await writeFile(join(root, "logos", "logo.svg"), '<svg xmlns="http://www.w3.org/2000/svg"></svg>');
    const document = { version: 6, listView: { mode: "manual", column: null, direction: null }, positions: [{ id: "p1", company: { name: "=Acme", logoPath: "/company-logos/logo.svg", logoUrl: null }, title: "Engineer", status: "applied", workMode: "remote", employmentType: "full_time", seniority: "Senior", departmentId: null, teamId: null, locationId: null, hiringManager: { name: "", phone: "", position: "" }, salary: null, description: { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "Build things" }] }] }, jobPlatformLinks: [], careerPageUrl: null, careerPageApplicationStatus: null, careerPageApplicationDate: null, questions: [], readingItems: [], submittedResume: { originalFileName: "resume.pdf", fileType: "pdf", mediaType: "application/pdf", relativePath: "p1/resume.pdf", uploadedAt: "2026-09-09T12:00:00.000Z" }, createdAt: "2026-09-09T12:00:00.000Z", updatedAt: "2026-09-09T12:00:00.000Z" }] } as PositionsDocument;
    const archivePath = await createWorkspacePackage({ document, referenceData: { version: 1, departments: [], locations: [] }, resumeDirectoryPath: join(root, "resumes"), logoDirectoryPath: join(root, "logos"), bundledLogoDirectoryPath: join(root, "public"), outputDirectoryPath: root });
    const validated = await validateWorkspacePackage({ archivePath, stagingDirectoryPath: join(root, "staged") });
    expect(validated.manifest.files).toHaveLength(2);
    expect(validated.counts).toMatchObject({ positions: 1, resumes: 1, logos: 1 });
  });
});
