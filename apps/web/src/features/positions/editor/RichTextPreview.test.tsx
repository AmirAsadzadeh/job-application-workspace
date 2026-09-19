import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { RichTextPreview } from "./RichTextPreview";
import type { QuestionAnswerDocument } from "../positionTypes";

describe("RichTextPreview", () => {
  it("renders raw markdown-like text as preview blocks with bidi isolation", () => {
    const document: QuestionAnswerDocument = {
      type: "doc",
      content: [{
        type: "paragraph",
        content: [{
          type: "text",
          text: "# 🌐 وقتی URL رو وارد می‌کنیم چه اتفاقی می‌افته؟\n\n- مورد اول\n- item two\n\n```ts\nconst value = 1;\n```\n\nمتن `inline` mixed",
        }],
      }],
    };

    const { container } = render(<RichTextPreview document={document} />);

    expect(screen.getByRole("heading", { name: "🌐 وقتی URL رو وارد می‌کنیم چه اتفاقی می‌افته؟" })).toHaveAttribute("dir", "rtl");
    expect(screen.getByText("مورد اول")).toBeInTheDocument();
    expect(screen.getByText("item two")).toBeInTheDocument();
    expect(container.querySelector("pre code")?.textContent).toBe("const value = 1;");
    expect(container.querySelector("pre")).toHaveAttribute("dir", "ltr");
    expect(screen.getByText("مورد اول").closest("li")).toHaveAttribute("dir", "rtl");
    expect(container.querySelector("bdi")?.getAttribute("dir")).toBe("auto");
  });
});
