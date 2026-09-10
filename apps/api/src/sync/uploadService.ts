import { createHash, randomUUID } from "node:crypto";
import { createWriteStream } from "node:fs";
import { mkdir, mkdtemp, readFile, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve, sep } from "node:path";
import { Readable, Transform } from "node:stream";
import { pipeline } from "node:stream/promises";
import { fileTypeFromFile } from "file-type";
import { openPromise } from "yauzl";
import { createCanonicalCsvs } from "@workspace/domain/workspaceCsv";
import { WorkspaceManifestSchema, workspacePackageLimits, type WorkspaceCounts, type WorkspaceManifest } from "@workspace/domain/workspacePackageSchema";

const rootFiles = ["manifest.json", "positions.csv", "job-platform-links.csv", "questions.csv", "readings.csv", "submitted-resumes.csv", "departments.csv", "teams.csv", "locations.csv"] as const;
const csvNames = ["positions.csv", "job-platform-links.csv", "questions.csv", "readings.csv", "submitted-resumes.csv", "departments.csv", "teams.csv", "locations.csv"] as const;

export class SynchronizationUploadError extends Error {
  readonly statusCode: number;
  constructor(public readonly code: "SYNC_UPLOAD_TOO_LARGE" | "SYNC_SOURCE_INVALID", message: string) {
    super(message);
    this.statusCode = code === "SYNC_UPLOAD_TOO_LARGE" ? 413 : 422;
  }
}

function safeEntry(name: string) {
  const parts = name.endsWith("/") ? name.slice(0, -1).split("/") : name.split("/");
  return !name.includes("\\") && !name.startsWith("/") && !/^[A-Za-z]:/.test(name) && !/[\x00-\x1f\x7f]/.test(name) && parts.every((part) => part && part !== "." && part !== "..");
}

function destination(root: string, name: string) {
  const target = resolve(root, name);
  if (!target.startsWith(`${resolve(root)}${sep}`)) throw new SynchronizationUploadError("SYNC_SOURCE_INVALID", "Package contains an unsafe path.");
  return target;
}

function counts(manifest: WorkspaceManifest): WorkspaceCounts {
  const positions = manifest.positionsDocument.positions;
  return { positions: positions.length, platformLinks: positions.reduce((n, p) => n + p.jobPlatformLinks.length, 0), questions: positions.reduce((n, p) => n + p.questions.length, 0), readings: positions.reduce((n, p) => n + p.readingItems.length, 0), resumes: positions.filter((p) => p.submittedResume).length, logos: positions.filter((p) => p.company.logoPath).length, departments: manifest.referenceData.departments.length, teams: manifest.referenceData.departments.reduce((n, d) => n + d.teams.length, 0), locations: manifest.referenceData.locations.length };
}

function validateRelations(manifest: WorkspaceManifest) {
  const departments = new Map(manifest.referenceData.departments.map((department) => [department.id, department]));
  const locations = new Set(manifest.referenceData.locations.map((location) => location.id));
  const expectedFiles = new Set<string>();
  for (const position of manifest.positionsDocument.positions) {
    const department = position.departmentId ? departments.get(position.departmentId) : undefined;
    if (position.departmentId && !department) throw new SynchronizationUploadError("SYNC_SOURCE_INVALID", "A position references an unknown department.");
    if (position.teamId && !department?.teams.some((team) => team.id === position.teamId)) throw new SynchronizationUploadError("SYNC_SOURCE_INVALID", "A position references an invalid team.");
    if (position.locationId && !locations.has(position.locationId)) throw new SynchronizationUploadError("SYNC_SOURCE_INVALID", "A position references an unknown location.");
    if (position.submittedResume) expectedFiles.add(`submitted_resume:${position.id}:${position.submittedResume.relativePath}`);
    if (position.company.logoPath) expectedFiles.add(`company_logo:${position.id}:${position.company.logoPath}`);
  }
  const actualFiles = new Set(manifest.files.map((file) => `${file.kind}:${file.ownerPositionId}:${file.sourceRelativePath}`));
  if (actualFiles.size !== manifest.files.length || actualFiles.size !== expectedFiles.size || [...expectedFiles].some((key) => !actualFiles.has(key))) throw new SynchronizationUploadError("SYNC_SOURCE_INVALID", "Managed file ownership is inconsistent with the workspace records.");
}

async function validateManagedFile(path: string, file: WorkspaceManifest["files"][number]) {
  const details = await stat(path).catch(() => null);
  if (!details?.isFile() || details.size !== file.byteLength) return false;
  const bytes = await readFile(path);
  if (createHash("sha256").update(bytes).digest("hex") !== file.sha256) return false;
  if (file.mediaType === "image/svg+xml") {
    const text = bytes.toString("utf8");
    return /^\s*(?:<\?xml[^>]*>\s*)?<svg(?:\s|>)/i.test(text) && !/<!DOCTYPE|<!ENTITY|<script|<foreignObject|\son[a-z]+\s*=/i.test(text);
  }
  return (await fileTypeFromFile(path))?.mime === file.mediaType;
}

