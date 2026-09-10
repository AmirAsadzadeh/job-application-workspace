import { createReadStream, createWriteStream } from "node:fs";
import { mkdir, rename, stat, unlink } from "node:fs/promises";
import { resolve, sep } from "node:path";
import { pipeline } from "node:stream/promises";
import { Readable } from "node:stream";
import { fileTypeFromFile } from "file-type";
import type { SubmittedResume } from "@workspace/domain/positionSchema";

const supportedTypes = {
  "application/pdf": { fileType: "pdf", extension: "pdf" },
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": { fileType: "docx", extension: "docx" },
} as const;

export class ResumeStorageError extends Error {
  constructor(public readonly code: "RESUME_INVALID" | "RESUME_FILE_UNAVAILABLE" | "RESUME_STORAGE_FAILED", message: string, public readonly cause?: unknown) {
    super(message);
    this.name = "ResumeStorageError";
  }
}

export type StagedResume = {
  temporaryPath: string;
  finalPath: string;
  relativePath: string;
  fileType: SubmittedResume["fileType"];
  mediaType: SubmittedResume["mediaType"];
};

type ResumeStorageOptions = {
  rootPath: string;
  createId: () => string;
};

function assertSafeSegment(value: string, label: string) {
  if (!/^[A-Za-z0-9][A-Za-z0-9-]*$/.test(value)) throw new ResumeStorageError("RESUME_INVALID", `${label} is invalid.`);
}

export function createResumeStorage({ rootPath, createId }: ResumeStorageOptions) {
  const root = resolve(rootPath);

  function resolveManaged(relativePath: string, positionId?: string) {
    const target = resolve(root, relativePath);
    if (!target.startsWith(`${root}${sep}`)) throw new ResumeStorageError("RESUME_INVALID", "Resume path is outside managed storage.");
    if (positionId) {
      assertSafeSegment(positionId, "Position id");
      const ownerRoot = resolve(root, positionId);
      if (!target.startsWith(`${ownerRoot}${sep}`)) throw new ResumeStorageError("RESUME_INVALID", "Resume path does not belong to this position.");
    }
    return target;
  }

  async function stage(positionId: string, body: AsyncIterable<Uint8Array>) {
    assertSafeSegment(positionId, "Position id");
    const ownerRoot = resolve(root, positionId);
    await mkdir(ownerRoot, { recursive: true });
    const token = createId();
    assertSafeSegment(token, "Resume id");
    const temporaryPath = resolveManaged(`${positionId}/.${token}.upload`, positionId);
    try {
      await pipeline(Readable.from(body), createWriteStream(temporaryPath, { flags: "wx" }));
      const detected = await fileTypeFromFile(temporaryPath);
      const supported = detected ? supportedTypes[detected.mime as keyof typeof supportedTypes] : undefined;
      if (!supported) throw new ResumeStorageError("RESUME_INVALID", "Choose a valid PDF or DOCX file.");
      const relativePath = `${positionId}/${token}.${supported.extension}`;
      return {
        temporaryPath,
        finalPath: resolveManaged(relativePath, positionId),
        relativePath,
        fileType: supported.fileType,
        mediaType: detected!.mime as SubmittedResume["mediaType"],
      } satisfies StagedResume;
    } catch (error) {
      await unlink(temporaryPath).catch(() => undefined);
      if (error instanceof ResumeStorageError) throw error;
      throw new ResumeStorageError("RESUME_STORAGE_FAILED", "Could not import the resume.", error);
    }
  }

  async function promote(staged: StagedResume) {
    try {
      await rename(staged.temporaryPath, staged.finalPath);
    } catch (error) {
      await unlink(staged.temporaryPath).catch(() => undefined);
      throw new ResumeStorageError("RESUME_STORAGE_FAILED", "Could not retain the resume.", error);
    }
  }

  async function discard(relativePath: string, positionId: string) {
    await unlink(resolveManaged(relativePath, positionId)).catch((error: NodeJS.ErrnoException) => {
      if (error.code !== "ENOENT") throw new ResumeStorageError("RESUME_STORAGE_FAILED", "Could not remove the managed resume.", error);
    });
  }

  async function moveToTombstone(relativePath: string, positionId: string) {
    const source = resolveManaged(relativePath, positionId);
    const tombstone = resolveManaged(`${positionId}/.${createId()}.removed`, positionId);
    try {
      await rename(source, tombstone);
      return { source, tombstone };
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
      throw new ResumeStorageError("RESUME_STORAGE_FAILED", "Could not remove the managed resume.", error);
    }
  }

  async function restoreTombstone(tombstone: { source: string; tombstone: string }) {
    await rename(tombstone.tombstone, tombstone.source).catch((error) => {
      throw new ResumeStorageError("RESUME_STORAGE_FAILED", "Could not restore the previous resume.", error);
    });
  }

  async function deleteTombstone(tombstone: { tombstone: string }) {
    await unlink(tombstone.tombstone).catch((error: NodeJS.ErrnoException) => {
      if (error.code !== "ENOENT") throw new ResumeStorageError("RESUME_STORAGE_FAILED", "Could not finish removing the previous resume.", error);
    });
  }

  async function open(relativePath: string, positionId: string) {
    const path = resolveManaged(relativePath, positionId);
    try {
      const details = await stat(path);
      if (!details.isFile()) throw new Error("Not a regular file.");
      return { path, size: details.size, stream: createReadStream(path) };
    } catch (error) {
      throw new ResumeStorageError("RESUME_FILE_UNAVAILABLE", "The managed resume file is unavailable.", error);
    }
  }

  return { stage, promote, discard, moveToTombstone, restoreTombstone, deleteTombstone, open, resolveManaged };
}
