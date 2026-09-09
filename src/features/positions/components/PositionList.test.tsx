import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PositionList } from "./PositionList";
import type { PositionSummary } from "../positionTypes";
import type { ListViewPreference } from "../../../../shared/positionSchema";

const dnd = vi.hoisted(() => ({ onDragEnd: undefined as undefined | ((event: unknown) => Promise<void>) }));
vi.mock("@dnd-kit/react", () => ({
  DragDropProvider: ({ children, onDragEnd }: { children: React.ReactNode; onDragEnd: (event: unknown) => Promise<void> }) => {
    dnd.onDragEnd = onDragEnd;
    return children;
  },
}));
vi.mock("@dnd-kit/react/sortable", () => ({
  isSortableOperation: () => true,
  useSortable: () => ({ ref: vi.fn(), handleRef: vi.fn(), isDragging: false }),
}));

const row: PositionSummary = { id: "p1", company: { name: "Acme Corporation With A Long Name", logoPath: null, logoUrl: null }, title: "Senior Frontend Engineer", status: "applied", workMode: "hybrid", seniority: "Senior", updatedAt: "2026-09-05T09:15:00.000Z" };
const secondRow: PositionSummary = { ...row, id: "p2", company: { name: "Beta", logoPath: null, logoUrl: null }, title: "Designer", status: "saved", updatedAt: "2026-09-06T09:15:00.000Z" };
const manual = { mode: "manual" as const, column: null, direction: null };

function api(positions = [row], listView: ListViewPreference = manual) {
  return {
    listPositions: vi.fn().mockResolvedValue({ positions, listView }),
    updateListView: vi.fn().mockImplementation(async (value) => value),
    reorderPosition: vi.fn().mockResolvedValue(positions),
    exportWorkspace: vi.fn().mockResolvedValue({ blob: new Blob(["zip"]), fileName: "workspace.zip" }),
    validateWorkspaceImport: vi.fn(),
    cancelWorkspaceImport: vi.fn(),
    restoreWorkspaceImport: vi.fn(),
  };
}