export async function stageSynchronizationUpload(body: AsyncIterable<Uint8Array>) {
  const root = await mkdtemp(join(tmpdir(), "workspace-sync-"));
  const archivePath = join(root, "source.zip");
  const extractedPath = join(root, "extracted");
  await mkdir(extractedPath);
  const hash = createHash("sha256");
  let compressedBytes = 0;
  const limiter = new Transform({ transform(chunk: Buffer, _encoding, callback) { compressedBytes += chunk.byteLength; hash.update(chunk); callback(compressedBytes > workspacePackageLimits.maxCompressedBytes ? new SynchronizationUploadError("SYNC_UPLOAD_TOO_LARGE", "Package is larger than 512 MiB.") : null, chunk); } });
  try {
    await pipeline(Readable.from(body), limiter, createWriteStream(archivePath, { flags: "wx" }));
    const zip = await openPromise(archivePath, { lazyEntries: true, strictFileNames: true, validateEntrySizes: true });
    const names = new Set<string>();
    let expandedBytes = 0;
    for await (const entry of zip.eachEntry()) {
      const name = entry.fileName;
      if (!safeEntry(name) || names.has(name) || entry.isEncrypted()) throw new SynchronizationUploadError("SYNC_SOURCE_INVALID", "Package entries are invalid.");
      const unixType = (entry.externalFileAttributes >>> 16) & 0o170000;
      if (unixType === 0o120000) throw new SynchronizationUploadError("SYNC_SOURCE_INVALID", "Linked archive entries are not supported.");
      names.add(name);
      expandedBytes += entry.uncompressedSize;
      if (names.size > workspacePackageLimits.maxEntries || expandedBytes > workspacePackageLimits.maxExpandedBytes) throw new SynchronizationUploadError("SYNC_UPLOAD_TOO_LARGE", "Expanded package exceeds safety limits.");
      const isDirectory = name.endsWith("/");
      if (isDirectory) {
        if (name !== "resume-files/" && name !== "company-logo-files/") throw new SynchronizationUploadError("SYNC_SOURCE_INVALID", "Package contains an unsupported directory.");
        continue;
      }
      if (!rootFiles.includes(name as never) && !name.startsWith("resume-files/") && !name.startsWith("company-logo-files/")) throw new SynchronizationUploadError("SYNC_SOURCE_INVALID", "Package contains an unsupported entry.");
      if (name === "manifest.json" && entry.uncompressedSize > workspacePackageLimits.maxManifestBytes) throw new SynchronizationUploadError("SYNC_UPLOAD_TOO_LARGE", "Manifest exceeds the safety limit.");
      const target = destination(extractedPath, name);
      await mkdir(dirname(target), { recursive: true });
      await pipeline(await zip.openReadStreamPromise(entry), createWriteStream(target, { flags: "wx" }));
    }
    zip.close();
    for (const name of rootFiles) if (!names.has(name)) throw new SynchronizationUploadError("SYNC_SOURCE_INVALID", `Package is missing ${name}.`);
    const manifest = WorkspaceManifestSchema.parse(JSON.parse(await readFile(join(extractedPath, "manifest.json"), "utf8")));
    validateRelations(manifest);
    const canonical = createCanonicalCsvs(manifest.positionsDocument, manifest.referenceData, manifest.files);
    for (const name of csvNames) if ((await readFile(join(extractedPath, name), "utf8")) !== canonical[name]) throw new SynchronizationUploadError("SYNC_SOURCE_INVALID", `${name} does not match the manifest.`);
    const expectedManaged = new Set(manifest.files.map((file) => file.archivePath));
    for (const file of manifest.files) if (!names.has(file.archivePath) || !(await validateManagedFile(destination(extractedPath, file.archivePath), file))) throw new SynchronizationUploadError("SYNC_SOURCE_INVALID", `Managed file ${file.archivePath} failed validation.`);
    for (const name of names) if ((name.startsWith("resume-files/") || name.startsWith("company-logo-files/")) && !name.endsWith("/") && !expectedManaged.has(name)) throw new SynchronizationUploadError("SYNC_SOURCE_INVALID", "Package contains an unreferenced managed file.");
    return { id: randomUUID(), root, archivePath, extractedPath, checksum: hash.digest("hex"), compressedBytes, manifest, counts: counts(manifest), cleanup: () => rm(root, { recursive: true, force: true }) };
  } catch (error) {
    await rm(root, { recursive: true, force: true });
    if (error instanceof SynchronizationUploadError) throw error;
    throw new SynchronizationUploadError("SYNC_SOURCE_INVALID", "Workspace package is invalid.");
  }
}
