import { Readable } from "node:stream";
import { createHash } from "node:crypto";
import type { ObjectStorage } from "./objectStorage.js";

export function createTestObjectStorage(): ObjectStorage & { objects: Map<string, Uint8Array> } {
  const objects = new Map<string, Uint8Array>();
  return {
    objects,
    async putImmutable(key, body) {
      if (objects.has(key)) throw new Error("Immutable object key already exists.");
      objects.set(key, body.slice());
      return { key, byteLength: body.byteLength, sha256: createHash("sha256").update(body).digest("hex") };
    },
    async putVerifiedStream(key, body, _contentType, metadata) {
      if (objects.has(key)) throw new Error("Immutable object key already exists.");
      const chunks: Buffer[] = [];
      for await (const chunk of body) chunks.push(Buffer.from(chunk));
      const value = Buffer.concat(chunks);
      if (value.byteLength !== metadata.byteLength || createHash("sha256").update(value).digest("hex") !== metadata.sha256) throw new Error("Verified object metadata does not match its body.");
      objects.set(key, value);
      return { key, ...metadata };
    },
    async get(key) {
      const value = objects.get(key);
      if (!value) throw new Error("Stored object was not found.");
      return Readable.from(value);
    },
    async remove(key) {
      objects.delete(key);
    },
    async signedDownloadUrl(key) {
      if (!objects.has(key)) throw new Error("Stored object was not found.");
      return `https://objects.example.test/${encodeURIComponent(key)}?expires=300`;
    },
  };
}
