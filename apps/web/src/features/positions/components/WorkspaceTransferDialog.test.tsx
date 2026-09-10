import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { WorkspaceTransferDialog } from "./WorkspaceTransferDialog";

const desktop = vi.hoisted(() => ({ isDesktop: vi.fn(() => false), chooseZip: vi.fn() }));
vi.mock("../../../desktop/desktopBridge", () => ({
  isDesktopApplication: desktop.isDesktop,
  chooseWorkspaceZip: desktop.chooseZip,
}));

const preview = { importId: "id", sourceFileName: "backup.zip", formatVersion: 1 as const, applicationVersion: "0.1.0", exportedAt: "2026-09-09T12:00:00.000Z", counts: { positions: 2, platformLinks: 3, questions: 4, readings: 5, resumes: 1, logos: 1, departments: 1, teams: 2, locations: 1 }, notices: [], willReplaceWorkspace: true as const, expiresAt: "2026-09-09T12:30:00.000Z" };

describe("WorkspaceTransferDialog", () => {
  beforeEach(() => {
    desktop.isDesktop.mockReturnValue(false);
    desktop.chooseZip.mockReset();
  });

  it("focuses its close control and closes from Escape", async () => {
    const onClose = vi.fn();
    render(<WorkspaceTransferDialog open onClose={onClose} onRestored={vi.fn()} api={{ validateWorkspaceImport: vi.fn(), cancelWorkspaceImport: vi.fn(), restoreWorkspaceImport: vi.fn() }} />);
    await waitFor(() => expect(screen.getByRole("button", { name: "Close import" })).toHaveFocus());
    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("validates, previews, confirms replacement, and reports the backup", async () => {
    const api = { validateWorkspaceImport: vi.fn().mockResolvedValue(preview), cancelWorkspaceImport: vi.fn(), restoreWorkspaceImport: vi.fn().mockResolvedValue({ restored: true, counts: preview.counts, backup: { fileName: "before.zip", relativePath: "data/backups/before.zip", createdAt: preview.exportedAt } }) };
    const onRestored = vi.fn();
    render(<WorkspaceTransferDialog open onClose={vi.fn()} onRestored={onRestored} api={api} />);
    fireEvent.change(screen.getByLabelText("Workspace ZIP"), { target: { files: [new File(["zip"], "backup.zip", { type: "application/zip" })] } });
    expect(await screen.findByText("2 positions")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    fireEvent.click(screen.getByRole("button", { name: "Replace workspace" }));
    expect(await screen.findByText("data/backups/before.zip")).toBeInTheDocument();
    expect(onRestored).toHaveBeenCalledOnce();
  });

  it("cancels a validated import without restoring", async () => {
    const onClose = vi.fn(); const api = { validateWorkspaceImport: vi.fn().mockResolvedValue(preview), cancelWorkspaceImport: vi.fn().mockResolvedValue(undefined), restoreWorkspaceImport: vi.fn() };
    render(<WorkspaceTransferDialog open onClose={onClose} onRestored={vi.fn()} api={api} />);
    fireEvent.change(screen.getByLabelText("Workspace ZIP"), { target: { files: [new File(["zip"], "backup.zip")] } });
    await screen.findByText("2 positions"); fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    await waitFor(() => expect(api.cancelWorkspaceImport).toHaveBeenCalledWith("id"));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("selects a ZIP through the native desktop dialog", async () => {
    const file = new File(["zip"], "desktop-backup.zip", { type: "application/zip" });
    const api = { validateWorkspaceImport: vi.fn().mockResolvedValue(preview), cancelWorkspaceImport: vi.fn(), restoreWorkspaceImport: vi.fn() };
    desktop.isDesktop.mockReturnValue(true);
    desktop.chooseZip.mockResolvedValue(file);
    render(<WorkspaceTransferDialog open onClose={vi.fn()} onRestored={vi.fn()} api={api} />);
    fireEvent.click(screen.getByRole("button", { name: "Choose ZIP" }));
    await waitFor(() => expect(api.validateWorkspaceImport).toHaveBeenCalledWith(file));
    expect(screen.queryByLabelText("Workspace ZIP")).not.toBeInTheDocument();
  });

  it("shows a recoverable error when the native ZIP cannot be read", async () => {
    desktop.isDesktop.mockReturnValue(true);
    desktop.chooseZip.mockRejectedValue(new Error("access denied"));
    render(<WorkspaceTransferDialog open onClose={vi.fn()} onRestored={vi.fn()} api={{ validateWorkspaceImport: vi.fn(), cancelWorkspaceImport: vi.fn(), restoreWorkspaceImport: vi.fn() }} />);
    fireEvent.click(screen.getByRole("button", { name: "Choose ZIP" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Could not read the selected workspace package.");
    expect(screen.getByRole("button", { name: "Try again" })).toBeInTheDocument();
  });
});
