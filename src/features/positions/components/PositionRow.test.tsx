import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PositionRow } from "./PositionRow";

describe("PositionRow company logo", () => {
  it("loads a remote logo and falls back without changing the logo container", () => {
    render(<PositionRow position={{ id: "p1", company: { name: "Acme", logoPath: null, logoUrl: "https://example.test/logo.png" }, title: "Engineer", status: "saved", workMode: "remote", seniority: "Senior", updatedAt: "2026-01-01T00:00:00.000Z" }} onOpen={() => undefined} />);
    const image = document.querySelector("img") as HTMLImageElement;
    expect(image).toHaveAttribute("src", "https://example.test/logo.png");
    fireEvent.error(image);
    expect(screen.getByText("A")).toBeInTheDocument();
    expect(screen.getByText("A").closest(".company-logo")).toHaveClass("company-logo");
  });

  it("keeps reorder and open actions separate and accessible", () => {
    const onOpen = vi.fn();
    const position = { id: "p1", company: { name: "Acme", logoPath: null, logoUrl: null }, title: "Engineer", status: "saved" as const, workMode: "remote" as const, seniority: "Senior" as const, updatedAt: "2026-01-01T00:00:00.000Z" };
    render(<PositionRow position={position} index={0} reorderEnabled reorderReason="" onOpen={onOpen} />);
    const handle = screen.getByRole("button", { name: "Move Engineer at Acme" });
    const open = screen.getByRole("button", { name: "Open Engineer at Acme" });
    expect(handle).toBeEnabled();
    expect(open).not.toContainElement(handle);
    fireEvent.click(open);
    expect(onOpen).toHaveBeenCalledWith("p1");
  });

  it("keeps a disabled handle visible with its reason", () => {
    render(<PositionRow position={{ id: "p1", company: { name: "Acme", logoPath: null, logoUrl: null }, title: "Engineer", status: "saved", workMode: "remote", seniority: "Senior", updatedAt: "2026-01-01T00:00:00.000Z" }} index={0} reorderEnabled={false} reorderReason="Clear search to reorder" onOpen={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Move Engineer at Acme" })).toBeDisabled();
    expect(screen.getByTitle("Clear search to reorder")).toBeInTheDocument();
  });
});