describe("PositionList", () => {
  it("shows only approved columns, filters, fallback, and row navigation", async () => {
    const positionApi = api();
    const onOpen = vi.fn();
    const onCreate = vi.fn();
    render(<PositionList onOpen={onOpen} onCreate={onCreate} api={positionApi} />);
    expect(screen.getByText("Loading positions...")).toBeInTheDocument();
    await screen.findByText(row.title);
    ["Company", "Position", "Work mode", "Seniority", "Updated"].forEach((heading) => expect(screen.getByText(heading)).toBeInTheDocument());
    expect(screen.getAllByText("Status")).toHaveLength(2);
    expect(screen.queryByText("Department")).not.toBeInTheDocument();
    expect(screen.queryByText("Publication links")).not.toBeInTheDocument();
    expect(screen.queryByText("Job description")).not.toBeInTheDocument();
    expect(screen.getByText("A")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Open Senior Frontend Engineer at Acme Corporation With A Long Name" }));
    expect(onOpen).toHaveBeenCalledWith("p1");
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "mina" } });
    await waitFor(() => expect(positionApi.listPositions).toHaveBeenLastCalledWith({ q: "mina", status: undefined }));
    fireEvent.change(screen.getByLabelText("Filter by status"), { target: { value: "screening" } });
    await waitFor(() => expect(positionApi.listPositions).toHaveBeenLastCalledWith({ q: "mina", status: "screening" }));
    fireEvent.click(screen.getByRole("button", { name: "New position" }));
    expect(onCreate).toHaveBeenCalledOnce();
  });

  it("supports empty, error, and retry states", async () => {
    const positionApi = api([]);
    positionApi.listPositions.mockRejectedValueOnce(new Error("offline"));
    render(<PositionList onOpen={() => undefined} api={positionApi} />);
    await screen.findByText("Could not load positions");
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    await screen.findByText("No positions yet");
    expect(screen.getByRole("button", { name: "New position" })).toBeInTheDocument();
  });

  it("distinguishes filtered-empty results and clears every filter", async () => {
    const positionApi = api([]);
    render(<PositionList onOpen={vi.fn()} api={positionApi} />);
    await screen.findByText("No positions yet");
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "missing" } });
    fireEvent.change(screen.getByLabelText("Filter by status"), { target: { value: "screening" } });
    expect(await screen.findByText("No matching positions")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Clear filters" }));
    expect(screen.getByRole("searchbox")).toHaveValue("");
    expect(screen.getByLabelText("Filter by status")).toHaveValue("all");
  });

  it("offers all nine compact status filters and adjacent definitions", async () => {
    render(<PositionList onOpen={vi.fn()} api={api()} />);
    await screen.findByText(row.title);
    const options = Array.from(screen.getByLabelText("Filter by status").querySelectorAll("option")).map((option) => option.textContent);
    expect(options).toEqual(["All statuses", "Saved", "Applied", "Screening", "Interviewing", "Assignment", "Paused", "Offer", "Rejected", "Withdrawn"]);
    expect(screen.getByRole("button", { name: "Overall status definitions" })).toBeInTheDocument();
  });

  it("exposes compact accessible workspace transfer controls", async () => {
    render(<PositionList onOpen={vi.fn()} api={api()} />);
    await screen.findByText(row.title);
    expect(screen.getByRole("button", { name: "Export workspace" })).toHaveAttribute("title", "Export workspace");
    fireEvent.click(screen.getByRole("button", { name: "Import workspace" }));
    expect(screen.getByRole("dialog", { name: "Import workspace" })).toBeInTheDocument();
  });

  it("sorts headers in both directions, persists the mode, and restores Manual order", async () => {
    const positionApi = api([secondRow, row]);
    render(<PositionList onOpen={vi.fn()} api={positionApi} />);
    await screen.findByText(secondRow.title);
    fireEvent.click(screen.getByRole("button", { name: "Sort Company ascending" }));
    await waitFor(() => expect(positionApi.updateListView).toHaveBeenCalledWith({ mode: "column", column: "company", direction: "asc" }));
    expect(screen.getAllByRole("button", { name: /Open .* at/ })[0]).toHaveAccessibleName(/Acme/);
    fireEvent.click(screen.getByRole("button", { name: "Sort Company descending" }));
    await waitFor(() => expect(positionApi.updateListView).toHaveBeenLastCalledWith({ mode: "column", column: "company", direction: "desc" }));
    expect(screen.getAllByRole("button", { name: /Open .* at/ })[0]).toHaveAccessibleName(/Beta/);
    fireEvent.click(screen.getByRole("button", { name: "Manual order" }));
    await waitFor(() => expect(positionApi.updateListView).toHaveBeenLastCalledWith(manual));
    expect(screen.getAllByRole("button", { name: /Open .* at/ })[0]).toHaveAccessibleName(/Beta/);
  });

  it("loads a persisted sort and disables reordering while filtered", async () => {
    const positionApi = api([row, secondRow], { mode: "column" as const, column: "updatedAt" as const, direction: "desc" as const });
    render(<PositionList onOpen={vi.fn()} api={positionApi} />);
    await screen.findByText(secondRow.title);
    expect(screen.getByRole("button", { name: "Sort Updated ascending" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getAllByRole("button", { name: /Open .* at/ })[0]).toHaveAccessibleName(/Designer/);
    expect(screen.getByRole("button", { name: `Move ${row.title} at ${row.company.name}` })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Manual order" }));
    await waitFor(() => expect(screen.getByRole("button", { name: `Move ${row.title} at ${row.company.name}` })).toBeEnabled());
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "engineer" } });
    await waitFor(() => expect(screen.getAllByTitle("Clear search to reorder").length).toBeGreaterThan(0));
  });

  it("restores the saved mode when preference persistence fails", async () => {
    const positionApi = api([secondRow, row]);
    positionApi.updateListView.mockRejectedValueOnce(new Error("disk busy"));
    render(<PositionList onOpen={vi.fn()} api={positionApi} />);
    await screen.findByText(secondRow.title);
    fireEvent.click(screen.getByRole("button", { name: "Sort Company ascending" }));
    expect(await screen.findByText("Could not save list order. Previous order restored.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Manual order" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getAllByRole("button", { name: /Open .* at/ })[0]).toHaveAccessibleName(/Beta/);
  });

  it("persists an optimistic move, announces it, and rolls back a rejected move", async () => {
    const positionApi = api([row, secondRow]);
    positionApi.reorderPosition.mockResolvedValueOnce([secondRow, row]);
    render(<PositionList onOpen={vi.fn()} api={positionApi} />);
    await screen.findByText(row.title);

    await act(async () => dnd.onDragEnd?.({ operation: { source: { initialIndex: 0, index: 1 } } }));
    expect(positionApi.reorderPosition).toHaveBeenCalledWith({ positionId: "p1", beforePositionId: null });
    expect(await screen.findByText("Senior Frontend Engineer moved to position 2.")).toBeInTheDocument();

    positionApi.reorderPosition.mockRejectedValueOnce(new Error("disk busy"));
    await act(async () => dnd.onDragEnd?.({ operation: { source: { initialIndex: 1, index: 0 } } }));
    expect(await screen.findByText("Could not save manual order. Previous order restored.")).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /Open .* at/ })[0]).toHaveAccessibleName(/Beta/);
  });
});
