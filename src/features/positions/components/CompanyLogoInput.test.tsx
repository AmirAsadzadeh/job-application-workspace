import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { CompanyLogoInput } from "./CompanyLogoInput";

describe("CompanyLogoInput", () => {
  it("switches to a direct image URL and falls back when it cannot load", () => {
    const onChange = vi.fn();
    const { rerender } = render(<CompanyLogoInput value={{ kind: "none" }} companyName="Acme" onChange={onChange} onError={() => undefined} />);
    fireEvent.click(screen.getByRole("button", { name: "Image URL" }));
    expect(onChange).toHaveBeenCalledWith({ kind: "remote", url: "" });
    rerender(<CompanyLogoInput value={{ kind: "remote", url: "https://example.test/missing.png" }} companyName="Acme" onChange={onChange} onError={() => undefined} />);
    fireEvent.error(document.querySelector("img") as HTMLImageElement);
    expect(screen.getByText("A")).toBeInTheDocument();
  });

  it("reads an approved upload and rejects unsupported or oversized files", async () => {
    const onChange = vi.fn();
    const onError = vi.fn();
    render(<CompanyLogoInput value={{ kind: "upload", fileName: "", mediaType: "image/png", dataBase64: "" }} companyName="Acme" onChange={onChange} onError={onError} />);
    const input = screen.getByLabelText("Upload company logo");
    fireEvent.change(input, { target: { files: [new File([new Uint8Array([137, 80, 78, 71])], "logo.png", { type: "image/png" })] } });
    await waitFor(() => expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ kind: "upload", fileName: "logo.png", mediaType: "image/png" })));
    fireEvent.change(input, { target: { files: [new File(["text"], "logo.txt", { type: "text/plain" })] } });
    expect(onError).toHaveBeenCalledWith("Choose a PNG, JPG, or SVG image.");
    fireEvent.change(input, { target: { files: [new File([new Uint8Array(2 * 1024 * 1024 + 1)], "large.png", { type: "image/png" })] } });
    expect(onError).toHaveBeenCalledWith("Logo must be 2 MB or smaller.");
  });

  it("replaces an upload when remote mode is selected and displays URL errors", () => {
    const onChange = vi.fn();
    render(<CompanyLogoInput value={{ kind: "upload", fileName: "logo.png", mediaType: "image/png", dataBase64: "iVBORw==" }} companyName="Acme" error="Enter an HTTP or HTTPS address." onChange={onChange} onError={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "Image URL" }));
    expect(onChange).toHaveBeenCalledWith({ kind: "remote", url: "" });
    expect(screen.getByRole("alert")).toHaveTextContent("Enter an HTTP or HTTPS address.");
  });
});
