import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SignOutGuard } from "./SignOutGuard";

describe("SignOutGuard", () => {
  it("requires an explicit upload, discard, or cancel decision", () => {
    const upload = vi.fn();
    const discard = vi.fn();
    const cancel = vi.fn();
    render(<SignOutGuard open onUpload={upload} onDiscard={discard} onCancel={cancel} />);
    expect(screen.getByText(/not been stored Online/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /upload and sign out/i }));
    fireEvent.click(screen.getByRole("button", { name: /discard and sign out/i }));
    fireEvent.click(screen.getByRole("button", { name: /^cancel$/i }));
    expect(upload).toHaveBeenCalledOnce();
    expect(discard).toHaveBeenCalledOnce();
    expect(cancel).toHaveBeenCalledOnce();
  });
});
