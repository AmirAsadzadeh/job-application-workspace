import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { cleanJobDescriptionDocument, JobDescriptionEditor, normalizeJobDescriptionPaste, normalizeJobDescriptionPasteHtml } from "./JobDescriptionEditor";

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

  it("calls the save shortcut handler on Cmd+S and Ctrl+S inside the editor", async () => {
    const onModSave = vi.fn();
    render(<JobDescriptionEditor value={description} onChange={vi.fn()} onModSave={onModSave} />);
    const editor = await screen.findByRole("textbox", { name: "Job description" });
    fireEvent.keyDown(editor, { key: "s", metaKey: true });
    fireEvent.keyDown(editor, { key: "S", ctrlKey: true });
    expect(onModSave).toHaveBeenCalledTimes(2);
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

  it("normalizes copied job descriptions with encoded entities and line-continuation slashes", () => {
    expect(normalizeJobDescriptionPaste("Yo&#x75;**’**&#x6C;l leverage Next.js.\\\nSSR and SSG     optimizations.\n&#x20;Develop features.")).toBe(
      "You**’**ll leverage Next.js.\nSSR and SSG optimizations.\nDevelop features.",
    );
    expect(normalizeJobDescriptionPaste("A&nbsp;B\u00a0C\u200b")).toBe("A B C");
  });

  it("normalizes pasted HTML job descriptions before TipTap parses them", () => {
    expect(normalizeJobDescriptionPasteHtml("<p>**&#xA0;What you’ll do:**\\</p><p>\\- Build     apps.</p><script>bad()</script>")).toBe(
      "<p>**What you’ll do:**</p><p>- Build apps.</p>",
    );
  });

  it("converts unsupported editor JSON into a saveable job description", () => {
    expect(cleanJobDescriptionDocument({
      type: "doc",
      content: [
        { type: "paragraph", content: [{ type: "text", text: "Keep me", marks: [{ type: "bold" }, { type: "strike" }, { type: "link", attrs: { href: "javascript:alert(1)" } }] }] },
        { type: "blockquote", content: [{ type: "text", text: "Unsupported block stays readable" }] },
        { type: "heading", attrs: { level: 9 }, content: [{ type: "text", text: "Bad heading level" }] },
      ],
    })).toEqual({
      type: "doc",
      content: [
        { type: "paragraph", content: [{ type: "text", text: "Keep me", marks: [{ type: "bold" }] }] },
        { type: "paragraph", content: [{ type: "text", text: "Unsupported block stays readable" }] },
        { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Bad heading level" }] },
      ],
    });
  });
});
