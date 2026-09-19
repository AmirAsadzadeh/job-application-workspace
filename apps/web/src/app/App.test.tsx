import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../features/positions/components/PositionList", () => ({
  PositionList: ({ onCreate, onOpen }: { onCreate: () => void; onOpen: (id: string) => void }) => <><button onClick={onCreate}>Open create</button><button onClick={() => onOpen("p1")}>Open detail</button></>,
}));
vi.mock("../features/positions/components/PositionDetailsRoute", () => ({
  PositionDetailsRoute: ({ positionId, section, onBack, onSectionChange }: { positionId: string; section: string; onBack: () => void; onSectionChange: (section: string) => void }) => <><span>Detail {positionId} {section}</span><button onClick={() => onSectionChange("questions")}>Open questions</button><button onClick={onBack}>Detail back</button></>,
}));
vi.mock("../features/positions/components/PositionCreateRoute", () => ({
  PositionCreateRoute: ({ onBack, onCreated, onDirtyChange }: { onBack: () => void; onCreated: () => void; onDirtyChange: (dirty: boolean) => void }) => <><span>Create route</span><button onClick={() => onDirtyChange(true)}>Make dirty</button><button onClick={onBack}>Create back</button><button onClick={onCreated}>Created</button></>,
}));
vi.mock("../features/positions/components/ReadinessRoute", () => ({
  ReadinessRoute: ({ articleId, onBack, onOpenArticle }: { articleId?: string; onBack: () => void; onOpenArticle?: (id: string) => void }) => <><span>{articleId ? `Readiness article ${articleId}` : "Global readiness"}</span><button onClick={() => onOpenArticle?.("a1")}>Open article</button><button onClick={onBack}>Readiness back</button></>,
}));

import { App } from "./App";

describe("App routing", () => {
  beforeEach(() => {
    window.history.replaceState({}, "", "/");
    vi.restoreAllMocks();
  });

  it("moves between list, create, and detail routes", () => {
    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: "Open create" }));
    expect(screen.getByText("Create route")).toBeInTheDocument();
    expect(window.location.pathname).toBe("/positions/new");
    fireEvent.click(screen.getByRole("button", { name: "Created" }));
    fireEvent.click(screen.getByRole("button", { name: "Open detail" }));
    expect(screen.getByText("Detail p1 application")).toBeInTheDocument();
    expect(window.location.pathname).toBe("/positions/p1/application");
    fireEvent.click(screen.getByRole("button", { name: "Open questions" }));
    expect(screen.getByText("Detail p1 questions")).toBeInTheDocument();
    expect(window.location.pathname).toBe("/positions/p1/questions");
  });

  it("opens legacy detail and top-level readiness URLs", () => {
    window.history.replaceState({}, "", "/positions/p1");
    const { unmount } = render(<App />);
    expect(screen.getByText("Detail p1 application")).toBeInTheDocument();
    unmount();
    window.history.replaceState({}, "", "/positions/p1/readiness");
    const legacy = render(<App />);
    expect(screen.getByText("Global readiness")).toBeInTheDocument();
    legacy.unmount();
    window.history.replaceState({}, "", "/readiness");
    render(<App />);
    expect(screen.getByText("Global readiness")).toBeInTheDocument();
  });

  it("opens dedicated readiness article routes", () => {
    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: "Readiness" }));
    fireEvent.click(screen.getByRole("button", { name: "Open article" }));
    expect(window.location.pathname).toBe("/readiness/articles/a1");
    expect(screen.getByText("Readiness article a1")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Readiness back" }));
    expect(window.location.pathname).toBe("/readiness");
    expect(screen.getByText("Global readiness")).toBeInTheDocument();
  });

  it("guards dirty internal navigation and allows confirmed discard", () => {
    const confirm = vi.spyOn(window, "confirm").mockReturnValueOnce(false).mockReturnValueOnce(true);
    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: "Open create" }));
    fireEvent.click(screen.getByRole("button", { name: "Make dirty" }));
    fireEvent.click(screen.getByRole("button", { name: "Create back" }));
    expect(screen.getByText("Create route")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Create back" }));
    expect(screen.getByRole("button", { name: "Open create" })).toBeInTheDocument();
    expect(confirm).toHaveBeenCalledTimes(2);
  });

  it("guards browser history navigation from a dirty create route", () => {
    const confirm = vi.spyOn(window, "confirm").mockReturnValueOnce(false).mockReturnValueOnce(true);
    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: "Open create" }));
    fireEvent.click(screen.getByRole("button", { name: "Make dirty" }));
    window.history.replaceState({}, "", "/");
    fireEvent.popState(window);
    expect(window.location.pathname).toBe("/positions/new");
    window.history.replaceState({}, "", "/");
    fireEvent.popState(window);
    expect(screen.getByRole("button", { name: "Open create" })).toBeInTheDocument();
    expect(confirm).toHaveBeenCalledTimes(2);
  });
});
