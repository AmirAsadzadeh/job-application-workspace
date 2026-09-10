import { describe, expect, it } from "vitest";
import {
  ApplicationChannelStatusSchema,
  ApplicationDateSchema,
  CreatePositionInputSchema,
  DATA_VERSION,
  JobPlatformLinkSchema,
  ListViewPreferenceSchema,
  PositionQuestionInputSchema,
  QuestionAnswerDocumentSchema,
  ReadingItemInputSchema,
  SubmittedResumeSchema,
  PositionStatusSchema,
  PositionsDocumentSchema,
  ReorderPositionInputSchema,
  normalizePositionsDocument,
} from "./positionSchema";

const legacyPosition = {
  id: "p1",
  company: { name: "Acme", logoPath: null },
  title: "Engineer",
  status: "open",
  workMode: "remote",
  employmentType: "full_time",
  seniority: "Senior",
  departmentId: null,
  teamId: null,
  locationId: null,
  hiringManager: { name: "", phone: "", position: "" },
  salary: null,
  requirements: ["TypeScript", "Accessible UI"],
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

describe("position schema version 6", () => {
  it("migrates version 1 requirements into a rich description", () => {
    const migrated = normalizePositionsDocument({
      version: 1,
      positions: [{ ...legacyPosition, description: "Build useful software." }],
    });
    expect(DATA_VERSION).toBe(6);
    expect(migrated.version).toBe(6);
    expect(migrated.listView).toEqual({ mode: "manual", column: null, direction: null });
    expect(migrated.positions[0]).not.toHaveProperty("requirements");
    expect(migrated.positions[0].company).toEqual({ name: "Acme", logoPath: null, logoUrl: null });
    expect(JSON.stringify(migrated.positions[0].description)).toContain("Requirements");
    expect(JSON.stringify(migrated.positions[0].description)).toContain("Accessible UI");
    expect(migrated.positions[0]).toMatchObject({ questions: [], readingItems: [], submittedResume: null });
  });

  it("migrates version 2 without replacing existing rich content", () => {
    const migrated = normalizePositionsDocument({
      version: 2,
      positions: [{
        ...legacyPosition,
        description: { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "Existing" }] }] },
        jobPlatformLinks: [],
        careerPageUrl: null,
      }],
    });
    const serialized = JSON.stringify(migrated.positions[0].description);
    expect(serialized).toContain("Existing");
    expect(serialized).toContain("TypeScript");
  });

  it("rejects two logo sources and unknown seniority", () => {
    const migrated = normalizePositionsDocument({ version: 1, positions: [{ ...legacyPosition, requirements: [], description: "" }] });
    const invalidLogo = structuredClone(migrated);
    invalidLogo.positions[0].company = { name: "Acme", logoPath: "/company-logos/acme.png", logoUrl: "https://example.com/acme.png" };
    expect(PositionsDocumentSchema.safeParse(invalidLogo).success).toBe(false);
    const invalidSeniority = structuredClone(migrated) as unknown as { positions: Array<{ seniority: string }> };
    invalidSeniority.positions[0].seniority = "Wizard";
    expect(PositionsDocumentSchema.safeParse(invalidSeniority).success).toBe(false);
  });

  it("applies create defaults and validates grouped fields", () => {
    const base = {
      companyName: "Acme",
      companyLogo: { kind: "none" as const },
      title: "Engineer",
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
      description: { type: "doc" as const, content: [{ type: "paragraph" as const }] },
    };
    expect(CreatePositionInputSchema.parse(base).employmentType).toBe("full_time");
    expect(CreatePositionInputSchema.safeParse({ ...base, hiringManager: { name: "Mina", phone: "", position: "" } }).success).toBe(false);
    expect(CreatePositionInputSchema.safeParse({ ...base, salary: { min: 20, max: 10, currency: "USD" } }).success).toBe(false);
  });

  it("enforces upload size and web logo URLs", () => {
    const common = {
      companyName: "Acme", title: "Engineer", workMode: "remote", seniority: "Senior",
      departmentId: null, teamId: null, locationId: null,
      hiringManager: { name: "", phone: "", position: "" }, salary: null,
      jobPlatformLinks: [], careerPageUrl: null,
      careerPageApplicationStatus: null, careerPageApplicationDate: null,
      description: { type: "doc", content: [{ type: "paragraph" }] },
    };
    expect(CreatePositionInputSchema.safeParse({ ...common, companyLogo: { kind: "remote", url: "ftp://example.com/logo.png" } }).success).toBe(false);
    const oversized = "A".repeat(2_796_208);
    expect(CreatePositionInputSchema.safeParse({ ...common, companyLogo: { kind: "upload", fileName: "logo.png", mediaType: "image/png", dataBase64: oversized } }).success).toBe(false);
  });

  it("migrates version 3 without changing records or sequence", () => {
    const positions = ["p1", "p2"].map((id) => ({
      ...legacyPosition,
      id,
      company: { name: "Acme", logoPath: null, logoUrl: null },
      description: { type: "doc", content: [{ type: "paragraph" }] },
      jobPlatformLinks: [],
      careerPageUrl: null,
    }));
    const versionThree = { version: 3, positions: positions.map(({ requirements: _requirements, ...position }) => position) };
    const migrated = normalizePositionsDocument(versionThree);
    expect(migrated).toEqual({
      version: 6,
      listView: { mode: "manual", column: null, direction: null },
      positions: versionThree.positions.map((position) => ({
        ...position,
        status: "applied",
        jobPlatformLinks: [],
        careerPageApplicationStatus: null,
        careerPageApplicationDate: null,
        questions: [],
        readingItems: [],
        submittedResume: null,
      })),
    });
  });

  it("accepts only the approved overall and channel status values", () => {
    expect(PositionStatusSchema.options).toEqual([
      "saved", "applied", "screening", "interviewing", "assignment",
      "paused", "offer", "rejected", "withdrawn",
    ]);
    expect(ApplicationChannelStatusSchema.options).toEqual([
      "not_applied", "applied", "viewed", "contacted", "closed",
    ]);
    expect(PositionStatusSchema.safeParse("open").success).toBe(false);
    expect(ApplicationChannelStatusSchema.safeParse("submitted").success).toBe(false);
  });

  it("validates real calendar dates and rejects malformed values", () => {
    expect(ApplicationDateSchema.parse("2024-02-29")).toBe("2024-02-29");
    for (const value of ["2023-02-29", "2026-04-31", "2026-2-03", "03-02-2026", ""]) {
      expect(ApplicationDateSchema.safeParse(value).success).toBe(false);
    }
  });

  it("requires nullable status and date metadata on every platform link", () => {
    expect(JobPlatformLinkSchema.parse({
      platformName: "LinkedIn",
      url: "https://linkedin.com/jobs/1",
      applicationStatus: null,
      applicationDate: null,
    })).toMatchObject({ applicationStatus: null, applicationDate: null });
    expect(JobPlatformLinkSchema.safeParse({ platformName: "LinkedIn", url: "https://linkedin.com/jobs/1" }).success).toBe(false);
  });

  it("migrates version 4 status values and channel metadata without changing record order or existing fields", () => {
    const statuses = ["draft", "open", "interviewing", "on_hold", "closed"] as const;
    const positions = statuses.map((status, index) => ({
      ...legacyPosition,
      id: `p${index + 1}`,
      status,
      company: { name: `Company ${index + 1}`, logoPath: null, logoUrl: null },
      seniority: "Senior",
      description: { type: "doc", content: [{ type: "paragraph" }] },
      jobPlatformLinks: [{ platformName: "LinkedIn", url: `https://example.com/jobs/${index + 1}` }],
      careerPageUrl: `https://example.com/careers/${index + 1}`,
    })).map(({ requirements: _requirements, ...position }) => position);
    const source = {
      version: 4,
      listView: { mode: "column", column: "status", direction: "desc" },
      positions,
    };

    const migrated = normalizePositionsDocument(source);

    expect(migrated.version).toBe(6);
    expect(migrated.listView).toEqual(source.listView);
    expect(migrated.positions.map((position) => position.id)).toEqual(positions.map((position) => position.id));
    expect(migrated.positions.map((position) => position.status)).toEqual([
      "saved", "applied", "interviewing", "paused", "rejected",
    ]);
    migrated.positions.forEach((position, index) => {
      const { status: _oldStatus, jobPlatformLinks, careerPageUrl, ...unchanged } = positions[index];
      const {
        status: _newStatus,
        jobPlatformLinks: migratedLinks,
        careerPageUrl: migratedCareerUrl,
        careerPageApplicationStatus,
        careerPageApplicationDate,
        questions,
        readingItems,
        submittedResume,
        ...migratedUnchanged
      } = position;
      expect(migratedUnchanged).toEqual(unchanged);
      expect(migratedCareerUrl).toBe(careerPageUrl);
      expect(migratedLinks).toEqual(jobPlatformLinks.map((link) => ({
        ...link,
        applicationStatus: null,
        applicationDate: null,
      })));
      expect(careerPageApplicationStatus).toBeNull();
      expect(careerPageApplicationDate).toBeNull();
      expect(questions).toEqual([]);
      expect(readingItems).toEqual([]);
      expect(submittedResume).toBeNull();
    });
  });

  it("requires career application metadata to be null when there is no career URL", () => {
    const migrated = normalizePositionsDocument({ version: 1, positions: [{ ...legacyPosition, requirements: [], description: "" }] });
    const invalid = structuredClone(migrated);
    invalid.positions[0].careerPageApplicationStatus = "applied";
    expect(PositionsDocumentSchema.safeParse(invalid).success).toBe(false);
  });

  it("accepts only complete Manual or column list-view preferences", () => {
    expect(ListViewPreferenceSchema.parse({ mode: "manual", column: null, direction: null })).toEqual({ mode: "manual", column: null, direction: null });
    expect(ListViewPreferenceSchema.parse({ mode: "column", column: "updatedAt", direction: "desc" })).toEqual({ mode: "column", column: "updatedAt", direction: "desc" });
    expect(ListViewPreferenceSchema.safeParse({ mode: "manual", column: "title", direction: "asc" }).success).toBe(false);
    expect(ListViewPreferenceSchema.safeParse({ mode: "column", column: null, direction: "asc" }).success).toBe(false);
    expect(ListViewPreferenceSchema.safeParse({ mode: "column", column: "unknown", direction: "asc" }).success).toBe(false);
  });

  it("validates anchor-based reorder requests", () => {
    expect(ReorderPositionInputSchema.parse({ positionId: "p2", beforePositionId: "p1" })).toEqual({ positionId: "p2", beforePositionId: "p1" });
    expect(ReorderPositionInputSchema.parse({ positionId: "p2", beforePositionId: null })).toEqual({ positionId: "p2", beforePositionId: null });
    expect(ReorderPositionInputSchema.safeParse({ positionId: "p1", beforePositionId: "p1" }).success).toBe(false);
    expect(ReorderPositionInputSchema.safeParse({ positionId: "", beforePositionId: null }).success).toBe(false);
    expect(ReorderPositionInputSchema.safeParse({ positionId: "p1", beforePositionId: null, index: 1 }).success).toBe(false);
  });

  it("migrates version 5 preparation fields without changing previous values", () => {
    const versionFour = {
      version: 4,
      listView: { mode: "column", column: "status", direction: "asc" },
      positions: [{
        ...legacyPosition,
        company: { name: "Acme", logoPath: null, logoUrl: null },
        description: { type: "doc", content: [{ type: "paragraph" }] },
        jobPlatformLinks: [{ platformName: "Board", url: "https://example.com/jobs/1" }],
        careerPageUrl: null,
      }].map(({ requirements: _requirements, ...position }) => position),
    };
    const fromFour = normalizePositionsDocument(versionFour);
    const versionFive = {
      version: 5,
      listView: fromFour.listView,
      positions: fromFour.positions.map(({ questions: _questions, readingItems: _readings, submittedResume: _resume, ...position }) => position),
    };
    const migrated = normalizePositionsDocument(versionFive);
    expect(migrated).toEqual({
      version: 6,
      listView: versionFive.listView,
      positions: versionFive.positions.map((position) => ({ ...position, questions: [], readingItems: [], submittedResume: null })),
    });
  });

  it("validates question categories, custom values, and rich code documents", () => {
    const answer = {
      type: "doc" as const,
      content: [
        { type: "paragraph" as const, content: [{ type: "text" as const, text: "Use ", marks: [{ type: "code" as const }] }] },
        { type: "codeBlock" as const, attrs: { language: "react_tsx" as const }, content: [{ type: "text" as const, text: "const App = () => <main />;\n" }] },
      ],
    };
    expect(QuestionAnswerDocumentSchema.parse(answer)).toEqual(answer);
    expect(PositionQuestionInputSchema.parse({ title: "  Explain JSX  ", category: "react", customCategory: null, answer }).title).toBe("Explain JSX");
    expect(PositionQuestionInputSchema.safeParse({ title: "Question", category: "other", customCategory: "", answer }).success).toBe(false);
    expect(PositionQuestionInputSchema.safeParse({ title: "Question", category: "react", customCategory: "Custom", answer }).success).toBe(false);
    expect(QuestionAnswerDocumentSchema.safeParse({ type: "doc", content: [{ type: "codeBlock", attrs: { language: "ruby" } }] }).success).toBe(false);
  });

  it("validates reading inputs and submitted resume metadata", () => {
    expect(ReadingItemInputSchema.parse({ title: "  Event loop  ", url: null, notes: "", isRead: false }).title).toBe("Event loop");
    expect(ReadingItemInputSchema.safeParse({ title: "", url: null, notes: "", isRead: false }).success).toBe(false);
    expect(ReadingItemInputSchema.safeParse({ title: "Read", url: "file:///secret", notes: "", isRead: true }).success).toBe(false);
    expect(SubmittedResumeSchema.parse({ originalFileName: "resume.pdf", fileType: "pdf", mediaType: "application/pdf", relativePath: "p1/file-id.pdf", uploadedAt: "2026-09-09T10:00:00.000Z" }).fileType).toBe("pdf");
    expect(SubmittedResumeSchema.safeParse({ originalFileName: "resume.exe", fileType: "pdf", mediaType: "application/pdf", relativePath: "../resume.pdf", uploadedAt: "2026-09-09T10:00:00.000Z" }).success).toBe(false);
  });

  it("rejects duplicate question and reading IDs within one position", () => {
    const document = normalizePositionsDocument({ version: 1, positions: [{ ...legacyPosition, requirements: [], description: "" }] });
    const answer = { type: "doc" as const, content: [{ type: "paragraph" as const }] };
    const question = { id: "q1", title: "Question", category: null, customCategory: null, answer, createdAt: "2026-09-09T10:00:00.000Z", updatedAt: "2026-09-09T10:00:00.000Z" };
    const reading = { id: "r1", title: "Reading", url: null, notes: "", isRead: false, createdAt: "2026-09-09T10:00:00.000Z", updatedAt: "2026-09-09T10:00:00.000Z" };
    document.positions[0].questions = [question, { ...question }];
    document.positions[0].readingItems = [reading, { ...reading }];
    expect(PositionsDocumentSchema.safeParse(document).success).toBe(false);
  });
});
