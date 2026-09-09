import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { EmptyState } from "./EmptyState";
import { Inbox } from "lucide-react";

describe("EmptyState", () => {
  it("renders one concise status and optional keyboard-operable action", () => {
    const onAction = vi.fn();
    render(<EmptyState icon={Inbox} message="No items yet" actionLabel="Add item" onAction={onAction} />);
    expect(screen.getByRole("status")).toHaveTextContent("No items yet");
    expect(screen.getByRole("status").querySelector("svg")).toHaveAttribute("aria-hidden", "true");
    expect(screen.getByRole("status").querySelector(".empty-state-icon-frame")).toBeInTheDocument();
    const action = screen.getByRole("button", { name: "Add item" });
    action.focus();
    expect(action).toHaveFocus();
    fireEvent.keyDown(action, { key: "Enter" });
    fireEvent.click(action);
    expect(onAction).toHaveBeenCalledOnce();
  });

  it("does not create an action when none is supplied", () => {
    render(<EmptyState icon={Inbox} message="No options available" />);
    expect(screen.getByRole("status")).toHaveTextContent("No options available");
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});
