import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { JobDescriptionEditor } from "./JobDescriptionEditor";

const description = {
  type: "doc" as const,
  content: [{
    type: "paragraph" as const,
    content: [{ type: "text" as const, text: "Build accessible products." }],
  }],
};

describe("JobDescriptionEditor", () => {
  it("exposes only the approved formatting controls and restores JSON content", async () => {
    render(<JobDescriptionEditor value={description} onChange={vi.fn()} />);
    expect(await screen.findByText("Build accessible products.")).toBeInTheDocument();
    for (const name of ["Heading 1", "Heading 2", "Heading 3", "Bold", "Italic", "Bullet list", "Numbered list", "Add or edit link", "Remove link"]) {
      expect(screen.getByRole("button", { name })).toBeInTheDocument();
    }
    expect(screen.queryByRole("button", { name: "Code" })).not.toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "Job description" })).toHaveAttribute("contenteditable", "true");
  });

  it("runs toolbar commands through the editor without submitting a surrounding form", async () => {
    const onChange = vi.fn();
    render(<form onSubmit={vi.fn()}><JobDescriptionEditor value={description} onChange={onChange} /></form>);
    await screen.findByText("Build accessible products.");
    fireEvent.click(screen.getByRole("button", { name: "Bold" }));
    fireEvent.click(screen.getByRole("button", { name: "Italic" }));
    fireEvent.click(screen.getByRole("button", { name: "Bullet list" }));
    expect(onChange).toHaveBeenCalled();
  });

  it("round-trips every supported format and accepts an empty document", async () => {
    const formatted = {
      type: "doc" as const,
      content: [
        { type: "heading" as const, attrs: { level: 2 as const }, content: [{ type: "text" as const, text: "Overview" }] },
        { type: "paragraph" as const, content: [
          { type: "text" as const, text: "Bold", marks: [{ type: "bold" as const }] },
          { type: "text" as const, text: " italic", marks: [{ type: "italic" as const }] },
          { type: "text" as const, text: " link", marks: [{ type: "link" as const, attrs: { href: "https://example.com" } }] },
        ] },
        { type: "bulletList" as const, content: [{ type: "listItem" as const, content: [{ type: "paragraph" as const, content: [{ type: "text" as const, text: "Bullet" }] }] }] },
        { type: "orderedList" as const, content: [{ type: "listItem" as const, content: [{ type: "paragraph" as const, content: [{ type: "text" as const, text: "Step" }] }] }] },
      ],
    };
    const { container, unmount } = render(<JobDescriptionEditor value={formatted} onChange={vi.fn()} />);
    await screen.findByRole("heading", { name: "Overview", level: 2 });
    expect(container.querySelector("strong")).toHaveTextContent("Bold");
    expect(container.querySelector("em")).toHaveTextContent("italic");
    expect(container.querySelector("a")).toHaveAttribute("href", "https://example.com");
    expect(container.querySelector("ul")).toHaveTextContent("Bullet");
    expect(container.querySelector("ol")).toHaveTextContent("Step");
    unmount();
    const empty = render(<JobDescriptionEditor value={{ type: "doc", content: [{ type: "paragraph" }] }} onChange={vi.fn()} />);
    expect((await screen.findByRole("textbox", { name: "Job description" })).textContent).toBe("");
    empty.unmount();
  });

  it("drops unsupported pasted elements while retaining readable text", async () => {
    const { container } = render(<JobDescriptionEditor value={description} onChange={vi.fn()} />);
    const editor = await screen.findByRole("textbox", { name: "Job description" });
    fireEvent.paste(editor, { clipboardData: { getData: (type: string) => type === "text/html" ? "<p><u>Readable</u><script>hidden</script></p>" : "Readable", types: ["text/html", "text/plain"] } });
    expect(container.querySelector("u")).not.toBeInTheDocument();
    expect(container.querySelector("script")).not.toBeInTheDocument();
  });
});
