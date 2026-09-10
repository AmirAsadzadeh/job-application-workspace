import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { Position } from "../positionTypes";
import { PositionQuestionsSection } from "./PositionQuestionsSection";
import { PositionReadinessSection } from "./PositionReadinessSection";

const base: Position = { id: "p1", company: { name: "Acme", logoPath: null, logoUrl: null }, title: "Engineer", status: "applied", workMode: "remote", employmentType: "full_time", seniority: "Senior", departmentId: null, teamId: null, locationId: null, hiringManager: { name: "", phone: "", position: "" }, salary: null, description: { type: "doc", content: [{ type: "paragraph" }] }, jobPlatformLinks: [], careerPageUrl: null, careerPageApplicationStatus: null, careerPageApplicationDate: null, questions: [], readingItems: [], submittedResume: null, createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z" };

describe("position preparation performance", () => {
  it("renders and opens one of 100 questions within one second", () => {
    const questions = Array.from({ length: 100 }, (_, index) => ({ id: `q-${index}`, title: `Question ${index}`, category: null, customCategory: null, answer: { type: "doc" as const, content: [{ type: "paragraph" as const }] }, createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z" }));
    const start = performance.now();
    render(<PositionQuestionsSection position={{ ...base, questions }} onPositionChange={vi.fn()} api={{ createQuestion: vi.fn(), updateQuestion: vi.fn(), deleteQuestion: vi.fn() }} />);
    fireEvent.click(screen.getByRole("button", { name: /Question 99/ }));
    expect(screen.getByLabelText("Question title")).toHaveValue("Question 99");
    expect(performance.now() - start).toBeLessThan(1000);
  });

  it("renders 30 readings and keeps direct status interaction responsive", async () => {
    const readingItems = Array.from({ length: 30 }, (_, index) => ({ id: `r-${index}`, title: `Reading ${index}`, url: null, notes: "", isRead: false, createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z" }));
    const updateReading = vi.fn().mockResolvedValue({ ...base, readingItems: readingItems.map((item, index) => index === 29 ? { ...item, isRead: true } : item) });
    const start = performance.now();
    render(<PositionReadinessSection position={{ ...base, readingItems }} onPositionChange={vi.fn()} api={{ createReading: vi.fn(), updateReading, deleteReading: vi.fn() }} />);
    fireEvent.click(screen.getByRole("checkbox", { name: /Not read: Reading 29/ }));
    await waitFor(() => expect(updateReading).toHaveBeenCalled());
    expect(performance.now() - start).toBeLessThan(1000);
  });
});
