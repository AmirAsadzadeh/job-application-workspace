import { describe, expect, it } from "vitest";
import type { PositionSummary } from "./positionTypes";
import { nextSortPreference, sortPositions } from "./positionSort";

function row(id: string, values: Partial<PositionSummary> = {}): PositionSummary {
  return {
    id,
    company: { name: id, logoPath: null, logoUrl: null },
    title: id,
    status: "saved",
    workMode: "remote",
    seniority: "Intern",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...values,
  };
}

describe("position sorting", () => {
  it.each([
    ["company", [row("1", { company: { name: "zeta", logoPath: null, logoUrl: null } }), row("2", { company: { name: " Alpha ", logoPath: null, logoUrl: null } })], ["2", "1"]],
    ["title", [row("1", { title: "beta" }), row("2", { title: "Alpha" })], ["2", "1"]],
    ["status", [row("1", { status: "withdrawn" }), row("2", { status: "offer" }), row("3", { status: "assignment" }), row("4", { status: "saved" }), row("5", { status: "screening" })], ["4", "5", "3", "2", "1"]],
    ["workMode", [row("1", { workMode: "remote" }), row("2", { workMode: "onsite" }), row("3", { workMode: "hybrid" })], ["3", "2", "1"]],
    ["seniority", [row("1", { seniority: "Director" }), row("2", { seniority: "Senior" }), row("3", { seniority: "Entry" })], ["3", "2", "1"]],
    ["updatedAt", [row("1", { updatedAt: "2026-03-01T00:00:00.000Z" }), row("2", { updatedAt: "2026-01-01T00:00:00.000Z" })], ["2", "1"]],
  ] as const)("sorts %s ascending", (column, input, expected) => {
    expect(sortPositions(input, { mode: "column", column, direction: "asc" }).map((item) => item.id)).toEqual(expected);
  });

  it("reverses non-equal values while keeping equal values stable", () => {
    const input = [row("first", { title: "Same" }), row("second", { title: "same" }), row("third", { title: "After" })];
    expect(sortPositions(input, { mode: "column", column: "title", direction: "desc" }).map((item) => item.id)).toEqual(["first", "second", "third"]);
    expect(sortPositions(input, { mode: "manual", column: null, direction: null })).toEqual(input);
  });

  it("uses the exact nine-status workflow order in both directions", () => {
    const statuses = ["withdrawn", "screening", "offer", "saved", "paused", "assignment", "rejected", "interviewing", "applied"] as const;
    const input = statuses.map((status, index) => row(String(index), { status }));
    const ascending = ["saved", "applied", "screening", "interviewing", "assignment", "paused", "offer", "rejected", "withdrawn"];
    expect(sortPositions(input, { mode: "column", column: "status", direction: "asc" }).map((item) => item.status)).toEqual(ascending);
    expect(sortPositions(input, { mode: "column", column: "status", direction: "desc" }).map((item) => item.status)).toEqual([...ascending].reverse());
  });

  it("cycles a selected header and starts a new header ascending", () => {
    expect(nextSortPreference({ mode: "manual", column: null, direction: null }, "company")).toEqual({ mode: "column", column: "company", direction: "asc" });
    expect(nextSortPreference({ mode: "column", column: "company", direction: "asc" }, "company")).toEqual({ mode: "column", column: "company", direction: "desc" });
    expect(nextSortPreference({ mode: "column", column: "company", direction: "desc" }, "updatedAt")).toEqual({ mode: "column", column: "updatedAt", direction: "asc" });
  });
});
