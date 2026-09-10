import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { formatWorkspaceReady, initializeWorkspaceFiles, parseDesktopArguments, watchParentProcess } from "./desktopRuntime";

const directories: string[] = [];

afterEach(async () => {
  vi.useRealTimers();
  await Promise.all(directories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })));
});

describe("desktop runtime", () => {
  it("parses an isolated loopback runtime with an ephemeral port", () => {
    expect(parseDesktopArguments([
      "--desktop",
      "--host=127.0.0.1",
      "--port=0",
      "--workspace=C:\\Users\\Me\\Workspace",
      "--resources=C:\\Program Files\\Workspace\\resources",
      "--parent-pid=42",
    ])).toEqual({
      desktop: true,
      host: "127.0.0.1",
      port: 0,
      workspacePath: "C:\\Users\\Me\\Workspace",
      resourcesPath: "C:\\Program Files\\Workspace\\resources",
      parentProcessId: 42,
    });
  });

  it.each([
    [["--desktop", "--host=0.0.0.0", "--port=0", "--workspace=x", "--resources=y", "--parent-pid=1"]],
    [["--desktop", "--host=127.0.0.1", "--port=70000", "--workspace=x", "--resources=y", "--parent-pid=1"]],
    [["--desktop", "--host=127.0.0.1", "--port=0", "--workspace=x", "--resources=y"]],
    [["--desktop", "--host=127.0.0.1", "--port=0", "--workspace=x", "--resources=y", "--parent-pid=1", "--unknown"]],
  ])("rejects invalid or incomplete desktop arguments", (args) => {
    expect(() => parseDesktopArguments(args)).toThrow();
  });

  it("creates missing JSON files from packaged templates", async () => {
    const root = await mkdtemp(join(tmpdir(), "desktop-runtime-"));
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
    const root = await mkdtemp(join(tmpdir(), "desktop-runtime-"));
    directories.push(root);
    const workspace = join(root, "workspace");
    const resources = join(root, "resources");
    const { mkdir } = await import("node:fs/promises");
    await mkdir(workspace, { recursive: true });
    await mkdir(resources, { recursive: true });
    await writeFile(join(workspace, "positions.json"), "{future-invalid");
    await writeFile(join(workspace, "reference-data.json"), '{"version":999,"departments":[],"locations":[]}');
    await writeFile(join(resources, "positions.example.json"), "{}");
    await writeFile(join(resources, "reference-data.example.json"), "{}");

    await initializeWorkspaceFiles(workspace, resources);

    expect(await readFile(join(workspace, "positions.json"), "utf8")).toBe("{future-invalid");
    expect(await readFile(join(workspace, "reference-data.json"), "utf8")).toContain('"version":999');
  });

  it("surfaces template read failures without leaving a partial canonical file", async () => {
    const root = await mkdtemp(join(tmpdir(), "desktop-runtime-"));
    directories.push(root);
    const workspace = join(root, "workspace");
    const resources = join(root, "missing-resources");

    await expect(initializeWorkspaceFiles(workspace, resources)).rejects.toThrow();
    await expect(readFile(join(workspace, "positions.json"))).rejects.toThrow();
  });

  it("notifies once when the owning process disappears", () => {
    vi.useFakeTimers();
    const onGone = vi.fn();
    const stop = watchParentProcess(42, onGone, 100, () => false);
    vi.advanceTimersByTime(250);
    expect(onGone).toHaveBeenCalledTimes(1);
    stop();
  });

  it("formats the exact loopback readiness contract", () => {
    expect(formatWorkspaceReady("http://127.0.0.1:4173")).toBe('WORKSPACE_READY {"origin":"http://127.0.0.1:4173"}\n');
    expect(() => formatWorkspaceReady("https://example.com:4173")).toThrow("loopback");
  });
});
