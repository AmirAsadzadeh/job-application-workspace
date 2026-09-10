import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Bold, Code, FileCode2, Heading1, Heading2, Heading3, Italic, Link, List, ListOrdered, Unlink } from "lucide-react";
import { useEffect } from "react";
import { QuestionAnswerDocumentSchema } from "@workspace/domain/positionSchema";
import { questionCodeLanguageLabels, questionCodeLanguages, type QuestionAnswerDocument, type QuestionCodeLanguage } from "../positionTypes";
import { defaultQuestionCodeLanguage, questionLowlight } from "./questionCodeLanguages";

type Props = { value: QuestionAnswerDocument; onChange: (value: QuestionAnswerDocument) => void };

export function normalizeQuestionAnswer(value: unknown): QuestionAnswerDocument {
  const cleanNode = (node: any): any => {
    const clean: any = { type: node.type };
    if (typeof node.text === "string") clean.text = node.text;
    if (node.type === "heading") clean.attrs = { level: node.attrs.level };
    if (node.type === "codeBlock") clean.attrs = { language: questionCodeLanguages.includes(node.attrs?.language) ? node.attrs.language : "plain_text" };
    if (Array.isArray(node.marks) && node.marks.length) clean.marks = node.marks.map((mark: any) => mark.type === "link" ? { type: "link", attrs: { href: mark.attrs.href } } : { type: mark.type });
    if (Array.isArray(node.content) && node.content.length) clean.content = node.content.map(cleanNode);
    return clean;
  };
  return QuestionAnswerDocumentSchema.parse(cleanNode(value));
}

export function PositionQuestionAnswerEditor({ value, onChange }: Props) {
  const editor = useEditor({
    immediatelyRender: false,
    shouldRerenderOnTransaction: true,
    content: value,
    extensions: [
      StarterKit.configure({ blockquote: false, codeBlock: false, horizontalRule: false, strike: false, underline: false, heading: { levels: [1, 2, 3] }, link: { openOnClick: false, autolink: true, defaultProtocol: "https" } }),
      CodeBlockLowlight.configure({ lowlight: questionLowlight, defaultLanguage: defaultQuestionCodeLanguage }),
    ],
    onUpdate: ({ editor: current }) => onChange(normalizeQuestionAnswer(current.getJSON())),
    editorProps: { attributes: { class: "question-answer-content", role: "textbox", "aria-label": "Answer", "aria-multiline": "true" } },
  });

  useEffect(() => {
    if (!editor) return;
    const current = normalizeQuestionAnswer(editor.getJSON());
    if (JSON.stringify(current) !== JSON.stringify(value)) editor.commands.setContent(value, { emitUpdate: false });
  }, [editor, value]);

  if (!editor) return <div className="description-editor-loading">Loading editor...</div>;

  function setLink() {
    const previous = editor?.getAttributes("link").href as string | undefined;
    const href = window.prompt("Link URL", previous ?? "https://");
    if (href === null) return;
    if (!href.trim()) editor?.chain().focus().extendMarkRange("link").unsetLink().run();
    else editor?.chain().focus().extendMarkRange("link").setLink({ href: href.trim() }).run();
  }

  const controls = [
    { label: "Heading 1", icon: Heading1, active: editor.isActive("heading", { level: 1 }), run: () => editor.chain().focus().toggleHeading({ level: 1 }).run() },
    { label: "Heading 2", icon: Heading2, active: editor.isActive("heading", { level: 2 }), run: () => editor.chain().focus().toggleHeading({ level: 2 }).run() },
    { label: "Heading 3", icon: Heading3, active: editor.isActive("heading", { level: 3 }), run: () => editor.chain().focus().toggleHeading({ level: 3 }).run() },
    { label: "Bold", icon: Bold, active: editor.isActive("bold"), run: () => editor.chain().focus().toggleBold().run() },
    { label: "Italic", icon: Italic, active: editor.isActive("italic"), run: () => editor.chain().focus().toggleItalic().run() },
    { label: "Inline code", icon: Code, active: editor.isActive("code"), run: () => editor.chain().focus().toggleCode().run() },
    { label: "Bullet list", icon: List, active: editor.isActive("bulletList"), run: () => editor.chain().focus().toggleBulletList().run() },
    { label: "Numbered list", icon: ListOrdered, active: editor.isActive("orderedList"), run: () => editor.chain().focus().toggleOrderedList().run() },
  ];
  const language = (editor.getAttributes("codeBlock").language || defaultQuestionCodeLanguage) as QuestionCodeLanguage;

  return <div className="question-answer-editor">
    <div className="editor-toolbar question-toolbar" role="toolbar" aria-label="Answer formatting">
      {controls.map(({ label, icon: Icon, active, run }) => <button className={active ? "active" : ""} type="button" key={label} aria-label={label} title={label} aria-pressed={active} onClick={run}><Icon size={15} /></button>)}
      <span className="toolbar-divider" />
      <button className={editor.isActive("link") ? "active" : ""} type="button" aria-label="Add or edit link" title="Add or edit link" onClick={setLink}><Link size={15} /></button>
      <button type="button" aria-label="Remove link" title="Remove link" disabled={!editor.isActive("link")} onClick={() => editor.chain().focus().unsetLink().run()}><Unlink size={15} /></button>
      <span className="toolbar-divider" />
      <button className={editor.isActive("codeBlock") ? "active" : ""} type="button" aria-label="Code block" title="Code block" onClick={() => editor.chain().focus().toggleCodeBlock({ language }).run()}><FileCode2 size={15} /></button>
      <label className="code-language-label"><span className="sr-only">Code language</span><select aria-label="Code language" value={language} disabled={!editor.isActive("codeBlock")} onChange={(event) => editor.chain().focus().updateAttributes("codeBlock", { language: event.target.value }).run()}>{questionCodeLanguages.map((item) => <option key={item} value={item}>{questionCodeLanguageLabels[item]}</option>)}</select></label>
    </div>
    <EditorContent editor={editor} />
  </div>;
}
