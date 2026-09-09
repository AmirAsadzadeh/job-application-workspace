import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { Position } from "../positionTypes";
import { PositionReadinessSection, PositionSubmittedResume } from "./PositionReadinessSection";

const position: Position = { id: "p1", company: { name: "Acme", logoPath: null, logoUrl: null }, title: "Engineer", status: "applied", workMode: "remote", employmentType: "full_time", seniority: "Senior", departmentId: null, teamId: null, locationId: null, hiringManager: { name: "", phone: "", position: "" }, salary: null, description: { type: "doc", content: [{ type: "paragraph" }] }, jobPlatformLinks: [], careerPageUrl: null, careerPageApplicationStatus: null, careerPageApplicationDate: null, questions: [], readingItems: [], submittedResume: null, createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z" };
const api = (overrides = {}) => ({ createReading: vi.fn(), updateReading: vi.fn(), deleteReading: vi.fn(), ...overrides });
const resumeApi = (overrides = {}) => ({ uploadResume: vi.fn(), getResumeOpenUrl: vi.fn(() => "/resume"), removeResume: vi.fn(), ...overrides });

describe("PositionReadinessSection", () => {
  it("offers the approved reading empty action without resume controls", () => {
    render(<PositionReadinessSection position={position} onPositionChange={vi.fn()} api={api()} />);
    expect(screen.getByText("No reading items yet")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add reading" })).toBeInTheDocument();
    expect(screen.queryByText("Submitted resume")).not.toBeInTheDocument();
  });

  it("creates a reading, validates its title, and keeps a failed draft", async () => {
    const createReading = vi.fn().mockRejectedValue(new Error("disk"));
    render(<PositionReadinessSection position={position} onPositionChange={vi.fn()} api={api({ createReading })} />);
    fireEvent.click(screen.getByRole("button", { name: "Add reading" }));
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(await screen.findByText("Enter a reading title.")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Title"), { target: { value: "React docs" } });
    fireEvent.change(screen.getByLabelText(/Link/), { target: { value: "https://react.dev" } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(await screen.findByText(/Could not save the reading item/)).toBeInTheDocument();
    expect(screen.getByLabelText("Title")).toHaveValue("React docs");
  });

  it("changes Read status with the complete saved reading and confirms deletion", async () => {
    const reading = { id: "r1", title: "React docs", url: null, notes: "Hooks", isRead: false, createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z" };
    const loaded = { ...position, readingItems: [reading] };
    const updateReading = vi.fn().mockResolvedValue({ ...loaded, readingItems: [{ ...reading, isRead: true }] });
    const deleteReading = vi.fn().mockResolvedValue({ ...position, readingItems: [] });
    vi.spyOn(window, "confirm").mockReturnValue(true);
    render(<PositionReadinessSection position={loaded} onPositionChange={vi.fn()} api={api({ updateReading, deleteReading })} />);
    fireEvent.click(screen.getByRole("checkbox", { name: /Not read: React docs/ }));
    await waitFor(() => expect(updateReading).toHaveBeenCalledWith("p1", "r1", expect.objectContaining({ title: "React docs", isRead: true })));
    fireEvent.click(screen.getByRole("button", { name: "React docs" }));
    fireEvent.click(screen.getByRole("button", { name: "Delete" }));
    await waitFor(() => expect(deleteReading).toHaveBeenCalledWith("p1", "r1"));
  });

  it("imports a resume and keeps Open, Replace, and Remove available", async () => {
    const resume = { originalFileName: "resume.pdf", fileType: "pdf" as const, mediaType: "application/pdf" as const, relativePath: "p1/id.pdf", uploadedAt: "2026-09-09T10:00:00.000Z" };
    const uploadResume = vi.fn().mockResolvedValue({ ...position, submittedResume: resume });
    const { rerender } = render(<PositionSubmittedResume position={position} onPositionChange={vi.fn()} api={resumeApi({ uploadResume })} />);
    const file = new File(["%PDF-1.7"], "resume.pdf", { type: "application/pdf" });
    fireEvent.change(screen.getByLabelText("Choose submitted resume"), { target: { files: [file] } });
    await waitFor(() => expect(uploadResume).toHaveBeenCalledWith("p1", file));
    rerender(<PositionSubmittedResume position={{ ...position, submittedResume: resume }} onPositionChange={vi.fn()} api={resumeApi()} />);
    expect(screen.getByRole("link", { name: "Open" })).toHaveAttribute("href", "/resume");
    expect(screen.getByRole("button", { name: "Replace" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Remove resume" })).toBeInTheDocument();
  });
});
