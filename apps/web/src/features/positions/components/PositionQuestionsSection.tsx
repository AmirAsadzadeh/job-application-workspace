import { ChevronDown, CircleHelp, Filter, Plus, Save, SearchX, Trash2, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { EMPTY_QUESTION_ANSWER_DOCUMENT, PositionQuestionInputSchema } from "@workspace/domain/positionSchema";
import { PositionApiError, positionApi } from "../positionApi";
import { questionCategories, questionCategoryLabels, type Position, type PositionQuestionInput, type QuestionCategory } from "../positionTypes";
import { PositionQuestionAnswerEditor } from "../editor/QuestionAnswerEditor";
import { EmptyState } from "./EmptyState";

type QuestionsApi = Pick<typeof positionApi, "createQuestion" | "updateQuestion" | "deleteQuestion">;
type Props = { position: Position; onPositionChange: (position: Position) => void; onDirtyChange?: (dirty: boolean) => void; api?: QuestionsApi };

const emptyDraft = (): PositionQuestionInput => ({ title: "", category: null, customCategory: null, answer: structuredClone(EMPTY_QUESTION_ANSWER_DOCUMENT) });
const normalized = (draft: PositionQuestionInput) => JSON.stringify({ ...draft, title: draft.title.trim(), customCategory: draft.customCategory?.trim() || null });

export function PositionQuestionsSection({ position, onPositionChange, onDirtyChange = () => undefined, api = positionApi }: Props) {
  const [activeId, setActiveId] = useState<string | "new" | null>(null);
  const [draft, setDraft] = useState<PositionQuestionInput>(emptyDraft);
  const [baseline, setBaseline] = useState(normalized(emptyDraft()));
  const [filter, setFilter] = useState("all");
  const [state, setState] = useState<"idle" | "saving" | "deleting" | "error">("idle");
  const [error, setError] = useState("");
  const titleRef = useRef<HTMLInputElement>(null);
  const addRef = useRef<HTMLButtonElement>(null);
  const rowRefs = useRef(new Map<string, HTMLButtonElement>());
  const dirty = activeId !== null && normalized(draft) !== baseline;

  useEffect(() => { if (activeId) titleRef.current?.focus(); }, [activeId]);
  useEffect(() => { onDirtyChange(dirty); }, [dirty, onDirtyChange]);
  useEffect(() => () => onDirtyChange(false), [onDirtyChange]);
  useEffect(() => { setActiveId(null); setDraft(emptyDraft()); setBaseline(normalized(emptyDraft())); setError(""); setFilter("all"); }, [position.id]);
  useEffect(() => {
    const beforeUnload = (event: BeforeUnloadEvent) => { if (dirty) event.preventDefault(); };
    window.addEventListener("beforeunload", beforeUnload);
    return () => window.removeEventListener("beforeunload", beforeUnload);
  }, [dirty]);

  const customCategories = useMemo(() => Array.from(new Set(position.questions.filter((question) => question.category === "other" && question.customCategory).map((question) => question.customCategory as string))).sort((a, b) => a.localeCompare(b)), [position.questions]);
  const visibleQuestions = useMemo(() => position.questions.filter((question) => {
    if (filter === "all") return true;
    if (filter === "uncategorized") return question.category === null;
    if (filter.startsWith("custom:")) return question.category === "other" && question.customCategory === filter.slice(7);
    return question.category === filter;
  }), [filter, position.questions]);

  const canDiscard = () => !dirty || window.confirm("Discard unsaved question changes?");
  const begin = (id: string | "new", next: PositionQuestionInput) => {
    if (!canDiscard()) return;
    setActiveId(id); setDraft(next); setBaseline(normalized(next)); setError(""); setState("idle");
  };
  const openQuestion = (id: string) => {
    const question = position.questions.find((candidate) => candidate.id === id);
    if (question) begin(id, { title: question.title, category: question.category, customCategory: question.customCategory, answer: structuredClone(question.answer) });
  };
  const close = () => {
    if (!canDiscard()) return;
    const previous = activeId;
    setActiveId(null); setError("");
    queueMicrotask(() => previous && previous !== "new" ? rowRefs.current.get(previous)?.focus() : addRef.current?.focus());
  };

  const save = async () => {
    const candidate = { ...draft, customCategory: draft.category === "other" ? draft.customCategory : null };
    const parsed = PositionQuestionInputSchema.safeParse(candidate);
    if (!parsed.success) { setError(parsed.error.issues[0]?.message ?? "Check the question."); titleRef.current?.focus(); return; }
    setState("saving"); setError("");
    try {
      const updated = activeId === "new" ? await api.createQuestion(position.id, parsed.data) : await api.updateQuestion(position.id, activeId as string, parsed.data);
      onPositionChange(updated); setBaseline(normalized(parsed.data)); setActiveId(null); setState("idle");
    } catch (requestError) {
      setState("error"); setError(requestError instanceof PositionApiError ? requestError.message : "Could not save question. Your entries are still here.");
    }
  };

  const remove = async () => {
    if (!activeId || activeId === "new" || !window.confirm("Delete this question?")) return;
    setState("deleting"); setError("");
    try { onPositionChange(await api.deleteQuestion(position.id, activeId)); setActiveId(null); setState("idle"); }
    catch (requestError) { setState("error"); setError(requestError instanceof PositionApiError ? requestError.message : "Could not delete question."); }
  };

  const editor = <div className="preparation-editor question-editor">
    <div className="question-fields">
      <label>Question title<input ref={titleRef} value={draft.title} onChange={(event) => { setDraft({ ...draft, title: event.target.value }); setError(""); }} /></label>
      <label>Category <span className="optional-label">Optional</span><select value={draft.category ?? ""} onChange={(event) => { const category = (event.target.value || null) as QuestionCategory | null; setDraft({ ...draft, category, customCategory: category === "other" ? draft.customCategory : null }); setError(""); }}><option value="">Uncategorized</option>{questionCategories.map((category) => <option key={category} value={category}>{questionCategoryLabels[category]}</option>)}</select></label>
      {draft.category === "other" && <label>Custom category<input value={draft.customCategory ?? ""} onChange={(event) => { setDraft({ ...draft, customCategory: event.target.value || null }); setError(""); }} /></label>}
    </div>
    <label className="answer-label">Answer <span className="optional-label">Optional</span></label>
    <PositionQuestionAnswerEditor value={draft.answer} onChange={(answer) => setDraft((current) => ({ ...current, answer }))} />
    {error && <p className="field-error" role="alert">{error}</p>}
    <div className="preparation-editor-actions">
      {activeId !== "new" && <button className="secondary-button danger-button" type="button" onClick={() => void remove()} disabled={state === "saving" || state === "deleting"}><Trash2 size={14} /> Delete</button>}
      <span />
      <button className="secondary-button" type="button" onClick={close} disabled={state === "saving" || state === "deleting"}><X size={14} /> Cancel</button>
      <button className="primary-button" type="button" onClick={() => void save()} disabled={state === "saving" || state === "deleting"}><Save size={14} /> {state === "saving" ? "Saving..." : "Save"}</button>
    </div>
  </div>;

  return <section id="position-questions" className="preparation-section questions-section detail-band" aria-labelledby="questions-heading">
    <header className="preparation-heading"><div><CircleHelp size={18} /><div><h2 id="questions-heading">Questions <span className="preparation-count" aria-hidden="true">{position.questions.length}</span></h2><p>Interview questions for this position.</p></div></div>{(position.questions.length > 0 || activeId === "new") && <button ref={addRef} className="secondary-button" type="button" onClick={() => begin("new", emptyDraft())} disabled={activeId === "new"}><Plus size={14} /> Add question</button>}</header>
    {position.questions.length > 0 && <div className="question-filter"><Filter size={13} /><label><span className="sr-only">Filter questions</span><select aria-label="Filter questions" value={filter} onChange={(event) => setFilter(event.target.value)}><option value="all">All</option><option value="uncategorized">Uncategorized</option>{questionCategories.filter((category) => category !== "other").map((category) => <option key={category} value={category}>{questionCategoryLabels[category]}</option>)}{customCategories.map((category) => <option key={category} value={`custom:${category}`}>{category}</option>)}</select></label></div>}
    {activeId === "new" && editor}
    <div className="preparation-list">
      {visibleQuestions.map((question) => activeId === question.id ? <div key={question.id}>{editor}</div> : <button ref={(element) => { if (element) rowRefs.current.set(question.id, element); else rowRefs.current.delete(question.id); }} className="preparation-row question-row" type="button" key={question.id} onClick={() => openQuestion(question.id)} title={question.title}><span className="truncate">{question.title}</span><span className="question-category">{question.category === "other" ? question.customCategory : question.category ? questionCategoryLabels[question.category] : "Uncategorized"}</span><ChevronDown size={14} /></button>)}
      {!visibleQuestions.length && activeId !== "new" && (position.questions.length
        ? <EmptyState icon={SearchX} message="No questions in this category" actionLabel="Show all" onAction={() => setFilter("all")} />
        : <EmptyState icon={CircleHelp} message="No questions yet" actionLabel="Add question" onAction={() => begin("new", emptyDraft())} actionRef={addRef} />)}
    </div>
  </section>;
}
