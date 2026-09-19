import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { initializeWorkspaceFiles } from "./workspaceInitialization";

const directories: string[] = [];

afterEach(async () => {
  await Promise.all(directories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })));
});

describe("workspace initialization", () => {
  it("creates missing JSON files from bundled templates", async () => {
    const root = await mkdtemp(join(tmpdir(), "workspace-initialization-"));
    directories.push(root);
    const workspace = join(root, "workspace");
    const resources = join(root, "resources");
    await import("node:fs/promises").then(({ mkdir }) => mkdir(resources, { recursive: true }));
    await writeFile(join(resources, "positions.example.json"), "{\"version\":6,\"positions\":[]}");
    await writeFile(join(resources, "reference-data.example.json"), "{\"version\":1,\"departments\":[],\"locations\":[]}");

    await initializeWorkspaceFiles(workspace, resources);

    expect(await readFile(join(workspace, "positions.json"), "utf8")).toContain("\"version\":6");
    expect(await readFile(join(workspace, "reference-data.json"), "utf8")).toContain("\"version\":1");
  });

  it("never replaces an existing invalid or future-version file", async () => {
    const root = await mkdtemp(join(tmpdir(), "workspace-initialization-"));
    directories.push(root);
    const workspace = join(root, "workspace");
    const resources = join(root, "resources");
    const { mkdir } = await import("node:fs/promises");
    await mkdir(workspace, { recursive: true });
    await mkdir(resources, { recursive: true });
    await writeFile(join(workspace, "positions.json"), "{future-invalid");
    await writeFile(join(workspace, "reference-data.json"), "{\"version\":999,\"departments\":[],\"locations\":[]}");
    await writeFile(join(resources, "positions.example.json"), "{}");
    await writeFile(join(resources, "reference-data.example.json"), "{}");

    await initializeWorkspaceFiles(workspace, resources);

    expect(await readFile(join(workspace, "positions.json"), "utf8")).toBe("{future-invalid");
    expect(await readFile(join(workspace, "reference-data.json"), "utf8")).toContain("\"version\":999");
  });

  it("surfaces template read failures without leaving a partial canonical file", async () => {
    const root = await mkdtemp(join(tmpdir(), "workspace-initialization-"));
    directories.push(root);
    const workspace = join(root, "workspace");
    const resources = join(root, "missing-resources");

    await expect(initializeWorkspaceFiles(workspace, resources)).rejects.toThrow();
    await expect(readFile(join(workspace, "positions.json"))).rejects.toThrow();
  });
});
