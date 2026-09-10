import { PassThrough } from "node:stream";
import { ZipArchive } from "@archiver/archiver";
import { eq } from "drizzle-orm";
import { createCanonicalCsvs } from "@workspace/domain/workspaceCsv";
import { WorkspaceManifestSchema, type WorkspaceManifest } from "@workspace/domain/workspacePackageSchema";
import type { Database } from "../db/connection.js";
import { managedFiles } from "../db/schema/index.js";
import { createOnlineWorkspaceRepository } from "../repositories/onlineWorkspaceRepository.js";
import type { ObjectStorage } from "../storage/objectStorage.js";

const csvNames = ["positions.csv", "job-platform-links.csv", "questions.csv", "readings.csv", "submitted-resumes.csv", "departments.csv", "teams.csv", "locations.csv"] as const;
const fixedDate = new Date("2000-01-01T00:00:00.000Z");

function extension(mediaType: string) {
  return mediaType === "application/pdf" ? "pdf"
    : mediaType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ? "docx"
      : mediaType === "image/png" ? "png"
        : mediaType === "image/jpeg" ? "jpg" : "svg";
}

export async function createOnlineWorkspaceExport(ownerId: string, database: Database, storage: ObjectStorage) {
  const workspace = await createOnlineWorkspaceRepository(database).ensure(ownerId);
  const rows = await database.db.select().from(managedFiles).where(eq(managedFiles.workspaceId, workspace.id));
  const byId = new Map(rows.map((file) => [file.id, file]));
  const included = workspace.positions.positions.flatMap((position) => {
    const files: typeof rows = [];
    const logoId = position.company.logoPath?.match(/^\/company-logos\/([^/]+)$/)?.[1];
    if (logoId && byId.get(logoId)?.kind === "company_logo") files.push(byId.get(logoId)!);
    const resume = rows.find((file) => file.positionId === position.id && file.kind === "submitted_resume");
    if (position.submittedResume && resume) files.push(resume);
    return files;
  });
  const manifestFiles: WorkspaceManifest["files"] = included.map((file) => {
    const ext = extension(file.mediaType);
    const sourceRelativePath = file.kind === "submitted_resume" ? `${file.positionId}/${file.id}.${ext}` : `/company-logos/${file.id}`;
    return {
      kind: file.kind,
      ownerPositionId: file.positionId,
      sourceRelativePath,
      archivePath: `${file.kind === "submitted_resume" ? "resume-files" : "company-logo-files"}/${file.positionId}--${file.id}.${ext}`,
      mediaType: file.mediaType as WorkspaceManifest["files"][number]["mediaType"],
      byteLength: file.byteLength,
      sha256: file.sha256,
      originalFileName: file.kind === "submitted_resume" ? file.originalFileName : null,
    };
  });
  const exportedAt = new Date().toISOString();
  const manifest = WorkspaceManifestSchema.parse({ formatVersion: 1, exportedAt, application: { name: "job-positions", version: "0.1.0" }, positionsDocument: workspace.positions, referenceData: workspace.referenceData, files: manifestFiles });
  const csvs = createCanonicalCsvs(workspace.positions, workspace.referenceData, manifest.files);
  const output = new PassThrough();
  const archive = new ZipArchive({ zlib: { level: 9 }, forceUTC: true });
  archive.on("error", (error) => output.destroy(error));
  archive.pipe(output);
  archive.append(`${JSON.stringify(manifest, null, 2)}\n`, { name: "manifest.json", date: fixedDate });
  for (const name of csvNames) archive.append(csvs[name], { name, date: fixedDate });
  for (let index = 0; index < included.length; index += 1) archive.append(await storage.get(included[index].objectKey), { name: manifest.files[index].archivePath, date: fixedDate });
  void archive.finalize().catch((error) => output.destroy(error));
  return { stream: output, fileName: `positions-workspace-${exportedAt.replace(/[:.]/g, "-")}.zip`, revision: workspace.revision };
}
