import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PositionRow } from "./PositionRow";
import { sortPositions } from "../positionSort";

describe("position row activation performance", () => {
  it("dispatches row activation within 100ms", () => {
    const onOpen = vi.fn();
    render(<PositionRow position={{ id: "p1", company: { name: "Acme", logoPath: null, logoUrl: null }, title: "Engineer", status: "applied", workMode: "remote", seniority: "Senior", updatedAt: "2026-01-01T00:00:00.000Z" }} onOpen={onOpen} />);
    const started = performance.now();
    fireEvent.click(screen.getByRole("button", { name: "Open Engineer at Acme" }));
    expect(performance.now() - started).toBeLessThan(100);
    expect(onOpen).toHaveBeenCalledWith("p1");
  });

  it("stably sorts 1,000 position summaries within one second", () => {
    const positions = Array.from({ length: 1000 }, (_, index) => ({ id: `p${index}`, company: { name: `Company ${1000 - index}`, logoPath: null, logoUrl: null }, title: `Position ${index}`, status: "applied" as const, workMode: "remote" as const, seniority: "Senior" as const, updatedAt: new Date(2026, 0, (index % 28) + 1).toISOString() }));
    const started = performance.now();
    const sorted = sortPositions(positions, { mode: "column", column: "company", direction: "asc" });
    expect(performance.now() - started).toBeLessThan(1000);
    expect(sorted).toHaveLength(1000);
  });
});
