import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PendingWorkspaceState } from "./PendingWorkspaceState";
import { SynchronizationDialog } from "./SynchronizationDialog";

const counts = { positions: 2, platformLinks: 1, questions: 3, readings: 4, resumes: 1, logos: 1, departments: 0, teams: 0, locations: 0 };

describe("workspace synchronization controls", () => {
  it("requires explicit confirmation and states that replacement does not merge", () => {
    const confirm = vi.fn();
    render(<SynchronizationDialog open source={{ label: "Offline", revision: null, counts }} destination={{ label: "Online", revision: 7, counts }} conflict onCancel={() => undefined} onConfirm={confirm} />);
    expect(screen.getByText(/Records are not merged/i)).toBeInTheDocument();
    expect(screen.getByText(/destination changed/i)).toBeInTheDocument();
    const button = screen.getByRole("button", { name: "Confirm replacement" });
    expect(button).toBeDisabled();
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(button);
    expect(confirm).toHaveBeenCalledOnce();
  });

  it("offers review rather than automatic upload for pending work", () => {
    const review = vi.fn();
    render(<PendingWorkspaceState pending connected conflict={false} onReview={review} />);
    fireEvent.click(screen.getByRole("button", { name: /Review/i }));
    expect(review).toHaveBeenCalledOnce();
  });
});
