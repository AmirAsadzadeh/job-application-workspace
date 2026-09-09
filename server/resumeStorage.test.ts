import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createResumeStorage } from "./resumeStorage";

let directory = "";
let sequence = 0;
const chunks = (value: Uint8Array) => (async function* () { yield value.subarray(0, 5); yield value.subarray(5); })();
const storedZipEntry = (name: string, content: string) => {
  const nameBytes = Buffer.from(name);
  const contentBytes = Buffer.from(content);
  const header = Buffer.alloc(30);
  header.writeUInt32LE(0x04034b50, 0);
  header.writeUInt16LE(20, 4);
  header.writeUInt32LE(contentBytes.length, 18);
  header.writeUInt32LE(contentBytes.length, 22);
  header.writeUInt16LE(nameBytes.length, 26);
  return Buffer.concat([header, nameBytes, contentBytes]);
};

beforeEach(async () => { directory = await mkdtemp(join(tmpdir(), "resume-storage-")); sequence = 0; });
afterEach(async () => rm(directory, { recursive: true, force: true }));

describe("resume storage", () => {
  it("streams, detects, promotes, opens, and removes a PDF independently of its declared name", async () => {
    const storage = createResumeStorage({ rootPath: directory, createId: () => `id-${++sequence}` });
    const bytes = Buffer.from("%PDF-1.7\n1 0 obj\n<<>>\nendobj\n%%EOF");
    const staged = await storage.stage("position-1", chunks(bytes));
    expect(staged).toMatchObject({ fileType: "pdf", mediaType: "application/pdf", relativePath: "position-1/id-1.pdf" });
    await storage.promote(staged);
    const opened = await storage.open(staged.relativePath, "position-1");
    expect(await readFile(opened.path)).toEqual(bytes);
    await storage.discard(staged.relativePath, "position-1");
    await expect(storage.open(staged.relativePath, "position-1")).rejects.toMatchObject({ code: "RESUME_FILE_UNAVAILABLE" });
  });

  it("rejects unsupported content and paths outside the owning position", async () => {
    const storage = createResumeStorage({ rootPath: directory, createId: () => `id-${++sequence}` });
    await expect(storage.stage("position-1", chunks(Buffer.from("not a document")))).rejects.toMatchObject({ code: "RESUME_INVALID" });
    expect(() => storage.resolveManaged("../private.pdf", "position-1")).toThrow(/outside managed storage/);
    expect(() => storage.resolveManaged("position-2/file.pdf", "position-1")).toThrow(/does not belong/);
  });

  it("uses opaque names so equal source names cannot collide", async () => {
    const storage = createResumeStorage({ rootPath: directory, createId: () => `id-${++sequence}` });
    const bytes = Buffer.from("%PDF-1.7\n%%EOF");
    const first = await storage.stage("position-1", chunks(bytes));
    const second = await storage.stage("position-2", chunks(bytes));
    expect(first.relativePath).not.toBe(second.relativePath);
  });

  it("detects DOCX content rather than trusting a filename or MIME hint", async () => {
    const storage = createResumeStorage({ rootPath: directory, createId: () => `id-${++sequence}` });
    const contentTypes = '<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>';
    const staged = await storage.stage("position-1", chunks(storedZipEntry("[Content_Types].xml", contentTypes)));
    expect(staged).toMatchObject({ fileType: "docx", mediaType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" });
  });
});
