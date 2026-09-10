import { beforeEach, describe, expect, it, vi } from "vitest";

const openUrl = vi.fn();
const invoke = vi.fn();
const dialogOpen = vi.fn();
const dialogSave = vi.fn();
const readFile = vi.fn();
const writeFile = vi.fn();
const once = vi.fn();

vi.mock("@tauri-apps/plugin-opener", () => ({ openUrl }));
vi.mock("@tauri-apps/api/core", () => ({ invoke }));
vi.mock("@tauri-apps/plugin-dialog", () => ({ open: dialogOpen, save: dialogSave }));
vi.mock("@tauri-apps/plugin-fs", () => ({ readFile, writeFile }));
vi.mock("@tauri-apps/api/event", () => ({ once }));

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

  it("registers authorization state natively and receives a validated callback event", async () => {
    (window as Window & { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__ = {};
    once.mockImplementation(async (name: string, handler: (event: { payload: string }) => void) => {
      if (name === "desktop-auth-callback") queueMicrotask(() => handler({ payload: "job-application-workspace://auth/callback?code=x" }));
      return () => undefined;
    });
    const { registerDesktopAuthorization, waitForDesktopAuthorizationCallback } = await import("./desktopBridge");
    await registerDesktopAuthorization({ state: "state", issuer: "https://accounts.example.test", expiresAt: "2026-09-10T10:10:00.000Z" });
    expect(invoke).toHaveBeenCalledWith("register_auth_attempt", { state: "state", issuer: "https://accounts.example.test", expiresAtEpochMs: Date.parse("2026-09-10T10:10:00.000Z") });
    await expect(waitForDesktopAuthorizationCallback()).resolves.toContain("auth/callback");
  });

  it("routes refresh credentials only through narrow native commands", async () => {
    (window as Window & { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__ = {};
    invoke.mockResolvedValueOnce(undefined).mockResolvedValueOnce("refresh-secret").mockResolvedValueOnce(undefined);
    const { createDesktopCredentialVault } = await import("./desktopBridge");
    const vault = createDesktopCredentialVault();
    await vault.saveRefreshCredential("account-a", "https://accounts.example.test", "refresh-secret");
    await expect(vault.readRefreshCredential("account-a", "https://accounts.example.test")).resolves.toBe("refresh-secret");
    await vault.deleteRefreshCredential("account-a", "https://accounts.example.test");
    expect(invoke).toHaveBeenNthCalledWith(1, "save_refresh_credential", { accountId: "account-a", issuer: "https://accounts.example.test", credential: "refresh-secret" });
    expect(invoke).toHaveBeenNthCalledWith(2, "read_refresh_credential", { accountId: "account-a", issuer: "https://accounts.example.test" });
    expect(invoke).toHaveBeenNthCalledWith(3, "delete_refresh_credential", { accountId: "account-a", issuer: "https://accounts.example.test" });
  });
});
