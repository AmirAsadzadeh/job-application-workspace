import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, unlink, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import {
  CreatePositionInputSchema,
  DATA_VERSION,
  ListViewPreferenceSchema,
  MAX_LOGO_BYTES,
  PositionQuestionInputSchema,
  PositionQuestionSchema,
  ReadingItemInputSchema,
  ReadingItemSchema,
  SubmittedResumeSchema,
  PositionDetailsUpdateSchema,
  PositionSummarySchema,
  PositionsDocumentSchema,
  ReferenceDataSchema,
  ReorderPositionInputSchema,
  isFutureApplicationDate,
  normalizePositionsDocument,
  type CompanyLogoInput,
  type CreatePositionInput,
  type ListViewPreference,
  type Position,
  type PositionDetailsUpdate,
  type PositionQuestionInput,
  type PositionStatus,
  type ReadingItemInput,
  type SubmittedResume,
  type PositionsDocument,
  type ReferenceData,
  type ReorderPositionInput,
} from "../shared/positionSchema.js";
import { createResumeStorage, ResumeStorageError } from "./resumeStorage.js";

export type RepositoryErrorCode =
  | "DATA_INVALID"
  | "DATA_RELATION_INVALID"
  | "POSITION_NOT_FOUND"
  | "QUESTION_NOT_FOUND"
  | "QUESTION_INVALID"
  | "READING_NOT_FOUND"
  | "READING_INVALID"
  | "RESUME_NOT_FOUND"
  | "RESUME_INVALID"
  | "RESUME_FILE_UNAVAILABLE"
  | "CREATE_INVALID"
  | "LIST_VIEW_INVALID"
  | "REORDER_INVALID"
  | "UPDATE_INVALID"
  | "WRITE_FAILED";

export class PositionsRepositoryError extends Error {
  constructor(public readonly code: RepositoryErrorCode, message: string, public readonly cause?: unknown) {
    super(message);
    this.name = "PositionsRepositoryError";
  }
}

type RepositoryOptions = {
  positionsPath: string;
  referenceDataPath: string;
  logoDirectoryPath?: string;
  now?: () => Date;
  createId?: () => string;
  renameFile?: typeof rename;
  resumeDirectoryPath?: string;
};

export type PositionsRepository = ReturnType<typeof createPositionsRepository>;

function parseJson<T>(raw: string, parser: { parse(value: unknown): T }, label: string): T {
  try {
    return parser.parse(JSON.parse(raw));
  } catch (error) {
    throw new PositionsRepositoryError("DATA_INVALID", `${label} is invalid.`, error);
  }
}

function parsePositions(raw: string): PositionsDocument {
  try {
    return normalizePositionsDocument(JSON.parse(raw));
  } catch (error) {
    throw new PositionsRepositoryError("DATA_INVALID", "Positions data is invalid.", error);
  }
}

function validateRelationships(document: PositionsDocument, referenceData: ReferenceData) {
  const departments = new Map(referenceData.departments.map((department) => [department.id, department]));
  const locations = new Set(referenceData.locations.map((location) => location.id));
  const departmentIds = new Set<string>();
  const teamIds = new Set<string>();
  const locationIds = new Set<string>();

  for (const department of referenceData.departments) {
    if (departmentIds.has(department.id)) throw new PositionsRepositoryError("DATA_RELATION_INVALID", `Duplicate department id: ${department.id}`);
    departmentIds.add(department.id);
    for (const team of department.teams) {
      if (teamIds.has(team.id)) throw new PositionsRepositoryError("DATA_RELATION_INVALID", `Duplicate team id: ${team.id}`);
      teamIds.add(team.id);
    }
  }
  for (const location of referenceData.locations) {
    if (locationIds.has(location.id)) throw new PositionsRepositoryError("DATA_RELATION_INVALID", `Duplicate location id: ${location.id}`);
    locationIds.add(location.id);
  }

  for (const position of document.positions) {
    const department = position.departmentId ? departments.get(position.departmentId) : undefined;
    if (position.departmentId && !department) throw new PositionsRepositoryError("DATA_RELATION_INVALID", `Unknown department for ${position.id}.`);
    if (position.teamId && (!department || !department.teams.some((team) => team.id === position.teamId))) {
      throw new PositionsRepositoryError("DATA_RELATION_INVALID", `Invalid team for ${position.id}.`);
    }
    if (position.locationId && !locations.has(position.locationId)) throw new PositionsRepositoryError("DATA_RELATION_INVALID", `Unknown location for ${position.id}.`);
  }
}

