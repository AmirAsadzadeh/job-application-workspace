import { createHash, randomUUID } from "node:crypto";
import { createReadStream, createWriteStream } from "node:fs";
import { copyFile, mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import { basename, extname, join, resolve, sep } from "node:path";
import { pipeline } from "node:stream/promises";
import { ZipArchive } from "@archiver/archiver";
import { stringify } from "csv-stringify/sync";
import { fileTypeFromBuffer } from "file-type";
import { openPromise } from "yauzl";
import { PositionsDocumentSchema, ReferenceDataSchema, type PositionsDocument, type ReferenceData } from "@workspace/domain/positionSchema";
import { WorkspaceManifestSchema, workspacePackageLimits, type WorkspaceCounts, type WorkspaceManifest } from "@workspace/domain/workspacePackageSchema";

export type WorkspacePackageErrorCode = "IMPORT_TOO_LARGE" | "IMPORT_ARCHIVE_INVALID" | "IMPORT_PATH_UNSAFE" | "IMPORT_ENTRY_UNSUPPORTED" | "IMPORT_VERSION_UNSUPPORTED" | "IMPORT_MANIFEST_INVALID" | "IMPORT_RELATION_INVALID" | "IMPORT_FILE_MISSING" | "IMPORT_FILE_INVALID" | "IMPORT_STORAGE_FAILED";
export class WorkspacePackageError extends Error {
  constructor(public readonly code: WorkspacePackageErrorCode, message: string, public readonly cause?: unknown) { super(message); this.name = "WorkspacePackageError"; }
}

const rootFiles = ["manifest.json", "positions.csv", "job-platform-links.csv", "questions.csv", "readings.csv", "submitted-resumes.csv", "departments.csv", "teams.csv", "locations.csv"] as const;
const csvNames = rootFiles.slice(1);
const fixedDate = new Date("2000-01-01T00:00:00.000Z");

function richText(value: unknown): string {
  if (!value || typeof value !== "object") return "";
  const node = value as { type?: string; text?: string; content?: unknown[] };
  if (node.type === "text") return node.text ?? "";
  if (node.type === "hardBreak") return "\n";
  const separator = node.type === "doc" || node.type === "bulletList" || node.type === "orderedList" || node.type === "listItem" ? "\n" : "";
  return (node.content ?? []).map(richText).filter(Boolean).join(separator).replace(/\n{3,}/g, "\n\n").trim();
}

function csv(records: Record<string, unknown>[], columns: string[]) {
  return stringify(records, { header: true, columns, record_delimiter: "windows", escape_formulas: true });
}

export function createCanonicalCsvs(document: PositionsDocument, referenceData: ReferenceData, files: WorkspaceManifest["files"]) {
  const fileBySource = new Map(files.map((file) => [`${file.kind}:${file.ownerPositionId}:${file.sourceRelativePath}`, file]));
  const positions = document.positions.map((p, sequence) => ({ sequence, id: p.id, company_name: p.company.name, company_logo_path: p.company.logoPath ?? "", company_logo_url: p.company.logoUrl ?? "", title: p.title, status: p.status, work_mode: p.workMode, employment_type: p.employmentType, seniority: p.seniority, department_id: p.departmentId ?? "", team_id: p.teamId ?? "", location_id: p.locationId ?? "", hiring_manager_name: p.hiringManager.name, hiring_manager_phone: p.hiringManager.phone, hiring_manager_position: p.hiringManager.position, salary_min: p.salary?.min ?? "", salary_max: p.salary?.max ?? "", salary_currency: p.salary?.currency ?? "", career_page_url: p.careerPageUrl ?? "", career_page_application_status: p.careerPageApplicationStatus ?? "", career_page_application_date: p.careerPageApplicationDate ?? "", description_text: richText(p.description), description_json: JSON.stringify(p.description), created_at: p.createdAt, updated_at: p.updatedAt }));
  const links = document.positions.flatMap((p) => p.jobPlatformLinks.map((link, sequence) => ({ position_id: p.id, sequence, platform_name: link.platformName, url: link.url, application_status: link.applicationStatus ?? "", application_date: link.applicationDate ?? "" })));
  const questions = document.positions.flatMap((p) => p.questions.map((q, sequence) => ({ position_id: p.id, sequence, question_id: q.id, title: q.title, category: q.category ?? "", custom_category: q.customCategory ?? "", answer_text: richText(q.answer), answer_json: JSON.stringify(q.answer), created_at: q.createdAt, updated_at: q.updatedAt })));
  const readings = document.positions.flatMap((p) => p.readingItems.map((item, sequence) => ({ position_id: p.id, sequence, reading_id: item.id, title: item.title, url: item.url ?? "", notes: item.notes, is_read: item.isRead, created_at: item.createdAt, updated_at: item.updatedAt })));
  const resumes = document.positions.flatMap((p) => p.submittedResume ? (() => { const file = fileBySource.get(`submitted_resume:${p.id}:${p.submittedResume.relativePath}`); return [{ position_id: p.id, original_file_name: p.submittedResume.originalFileName, file_type: p.submittedResume.fileType, media_type: p.submittedResume.mediaType, relative_path: p.submittedResume.relativePath, uploaded_at: p.submittedResume.uploadedAt, archive_path: file?.archivePath ?? "", byte_length: file?.byteLength ?? "", sha256: file?.sha256 ?? "" }]; })() : []);
  const departments = referenceData.departments.map((d, sequence) => ({ sequence, department_id: d.id, name: d.name }));
  const teams = referenceData.departments.flatMap((d, department_sequence) => d.teams.map((t, sequence) => ({ department_sequence, sequence, department_id: d.id, team_id: t.id, name: t.name })));
  const locations = referenceData.locations.map((l, sequence) => ({ sequence, location_id: l.id, name: l.name }));
  return {
    "positions.csv": csv(positions, ["sequence", "id", "company_name", "company_logo_path", "company_logo_url", "title", "status", "work_mode", "employment_type", "seniority", "department_id", "team_id", "location_id", "hiring_manager_name", "hiring_manager_phone", "hiring_manager_position", "salary_min", "salary_max", "salary_currency", "career_page_url", "career_page_application_status", "career_page_application_date", "description_text", "description_json", "created_at", "updated_at"]),
    "job-platform-links.csv": csv(links, ["position_id", "sequence", "platform_name", "url", "application_status", "application_date"]),
    "questions.csv": csv(questions, ["position_id", "sequence", "question_id", "title", "category", "custom_category", "answer_text", "answer_json", "created_at", "updated_at"]),
    "readings.csv": csv(readings, ["position_id", "sequence", "reading_id", "title", "url", "notes", "is_read", "created_at", "updated_at"]),
    "submitted-resumes.csv": csv(resumes, ["position_id", "original_file_name", "file_type", "media_type", "relative_path", "uploaded_at", "archive_path", "byte_length", "sha256"]),
    "departments.csv": csv(departments, ["sequence", "department_id", "name"]),
    "teams.csv": csv(teams, ["department_sequence", "sequence", "department_id", "team_id", "name"]),
    "locations.csv": csv(locations, ["sequence", "location_id", "name"]),
  } as Record<(typeof csvNames)[number], string>;
}

function contained(root: string, relativePath: string) {
  const target = resolve(root, relativePath);
  if (target !== resolve(root) && !target.startsWith(`${resolve(root)}${sep}`)) throw new WorkspacePackageError("IMPORT_PATH_UNSAFE", "Package contains an unsafe path.");
  return target;
}

async function fileMetadata(kind: "submitted_resume" | "company_logo", ownerPositionId: string, sourceRelativePath: string, path: string, originalFileName: string | null) {
  const bytes = await readFile(path);
  const extension = extname(path).toLowerCase();
  const mediaType = kind === "submitted_resume" ? (extension === ".pdf" ? "application/pdf" : "application/vnd.openxmlformats-officedocument.wordprocessingml.document") : (extension === ".svg" ? "image/svg+xml" : extension === ".png" ? "image/png" : "image/jpeg");
  const archivePath = `${kind === "submitted_resume" ? "resume-files" : "company-logo-files"}/${ownerPositionId}--${basename(path)}`;
  return { entry: { kind, ownerPositionId, sourceRelativePath, archivePath, mediaType, byteLength: bytes.byteLength, sha256: createHash("sha256").update(bytes).digest("hex"), originalFileName }, bytes } as const;
}

type CreateOptions = { document: PositionsDocument; referenceData: ReferenceData; resumeDirectoryPath: string; logoDirectoryPath: string; bundledLogoDirectoryPath: string; outputDirectoryPath: string; now?: () => Date; fileName?: string };
export async function createWorkspacePackage(options: CreateOptions) {
  const document = PositionsDocumentSchema.parse(options.document);
  const referenceData = ReferenceDataSchema.parse(options.referenceData);
  const managed: Awaited<ReturnType<typeof fileMetadata>>[] = [];
  for (const position of document.positions) {
    if (position.submittedResume) managed.push(await fileMetadata("submitted_resume", position.id, position.submittedResume.relativePath, contained(options.resumeDirectoryPath, position.submittedResume.relativePath), position.submittedResume.originalFileName));
    if (position.company.logoPath) {
      const name = basename(position.company.logoPath);
      let path = contained(options.logoDirectoryPath, name);
      try { await stat(path); } catch { path = contained(options.bundledLogoDirectoryPath, name); }
      managed.push(await fileMetadata("company_logo", position.id, position.company.logoPath, path, null));
    }
  }
  const exportedAt = (options.now ?? (() => new Date()))().toISOString();
  const manifest = WorkspaceManifestSchema.parse({ formatVersion: 1, exportedAt, application: { name: "job-positions", version: "0.1.0" }, positionsDocument: document, referenceData, files: managed.map((item) => item.entry) });
  const csvs = createCanonicalCsvs(document, referenceData, manifest.files);
  await mkdir(options.outputDirectoryPath, { recursive: true });
  const outputPath = join(options.outputDirectoryPath, options.fileName ?? `positions-workspace-${exportedAt.replace(/[:.]/g, "-")}-${randomUUID()}.zip`);
  const output = createWriteStream(outputPath, { flags: "wx" });
  const archive = new ZipArchive({ zlib: { level: 9 }, forceUTC: true });
  const completed = new Promise<void>((resolveDone, reject) => { output.on("close", resolveDone); output.on("error", reject); archive.on("error", reject); });
  archive.pipe(output);
  archive.append(`${JSON.stringify(manifest, null, 2)}\n`, { name: "manifest.json", date: fixedDate });
  for (const name of csvNames) archive.append(csvs[name], { name, date: fixedDate });
  for (const item of managed) archive.append(item.bytes, { name: item.entry.archivePath, date: fixedDate });
  await archive.finalize();
  await completed;
  return outputPath;
}

export function workspaceCounts(manifest: WorkspaceManifest): WorkspaceCounts {
  const positions = manifest.positionsDocument.positions;
  return { positions: positions.length, platformLinks: positions.reduce((n, p) => n + p.jobPlatformLinks.length, 0), questions: positions.reduce((n, p) => n + p.questions.length, 0), readings: positions.reduce((n, p) => n + p.readingItems.length, 0), resumes: positions.filter((p) => p.submittedResume).length, logos: positions.filter((p) => p.company.logoPath).length, departments: manifest.referenceData.departments.length, teams: manifest.referenceData.departments.reduce((n, d) => n + d.teams.length, 0), locations: manifest.referenceData.locations.length };
}

function isSafeEntry(name: string) { return !name.includes("\\") && !name.startsWith("/") && !/^[A-Za-z]:/.test(name) && !/[\x00-\x1f\x7f]/.test(name) && name.split("/").every((part) => part && part !== "." && part !== ".."); }
function validateManifestRelations(manifest: WorkspaceManifest) {
  const departments = new Map(manifest.referenceData.departments.map((department) => [department.id, department]));
  const departmentIds = new Set<string>(); const teamIds = new Set<string>(); const locationIds = new Set<string>();
  for (const department of manifest.referenceData.departments) {
    if (departmentIds.has(department.id)) throw new WorkspacePackageError("IMPORT_RELATION_INVALID", "Package contains duplicate department identifiers.");
    departmentIds.add(department.id);
    for (const team of department.teams) { if (teamIds.has(team.id)) throw new WorkspacePackageError("IMPORT_RELATION_INVALID", "Package contains duplicate team identifiers."); teamIds.add(team.id); }
  }
  for (const location of manifest.referenceData.locations) { if (locationIds.has(location.id)) throw new WorkspacePackageError("IMPORT_RELATION_INVALID", "Package contains duplicate location identifiers."); locationIds.add(location.id); }
  for (const position of manifest.positionsDocument.positions) {
    const department = position.departmentId ? departments.get(position.departmentId) : undefined;
    if (position.departmentId && !department) throw new WorkspacePackageError("IMPORT_RELATION_INVALID", "A position references an unknown department.");
    if (position.teamId && (!department || !department.teams.some((team) => team.id === position.teamId))) throw new WorkspacePackageError("IMPORT_RELATION_INVALID", "A position references an invalid team.");
    if (position.locationId && !locationIds.has(position.locationId)) throw new WorkspacePackageError("IMPORT_RELATION_INVALID", "A position references an unknown location.");
  }
}

function validateFileOwnership(manifest: WorkspaceManifest) {
  const expected = new Set<string>();
  for (const position of manifest.positionsDocument.positions) {
    if (position.submittedResume) expected.add(`submitted_resume:${position.id}:${position.submittedResume.relativePath}`);
    if (position.company.logoPath) expected.add(`company_logo:${position.id}:${position.company.logoPath}`);
  }
  const actual = new Set<string>(); const archivePaths = new Set<string>();
  for (const file of manifest.files) {
    const key = `${file.kind}:${file.ownerPositionId}:${file.sourceRelativePath}`;
    if (!expected.has(key) || actual.has(key) || archivePaths.has(file.archivePath)) throw new WorkspacePackageError("IMPORT_FILE_INVALID", "Managed file ownership is inconsistent with the manifest.");
    actual.add(key); archivePaths.add(file.archivePath);
  }
  if (actual.size !== expected.size) throw new WorkspacePackageError("IMPORT_FILE_MISSING", "The package does not contain every referenced managed file.");
}
async function detectValid(bytes: Buffer, mediaType: string) {
  if (mediaType === "image/svg+xml") return /^\s*(?:<\?xml[^>]*>\s*)?<svg(?:\s|>)/i.test(bytes.toString("utf8")) && !/<!DOCTYPE|<!ENTITY|<script|<foreignObject|\son[a-z]+\s*=/i.test(bytes.toString("utf8"));
  const detected = await fileTypeFromBuffer(Uint8Array.from(bytes));
  return detected?.mime === mediaType;
}

export async function validateWorkspacePackage({ archivePath, stagingDirectoryPath }: { archivePath: string; stagingDirectoryPath: string }) {
  if ((await stat(archivePath)).size > workspacePackageLimits.maxCompressedBytes) throw new WorkspacePackageError("IMPORT_TOO_LARGE", "Package is larger than 512 MiB.");
  await rm(stagingDirectoryPath, { recursive: true, force: true }); await mkdir(stagingDirectoryPath, { recursive: true });
  const entries = new Map<string, Buffer>();
  let expanded = 0;
  try {
    const zip = await openPromise(archivePath, { lazyEntries: true, strictFileNames: true, validateEntrySizes: true });
    for await (const entry of zip.eachEntry()) {
      const name = entry.fileName;
      if (!isSafeEntry(name)) throw new WorkspacePackageError("IMPORT_PATH_UNSAFE", "Package contains an unsafe path.");
      const isManagedDirectory = name === "resume-files/" || name === "company-logo-files/";
      if ((name.endsWith("/") && !isManagedDirectory) || (!name.endsWith("/") && !rootFiles.includes(name as never) && !name.startsWith("resume-files/") && !name.startsWith("company-logo-files/"))) throw new WorkspacePackageError("IMPORT_ENTRY_UNSUPPORTED", "Package contains an unsupported entry.");
      if (entries.has(name)) throw new WorkspacePackageError("IMPORT_ARCHIVE_INVALID", "Package contains duplicate entries.");
      if (entry.isEncrypted()) throw new WorkspacePackageError("IMPORT_ENTRY_UNSUPPORTED", "Encrypted entries are not supported.");
      const unixType = (entry.externalFileAttributes >>> 16) & 0o170000;
      if (unixType === 0o120000) throw new WorkspacePackageError("IMPORT_ENTRY_UNSUPPORTED", "Linked archive entries are not supported.");
      expanded += entry.uncompressedSize;
      if (entries.size + 1 > workspacePackageLimits.maxEntries || expanded > workspacePackageLimits.maxExpandedBytes) throw new WorkspacePackageError("IMPORT_TOO_LARGE", "Expanded package exceeds safety limits.");
      if (name === "manifest.json" && entry.uncompressedSize > workspacePackageLimits.maxManifestBytes) throw new WorkspacePackageError("IMPORT_TOO_LARGE", "Manifest exceeds the safety limit.");
      if (isManagedDirectory) { entries.set(name, Buffer.alloc(0)); continue; }
      const stream = await zip.openReadStreamPromise(entry);
      const chunks: Buffer[] = [];
      for await (const chunk of stream) chunks.push(Buffer.from(chunk));
      entries.set(name, Buffer.concat(chunks));
    }
    zip.close();
  } catch (error) {
    await rm(stagingDirectoryPath, { recursive: true, force: true });
    if (error instanceof WorkspacePackageError) throw error;
    throw new WorkspacePackageError("IMPORT_ARCHIVE_INVALID", "Choose a valid workspace ZIP package.", error);
  }
  for (const name of rootFiles) if (!entries.has(name)) throw new WorkspacePackageError("IMPORT_FILE_MISSING", `Package is missing ${name}.`);
  let manifest: WorkspaceManifest;
  try {
    const raw = JSON.parse(entries.get("manifest.json")!.toString("utf8"));
    if (raw?.formatVersion !== 1) throw new WorkspacePackageError("IMPORT_VERSION_UNSUPPORTED", "This workspace package version is not supported.");
    manifest = WorkspaceManifestSchema.parse(raw);
  }
  catch (error) { if (error instanceof WorkspacePackageError) throw error; throw new WorkspacePackageError("IMPORT_MANIFEST_INVALID", "Package manifest is invalid or unsupported.", error); }
  validateManifestRelations(manifest);
  validateFileOwnership(manifest);
  const canonical = createCanonicalCsvs(manifest.positionsDocument, manifest.referenceData, manifest.files);
  for (const name of csvNames) if (!entries.get(name)!.equals(Buffer.from(canonical[name]))) throw new WorkspacePackageError("IMPORT_FILE_INVALID", `${name} does not match the manifest.`);
  const expectedPaths = new Set(manifest.files.map((file) => file.archivePath));
  for (const name of entries.keys()) if (!name.endsWith("/") && (name.startsWith("resume-files/") || name.startsWith("company-logo-files/")) && !expectedPaths.has(name)) throw new WorkspacePackageError("IMPORT_FILE_INVALID", "Package contains an unreferenced managed file.");
  for (const file of manifest.files) {
    const bytes = entries.get(file.archivePath);
    if (!bytes) throw new WorkspacePackageError("IMPORT_FILE_MISSING", `Package is missing ${file.archivePath}.`);
    if (bytes.byteLength !== file.byteLength || createHash("sha256").update(bytes).digest("hex") !== file.sha256 || !(await detectValid(bytes, file.mediaType))) throw new WorkspacePackageError("IMPORT_FILE_INVALID", `Managed file ${file.archivePath} failed integrity validation.`);
  }
  const workspacePath = join(stagingDirectoryPath, "workspace");
  await mkdir(join(workspacePath, "resumes"), { recursive: true }); await mkdir(join(workspacePath, "company-logos"), { recursive: true });
  await writeFile(join(workspacePath, "positions.json"), `${JSON.stringify(manifest.positionsDocument, null, 2)}\n`);
  await writeFile(join(workspacePath, "reference-data.json"), `${JSON.stringify(manifest.referenceData, null, 2)}\n`);
  for (const file of manifest.files) {
    const destination = file.kind === "submitted_resume" ? contained(join(workspacePath, "resumes"), file.sourceRelativePath) : contained(join(workspacePath, "company-logos"), basename(file.sourceRelativePath));
    await mkdir(join(destination, ".."), { recursive: true }); await writeFile(destination, entries.get(file.archivePath)!);
  }
  return { manifest, counts: workspaceCounts(manifest), workspacePath };
}
