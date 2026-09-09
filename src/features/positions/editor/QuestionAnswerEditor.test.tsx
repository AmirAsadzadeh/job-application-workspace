import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PositionQuestionAnswerEditor, normalizeQuestionAnswer } from "./QuestionAnswerEditor";

describe("PositionQuestionAnswerEditor", () => {
  it("renders prose, inline code, and multiple language-aware code blocks exactly", async () => {
    const value = { type: "doc" as const, content: [
      { type: "heading" as const, attrs: { level: 2 as const }, content: [{ type: "text" as const, text: "Answer" }] },
      { type: "paragraph" as const, content: [{ type: "text" as const, text: "const", marks: [{ type: "code" as const }] }] },
      { type: "codeBlock" as const, attrs: { language: "javascript" as const }, content: [{ type: "text" as const, text: "const x = 1;\n  return x;" }] },
      { type: "codeBlock" as const, attrs: { language: "json" as const }, content: [{ type: "text" as const, text: "{\n  \"ok\": true\n}" }] },
    ] };
    const { container } = render(<PositionQuestionAnswerEditor value={value} onChange={vi.fn()} />);
    expect(await screen.findByRole("heading", { name: "Answer" })).toBeInTheDocument();
    expect(container.querySelectorAll("pre")).toHaveLength(2);
    expect(container.querySelectorAll("pre")[0].textContent).toBe("const x = 1;\n  return x;");
    expect(normalizeQuestionAnswer(value)).toEqual(value);
  });

  it("offers all approved formatting and code language controls", async () => {
    const onChange = vi.fn();
    render(<PositionQuestionAnswerEditor value={{ type: "doc", content: [{ type: "paragraph" }] }} onChange={onChange} />);
    await screen.findByRole("textbox", { name: "Answer" });
    for (const name of ["Heading 1", "Heading 2", "Heading 3", "Bold", "Italic", "Inline code", "Bullet list", "Numbered list", "Code block"]) expect(screen.getByRole("button", { name })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Code block" }));
    expect(screen.getByLabelText("Code language")).toBeEnabled();
    expect(screen.getByLabelText("Code language").querySelectorAll("option")).toHaveLength(9);
  });
});
