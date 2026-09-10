import { beforeEach, describe, expect, it, vi } from "vitest";

const openUrl = vi.fn();
const invoke = vi.fn();
const dialogOpen = vi.fn();
const dialogSave = vi.fn();
const readFile = vi.fn();
const writeFile = vi.fn();

vi.mock("@tauri-apps/plugin-opener", () => ({ openUrl }));
vi.mock("@tauri-apps/api/core", () => ({ invoke }));
vi.mock("@tauri-apps/plugin-dialog", () => ({ open: dialogOpen, save: dialogSave }));
vi.mock("@tauri-apps/plugin-fs", () => ({ readFile, writeFile }));

describe("desktop bridge", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete (window as Window & { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__;
  });

  it("retains normal browser link behavior outside the desktop shell", async () => {
    const browserOpen = vi.spyOn(window, "open").mockImplementation(() => null);
    const { openExternalUrl } = await import("./desktopBridge");
    await openExternalUrl("https://example.com/job");
    expect(browserOpen).toHaveBeenCalledWith("https://example.com/job", "_blank", "noopener,noreferrer");
  });

  it("rejects unsafe external protocols", async () => {
    const { openExternalUrl } = await import("./desktopBridge");
    await expect(openExternalUrl("file:///private.txt")).rejects.toThrow("HTTP or HTTPS");
  });

  it("uses native open and save operations in desktop mode", async () => {
    (window as Window & { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__ = {};
    dialogOpen.mockResolvedValue("C:\\Backups\\workspace.zip");
    readFile.mockResolvedValue(new Uint8Array([1, 2, 3]));
    dialogSave.mockResolvedValue("C:\\Backups\\export.zip");
    const { chooseWorkspaceZip, openWorkspaceDataFolder, saveWorkspacePackage } = await import("./desktopBridge");
    const file = await chooseWorkspaceZip();
    expect(file?.name).toBe("workspace.zip");
    expect(await openWorkspaceDataFolder()).toBe(true);
    expect(invoke).toHaveBeenCalledWith("reveal_workspace");
    expect(await saveWorkspacePackage(new Blob([new Uint8Array([4])]), "export.zip")).toBe(true);
    expect(writeFile).toHaveBeenCalledWith("C:\\Backups\\export.zip", expect.any(Uint8Array));
  });
});
