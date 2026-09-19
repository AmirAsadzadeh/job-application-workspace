import type React from "react";
import type { QuestionAnswerDocument, RichTextDocument } from "../positionTypes";

type PreviewDocument = RichTextDocument | QuestionAnswerDocument;
type RichTextBlock = PreviewDocument["content"][number];
type Paragraph = Extract<RichTextBlock, { type: "paragraph" }>;
type RichTextInline = NonNullable<Paragraph["content"]>[number];
type TextDirection = "rtl" | "ltr";

const rtlCharacter = /[\u0590-\u08ff\ufb1d-\ufdff\ufe70-\ufefc]/;
const ltrCharacter = /[A-Za-z]/;

function textDirection(value: string): TextDirection {
  for (const char of value) {
    if (rtlCharacter.test(char)) return "rtl";
    if (ltrCharacter.test(char)) return "ltr";
  }
  return "ltr";
}

function inlineText(content: RichTextInline[] | undefined) {
  return content?.map((node) => node.type === "hardBreak" ? "\n" : node.text).join("") ?? "";
}

function blockText(node: RichTextBlock): string {
  if (node.type === "paragraph" || node.type === "heading") return inlineText(node.content);
  if (node.type === "codeBlock") return node.content?.map((child) => child.text).join("") ?? "";
  if (node.type === "bulletList" || node.type === "orderedList") return node.content.map((item) => item.content.map(blockText).join("\n")).join("\n");
  return "";
}

function InlineText({ children }: { children: string }) {
  return <bdi dir="auto">{children}</bdi>;
}

function markdownInline(value: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  const pattern = /(`[^`\n]+`|\*\*[^*\n]+\*\*|\[[^\]\n]+\]\(https?:\/\/[^)\s]+\))/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(value))) {
    if (match.index > lastIndex) nodes.push(<InlineText key={`t-${lastIndex}`}>{value.slice(lastIndex, match.index)}</InlineText>);
    const token = match[0];
    if (token.startsWith("`")) nodes.push(<code key={`c-${match.index}`}><InlineText>{token.slice(1, -1)}</InlineText></code>);
    else if (token.startsWith("**")) nodes.push(<strong key={`b-${match.index}`}><InlineText>{token.slice(2, -2)}</InlineText></strong>);
    else {
      const linkMatch = /^\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)$/.exec(token);
      if (linkMatch) nodes.push(<a key={`a-${match.index}`} href={linkMatch[2]} target="_blank" rel="noreferrer"><InlineText>{linkMatch[1]}</InlineText></a>);
      else nodes.push(<InlineText key={`f-${match.index}`}>{token}</InlineText>);
    }
    lastIndex = match.index + token.length;
  }
  if (lastIndex < value.length) nodes.push(<InlineText key={`t-${lastIndex}`}>{value.slice(lastIndex)}</InlineText>);
  return nodes;
}

