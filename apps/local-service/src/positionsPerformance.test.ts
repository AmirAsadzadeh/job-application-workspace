import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { createPositionsRepository } from "./positionsRepository";
import { createWorkspacePackage, validateWorkspacePackage } from "./workspacePackage";
import type { Position, PositionsDocument } from "@workspace/domain/positionSchema";

describe("positions file performance", () => {
  it("reads, validates, filters, and summarizes 1,000 local records within one second", async () => {
    const directory = await mkdtemp(join(tmpdir(), "positions-performance-"));
    const positionsPath = join(directory, "positions.json");
    const referenceDataPath = join(directory, "reference-data.json");
    const base = { company: { name: "Company", logoPath: null, logoUrl: null }, title: "Frontend Engineer", status: "open", workMode: "remote", employmentType: "full_time", seniority: "Senior", departmentId: "eng", teamId: "web", locationId: "remote", hiringManager: { name: "Mina", phone: "123", position: "Director" }, salary: null, description: { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "Build reliable products." }] }] }, jobPlatformLinks: [{ platformName: "LinkedIn", url: "https://linkedin.com/jobs/1" }], careerPageUrl: "https://company.test/careers/1", createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z" };
    await writeFile(referenceDataPath, JSON.stringify({ version: 1, departments: [{ id: "eng", name: "Engineering", teams: [{ id: "web", name: "Web" }] }], locations: [{ id: "remote", name: "Remote" }] }));
    await writeFile(positionsPath, JSON.stringify({ version: 3, positions: Array.from({ length: 1000 }, (_, index) => ({ ...base, id: `p-${index}` })) }));

    try {
      const repository = createPositionsRepository({ positionsPath, referenceDataPath });
      const started = performance.now();
      const rows = await repository.list({ q: "engineering", status: "applied" });
      expect(rows.positions).toHaveLength(1000);
      expect(performance.now() - started).toBeLessThan(1000);

      const createStarted = performance.now();
      const created = await repository.create({ companyName: "New Company", companyLogo: { kind: "none" }, title: "New Position", workMode: "hybrid", seniority: "Staff", employmentType: "full_time", departmentId: null, teamId: null, locationId: null, hiringManager: { name: "", phone: "", position: "" }, salary: null, jobPlatformLinks: [], careerPageUrl: null, careerPageApplicationStatus: null, careerPageApplicationDate: null, description: { type: "doc", content: [{ type: "paragraph" }] } });
      expect(performance.now() - createStarted).toBeLessThan(1000);
      expect((await repository.list({})).positions[0].id).toBe(created.id);

      const preferenceStarted = performance.now();
      await repository.updateListView({ mode: "column", column: "updatedAt", direction: "desc" });
      expect(performance.now() - preferenceStarted).toBeLessThan(1000);

      const reorderStarted = performance.now();
      await repository.reorder({ positionId: "p-999", beforePositionId: "p-0" });
      expect(performance.now() - reorderStarted).toBeLessThan(1000);
      expect((await repository.list({})).positions[1].id).toBe("p-999");
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });

  it("exports and validates the representative portable workspace within sixty seconds", async () => {
    const directory = await mkdtemp(join(tmpdir(), "workspace-package-performance-"));
    const resumes = join(directory, "resumes"); const logos = join(directory, "logos");
    await mkdir(resumes, { recursive: true }); await mkdir(logos, { recursive: true });
    const timestamp = "2026-09-09T12:00:00.000Z";
    const positions: Position[] = [];
    for (let index = 0; index < 100; index += 1) {
      const id = `p-${index}`; await mkdir(join(resumes, id), { recursive: true });
      const resumeName = `resume-${index}.pdf`; const resume = Buffer.alloc(512 * 1024, 32); Buffer.from("%PDF-1.7\n").copy(resume); await writeFile(join(resumes, id, resumeName), resume);
      if (index < 25) {
        const prefix = '<svg xmlns="http://www.w3.org/2000/svg"><text>'; const suffix = "</text></svg>";
        await writeFile(join(logos, `logo-${index}.svg`), `${prefix}${"x".repeat(64 * 1024 - Buffer.byteLength(prefix + suffix))}${suffix}`);
      }
      positions.push({ id, company: { name: `Company ${index}`, logoPath: index < 25 ? `/company-logos/logo-${index}.svg` : null, logoUrl: null }, title: "Frontend Engineer", status: "applied", workMode: "remote", employmentType: "full_time", seniority: "Senior", departmentId: "eng", teamId: "web", locationId: "remote", hiringManager: { name: "", phone: "", position: "" }, salary: null, description: { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "Build reliable products." }] }] }, jobPlatformLinks: Array.from({ length: 5 }, (_, sequence) => ({ platformName: `Platform ${sequence}`, url: `https://jobs.test/${index}/${sequence}`, applicationStatus: null, applicationDate: null })), careerPageUrl: null, careerPageApplicationStatus: null, careerPageApplicationDate: null, questions: Array.from({ length: 100 }, (_, sequence) => ({ id: `q-${index}-${sequence}`, title: `Question ${sequence}`, category: "javascript" as const, customCategory: null, answer: { type: "doc" as const, content: [{ type: "paragraph" as const, content: [{ type: "text" as const, text: "Answer" }] }] }, createdAt: timestamp, updatedAt: timestamp })), readingItems: Array.from({ length: 30 }, (_, sequence) => ({ id: `r-${index}-${sequence}`, title: `Reading ${sequence}`, url: null, notes: "Notes", isRead: false, createdAt: timestamp, updatedAt: timestamp })), submittedResume: { originalFileName: resumeName, fileType: "pdf", mediaType: "application/pdf", relativePath: `${id}/${resumeName}`, uploadedAt: timestamp }, createdAt: timestamp, updatedAt: timestamp });
    }
    const document: PositionsDocument = { version: 6, listView: { mode: "manual", column: null, direction: null }, positions };
    try {
      const started = performance.now();
      const archivePath = await createWorkspacePackage({ document, referenceData: { version: 1, departments: [{ id: "eng", name: "Engineering", teams: [{ id: "web", name: "Web" }] }], locations: [{ id: "remote", name: "Remote" }] }, resumeDirectoryPath: resumes, logoDirectoryPath: logos, bundledLogoDirectoryPath: join(directory, "public"), outputDirectoryPath: directory });
      const validated = await validateWorkspacePackage({ archivePath, stagingDirectoryPath: join(directory, "validated") });
      expect(validated.counts).toMatchObject({ positions: 100, questions: 10_000, readings: 3_000, platformLinks: 500, resumes: 100, logos: 25 });
      expect(performance.now() - started).toBeLessThan(60_000);
    } finally { await rm(directory, { recursive: true, force: true }); }
  }, 60_000);
});
