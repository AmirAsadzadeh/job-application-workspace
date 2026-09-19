import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Bold, Heading1, Heading2, Heading3, Italic, Link, List, ListOrdered, Unlink } from "lucide-react";
import { useRef } from "react";
import type { RichTextDocument, RichTextMark } from "../positionTypes";

type RichTextBlock = RichTextDocument["content"][number];
type RichTextInline = NonNullable<Extract<RichTextBlock, { type: "paragraph" }>["content"]>[number];

type Props = {
  value: RichTextDocument;
  onChange: (value: RichTextDocument) => void;
  onModSave?: () => void;
};

function decodeHtmlEntities(value: string) {
  const parser = typeof document === "undefined" ? null : document.createElement("textarea");
  if (!parser) {
    return value.replace(/&#x([\da-f]+);/gi, (_, code: string) => String.fromCodePoint(Number.parseInt(code, 16)))
      .replace(/&#(\d+);/g, (_, code: string) => String.fromCodePoint(Number.parseInt(code, 10)))
      .replace(/&nbsp;/gi, " ");
  }
  parser.innerHTML = value;
  return parser.value;
}

export function normalizeJobDescriptionPaste(value: string) {
  return decodeHtmlEntities(value)
    .replace(/[\u00a0\u202f]/g, " ")
    .replace(/[\u200b-\u200d\ufeff]/g, "")
    .replace(/[ \t]*\\[ \t]*(?=\r?\n|$)/g, "")
    .replace(/[ \t]+$/gm, "")
    .replace(/^[ \t]+/gm, "")
    .replace(/\\-/g, "-")
    .replace(/\*\* +/g, "**")
    .replace(/ +\*\*/g, "**")
    .replace(/[ \t]{2,}/g, " ");
}

export function normalizeJobDescriptionPasteHtml(value: string) {
  if (typeof document === "undefined") return normalizeJobDescriptionPaste(value);
  const template = document.createElement("template");
  template.innerHTML = value;
  template.content.querySelectorAll("script, style").forEach((node) => node.remove());
  const walker = document.createTreeWalker(template.content, NodeFilter.SHOW_TEXT);
  const nodes: Text[] = [];
  while (walker.nextNode()) nodes.push(walker.currentNode as Text);
  for (const node of nodes) {
    node.textContent = normalizeJobDescriptionPaste(node.textContent ?? "");
  }
  return template.innerHTML;
}

function isSafeLink(href: unknown): href is string {
  if (typeof href !== "string") return false;
  try {
    const protocol = new URL(href.trim()).protocol;
    return protocol === "http:" || protocol === "https:";
  } catch {
    return false;
  }
}

function cleanMarks(marks: unknown): RichTextMark[] | undefined {
  if (!Array.isArray(marks)) return undefined;
  const cleaned: RichTextMark[] = [];
  for (const mark of marks as any[]) {
    if (mark?.type === "bold" && !cleaned.some((item) => item.type === "bold")) cleaned.push({ type: "bold" });
    if (mark?.type === "italic" && !cleaned.some((item) => item.type === "italic")) cleaned.push({ type: "italic" });
    if (mark?.type === "link" && isSafeLink(mark.attrs?.href) && !cleaned.some((item) => item.type === "link" && item.attrs.href === mark.attrs.href.trim())) {
      cleaned.push({ type: "link", attrs: { href: mark.attrs.href.trim() } });
    }
  }
  return cleaned.length ? cleaned : undefined;
}

function cleanInline(node: any): RichTextInline[] {
  if (!node || typeof node !== "object") return [];
  if (node.type === "text" && typeof node.text === "string") {
    const marks = cleanMarks(node.marks);
    return [{ type: "text", text: node.text, ...(marks ? { marks } : {}) }];
  }
  if (node.type === "hardBreak") return [{ type: "hardBreak" }];
  if (typeof node.text === "string") return [{ type: "text", text: node.text }];
  if (Array.isArray(node.content)) return node.content.flatMap(cleanInline);
  return [];
}

function cleanParagraph(node: any): RichTextBlock {
  const content = Array.isArray(node?.content) ? node.content.flatMap(cleanInline) : [];
  return content.length ? { type: "paragraph", content } : { type: "paragraph" };
}

function cleanBlock(node: any): RichTextBlock {
  if (!node || typeof node !== "object") return { type: "paragraph" };
  if (node.type === "heading") {
    const level = node.attrs?.level === 1 || node.attrs?.level === 2 || node.attrs?.level === 3 ? node.attrs.level : 2;
    const content = Array.isArray(node.content) ? node.content.flatMap(cleanInline) : [];
    return content.length ? { type: "heading", attrs: { level }, content } : { type: "heading", attrs: { level } };
  }
  if (node.type === "bulletList" || node.type === "orderedList") {
    const items: Extract<RichTextBlock, { type: "bulletList" | "orderedList" }>["content"] = Array.isArray(node.content) ? node.content.map((item: any) => ({
      type: "listItem" as const,
      content: Array.isArray(item?.content) ? item.content.map(cleanBlock) : [{ type: "paragraph" as const }],
    })).filter((item: { content: RichTextBlock[] }) => item.content.length) : [];
    return items.length ? { type: node.type, content: items } : { type: "paragraph" };
  }
  if (node.type === "paragraph") return cleanParagraph(node);
  return cleanParagraph(node);
}

export function cleanJobDescriptionDocument(value: unknown): RichTextDocument {
  const root = value as any;
  const content = Array.isArray(root?.content) ? root.content.map(cleanBlock) : [];
  return { type: "doc", content: content.length ? content : [{ type: "paragraph" }] };
}

export function JobDescriptionEditor({ value, onChange, onModSave }: Props) {
  const modSaveRef = useRef(onModSave);
  modSaveRef.current = onModSave;
  const editor = useEditor({
    immediatelyRender: false,
    content: value,
    extensions: [
      StarterKit.configure({
        blockquote: false,
        code: false,
        codeBlock: false,
        horizontalRule: false,
        strike: false,
        underline: false,
        heading: { levels: [1, 2, 3] },
        link: { openOnClick: false, autolink: true, defaultProtocol: "https" },
      }),
    ],
    onUpdate: ({ editor: currentEditor }: { editor: { getJSON: () => unknown } }) => onChange(cleanJobDescriptionDocument(currentEditor.getJSON())),
    editorProps: {
      handleKeyDown: (_view: unknown, event: KeyboardEvent) => {
        if ((event.metaKey || event.ctrlKey) && event.key.toLocaleLowerCase() === "s") {
          if (!modSaveRef.current) return false;
          event.preventDefault();
          modSaveRef.current();
          return true;
        }
        return false;
      },
      transformPastedText: normalizeJobDescriptionPaste,
      transformPastedHTML: normalizeJobDescriptionPasteHtml,
      attributes: {
        class: "description-editor-content",
        role: "textbox",
        "aria-label": "Job description",
        "aria-multiline": "true",
        dir: "auto",
      },
    },
  });

  if (!editor) return <div className="description-editor-loading">Loading editor...</div>;

  function setLink() {
    const previous = editor?.getAttributes("link").href as string | undefined;
    const href = window.prompt("Link URL", previous ?? "https://");
    if (href === null) return;
    if (!href.trim()) {
      editor?.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    editor?.chain().focus().extendMarkRange("link").setLink({ href: href.trim() }).run();
  }

  const controls = [
    { label: "Heading 1", icon: Heading1, active: editor.isActive("heading", { level: 1 }), run: () => editor.chain().focus().toggleHeading({ level: 1 }).run() },
    { label: "Heading 2", icon: Heading2, active: editor.isActive("heading", { level: 2 }), run: () => editor.chain().focus().toggleHeading({ level: 2 }).run() },
    { label: "Heading 3", icon: Heading3, active: editor.isActive("heading", { level: 3 }), run: () => editor.chain().focus().toggleHeading({ level: 3 }).run() },
    { label: "Bold", icon: Bold, active: editor.isActive("bold"), run: () => editor.chain().focus().toggleBold().run() },
    { label: "Italic", icon: Italic, active: editor.isActive("italic"), run: () => editor.chain().focus().toggleItalic().run() },
    { label: "Bullet list", icon: List, active: editor.isActive("bulletList"), run: () => editor.chain().focus().toggleBulletList().run() },
    { label: "Numbered list", icon: ListOrdered, active: editor.isActive("orderedList"), run: () => editor.chain().focus().toggleOrderedList().run() },
  ];

  return (
    <div className="description-editor">
      <div className="editor-toolbar" role="toolbar" aria-label="Description formatting">
        {controls.map(({ label, icon: Icon, active, run }) => (
          <button className={active ? "active" : ""} type="button" key={label} aria-label={label} title={label} aria-pressed={active} onClick={run}>
            <Icon size={15} />
          </button>
        ))}
        <span className="toolbar-divider" />
        <button className={editor.isActive("link") ? "active" : ""} type="button" aria-label="Add or edit link" title="Add or edit link" aria-pressed={editor.isActive("link")} onClick={setLink}><Link size={15} /></button>
        <button type="button" aria-label="Remove link" title="Remove link" disabled={!editor.isActive("link")} onClick={() => editor.chain().focus().unsetLink().run()}><Unlink size={15} /></button>
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}
