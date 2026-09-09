import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { StatusHelp } from "./StatusHelp";

const definitions = [
  { value: "saved", label: "Saved", description: "Found or under consideration, but not yet applied to." },
  { value: "applied", label: "Applied", description: "Application submitted and awaiting progress." },
];

describe("StatusHelp", () => {
  it("opens from an accessible trigger, dismisses with Escape, and restores focus", async () => {
    render(<StatusHelp label="Overall status definitions" definitions={definitions} />);
    const trigger = screen.getByRole("button", { name: "Overall status definitions" });
    trigger.focus();
    fireEvent.click(trigger);
    expect(screen.getByRole("dialog", { name: "Overall status definitions" })).toBeInTheDocument();
    expect(screen.getByText("Found or under consideration, but not yet applied to.")).toBeInTheDocument();
    expect(screen.getByText("Application submitted and awaiting progress.")).toBeInTheDocument();
    fireEvent.keyDown(document, { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    await waitFor(() => expect(trigger).toHaveFocus());
  });

  it("closes from its named button without changing surrounding form data", async () => {
    render(<form><input aria-label="Marker" defaultValue="kept" /><StatusHelp label="Channel status definitions" definitions={definitions} /></form>);
    fireEvent.click(screen.getByRole("button", { name: "Channel status definitions" }));
    fireEvent.click(screen.getByRole("button", { name: "Close status definitions" }));
    await waitFor(() => expect(screen.getByLabelText("Marker")).toHaveValue("kept"));
  });
});
