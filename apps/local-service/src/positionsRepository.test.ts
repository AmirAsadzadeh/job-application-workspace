import { mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createPositionsRepository, PositionsRepositoryError } from "./positionsRepository";

let directory = "";
let positionsPath = "";
let referenceDataPath = "";

beforeEach(async () => {
  directory = await mkdtemp(join(tmpdir(), "positions-repository-"));
  positionsPath = join(directory, "positions.json");
  referenceDataPath = join(directory, "reference-data.json");
  await writeFile(referenceDataPath, JSON.stringify({ version: 1, departments: [{ id: "eng", name: "Engineering", teams: [{ id: "web", name: "Web" }] }], locations: [{ id: "remote", name: "Remote" }] }));
  await writeFile(positionsPath, JSON.stringify({ version: 1, positions: [{ id: "p1", company: { name: "Acme", logoPath: null }, title: "Frontend Engineer", status: "open", workMode: "remote", employmentType: "full_time", seniority: "Senior", departmentId: "eng", teamId: "web", locationId: "remote", hiringManager: { name: "Mina", phone: "123", position: "Director" }, salary: null, description: "", requirements: [], createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z" }] }));
});

afterEach(async () => rm(directory, { recursive: true, force: true }));

describe("positions repository", () => {
  const createInput = {
    companyName: "Acme",
    companyLogo: { kind: "none" as const },
    title: "Frontend Engineer",
    workMode: "remote" as const,
    seniority: "Senior" as const,
    employmentType: "full_time" as const,
    departmentId: "eng",
    teamId: "web",
    locationId: "remote",
    hiringManager: { name: "", phone: "", position: "" },
    salary: null,
    jobPlatformLinks: [],
    careerPageUrl: null,
    careerPageApplicationStatus: null,
    careerPageApplicationDate: null,
    description: { type: "doc" as const, content: [{ type: "paragraph" as const }] },
  };

  it("provides a validated snapshot inside the serialized mutation boundary", async () => {
    const repository = createPositionsRepository({ positionsPath, referenceDataPath });
    const snapshot = await repository.snapshot();
    expect(snapshot.document.positions[0].id).toBe("p1");
    expect(snapshot.referenceData.departments[0].id).toBe("eng");
    expect(await repository.runExclusive(async ({ document }) => document.version)).toBe(6);
  });

  it("reads, searches resolved fields, and returns summaries", async () => {
    const repository = createPositionsRepository({ positionsPath, referenceDataPath });
    expect((await repository.list({ q: "engineering", status: "applied" })).positions).toHaveLength(1);
    expect((await repository.list({ q: "mina" })).positions[0]).not.toHaveProperty("departmentId");
    expect((await repository.list({})).listView).toEqual({ mode: "manual", column: null, direction: null });
    expect(await repository.get("p1")).toMatchObject({ title: "Frontend Engineer", jobPlatformLinks: [], careerPageUrl: null });
    expect((await repository.get("p1")).description).toMatchObject({ type: "doc" });
  });

  it("updates only detail fields and persists a server timestamp", async () => {
    const repository = createPositionsRepository({ positionsPath, referenceDataPath, now: () => new Date("2026-02-01T00:00:00.000Z") });
    const updated = await repository.update("p1", { status: "applied", departmentId: null, teamId: null, locationId: "remote", hiringManager: { name: "", phone: "", position: "" }, jobPlatformLinks: [{ platformName: "LinkedIn", url: "https://linkedin.com/jobs/1", applicationStatus: null, applicationDate: null }], careerPageUrl: "https://acme.test/jobs/1", careerPageApplicationStatus: null, careerPageApplicationDate: null, description: { type: "doc", content: [{ type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Role", marks: [{ type: "bold" }] }] }] } });
    expect(updated.updatedAt).toBe("2026-02-01T00:00:00.000Z");
    const saved = JSON.parse(await readFile(positionsPath, "utf8"));
    expect(saved.version).toBe(6);
    expect(saved.positions[0].title).toBe("Frontend Engineer");
    expect(saved.positions[0].jobPlatformLinks).toHaveLength(1);
  });

  it("rejects invalid relationships, duplicate ids, and unsafe logo paths", async () => {
    const original = JSON.parse(await readFile(positionsPath, "utf8"));
    original.positions[0].teamId = "missing";
    await writeFile(positionsPath, JSON.stringify(original));
    await expect(createPositionsRepository({ positionsPath, referenceDataPath }).list({})).rejects.toMatchObject({ code: "DATA_RELATION_INVALID" });
    original.positions[0].teamId = "web";
    original.positions.push({ ...original.positions[0], company: { name: "Acme", logoPath: "/private/logo.svg" } });
    await writeFile(positionsPath, JSON.stringify(original));
    await expect(createPositionsRepository({ positionsPath, referenceDataPath }).list({})).rejects.toBeInstanceOf(PositionsRepositoryError);
  });

  it("leaves the original unchanged when atomic rename fails", async () => {
    const before = await readFile(positionsPath, "utf8");
    const repository = createPositionsRepository({ positionsPath, referenceDataPath, renameFile: async () => { throw new Error("disk busy"); } });
    await expect(repository.update("p1", { status: "applied", departmentId: "eng", teamId: "web", locationId: "remote", hiringManager: { name: "Mina", phone: "456", position: "Director" }, jobPlatformLinks: [], careerPageUrl: null, careerPageApplicationStatus: null, careerPageApplicationDate: null, description: { type: "doc", content: [{ type: "paragraph" }] } })).rejects.toMatchObject({ code: "WRITE_FAILED" });
    expect(await readFile(positionsPath, "utf8")).toBe(before);
  });

  it("rejects unsafe publication URLs and leaves the version 1 file unchanged", async () => {
    const before = await readFile(positionsPath, "utf8");
    const repository = createPositionsRepository({ positionsPath, referenceDataPath });
    await expect(repository.update("p1", { status: "applied", departmentId: "eng", teamId: "web", locationId: "remote", hiringManager: { name: "Mina", phone: "123", position: "Director" }, jobPlatformLinks: [{ platformName: "Board", url: "javascript:alert(1)", applicationStatus: null, applicationDate: null }], careerPageUrl: null, careerPageApplicationStatus: null, careerPageApplicationDate: null, description: { type: "doc", content: [{ type: "paragraph" }] } })).rejects.toMatchObject({ code: "UPDATE_INVALID" });
    expect(await readFile(positionsPath, "utf8")).toBe(before);
  });

  it("creates a Saved position first with generated identity and timestamps", async () => {
    let sequence = 0;
    const repository = createPositionsRepository({ positionsPath, referenceDataPath, now: () => new Date("2026-03-01T10:00:00.000Z"), createId: () => String(++sequence) });
    const created = await repository.create(createInput);
    expect(created).toMatchObject({ id: "pos-1", status: "saved", createdAt: "2026-03-01T10:00:00.000Z", updatedAt: "2026-03-01T10:00:00.000Z" });
    const saved = JSON.parse(await readFile(positionsPath, "utf8"));
    expect(saved.version).toBe(6);
    expect(saved.positions.map((position: { id: string }) => position.id)).toEqual(["pos-1", "p1"]);
    expect(saved.positions[1]).not.toHaveProperty("requirements");
  });

  it("allows duplicate company/title pairs and serializes concurrent creates", async () => {
    let sequence = 0;
    const repository = createPositionsRepository({ positionsPath, referenceDataPath, createId: () => String(++sequence) });
    const [first, second] = await Promise.all([repository.create(createInput), repository.create(createInput)]);
    expect(first.id).not.toBe(second.id);
    const saved = JSON.parse(await readFile(positionsPath, "utf8"));
    expect(saved.positions).toHaveLength(3);
    expect(new Set(saved.positions.map((position: { id: string }) => position.id)).size).toBe(3);
  });

  it("serializes creates with updates without losing either write", async () => {
    let sequence = 0;
    const repository = createPositionsRepository({ positionsPath, referenceDataPath, createId: () => String(++sequence) });
    await Promise.all([
      repository.create(createInput),
      repository.update("p1", { status: "applied", departmentId: null, teamId: null, locationId: "remote", hiringManager: { name: "Mina", phone: "456", position: "Director" }, jobPlatformLinks: [], careerPageUrl: null, careerPageApplicationStatus: null, careerPageApplicationDate: null, description: { type: "doc", content: [{ type: "paragraph" }] } }),
    ]);
    const saved = JSON.parse(await readFile(positionsPath, "utf8"));
    expect(saved.positions).toHaveLength(2);
    expect(saved.positions.find((position: { id: string }) => position.id === "p1").hiringManager.phone).toBe("456");
  });

  it("persists list-view preferences and anchor-based moves", async () => {
    const original = JSON.parse(await readFile(positionsPath, "utf8"));
    original.positions.push({ ...original.positions[0], id: "p2", title: "Designer" });
    await writeFile(positionsPath, JSON.stringify(original));
    const repository = createPositionsRepository({ positionsPath, referenceDataPath });

    await repository.updateListView({ mode: "column", column: "updatedAt", direction: "desc" });
    expect((await repository.list({})).listView).toEqual({ mode: "column", column: "updatedAt", direction: "desc" });

    expect((await repository.reorder({ positionId: "p2", beforePositionId: "p1" })).map((position) => position.id)).toEqual(["p2", "p1"]);
    expect((await repository.reorder({ positionId: "p2", beforePositionId: null })).map((position) => position.id)).toEqual(["p1", "p2"]);
    const saved = JSON.parse(await readFile(positionsPath, "utf8"));
    expect(saved.positions.map((position: { id: string }) => position.id)).toEqual(["p1", "p2"]);
    expect(saved.positions.find((position: { id: string }) => position.id === "p2").title).toBe("Designer");
  });

  it("rejects missing reorder IDs and treats the current anchor as a no-op", async () => {
    const original = JSON.parse(await readFile(positionsPath, "utf8"));
    original.positions.push({ ...original.positions[0], id: "p2" });
    await writeFile(positionsPath, JSON.stringify(original));
    const repository = createPositionsRepository({ positionsPath, referenceDataPath });
    const before = await readFile(positionsPath, "utf8");
    await repository.reorder({ positionId: "p1", beforePositionId: "p2" });
    expect(await readFile(positionsPath, "utf8")).toBe(before);
    await expect(repository.reorder({ positionId: "missing", beforePositionId: null })).rejects.toMatchObject({ code: "POSITION_NOT_FOUND" });
    await expect(repository.reorder({ positionId: "p1", beforePositionId: "missing" })).rejects.toMatchObject({ code: "POSITION_NOT_FOUND" });
  });

  it("rolls back failed preference and reorder writes", async () => {
    const original = JSON.parse(await readFile(positionsPath, "utf8"));
    original.positions.push({ ...original.positions[0], id: "p2" });
    await writeFile(positionsPath, JSON.stringify(original));
    const before = await readFile(positionsPath, "utf8");
    const repository = createPositionsRepository({ positionsPath, referenceDataPath, renameFile: async () => { throw new Error("disk busy"); } });
    await expect(repository.updateListView({ mode: "column", column: "title", direction: "asc" })).rejects.toMatchObject({ code: "WRITE_FAILED" });
    expect(await readFile(positionsPath, "utf8")).toBe(before);
    await expect(repository.reorder({ positionId: "p2", beforePositionId: "p1" })).rejects.toMatchObject({ code: "WRITE_FAILED" });
    expect(await readFile(positionsPath, "utf8")).toBe(before);
  });

  it("serializes create, preference, and reorder writes without losing a concurrent addition", async () => {
    let sequence = 0;
    const repository = createPositionsRepository({ positionsPath, referenceDataPath, createId: () => String(++sequence) });
    const created = await repository.create(createInput);
    await Promise.all([
      repository.updateListView({ mode: "column", column: "company", direction: "asc" }),
      repository.reorder({ positionId: "p1", beforePositionId: created.id }),
    ]);
    const saved = JSON.parse(await readFile(positionsPath, "utf8"));
    expect(saved.positions.map((position: { id: string }) => position.id)).toEqual(["p1", created.id]);
    expect(saved.listView).toEqual({ mode: "column", column: "company", direction: "asc" });
  });

  it("persists an uploaded PNG outside JSON and removes staged files on failure", async () => {
    const logoDirectoryPath = join(directory, "company-logos");
    let sequence = 0;
    const png = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]).toString("base64");
    const repository = createPositionsRepository({ positionsPath, referenceDataPath, logoDirectoryPath, createId: () => String(++sequence) });
    const created = await repository.create({ ...createInput, companyLogo: { kind: "upload", fileName: "client-name.png", mediaType: "image/png", dataBase64: png } });
    expect(created.company.logoPath).toMatch(/^\/company-logos\/\d+\.png$/);
    expect(await readdir(logoDirectoryPath)).toHaveLength(1);
    expect(await readFile(positionsPath, "utf8")).not.toContain(png);

    const before = await readFile(positionsPath, "utf8");
    const failingDirectory = join(directory, "failed-logos");
    const failing = createPositionsRepository({ positionsPath, referenceDataPath, logoDirectoryPath: failingDirectory, renameFile: async () => { throw new Error("disk busy"); } });
    await expect(failing.create({ ...createInput, companyLogo: { kind: "upload", fileName: "logo.png", mediaType: "image/png", dataBase64: png } })).rejects.toMatchObject({ code: "WRITE_FAILED" });
    expect(await readFile(positionsPath, "utf8")).toBe(before);
    expect(await readdir(failingDirectory)).toEqual([]);
  });

  it("persists direct overall status changes with a server timestamp", async () => {
    const repository = createPositionsRepository({ positionsPath, referenceDataPath, now: () => new Date("2026-03-03T12:00:00.000Z") });
    const current = await repository.get("p1");
    const updated = await repository.update("p1", {
      status: "assignment",
      departmentId: current.departmentId,
      teamId: current.teamId,
      locationId: current.locationId,
      hiringManager: current.hiringManager,
      jobPlatformLinks: current.jobPlatformLinks,
      careerPageUrl: current.careerPageUrl,
      careerPageApplicationStatus: current.careerPageApplicationStatus,
      careerPageApplicationDate: current.careerPageApplicationDate,
      description: current.description,
    });
    expect(updated).toMatchObject({ status: "assignment", updatedAt: "2026-03-03T12:00:00.000Z" });
    expect((await repository.get("p1")).status).toBe("assignment");
  });

  it("advances Saved from qualifying channel activity but never overwrites a later status", async () => {
    const repository = createPositionsRepository({ positionsPath, referenceDataPath, now: () => new Date("2026-03-03T12:00:00.000Z") });
    const current = await repository.get("p1");
    const shared = {
      departmentId: current.departmentId,
      teamId: current.teamId,
      locationId: current.locationId,
      hiringManager: current.hiringManager,
      careerPageUrl: null,
      careerPageApplicationStatus: null,
      careerPageApplicationDate: null,
      description: current.description,
    };
    const advanced = await repository.update("p1", {
      ...shared,
      status: "saved",
      jobPlatformLinks: [{ platformName: "LinkedIn", url: "https://example.com/jobs/1", applicationStatus: "viewed", applicationDate: null }],
    });
    expect(advanced.status).toBe("applied");

    const preserved = await repository.update("p1", {
      ...shared,
      status: "offer",
      jobPlatformLinks: [{ platformName: "LinkedIn", url: "https://example.com/jobs/1", applicationStatus: "contacted", applicationDate: "2026-03-02" }],
    });
    expect(preserved.status).toBe("offer");

    const created = await repository.create({
      ...createInput,
      jobPlatformLinks: [{ platformName: "Board", url: "https://example.com/jobs/2", applicationStatus: "applied", applicationDate: "2026-03-03" }],
    });
    expect(created.status).toBe("applied");
  });

  it("rejects future channel dates atomically using the injected local clock", async () => {
    const repository = createPositionsRepository({ positionsPath, referenceDataPath, now: () => new Date(2026, 2, 3, 23, 30) });
    const before = await readFile(positionsPath, "utf8");
    await expect(repository.create({
      ...createInput,
      careerPageUrl: "https://example.com/careers/1",
      careerPageApplicationStatus: "applied",
      careerPageApplicationDate: "2026-03-04",
    })).rejects.toMatchObject({
      code: "CREATE_INVALID",
      cause: { issues: [{ path: "careerPageApplicationDate" }] },
    });
    expect(await readFile(positionsPath, "utf8")).toBe(before);
  });

  it("persists five independent platform channels and career-page metadata", async () => {
    const repository = createPositionsRepository({ positionsPath, referenceDataPath, now: () => new Date(2026, 2, 3, 12) });
    const statuses = [null, "not_applied", "applied", "viewed", "contacted"] as const;
    const jobPlatformLinks = statuses.map((applicationStatus, index) => ({
      platformName: `Platform ${index + 1}`,
      url: `https://example.com/jobs/${index + 1}`,
      applicationStatus,
      applicationDate: index > 1 ? `2026-03-0${Math.min(index, 3)}` : null,
    }));
    const created = await repository.create({
      ...createInput,
      jobPlatformLinks,
      careerPageUrl: "https://example.com/careers/1",
      careerPageApplicationStatus: "closed",
      careerPageApplicationDate: "2026-03-01",
    });
    const reloaded = await repository.get(created.id);
    expect(reloaded.jobPlatformLinks).toEqual(jobPlatformLinks);
    expect(reloaded).toMatchObject({ careerPageApplicationStatus: "closed", careerPageApplicationDate: "2026-03-01" });
  });

  it("creates, updates, and deletes isolated questions with authoritative metadata", async () => {
    let sequence = 0;
    const repository = createPositionsRepository({ positionsPath, referenceDataPath, now: () => new Date("2026-09-09T10:00:00.000Z"), createId: () => String(++sequence) });
    const answer = { type: "doc" as const, content: [{ type: "paragraph" as const }] };
    const created = await repository.createQuestion("p1", { title: "Question", category: null, customCategory: null, answer });
    expect(created.questions[0]).toMatchObject({ id: "question-1", title: "Question", createdAt: "2026-09-09T10:00:00.000Z" });
    const updated = await repository.updateQuestion("p1", "question-1", { title: "Updated", category: "react", customCategory: null, answer });
    expect(updated.questions[0]).toMatchObject({ id: "question-1", title: "Updated", category: "react", createdAt: "2026-09-09T10:00:00.000Z" });
    await expect(repository.updateQuestion("p1", "missing", { title: "No", category: null, customCategory: null, answer })).rejects.toMatchObject({ code: "QUESTION_NOT_FOUND" });
    const deleted = await repository.deleteQuestion("p1", "question-1");
    expect(deleted.questions).toEqual([]);
  });

  it("creates, updates status, and deletes newest-first reading items", async () => {
    let sequence = 0;
    const repository = createPositionsRepository({ positionsPath, referenceDataPath, now: () => new Date("2026-09-09T10:00:00.000Z"), createId: () => String(++sequence) });
    await repository.createReading("p1", { title: "First", url: null, notes: "", isRead: false });
    const created = await repository.createReading("p1", { title: "Second", url: "https://example.com/read", notes: "Useful", isRead: false });
    expect(created.readingItems.map((item) => item.title)).toEqual(["Second", "First"]);
    const updated = await repository.updateReading("p1", created.readingItems[1].id, { title: "First", url: null, notes: "Done", isRead: true });
    expect(updated.readingItems.map((item) => item.title)).toEqual(["Second", "First"]);
    expect(updated.readingItems[1]).toMatchObject({ isRead: true, notes: "Done" });
    await expect(repository.createReading("p1", { title: "Bad", url: "ftp://example.com", notes: "", isRead: false })).rejects.toMatchObject({ code: "READING_INVALID" });
    expect((await repository.deleteReading("p1", created.readingItems[0].id)).readingItems).toHaveLength(1);
  });

  it("imports, opens, replaces, and removes a managed submitted resume", async () => {
    let sequence = 0;
    const resumeDirectoryPath = join(directory, "resumes");
    const repository = createPositionsRepository({ positionsPath, referenceDataPath, resumeDirectoryPath, createId: () => `id-${++sequence}`, now: () => new Date("2026-09-09T10:00:00.000Z") });
    const bytes = Buffer.from("%PDF-1.7\n%%EOF");
    const imported = await repository.importResume("p1", "resume.txt", (async function* () { yield bytes; })());
    expect(imported.submittedResume).toMatchObject({ originalFileName: "resume.txt", fileType: "pdf", mediaType: "application/pdf" });
    const opened = await repository.openResume("p1");
    expect(opened.size).toBe(bytes.length);
    const replaced = await repository.importResume("p1", "resume.pdf", (async function* () { yield bytes; })());
    expect(replaced.submittedResume?.relativePath).not.toBe(imported.submittedResume?.relativePath);
    expect(await readdir(join(resumeDirectoryPath, "p1"))).toHaveLength(1);
    expect((await repository.removeResume("p1")).submittedResume).toBeNull();
    await expect(repository.openResume("p1")).rejects.toMatchObject({ code: "RESUME_NOT_FOUND" });
  });
});
