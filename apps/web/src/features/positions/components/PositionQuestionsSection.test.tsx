import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { Position } from "../positionTypes";
import { PositionQuestionsSection } from "./PositionQuestionsSection";

const position: Position = { id: "p1", company: { name: "Acme", logoPath: null, logoUrl: null }, title: "Engineer", status: "applied", workMode: "remote", employmentType: "full_time", seniority: "Senior", departmentId: null, teamId: null, locationId: null, hiringManager: { name: "", phone: "", position: "" }, salary: null, description: { type: "doc", content: [{ type: "paragraph" }] }, jobPlatformLinks: [], careerPageUrl: null, careerPageApplicationStatus: null, careerPageApplicationDate: null, questions: [], readingItems: [], submittedResume: null, createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z" };

describe("PositionQuestionsSection", () => {
  it("uses actionable true-empty and filtered-empty states", () => {
    const question = { id: "q1", title: "Hydration", category: "react" as const, customCategory: null, answer: { type: "doc" as const, content: [{ type: "paragraph" as const }] }, createdAt: "2026-09-09T10:00:00.000Z", updatedAt: "2026-09-09T10:00:00.000Z" };
    const api = { createQuestion: vi.fn(), updateQuestion: vi.fn(), deleteQuestion: vi.fn() };
    const { rerender } = render(<PositionQuestionsSection position={position} onPositionChange={vi.fn()} api={api} />);
    expect(screen.getByText("No questions yet")).toBeInTheDocument();
    expect(screen.queryByLabelText("Filter questions")).not.toBeInTheDocument();
    rerender(<PositionQuestionsSection position={{ ...position, questions: [question] }} onPositionChange={vi.fn()} api={api} />);
    fireEvent.change(screen.getByLabelText("Filter questions"), { target: { value: "testing" } });
    expect(screen.getByText("No questions in this category")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Show all" }));
    expect(screen.getByRole("button", { name: /Hydration/ })).toBeInTheDocument();
  });

  it("creates a title-only question and adopts the authoritative response", async () => {
    const question = { id: "q1", title: "Event loop", category: null, customCategory: null, answer: { type: "doc" as const, content: [{ type: "paragraph" as const }] }, createdAt: "2026-09-09T10:00:00.000Z", updatedAt: "2026-09-09T10:00:00.000Z" };
    const createQuestion = vi.fn().mockResolvedValue({ ...position, questions: [question] });
    const onPositionChange = vi.fn();
    render(<PositionQuestionsSection position={position} onPositionChange={onPositionChange} api={{ createQuestion, updateQuestion: vi.fn(), deleteQuestion: vi.fn() }} />);
    expect(screen.getByText("No questions yet")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Add question" }));
    fireEvent.change(screen.getByLabelText("Question title"), { target: { value: "Event loop" } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(createQuestion).toHaveBeenCalledWith("p1", expect.objectContaining({ title: "Event loop", category: null })));
    expect(onPositionChange).toHaveBeenCalledWith(expect.objectContaining({ questions: [question] }));
  });

  it("validates titles, retains failed drafts, and confirms deletion", async () => {
    const existing = { ...position, questions: [{ id: "q1", title: "Question", category: null, customCategory: null, answer: { type: "doc" as const, content: [{ type: "paragraph" as const }] }, createdAt: "2026-09-09T10:00:00.000Z", updatedAt: "2026-09-09T10:00:00.000Z" }] };
    const updateQuestion = vi.fn().mockRejectedValue(new Error("disk"));
    const deleteQuestion = vi.fn().mockResolvedValue({ ...position, questions: [] });
    vi.spyOn(window, "confirm").mockReturnValue(true);
    render(<PositionQuestionsSection position={existing} onPositionChange={vi.fn()} api={{ createQuestion: vi.fn(), updateQuestion, deleteQuestion }} />);
    fireEvent.click(screen.getByRole("button", { name: /Question/ }));
    fireEvent.change(screen.getByLabelText("Question title"), { target: { value: "" } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(await screen.findByText("Enter a question title.")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Question title"), { target: { value: "Retry me" } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(await screen.findByText(/Could not save question/)).toBeInTheDocument();
    expect(screen.getByLabelText("Question title")).toHaveValue("Retry me");
    fireEvent.click(screen.getByRole("button", { name: "Delete" }));
    await waitFor(() => expect(deleteQuestion).toHaveBeenCalledWith("p1", "q1"));
  });

  it("supports custom categories, presentation-only filtering, and guarded draft switching", async () => {
    const question = { id: "q1", title: "Hydration", category: "react" as const, customCategory: null, answer: { type: "doc" as const, content: [{ type: "paragraph" as const }] }, createdAt: "2026-09-09T10:00:00.000Z", updatedAt: "2026-09-09T10:00:00.000Z" };
    const custom = { ...question, id: "q2", title: "Team story", category: "other" as const, customCategory: "Culture" };
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    render(<PositionQuestionsSection position={{ ...position, questions: [custom, question] }} onPositionChange={vi.fn()} api={{ createQuestion: vi.fn(), updateQuestion: vi.fn(), deleteQuestion: vi.fn() }} />);
    fireEvent.change(screen.getByLabelText("Filter questions"), { target: { value: "react" } });
    expect(screen.getByRole("button", { name: /Hydration/ })).toBeInTheDocument();
    expect(screen.queryByText("Team story")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Hydration/ }));
    fireEvent.change(screen.getByLabelText("Question title"), { target: { value: "Changed" } });
    fireEvent.click(screen.getByRole("button", { name: "Add question" }));
    expect(confirm).toHaveBeenCalled();
    expect(screen.getByLabelText("Question title")).toHaveValue("Changed");
  });

  it("requires and clears custom category values correctly", async () => {
    render(<PositionQuestionsSection position={position} onPositionChange={vi.fn()} api={{ createQuestion: vi.fn(), updateQuestion: vi.fn(), deleteQuestion: vi.fn() }} />);
    fireEvent.click(screen.getByRole("button", { name: "Add question" }));
    fireEvent.change(screen.getByLabelText("Question title"), { target: { value: "Question" } });
    fireEvent.change(screen.getByLabelText(/Category/), { target: { value: "other" } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(await screen.findByText("Enter a custom category.")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Custom category"), { target: { value: "Performance" } });
    fireEvent.change(screen.getByLabelText(/Category/), { target: { value: "javascript" } });
    expect(screen.queryByLabelText("Custom category")).not.toBeInTheDocument();
  });
});
