import { createServer } from "node:http";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createApiHandler, serveFile } from "./index";
import { createPositionsRepository } from "./positionsRepository";

let directory = "";
let baseUrl = "";
let server: ReturnType<typeof createServer>;
let positionsPath = "";
let referenceDataPath = "";

beforeEach(async () => {
  directory = await mkdtemp(join(tmpdir(), "positions-api-"));
  positionsPath = join(directory, "positions.json");
  referenceDataPath = join(directory, "reference-data.json");
  await writeFile(referenceDataPath, JSON.stringify({ version: 1, departments: [], locations: [] }));
  await writeFile(positionsPath, JSON.stringify({ version: 1, positions: [{ id: "p1", company: { name: "Acme", logoPath: null }, title: "Engineer", status: "open", workMode: "remote", employmentType: "full_time", seniority: "Senior", departmentId: null, teamId: null, locationId: null, hiringManager: { name: "", phone: "", position: "" }, salary: null, description: "Secret detail", requirements: [], createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z" }] }));
  const handler = createApiHandler(createPositionsRepository({ positionsPath, referenceDataPath }));
  server = createServer(async (request, response) => { if (!(await handler(request, response))) response.end(); });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  baseUrl = `http://127.0.0.1:${typeof address === "object" && address ? address.port : 0}`;
});

afterEach(async () => {
  await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  await rm(directory, { recursive: true, force: true });
});

describe("positions API", () => {
  const createBody = {
    companyName: "Acme",
    companyLogo: { kind: "none" },
    title: "New Engineer",
    workMode: "remote",
    seniority: "Senior",
    departmentId: null,
    teamId: null,
    locationId: null,
    hiringManager: { name: "", phone: "", position: "" },
    salary: null,
    jobPlatformLinks: [],
    careerPageUrl: null,
    careerPageApplicationStatus: null,
    careerPageApplicationDate: null,
    description: { type: "doc", content: [{ type: "paragraph" }] },
  };

  it("exports and validates a complete workspace ZIP with safe response headers", async () => {
    const exported = await fetch(`${baseUrl}/api/workspace/export`);
    expect(exported.status).toBe(200);
    expect(exported.headers.get("content-type")).toBe("application/zip");
    expect(exported.headers.get("content-disposition")).toContain("attachment");
    const bytes = await exported.arrayBuffer();
    const imported = await fetch(`${baseUrl}/api/workspace/import`, { method: "PUT", headers: { "content-type": "application/zip", "x-workspace-filename": encodeURIComponent("backup.zip") }, body: bytes });
    expect(imported.status).toBe(200);
    const preview = await imported.json();
    expect(preview).toMatchObject({ sourceFileName: "backup.zip", willReplaceWorkspace: true, counts: { positions: 1 } });
    const cancelled = await fetch(`${baseUrl}/api/workspace/import/${preview.importId}`, { method: "DELETE" });
    expect(cancelled.status).toBe(204);
  });

  it("returns filtered summary-only rows", async () => {
    const response = await fetch(`${baseUrl}/api/positions?q=engineer&status=applied`);
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.positions[0]).not.toHaveProperty("description");
    expect(body.listView).toEqual({ mode: "manual", column: null, direction: null });
  });

  it("returns detail/reference data and stable missing errors", async () => {
    const detail = await fetch(`${baseUrl}/api/positions/p1`);
    expect(detail.status).toBe(200);
    expect(await detail.json()).toMatchObject({ position: { description: { type: "doc" }, jobPlatformLinks: [], careerPageUrl: null } });
    expect((await fetch(`${baseUrl}/api/reference-data`)).status).toBe(200);
    const missing = await fetch(`${baseUrl}/api/positions/nope`);
    expect(missing.status).toBe(404);
    expect(await missing.json()).toMatchObject({ error: { code: "POSITION_NOT_FOUND" } });
  });

  it("accepts approved PATCH fields and rejects extra fields", async () => {
    const approved = await fetch(`${baseUrl}/api/positions/p1`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ status: "screening", departmentId: null, teamId: null, locationId: null, hiringManager: { name: "", phone: "", position: "" }, jobPlatformLinks: [{ platformName: "LinkedIn", url: "https://linkedin.com/jobs/1", applicationStatus: "viewed", applicationDate: "2026-01-02" }], careerPageUrl: "https://acme.test/jobs/1", careerPageApplicationStatus: null, careerPageApplicationDate: null, description: { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "Role", marks: [{ type: "italic" }] }] }] } }) });
    expect(approved.status).toBe(200);
    const rejected = await fetch(`${baseUrl}/api/positions/p1`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ title: "Changed" }) });
    expect(rejected.status).toBe(400);
  });

  it("rejects incomplete and non-web publication links", async () => {
    for (const jobPlatformLinks of [[{ platformName: "Board", url: "" }], [{ platformName: "Board", url: "ftp://jobs.test/1" }]]) {
      const response = await fetch(`${baseUrl}/api/positions/p1`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ status: "applied", departmentId: null, teamId: null, locationId: null, hiringManager: { name: "", phone: "", position: "" }, jobPlatformLinks: jobPlatformLinks.map((link) => ({ ...link, applicationStatus: null, applicationDate: null })), careerPageUrl: null, careerPageApplicationStatus: null, careerPageApplicationDate: null, description: { type: "doc", content: [{ type: "paragraph" }] } }) });
      expect(response.status).toBe(400);
    }
  });

  it("creates a position and returns field-specific validation", async () => {
    const created = await fetch(`${baseUrl}/api/positions`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(createBody) });
    expect(created.status).toBe(201);
    expect(await created.json()).toMatchObject({ position: { title: "New Engineer", status: "saved", company: { logoPath: null, logoUrl: null } } });

    const invalid = await fetch(`${baseUrl}/api/positions`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ...createBody, companyName: "" }) });
    expect(invalid.status).toBe(400);
    expect(await invalid.json()).toMatchObject({ error: { code: "POSITION_CREATE_INVALID", issues: [{ path: "companyName" }] } });
  });

  it("rejects an oversized request body", async () => {
    const response = await fetch(`${baseUrl}/api/positions`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ...createBody, padding: "x".repeat(2_850_000) }) });
    expect(response.status).toBe(413);
    expect(await response.json()).toMatchObject({ error: { code: "REQUEST_TOO_LARGE" } });
  });

  it("persists list-view preferences and returns reordered summaries", async () => {
    await fetch(`${baseUrl}/api/positions`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ...createBody, title: "Second" }) });
    const listed = await (await fetch(`${baseUrl}/api/positions`)).json();
    const [second, first] = listed.positions;

    const view = await fetch(`${baseUrl}/api/positions/list-view`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ mode: "column", column: "updatedAt", direction: "desc" }) });
    expect(view.status).toBe(200);
    expect(await view.json()).toEqual({ listView: { mode: "column", column: "updatedAt", direction: "desc" } });

    const reordered = await fetch(`${baseUrl}/api/positions/order`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ positionId: first.id, beforePositionId: second.id }) });
    expect(reordered.status).toBe(200);
    expect((await reordered.json()).positions.map((position: { id: string }) => position.id)).toEqual([first.id, second.id]);
    expect((await (await fetch(`${baseUrl}/api/positions`)).json()).listView.mode).toBe("column");
  });

  it("rejects malformed preferences and missing reorder positions", async () => {
    const invalidView = await fetch(`${baseUrl}/api/positions/list-view`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ mode: "manual", column: "title", direction: "asc" }) });
    expect(invalidView.status).toBe(400);
    expect(await invalidView.json()).toMatchObject({ error: { code: "LIST_VIEW_INVALID" } });

    const missing = await fetch(`${baseUrl}/api/positions/order`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ positionId: "missing", beforePositionId: null }) });
    expect(missing.status).toBe(404);
    expect(await missing.json()).toMatchObject({ error: { code: "POSITION_NOT_FOUND" } });
  });

  it("returns a stable error when list-view persistence fails", async () => {
    const failingRepository = createPositionsRepository({
      positionsPath,
      referenceDataPath,
      renameFile: (() => Promise.reject(new Error("disk busy"))) as typeof import("node:fs/promises").rename,
    });
    const handler = createApiHandler(failingRepository);
    const failingServer = createServer(async (request, response) => { if (!(await handler(request, response))) response.end(); });
    await new Promise<void>((resolve) => failingServer.listen(0, "127.0.0.1", resolve));
    try {
      const address = failingServer.address();
      const url = `http://127.0.0.1:${typeof address === "object" && address ? address.port : 0}`;
      const response = await fetch(`${url}/api/positions/list-view`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ mode: "column", column: "company", direction: "asc" }) });
      expect(response.status).toBe(500);
      expect(await response.json()).toMatchObject({ error: { code: "POSITION_WRITE_FAILED" } });
    } finally {
      await new Promise<void>((resolve, reject) => failingServer.close((error) => error ? reject(error) : resolve()));
    }
  });

  it("rejects legacy overall statuses and reports future channel dates at stable field paths", async () => {
    expect((await fetch(`${baseUrl}/api/positions?status=open`)).status).toBe(400);
    const response = await fetch(`${baseUrl}/api/positions/p1`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        status: "saved",
        departmentId: null,
        teamId: null,
        locationId: null,
        hiringManager: { name: "", phone: "", position: "" },
        jobPlatformLinks: [{ platformName: "LinkedIn", url: "https://example.com/jobs/1", applicationStatus: "applied", applicationDate: "2999-01-01" }],
        careerPageUrl: null,
        careerPageApplicationStatus: null,
        careerPageApplicationDate: null,
        description: { type: "doc", content: [{ type: "paragraph" }] },
      }),
    });
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ error: { code: "UPDATE_INVALID", issues: [{ path: "jobPlatformLinks.0.applicationDate" }] } });
  });

  it("serves uploaded logos with restricted image headers", async () => {
    const logoPath = join(directory, "logo.svg");
    await writeFile(logoPath, '<svg xmlns="http://www.w3.org/2000/svg"></svg>');
    const logoServer = createServer(async (request, response) => {
      if (!(await serveFile(directory, request.url ?? "/", response, true))) {
        response.writeHead(404).end();
      }
    });
    await new Promise<void>((resolve) => logoServer.listen(0, "127.0.0.1", resolve));
    try {
      const address = logoServer.address();
      const response = await fetch(`http://127.0.0.1:${typeof address === "object" && address ? address.port : 0}/logo.svg`);
      expect(response.status).toBe(200);
      expect(response.headers.get("content-type")).toBe("image/svg+xml");
      expect(response.headers.get("x-content-type-options")).toBe("nosniff");
      expect(response.headers.get("content-security-policy")).toContain("sandbox");
    } finally {
      await new Promise<void>((resolve, reject) => logoServer.close((error) => error ? reject(error) : resolve()));
    }
  });

  it("creates, updates, and deletes position questions through strict routes", async () => {
    const input = { title: "Question", category: null, customCategory: null, answer: { type: "doc", content: [{ type: "paragraph" }] } };
    const created = await fetch(`${baseUrl}/api/positions/p1/questions`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(input) });
    expect(created.status).toBe(201);
    const createdBody = await created.json();
    const questionId = createdBody.position.questions[0].id;
    const updated = await fetch(`${baseUrl}/api/positions/p1/questions/${encodeURIComponent(questionId)}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ ...input, title: "Updated" }) });
    expect(updated.status).toBe(200);
    expect((await updated.json()).position.questions[0].title).toBe("Updated");
    const invalid = await fetch(`${baseUrl}/api/positions/p1/questions`, { method: "POST", headers: { "content-type": "application/json" }, body: "{" });
    expect(invalid.status).toBe(400);
    expect(await invalid.json()).toMatchObject({ error: { code: "QUESTION_INVALID" } });
    const deleted = await fetch(`${baseUrl}/api/positions/p1/questions/${encodeURIComponent(questionId)}`, { method: "DELETE" });
    expect(deleted.status).toBe(200);
    expect((await deleted.json()).position.questions).toEqual([]);
  });

  it("serves reading CRUD and a detected managed PDF through scoped routes", async () => {
    const reading = { title: "React docs", url: "https://react.dev", notes: "Hooks", isRead: false };
    const created = await fetch(`${baseUrl}/api/positions/p1/readiness/readings`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(reading) });
    expect(created.status).toBe(201);
    const readingId = (await created.json()).position.readingItems[0].id;
    const updated = await fetch(`${baseUrl}/api/positions/p1/readiness/readings/${readingId}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ ...reading, isRead: true }) });
    expect((await updated.json()).position.readingItems[0].isRead).toBe(true);

    const uploaded = await fetch(`${baseUrl}/api/positions/p1/readiness/resume`, { method: "PUT", headers: { "content-type": "text/plain", "x-resume-filename": encodeURIComponent("résumé.txt") }, body: Buffer.from("%PDF-1.7\n%%EOF") });
    expect(uploaded.status).toBe(200);
    expect((await uploaded.json()).position.submittedResume).toMatchObject({ originalFileName: "résumé.txt", fileType: "pdf" });
    const opened = await fetch(`${baseUrl}/api/positions/p1/readiness/resume`);
    expect(opened.headers.get("content-type")).toBe("application/pdf");
    expect(opened.headers.get("x-content-type-options")).toBe("nosniff");
    expect(Buffer.from(await opened.arrayBuffer()).toString()).toContain("%PDF");
    expect((await fetch(`${baseUrl}/api/positions/p1/readiness/resume`, { method: "DELETE" })).status).toBe(200);
    expect((await fetch(`${baseUrl}/api/positions/p1/readiness/readings/${readingId}`, { method: "DELETE" })).status).toBe(200);
  });
});