function renderMarkdownPreview(value: string) {
  const lines = value.replace(/\r\n?/g, "\n").split("\n");
  const blocks: React.ReactNode[] = [];
  let index = 0;
  const nextBlock = (line: string) => /^(```|#{1,3}\s+|\s*[-*]\s+|\s*\d+\.\s+)/.test(line);

  while (index < lines.length) {
    const line = lines[index];
    if (!line.trim()) {
      index += 1;
      continue;
    }

    const fence = /^```([A-Za-z0-9_+-]*)\s*$/.exec(line.trim());
    if (fence) {
      const language = fence[1] || "plain_text";
      const code: string[] = [];
      index += 1;
      while (index < lines.length && !/^```\s*$/.test(lines[index].trim())) {
        code.push(lines[index]);
        index += 1;
      }
      if (index < lines.length) index += 1;
      blocks.push(<pre key={blocks.length} data-language={language} dir="ltr"><code>{code.join("\n")}</code></pre>);
      continue;
    }

    const heading = /^(#{1,3})\s+(.+)$/.exec(line.trim());
    if (heading) {
      const content = markdownInline(heading[2]);
      const dir = textDirection(heading[2]);
      if (heading[1].length === 1) blocks.push(<h1 key={blocks.length} dir={dir}>{content}</h1>);
      else if (heading[1].length === 2) blocks.push(<h2 key={blocks.length} dir={dir}>{content}</h2>);
      else blocks.push(<h3 key={blocks.length} dir={dir}>{content}</h3>);
      index += 1;
      continue;
    }

    if (/^\s*[-*]\s+/.test(line)) {
      const items: React.ReactNode[] = [];
      const listDir = textDirection(line.replace(/^\s*[-*]\s+/, ""));
      while (index < lines.length && /^\s*[-*]\s+/.test(lines[index])) {
        const item = lines[index].replace(/^\s*[-*]\s+/, "");
        items.push(<li key={items.length} dir={textDirection(item)}>{markdownInline(item)}</li>);
        index += 1;
      }
      blocks.push(<ul key={blocks.length} dir={listDir}>{items}</ul>);
      continue;
    }

    if (/^\s*\d+\.\s+/.test(line)) {
      const items: React.ReactNode[] = [];
      const listDir = textDirection(line.replace(/^\s*\d+\.\s+/, ""));
      while (index < lines.length && /^\s*\d+\.\s+/.test(lines[index])) {
        const item = lines[index].replace(/^\s*\d+\.\s+/, "");
        items.push(<li key={items.length} dir={textDirection(item)}>{markdownInline(item)}</li>);
        index += 1;
      }
      blocks.push(<ol key={blocks.length} dir={listDir}>{items}</ol>);
      continue;
    }

    const paragraph = [line.trim()];
    index += 1;
    while (index < lines.length && lines[index].trim() && !nextBlock(lines[index])) {
      paragraph.push(lines[index].trim());
      index += 1;
    }
    const text = paragraph.join(" ");
    blocks.push(<p key={blocks.length} dir={textDirection(text)}>{markdownInline(text)}</p>);
  }

  return blocks;
}

function rawMarkdownText(document: PreviewDocument) {
  if (!document.content.every((node) => node.type === "paragraph")) return null;
  const parts = document.content.map((block) => {
    if (block.type !== "paragraph" || !block.content?.length) return "";
    return block.content.map((node) => node.type === "hardBreak" ? "\n" : node.text).join("");
  });
  const value = parts.join("\n\n").trim();
  return /(^|\n)\s*(```|#{1,3}\s+|[-*]\s+|\d+\.\s+)|`[^`\n]+`|\*\*[^*\n]+\*\*/.test(value) ? value : null;
}

function Inline({ node, index }: { node: RichTextInline; index: number }) {
  if (node.type === "hardBreak") return <br key={index} />;
  let content: React.ReactNode = <InlineText>{node.text}</InlineText>;
  for (const mark of node.marks ?? []) {
    if (mark.type === "bold") content = <strong>{content}</strong>;
    if (mark.type === "italic") content = <em>{content}</em>;
    if (mark.type === "link") content = <a href={mark.attrs.href} target="_blank" rel="noreferrer">{content}</a>;
    if (mark.type === "code") content = <code>{content}</code>;
  }
  return <span key={index}>{content}</span>;
}

function inlineContent(content: RichTextInline[] | undefined) {
  return content?.length ? content.map((node, index) => <Inline key={index} node={node} index={index} />) : null;
}

function Block({ node, index }: { node: RichTextBlock; index: number }) {
  if (node.type === "heading") {
    const content = inlineContent(node.content);
    const dir = textDirection(blockText(node));
    if (node.attrs.level === 1) return <h1 key={index} dir={dir}>{content}</h1>;
    if (node.attrs.level === 2) return <h2 key={index} dir={dir}>{content}</h2>;
    return <h3 key={index} dir={dir}>{content}</h3>;
  }
  if (node.type === "bulletList" || node.type === "orderedList") {
    const List = node.type === "bulletList" ? "ul" : "ol";
    return <List key={index} dir={textDirection(blockText(node))}>{node.content.map((item, itemIndex) => {
      const itemText = item.content.map(blockText).join("\n");
      return <li key={itemIndex} dir={textDirection(itemText)}>{item.content.map((child, childIndex) => <Block key={childIndex} node={child} index={childIndex} />)}</li>;
    })}</List>;
  }
  if (node.type === "codeBlock") {
    const code = node.content?.map((child) => child.text).join("") ?? "";
    return <pre key={index} data-language={node.attrs.language} dir="ltr"><code>{code}</code></pre>;
  }
  if (node.type === "paragraph") return <p key={index} dir={textDirection(blockText(node))}>{inlineContent(node.content)}</p>;
  return null;
}

function hasText(document: PreviewDocument) {
  const visit = (node: unknown): boolean => {
    if (!node || typeof node !== "object") return false;
    if ("text" in node && typeof node.text === "string" && node.text.trim()) return true;
    if ("content" in node && Array.isArray(node.content)) return node.content.some(visit);
    return false;
  };
  return document.content.some(visit);
}

export function RichTextPreview({ document, emptyMessage = "No description added." }: { document: PreviewDocument; emptyMessage?: string }) {
  if (!hasText(document)) return <div className="rich-text-preview empty-rich-text-preview" dir="auto"><bdi dir="auto">{emptyMessage}</bdi></div>;
  const markdown = rawMarkdownText(document);
  if (markdown) return <div className="rich-text-preview" dir="auto">{renderMarkdownPreview(markdown)}</div>;
  return <div className="rich-text-preview" dir="auto">{document.content.map((node, index) => <Block key={index} node={node} index={index} />)}</div>;
}
