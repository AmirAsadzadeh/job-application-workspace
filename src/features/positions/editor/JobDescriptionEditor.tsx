import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Bold, Heading1, Heading2, Heading3, Italic, Link, List, ListOrdered, Unlink } from "lucide-react";
import type { RichTextDocument } from "../positionTypes";

type Props = {
  value: RichTextDocument;
  onChange: (value: RichTextDocument) => void;
};

function cleanDocument(value: unknown): RichTextDocument {
  const cleanNode = (node: any): any => {
    const cleaned: any = { type: node.type };
    if (typeof node.text === "string") cleaned.text = node.text;
    if (node.type === "heading") cleaned.attrs = { level: node.attrs.level };
    if (Array.isArray(node.marks) && node.marks.length) {
      cleaned.marks = node.marks.map((mark: any) => mark.type === "link"
        ? { type: "link", attrs: { href: mark.attrs.href } }
        : { type: mark.type });
    }
    if (Array.isArray(node.content) && node.content.length) cleaned.content = node.content.map(cleanNode);
    return cleaned;
  };
  return cleanNode(value);
}

export function JobDescriptionEditor({ value, onChange }: Props) {
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
    onUpdate: ({ editor: currentEditor }) => onChange(cleanDocument(currentEditor.getJSON())),
    editorProps: {
      attributes: {
        class: "description-editor-content",
        role: "textbox",
        "aria-label": "Job description",
        "aria-multiline": "true",
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