function summarizePositions(document: PositionsDocument, referenceData: ReferenceData, filters: { q?: string; status?: PositionStatus }) {
  const query = filters.q?.trim().toLocaleLowerCase() ?? "";
  const departmentNames = new Map(referenceData.departments.map((department) => [department.id, department.name]));
  const locationNames = new Map(referenceData.locations.map((location) => [location.id, location.name]));
  return document.positions
    .filter((position) => !filters.status || position.status === filters.status)
    .filter((position) => !query || [position.title, departmentNames.get(position.departmentId ?? ""), position.hiringManager.name, locationNames.get(position.locationId ?? "")].filter(Boolean).join(" ").toLocaleLowerCase().includes(query))
    .map((position) => PositionSummarySchema.parse({
      id: position.id,
      company: position.company,
      title: position.title,
      status: position.status,
      workMode: position.workMode,
      seniority: position.seniority,
      updatedAt: position.updatedAt,
    }));
}

function decodeLogo(logo: Extract<CompanyLogoInput, { kind: "upload" }>) {
  const bytes = Buffer.from(logo.dataBase64, "base64");
  if (bytes.byteLength > MAX_LOGO_BYTES) {
    throw new PositionsRepositoryError("CREATE_INVALID", "Logo must be 2 MB or smaller.");
  }

  if (logo.mediaType === "image/png") {
    const valid = bytes.length >= 8 && bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
    if (!valid) throw new PositionsRepositoryError("CREATE_INVALID", "Logo content does not match PNG format.");
    return { bytes, extension: "png" };
  }
  if (logo.mediaType === "image/jpeg") {
    if (bytes.length < 3 || bytes[0] !== 0xff || bytes[1] !== 0xd8 || bytes[2] !== 0xff) {
      throw new PositionsRepositoryError("CREATE_INVALID", "Logo content does not match JPEG format.");
    }
    return { bytes, extension: "jpg" };
  }

  const svg = bytes.toString("utf8").replace(/^\uFEFF/, "");
  const hasSvgRoot = /^\s*(?:<\?xml[^>]*>\s*)?<svg(?:\s|>)/i.test(svg);
  const hasActiveContent = /<!DOCTYPE|<!ENTITY|<script|<foreignObject|\son[a-z]+\s*=|(?:href|src)\s*=\s*["']\s*(?:javascript:|data:text\/html)/i.test(svg);
  if (!hasSvgRoot || hasActiveContent) {
    throw new PositionsRepositoryError("CREATE_INVALID", "SVG logo contains unsupported content.");
  }
  return { bytes, extension: "svg" };
}

const advancingChannelStatuses = new Set(["applied", "viewed", "contacted"]);

function hasQualifyingChannelActivity(input: Pick<Position, "jobPlatformLinks" | "careerPageApplicationStatus">) {
  return input.jobPlatformLinks.some((link) => link.applicationStatus && advancingChannelStatuses.has(link.applicationStatus))
    || Boolean(input.careerPageApplicationStatus && advancingChannelStatuses.has(input.careerPageApplicationStatus));
}

function futureDateIssues(input: Pick<Position, "jobPlatformLinks" | "careerPageApplicationDate">, currentDate: Date) {
  const issues = input.jobPlatformLinks.flatMap((link, index) => isFutureApplicationDate(link.applicationDate, currentDate)
    ? [{ path: `jobPlatformLinks.${index}.applicationDate`, message: "Application date cannot be in the future." }]
    : []);
  if (isFutureApplicationDate(input.careerPageApplicationDate, currentDate)) {
    issues.push({ path: "careerPageApplicationDate", message: "Application date cannot be in the future." });
  }
  return issues;
}

export function createPositionsRepository(options: RepositoryOptions) {
  const now = options.now ?? (() => new Date());
  const createId = options.createId ?? randomUUID;
  const renameFile = options.renameFile ?? rename;
  const logoDirectoryPath = options.logoDirectoryPath ?? join(dirname(options.positionsPath), "company-logos");
  const resumeStorage = createResumeStorage({ rootPath: options.resumeDirectoryPath ?? join(dirname(options.positionsPath), "resumes"), createId });
  let writeQueue: Promise<unknown> = Promise.resolve();

  async function readAll() {
    const [positionsRaw, referenceRaw] = await Promise.all([
      readFile(options.positionsPath, "utf8"),
      readFile(options.referenceDataPath, "utf8"),
    ]);
    const document = parsePositions(positionsRaw);
    const referenceData = parseJson(referenceRaw, ReferenceDataSchema, "Reference data");
    validateRelationships(document, referenceData);
    return { document, referenceData };
  }

  async function writeDocument(document: PositionsDocument) {
    const temporaryPath = join(dirname(options.positionsPath), `.positions-${process.pid}-${Date.now()}-${createId()}.tmp`);
    try {
      await writeFile(temporaryPath, `${JSON.stringify(document, null, 2)}\n`, { encoding: "utf8", flush: true });
      await renameFile(temporaryPath, options.positionsPath);
    } catch (error) {
      await unlink(temporaryPath).catch(() => undefined);
      throw new PositionsRepositoryError("WRITE_FAILED", "Could not save positions data.", error);
    }
  }

  async function updatePosition(id: string, input: PositionDetailsUpdate): Promise<Position> {
    const parsed = PositionDetailsUpdateSchema.safeParse(input);
    if (!parsed.success) throw new PositionsRepositoryError("UPDATE_INVALID", "Position update is invalid.", parsed.error);

    const operation = writeQueue.then(async () => {
      const { document, referenceData } = await readAll();
      const index = document.positions.findIndex((position) => position.id === id);
      if (index < 0) throw new PositionsRepositoryError("POSITION_NOT_FOUND", "Position not found.");
      const currentDate = now();
      const issues = futureDateIssues(parsed.data, currentDate);
      if (issues.length) throw new PositionsRepositoryError("UPDATE_INVALID", "Check the highlighted fields.", { issues });
      const merged = { ...document.positions[index], ...parsed.data };
      const updated = {
        ...merged,
        status: merged.status === "saved" && hasQualifyingChannelActivity(merged) ? "applied" as const : merged.status,
        updatedAt: currentDate.toISOString(),
      };
      const nextDocument = PositionsDocumentSchema.parse({ ...document, positions: document.positions.map((position, positionIndex) => positionIndex === index ? updated : position) });
      validateRelationships(nextDocument, referenceData);
      await writeDocument(nextDocument);
      return updated;
    });
    writeQueue = operation.catch(() => undefined);
    return operation;
  }

  async function createPosition(input: CreatePositionInput): Promise<Position> {
    const parsed = CreatePositionInputSchema.safeParse(input);
    if (!parsed.success) throw new PositionsRepositoryError("CREATE_INVALID", "Position creation data is invalid.", parsed.error);

    const operation = writeQueue.then(async () => {
      const { document, referenceData } = await readAll();
      const currentDate = now();
      const issues = futureDateIssues(parsed.data, currentDate);
      if (issues.length) throw new PositionsRepositoryError("CREATE_INVALID", "Check the highlighted fields.", { issues });
      const timestamp = currentDate.toISOString();
      let id = `pos-${createId()}`;
      while (document.positions.some((position) => position.id === id)) id = `pos-${createId()}`;

      let logoPath: string | null = null;
      let logoUrl: string | null = null;
      let stagedLogoPath: string | null = null;
      let finalLogoPath: string | null = null;
      let uploadBytes: Buffer | null = null;

      if (parsed.data.companyLogo.kind === "remote") logoUrl = parsed.data.companyLogo.url;
      if (parsed.data.companyLogo.kind === "upload") {
        const { bytes, extension } = decodeLogo(parsed.data.companyLogo);
        const logoName = `${createId()}.${extension}`;
        stagedLogoPath = join(logoDirectoryPath, `.${logoName}.tmp`);
        finalLogoPath = join(logoDirectoryPath, logoName);
        uploadBytes = bytes;
        logoPath = `/company-logos/${logoName}`;
      }

      const position: Position = {
        id,
        company: { name: parsed.data.companyName, logoPath, logoUrl },
        title: parsed.data.title,
        status: "saved",
        workMode: parsed.data.workMode,
        employmentType: parsed.data.employmentType,
        seniority: parsed.data.seniority,
        departmentId: parsed.data.departmentId,
        teamId: parsed.data.teamId,
        locationId: parsed.data.locationId,
        hiringManager: parsed.data.hiringManager,
        salary: parsed.data.salary,
        description: parsed.data.description,
        jobPlatformLinks: parsed.data.jobPlatformLinks,
        careerPageUrl: parsed.data.careerPageUrl,
        careerPageApplicationStatus: parsed.data.careerPageApplicationStatus,
        careerPageApplicationDate: parsed.data.careerPageApplicationDate,
        questions: [],
        readingItems: [],
        submittedResume: null,
        createdAt: timestamp,
        updatedAt: timestamp,
      };
      if (hasQualifyingChannelActivity(position)) position.status = "applied";
      const nextDocument = PositionsDocumentSchema.parse({ version: DATA_VERSION, listView: document.listView, positions: [position, ...document.positions] });
      validateRelationships(nextDocument, referenceData);

      try {
        if (stagedLogoPath && finalLogoPath && uploadBytes) {
          await mkdir(logoDirectoryPath, { recursive: true });
          await writeFile(stagedLogoPath, uploadBytes, { flush: true });
          await renameFile(stagedLogoPath, finalLogoPath);
        }
        await writeDocument(nextDocument);
      } catch (error) {
        if (stagedLogoPath) await unlink(stagedLogoPath).catch(() => undefined);
        if (finalLogoPath) await unlink(finalLogoPath).catch(() => undefined);
        throw error instanceof PositionsRepositoryError ? error : new PositionsRepositoryError("WRITE_FAILED", "Could not save positions data.", error);
      }
      return position;
    });
    writeQueue = operation.catch(() => undefined);
    return operation;
  }

  async function createQuestion(positionId: string, input: PositionQuestionInput): Promise<Position> {
    const parsed = PositionQuestionInputSchema.safeParse(input);
    if (!parsed.success) throw new PositionsRepositoryError("QUESTION_INVALID", "Question is invalid.", parsed.error);
    const operation = writeQueue.then(async () => {
      const { document } = await readAll();
      const positionIndex = document.positions.findIndex((position) => position.id === positionId);
      if (positionIndex < 0) throw new PositionsRepositoryError("POSITION_NOT_FOUND", "Position not found.");
      const timestamp = now().toISOString();
      let id = `question-${createId()}`;
      while (document.positions[positionIndex].questions.some((question) => question.id === id)) id = `question-${createId()}`;
      const question = PositionQuestionSchema.parse({ ...parsed.data, id, createdAt: timestamp, updatedAt: timestamp });
      const updated = {
        ...document.positions[positionIndex],
        questions: [question, ...document.positions[positionIndex].questions],
        updatedAt: timestamp,
      };
      const nextDocument = PositionsDocumentSchema.parse({ ...document, positions: document.positions.map((position, index) => index === positionIndex ? updated : position) });
      await writeDocument(nextDocument);
      return updated;
    });
    writeQueue = operation.catch(() => undefined);
    return operation;
  }

  async function updateQuestion(positionId: string, questionId: string, input: PositionQuestionInput): Promise<Position> {
    const parsed = PositionQuestionInputSchema.safeParse(input);
    if (!parsed.success) throw new PositionsRepositoryError("QUESTION_INVALID", "Question is invalid.", parsed.error);
    const operation = writeQueue.then(async () => {
      const { document } = await readAll();
      const positionIndex = document.positions.findIndex((position) => position.id === positionId);
      if (positionIndex < 0) throw new PositionsRepositoryError("POSITION_NOT_FOUND", "Position not found.");
      const questionIndex = document.positions[positionIndex].questions.findIndex((question) => question.id === questionId);
      if (questionIndex < 0) throw new PositionsRepositoryError("QUESTION_NOT_FOUND", "Question not found.");
      const timestamp = now().toISOString();
      const questions = document.positions[positionIndex].questions.map((question, index) => index === questionIndex
        ? PositionQuestionSchema.parse({ ...parsed.data, id: question.id, createdAt: question.createdAt, updatedAt: timestamp })
        : question);
      const updated = { ...document.positions[positionIndex], questions, updatedAt: timestamp };
      const nextDocument = PositionsDocumentSchema.parse({ ...document, positions: document.positions.map((position, index) => index === positionIndex ? updated : position) });
      await writeDocument(nextDocument);
      return updated;
    });
    writeQueue = operation.catch(() => undefined);
    return operation;
  }

  async function deleteQuestion(positionId: string, questionId: string): Promise<Position> {
    const operation = writeQueue.then(async () => {
      const { document } = await readAll();
      const positionIndex = document.positions.findIndex((position) => position.id === positionId);
      if (positionIndex < 0) throw new PositionsRepositoryError("POSITION_NOT_FOUND", "Position not found.");
      const questions = document.positions[positionIndex].questions.filter((question) => question.id !== questionId);
      if (questions.length === document.positions[positionIndex].questions.length) throw new PositionsRepositoryError("QUESTION_NOT_FOUND", "Question not found.");
      const updated = { ...document.positions[positionIndex], questions, updatedAt: now().toISOString() };
      const nextDocument = PositionsDocumentSchema.parse({ ...document, positions: document.positions.map((position, index) => index === positionIndex ? updated : position) });
      await writeDocument(nextDocument);
      return updated;
    });
    writeQueue = operation.catch(() => undefined);
    return operation;
  }

  async function createReading(positionId: string, input: ReadingItemInput): Promise<Position> {
    const parsed = ReadingItemInputSchema.safeParse(input);
    if (!parsed.success) throw new PositionsRepositoryError("READING_INVALID", "Reading item is invalid.", parsed.error);
    const operation = writeQueue.then(async () => {
      const { document } = await readAll();
      const positionIndex = document.positions.findIndex((position) => position.id === positionId);
      if (positionIndex < 0) throw new PositionsRepositoryError("POSITION_NOT_FOUND", "Position not found.");
      const timestamp = now().toISOString();
      let id = `reading-${createId()}`;
      while (document.positions[positionIndex].readingItems.some((reading) => reading.id === id)) id = `reading-${createId()}`;
      const reading = ReadingItemSchema.parse({ ...parsed.data, id, createdAt: timestamp, updatedAt: timestamp });
      const updated = { ...document.positions[positionIndex], readingItems: [reading, ...document.positions[positionIndex].readingItems], updatedAt: timestamp };
      await writeDocument(PositionsDocumentSchema.parse({ ...document, positions: document.positions.map((position, index) => index === positionIndex ? updated : position) }));
      return updated;
    });
    writeQueue = operation.catch(() => undefined);
    return operation;
  }

  async function updateReading(positionId: string, readingId: string, input: ReadingItemInput): Promise<Position> {
    const parsed = ReadingItemInputSchema.safeParse(input);
    if (!parsed.success) throw new PositionsRepositoryError("READING_INVALID", "Reading item is invalid.", parsed.error);
    const operation = writeQueue.then(async () => {
      const { document } = await readAll();
      const positionIndex = document.positions.findIndex((position) => position.id === positionId);
      if (positionIndex < 0) throw new PositionsRepositoryError("POSITION_NOT_FOUND", "Position not found.");
      const readingIndex = document.positions[positionIndex].readingItems.findIndex((reading) => reading.id === readingId);
      if (readingIndex < 0) throw new PositionsRepositoryError("READING_NOT_FOUND", "Reading item not found.");
      const timestamp = now().toISOString();
      const readingItems = document.positions[positionIndex].readingItems.map((reading, index) => index === readingIndex
        ? ReadingItemSchema.parse({ ...parsed.data, id: reading.id, createdAt: reading.createdAt, updatedAt: timestamp })
        : reading);
      const updated = { ...document.positions[positionIndex], readingItems, updatedAt: timestamp };
      await writeDocument(PositionsDocumentSchema.parse({ ...document, positions: document.positions.map((position, index) => index === positionIndex ? updated : position) }));
      return updated;
    });
    writeQueue = operation.catch(() => undefined);
    return operation;
  }

  async function deleteReading(positionId: string, readingId: string): Promise<Position> {
    const operation = writeQueue.then(async () => {
      const { document } = await readAll();
      const positionIndex = document.positions.findIndex((position) => position.id === positionId);
      if (positionIndex < 0) throw new PositionsRepositoryError("POSITION_NOT_FOUND", "Position not found.");
      const readingItems = document.positions[positionIndex].readingItems.filter((reading) => reading.id !== readingId);
      if (readingItems.length === document.positions[positionIndex].readingItems.length) throw new PositionsRepositoryError("READING_NOT_FOUND", "Reading item not found.");
      const updated = { ...document.positions[positionIndex], readingItems, updatedAt: now().toISOString() };
      await writeDocument(PositionsDocumentSchema.parse({ ...document, positions: document.positions.map((position, index) => index === positionIndex ? updated : position) }));
      return updated;
    });
    writeQueue = operation.catch(() => undefined);
    return operation;
  }

  async function importResume(positionId: string, originalFileName: string, body: AsyncIterable<Uint8Array>): Promise<Position> {
    if (!originalFileName.trim()) throw new PositionsRepositoryError("RESUME_INVALID", "Resume filename is required.");
    const operation = writeQueue.then(async () => {
      const { document } = await readAll();
      const positionIndex = document.positions.findIndex((position) => position.id === positionId);
      if (positionIndex < 0) throw new PositionsRepositoryError("POSITION_NOT_FOUND", "Position not found.");
      let staged;
      try {
        staged = await resumeStorage.stage(positionId, body);
        await resumeStorage.promote(staged);
      } catch (error) {
        if (error instanceof ResumeStorageError) throw new PositionsRepositoryError(error.code === "RESUME_INVALID" ? "RESUME_INVALID" : "WRITE_FAILED", error.message, error);
        throw error;
      }
      const timestamp = now().toISOString();
      const metadata = SubmittedResumeSchema.parse({ originalFileName: originalFileName.trim(), fileType: staged.fileType, mediaType: staged.mediaType, relativePath: staged.relativePath, uploadedAt: timestamp });
      const current = document.positions[positionIndex];
      const updated = { ...current, submittedResume: metadata, updatedAt: timestamp };
      try {
        await writeDocument(PositionsDocumentSchema.parse({ ...document, positions: document.positions.map((position, index) => index === positionIndex ? updated : position) }));
      } catch (error) {
        await resumeStorage.discard(staged.relativePath, positionId);
        throw error;
      }
      try {
        if (current.submittedResume) await resumeStorage.discard(current.submittedResume.relativePath, positionId);
      } catch (error) {
        await writeDocument(document);
        await resumeStorage.discard(staged.relativePath, positionId);
        throw new PositionsRepositoryError("WRITE_FAILED", "Could not replace the submitted resume.", error);
      }
      return updated;
    });
    writeQueue = operation.catch(() => undefined);
    return operation;
  }

  async function openResume(positionId: string) {
    const { document } = await readAll();
    const position = document.positions.find((candidate) => candidate.id === positionId);
    if (!position) throw new PositionsRepositoryError("POSITION_NOT_FOUND", "Position not found.");
    if (!position.submittedResume) throw new PositionsRepositoryError("RESUME_NOT_FOUND", "No submitted resume is retained.");
    try {
      const opened = await resumeStorage.open(position.submittedResume.relativePath, positionId);
      return { metadata: position.submittedResume, stream: opened.stream, size: opened.size };
    } catch (error) {
      throw new PositionsRepositoryError("RESUME_FILE_UNAVAILABLE", "The submitted resume file is unavailable.", error);
    }
  }

  async function removeResume(positionId: string): Promise<Position> {
    const operation = writeQueue.then(async () => {
      const { document } = await readAll();
      const positionIndex = document.positions.findIndex((position) => position.id === positionId);
      if (positionIndex < 0) throw new PositionsRepositoryError("POSITION_NOT_FOUND", "Position not found.");
      const current = document.positions[positionIndex];
      if (!current.submittedResume) throw new PositionsRepositoryError("RESUME_NOT_FOUND", "No submitted resume is retained.");
      let tombstone = null;
      try { tombstone = await resumeStorage.moveToTombstone(current.submittedResume.relativePath, positionId); }
      catch (error) { throw new PositionsRepositoryError("WRITE_FAILED", "Could not remove the submitted resume.", error); }
      const updated = { ...current, submittedResume: null, updatedAt: now().toISOString() };
      try {
        await writeDocument(PositionsDocumentSchema.parse({ ...document, positions: document.positions.map((position, index) => index === positionIndex ? updated : position) }));
      } catch (error) {
        if (tombstone) await resumeStorage.restoreTombstone(tombstone);
        throw error;
      }
      try { if (tombstone) await resumeStorage.deleteTombstone(tombstone); }
      catch (error) {
        await writeDocument(document);
        if (tombstone) await resumeStorage.restoreTombstone(tombstone);
        throw new PositionsRepositoryError("WRITE_FAILED", "Could not remove the submitted resume.", error);
      }
      return updated;
    });
    writeQueue = operation.catch(() => undefined);
    return operation;
  }

  async function updateListView(input: ListViewPreference): Promise<ListViewPreference> {
    const parsed = ListViewPreferenceSchema.safeParse(input);
    if (!parsed.success) throw new PositionsRepositoryError("LIST_VIEW_INVALID", "List view preference is invalid.", parsed.error);

    const operation = writeQueue.then(async () => {
      const { document } = await readAll();
      if (JSON.stringify(document.listView) === JSON.stringify(parsed.data)) return document.listView;
      const nextDocument = PositionsDocumentSchema.parse({ ...document, listView: parsed.data });
      await writeDocument(nextDocument);
      return parsed.data;
    });
    writeQueue = operation.catch(() => undefined);
    return operation;
  }

  async function reorderPosition(input: ReorderPositionInput) {
    const parsed = ReorderPositionInputSchema.safeParse(input);
    if (!parsed.success) throw new PositionsRepositoryError("REORDER_INVALID", "Position reorder request is invalid.", parsed.error);

    const operation = writeQueue.then(async () => {
      const { document, referenceData } = await readAll();
      const sourceIndex = document.positions.findIndex((position) => position.id === parsed.data.positionId);
      if (sourceIndex < 0) throw new PositionsRepositoryError("POSITION_NOT_FOUND", "Position to move was not found.");
      const anchorIndex = parsed.data.beforePositionId === null ? -1 : document.positions.findIndex((position) => position.id === parsed.data.beforePositionId);
      if (parsed.data.beforePositionId !== null && anchorIndex < 0) throw new PositionsRepositoryError("POSITION_NOT_FOUND", "Target position was not found.");

      const isNoOp = parsed.data.beforePositionId === null
        ? sourceIndex === document.positions.length - 1
        : sourceIndex + 1 === anchorIndex;
      if (isNoOp) return summarizePositions(document, referenceData, {});

      const positions = [...document.positions];
      const [source] = positions.splice(sourceIndex, 1);
      const insertionIndex = parsed.data.beforePositionId === null
        ? positions.length
        : positions.findIndex((position) => position.id === parsed.data.beforePositionId);
      positions.splice(insertionIndex, 0, source);
      const nextDocument = PositionsDocumentSchema.parse({ ...document, positions });
      validateRelationships(nextDocument, referenceData);
      await writeDocument(nextDocument);
      return summarizePositions(nextDocument, referenceData, {});
    });
    writeQueue = operation.catch(() => undefined);
    return operation;
  }

  async function runExclusive<T>(callback: (snapshot: { document: PositionsDocument; referenceData: ReferenceData }) => Promise<T>): Promise<T> {
    const operation = writeQueue.then(async () => callback(await readAll()));
    writeQueue = operation.catch(() => undefined);
    return operation;
  }

  return {
    async list(filters: { q?: string; status?: PositionStatus }) {
      const { document, referenceData } = await readAll();
      return { positions: summarizePositions(document, referenceData, filters), listView: document.listView };
    },
    async get(id: string) {
      const { document } = await readAll();
      const position = document.positions.find((candidate) => candidate.id === id);
      if (!position) throw new PositionsRepositoryError("POSITION_NOT_FOUND", "Position not found.");
      return position;
    },
    async getReferenceData() {
      return (await readAll()).referenceData;
    },
    create: createPosition,
    update: updatePosition,
    createQuestion,
    updateQuestion,
    deleteQuestion,
    createReading,
    updateReading,
    deleteReading,
    importResume,
    openResume,
    removeResume,
    updateListView,
    reorder: reorderPosition,
    snapshot: () => runExclusive(async (snapshot) => snapshot),
    runExclusive,
    paths: {
      positionsPath: options.positionsPath,
      referenceDataPath: options.referenceDataPath,
      logoDirectoryPath,
      resumeDirectoryPath: options.resumeDirectoryPath ?? join(dirname(options.positionsPath), "resumes"),
    },
  };
}
