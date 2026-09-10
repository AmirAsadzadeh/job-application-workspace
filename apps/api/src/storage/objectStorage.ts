import { createHash } from "node:crypto";
import { Readable } from "node:stream";
import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import type { ApiConfig } from "../config.js";

export type StoredObject = {
  key: string;
  byteLength: number;
  sha256: string;
};

export interface ObjectStorage {
  putImmutable(key: string, body: Uint8Array, contentType: string): Promise<StoredObject>;
  putVerifiedStream(key: string, body: Readable, contentType: string, metadata: { byteLength: number; sha256: string }): Promise<StoredObject>;
  get(key: string): Promise<Readable>;
  remove(key: string): Promise<void>;
  signedDownloadUrl(key: string, expiresInSeconds?: number): Promise<string>;
}

export function immutableObjectKey(ownerId: string, workspaceId: string, generationId: string, fileId: string) {
  const clean = (value: string) => value.replaceAll(/[^A-Za-z0-9_-]/g, "_");
  return `${clean(ownerId)}/${clean(workspaceId)}/${clean(generationId)}/${clean(fileId)}`;
}

export function createS3ObjectStorage(config: ApiConfig): ObjectStorage {
  const client = new S3Client({
    endpoint: config.S3_ENDPOINT,
    region: config.S3_REGION,
    forcePathStyle: true,
    credentials: { accessKeyId: config.S3_ACCESS_KEY_ID, secretAccessKey: config.S3_SECRET_ACCESS_KEY },
  });
  return {
    async putImmutable(key, body, contentType) {
      const sha256 = createHash("sha256").update(body).digest("hex");
      await client.send(new PutObjectCommand({ Bucket: config.S3_BUCKET, Key: key, Body: body, ContentType: contentType, Metadata: { sha256 } }));
      return { key, byteLength: body.byteLength, sha256 };
    },
    async putVerifiedStream(key, body, contentType, metadata) {
      await client.send(new PutObjectCommand({ Bucket: config.S3_BUCKET, Key: key, Body: body, ContentLength: metadata.byteLength, ContentType: contentType, Metadata: { sha256: metadata.sha256 } }));
      return { key, ...metadata };
    },
    async get(key) {
      const response = await client.send(new GetObjectCommand({ Bucket: config.S3_BUCKET, Key: key }));
      if (!response.Body) throw new Error("Stored object has no body.");
      return Readable.fromWeb(response.Body.transformToWebStream() as never);
    },
    async remove(key) {
      await client.send(new DeleteObjectCommand({ Bucket: config.S3_BUCKET, Key: key }));
    },
    signedDownloadUrl(key, expiresInSeconds = 300) {
      return getSignedUrl(client, new GetObjectCommand({ Bucket: config.S3_BUCKET, Key: key }), { expiresIn: expiresInSeconds });
    },
  };
}
