import { describe, expect, it } from "vitest";
import { WorkspaceManifestSchema, WorkspacePreviewSchema, workspacePackageLimits } from "./workspacePackageSchema";

describe("workspace package schemas", () => {
  const manifest = {
    formatVersion: 1,
    exportedAt: "2026-09-09T12:00:00.000Z",
    application: { name: "job-positions", version: "0.1.0" },
    positionsDocument: { version: 6, listView: { mode: "manual", column: null, direction: null }, positions: [] },
    referenceData: { version: 1, departments: [], locations: [] },
    files: [],
  };

  it("accepts version one and rejects unknown keys and versions", () => {
    expect(WorkspaceManifestSchema.parse(manifest).formatVersion).toBe(1);
    expect(() => WorkspaceManifestSchema.parse({ ...manifest, formatVersion: 2 })).toThrow();
    expect(() => WorkspaceManifestSchema.parse({ ...manifest, extra: true })).toThrow();
  });

  it("validates file integrity metadata and preview counts", () => {
    expect(() => WorkspaceManifestSchema.parse({ ...manifest, files: [{ kind: "company_logo", ownerPositionId: "p1", sourceRelativePath: "x.svg", archivePath: "../x.svg", mediaType: "image/svg+xml", byteLength: 1, sha256: "0".repeat(64), originalFileName: null }] })).toThrow();
    expect(WorkspacePreviewSchema.parse({ importId: "id", sourceFileName: "a.zip", formatVersion: 1, applicationVersion: "0.1.0", exportedAt: manifest.exportedAt, counts: { positions: 0, platformLinks: 0, questions: 0, readings: 0, resumes: 0, logos: 0, departments: 0, teams: 0, locations: 0 }, notices: [], willReplaceWorkspace: true, expiresAt: "2026-09-09T12:30:00.000Z" })).toBeTruthy();
    expect(workspacePackageLimits.maxEntries).toBe(10_000);
  });
});
