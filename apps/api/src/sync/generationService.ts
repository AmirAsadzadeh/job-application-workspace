import { createHash, randomUUID } from "node:crypto";
import { createReadStream, createWriteStream } from "node:fs";
import { mkdtemp, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Transform } from "node:stream";
import { pipeline } from "node:stream/promises";
import { eq } from "drizzle-orm";
import type { Database } from "../db/connection.js";
import { workspaceGenerations } from "../db/schema/index.js";
import { createOnlineWorkspaceRepository } from "../repositories/onlineWorkspaceRepository.js";
import { createOnlineWorkspaceExport } from "../workspace/onlineWorkspaceExport.js";
import { immutableObjectKey, type ObjectStorage } from "../storage/objectStorage.js";

export function createGenerationService(database: Database, storage: ObjectStorage) {
  const repository = createOnlineWorkspaceRepository(database);

  async function persist(ownerId: string, input: { id: string; objectKey: string; checksum: string; sourceKind: "offline_upload" | "online_backup"; sourceRevision: number | null; expiresAt: Date | null }) {
    const workspace = await repository.ensure(ownerId);
    try {
      const generation = (await database.db.insert(workspaceGenerations).values({ id: input.id, workspaceId: workspace.id, state: input.sourceKind === "online_backup" ? "backup" : "staging", sourceKind: input.sourceKind, sourceRevision: input.sourceRevision, packageFormatVersion: 1, packageChecksum: input.checksum, backupObjectKey: input.objectKey, expiresAt: input.expiresAt }).returning({ createdAt: workspaceGenerations.createdAt }))[0];
      return { id: input.id, workspaceId: workspace.id, objectKey: input.objectKey, createdAt: generation.createdAt };
    } catch (error) {
      await storage.remove(input.objectKey).catch(() => undefined);
      throw error;
    }
  }

  async function stageSourcePackage(ownerId: string, source: { archivePath: string; checksum: string; compressedBytes: number }, sourceRevision: number | null, expiresAt: Date) {
    const workspace = await repository.ensure(ownerId);
    const id = randomUUID();
    const objectKey = immutableObjectKey(ownerId, workspace.id, id, "source-package.zip");
    await storage.putVerifiedStream(objectKey, createReadStream(source.archivePath), "application/zip", { byteLength: source.compressedBytes, sha256: source.checksum });
    return persist(ownerId, { id, objectKey, checksum: source.checksum, sourceKind: "offline_upload", sourceRevision, expiresAt });
  }

  async function backupCurrent(ownerId: string) {
    const workspace = await repository.ensure(ownerId);
    const exported = await createOnlineWorkspaceExport(ownerId, database, storage);
    const root = await mkdtemp(join(tmpdir(), "workspace-backup-"));
    const path = join(root, "backup.zip");
    const hash = createHash("sha256");
    let byteLength = 0;
    const meter = new Transform({ transform(chunk: Buffer, _encoding, callback) { byteLength += chunk.byteLength; hash.update(chunk); callback(null, chunk); } });
    try {
      await pipeline(exported.stream, meter, createWriteStream(path, { flags: "wx" }));
      const details = await stat(path);
      if (details.size !== byteLength) throw new Error("Backup size verification failed.");
      const checksum = hash.digest("hex");
      const id = randomUUID();
      const objectKey = immutableObjectKey(ownerId, workspace.id, id, "destination-backup.zip");
      await storage.putVerifiedStream(objectKey, createReadStream(path), "application/zip", { byteLength, sha256: checksum });
      return persist(ownerId, { id, objectKey, checksum, sourceKind: "online_backup", sourceRevision: workspace.revision, expiresAt: null });
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  }

  async function discard(generationId: string) {
    const generation = (await database.db.select().from(workspaceGenerations).where(eq(workspaceGenerations.id, generationId)).limit(1))[0];
    if (!generation) return;
    await database.db.update(workspaceGenerations).set({ state: "failed" }).where(eq(workspaceGenerations.id, generationId));
    if (generation.backupObjectKey) await storage.remove(generation.backupObjectKey).catch(() => undefined);
  }

  return { stageSourcePackage, backupCurrent, discard };
}
