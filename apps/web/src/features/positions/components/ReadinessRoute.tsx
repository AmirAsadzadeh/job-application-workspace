import { ArrowLeft, BookOpen, Edit3, Eye, Plus, Save, Tag, Trash2, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { EMPTY_QUESTION_ANSWER_DOCUMENT, ReadinessArticleInputSchema } from "@workspace/domain/positionSchema";
import { PositionApiError, positionApi } from "../positionApi";
import type { ReadinessArticle, ReadinessArticleInput, ReferenceData } from "../positionTypes";
import { PositionQuestionAnswerEditor } from "../editor/QuestionAnswerEditor";
import { RichTextPreview } from "../editor/RichTextPreview";
import { EmptyState } from "./EmptyState";

type ReadinessApi = Pick<typeof positionApi, "listReadinessArticles" | "createReadinessArticle" | "updateReadinessArticle" | "deleteReadinessArticle" | "getReferenceData">;
type Props = { articleId?: string; onBack: () => void; onDirtyChange?: (dirty: boolean) => void; onOpenArticle?: (articleId: string) => void; onArticleDeleted?: () => void; api?: ReadinessApi };

const emptyDraft = (): ReadinessArticleInput => ({ title: "", teamId: null, tags: [], answer: structuredClone(EMPTY_QUESTION_ANSWER_DOCUMENT) });
const normalized = (draft: ReadinessArticleInput) => JSON.stringify({ ...draft, title: draft.title.trim(), tags: draft.tags.map((tag) => tag.trim()).filter(Boolean) });

export function ReadinessRoute({ articleId, onBack, onDirtyChange = () => undefined, onOpenArticle = () => undefined, onArticleDeleted = () => undefined, api = positionApi }: Props) {
  const [articles, setArticles] = useState<ReadinessArticle[]>([]);
  const [referenceData, setReferenceData] = useState<ReferenceData | null>(null);
  const [activeId, setActiveId] = useState<string | "new" | null>(null);
  const [draft, setDraft] = useState<ReadinessArticleInput>(emptyDraft);
  const [tagInput, setTagInput] = useState("");
  const [teamFilter, setTeamFilter] = useState("");
  const [tagFilter, setTagFilter] = useState("");
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const titleRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let active = true;
    setState("loading");
    Promise.all([api.listReadinessArticles(), api.getReferenceData()])
      .then(([loadedArticles, loadedReferenceData]) => {
        if (!active) return;
        setArticles(loadedArticles);
        setReferenceData(loadedReferenceData);
        setState("ready");
      })
      .catch(() => { if (active) setState("error"); });
    return () => { active = false; };
  }, [api]);

  const current = activeId && activeId !== "new" ? articles.find((article) => article.id === activeId) ?? null : null;
  const detailArticle = articleId ? articles.find((article) => article.id === articleId) ?? null : null;
  const dirty = Boolean(activeId && normalized(draft) !== normalized(current ? { title: current.title, teamId: current.teamId, tags: current.tags, answer: current.answer } : emptyDraft()));
  useEffect(() => { onDirtyChange(dirty); }, [dirty, onDirtyChange]);
  useEffect(() => () => onDirtyChange(false), [onDirtyChange]);

  const teams = useMemo(() => referenceData?.departments.flatMap((department) => department.teams.map((team) => ({ ...team, departmentName: department.name }))) ?? [], [referenceData]);
  const teamName = useMemo(() => new Map(teams.map((team) => [team.id, `${team.name} · ${team.departmentName}`])), [teams]);
  const allTags = useMemo(() => Array.from(new Set(articles.flatMap((article) => article.tags))).sort((a, b) => a.localeCompare(b)), [articles]);
  const visibleArticles = useMemo(() => articles.filter((article) => {
    if (teamFilter && article.teamId !== teamFilter) return false;
    if (tagFilter && !article.tags.some((tag) => tag.toLocaleLowerCase().includes(tagFilter.trim().toLocaleLowerCase()))) return false;
    return true;
  }), [articles, tagFilter, teamFilter]);

  function begin(article: ReadinessArticle | null = null) {
    if (dirty && !window.confirm("Discard unsaved readiness changes?")) return;
    setError("");
    setTagInput("");
    if (!article) {
      setDraft(emptyDraft());
      setActiveId("new");
      requestAnimationFrame(() => titleRef.current?.focus());
      return;
    }
    setDraft({ title: article.title, teamId: article.teamId, tags: article.tags, answer: structuredClone(article.answer) });
    setActiveId(article.id);
  }

  function addTag(value: string) {
    const tag = value.trim();
    if (!tag || draft.tags.includes(tag)) return;
    setDraft({ ...draft, tags: [...draft.tags, tag] });
    setTagInput("");
  }

  function leaveDetail() {
    if (dirty && !window.confirm("Discard unsaved readiness changes?")) return;
    setActiveId(null);
    onBack();
  }

  async function save() {
    if (busy) return;
    const parsed = ReadinessArticleInputSchema.safeParse(draft);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Check the article.");
      titleRef.current?.focus();
      return;
    }
    setBusy(true);
    setError("");
    try {
      const next = activeId === "new"
        ? await api.createReadinessArticle(parsed.data)
        : await api.updateReadinessArticle(activeId as string, parsed.data);
      setArticles(next);
      if (activeId === "new") {
        const created = next.find((article) => !articles.some((currentArticle) => currentArticle.id === article.id));
        if (created) onOpenArticle(created.id);
      }
      setActiveId(null);
    } catch (requestError) {
      setError(requestError instanceof PositionApiError ? requestError.message : "Could not save the article. Your entries are still here.");
    } finally { setBusy(false); }
  }

  async function remove() {
    if (!current || !window.confirm("Delete this readiness article?")) return;
    setBusy(true);
    setError("");
    try {
      setArticles(await api.deleteReadinessArticle(current.id));
      setActiveId(null);
      if (articleId === current.id) onArticleDeleted();
    } catch (requestError) {
      setError(requestError instanceof PositionApiError ? requestError.message : "Could not delete the article.");
    } finally { setBusy(false); }
  }

  if (state === "loading") return <div className="detail-notice" role="status">Loading readiness...</div>;
  if (state === "error" || !referenceData) return <div className="detail-notice"><strong>Could not load readiness</strong><button className="secondary-button" type="button" onClick={onBack}>Back</button></div>;

  const editor = activeId && <article className="readiness-article-editor">
    <div className="question-fields">
      <label>Article question<input dir="auto" ref={titleRef} value={draft.title} onChange={(event) => { setDraft({ ...draft, title: event.target.value }); setError(""); }} /></label>
      <label>Team<select value={draft.teamId ?? ""} onChange={(event) => setDraft({ ...draft, teamId: event.target.value || null })}><option value="">No team</option>{teams.map((team) => <option key={team.id} value={team.id}>{teamName.get(team.id)}</option>)}</select></label>
    </div>
    <label className="tag-input-label"><span>Tags</span><div className="tag-input-row">{draft.tags.map((tag) => <button key={tag} className="tag-chip" type="button" onClick={() => setDraft({ ...draft, tags: draft.tags.filter((item) => item !== tag) })}><Tag size={12} /> <bdi dir="auto">{tag}</bdi><X size={12} /></button>)}<input dir="auto" aria-label="Add readiness tag" value={tagInput} onChange={(event) => setTagInput(event.target.value)} onBlur={() => addTag(tagInput)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === ",") { event.preventDefault(); addTag(tagInput); } }} placeholder="Type tag and press Enter" /></div></label>
    <label className="answer-label">Answer</label>
    <PositionQuestionAnswerEditor value={draft.answer} onChange={(answer) => setDraft({ ...draft, answer })} onModSave={() => void save()} />
    {error && <p className="field-error" role="alert">{error}</p>}
    <div className="preparation-editor-actions">
      {current && <button className="secondary-button danger-button" type="button" onClick={() => void remove()} disabled={busy}><Trash2 size={14} /> Delete</button>}
      <span />
      <button className="secondary-button" type="button" onClick={() => setActiveId(null)} disabled={busy}><X size={14} /> Cancel</button>
      <button className="primary-button" type="button" onClick={() => void save()} disabled={busy}><Save size={14} /> {busy ? "Saving..." : "Save"}</button>
    </div>
  </article>;

  if (articleId) {
    if (!detailArticle) return <div className="detail-notice"><strong>Readiness article not found</strong><button className="secondary-button" type="button" onClick={onBack}><ArrowLeft size={15} /> Back to readiness</button></div>;
    const editing = activeId === detailArticle.id;
    return <section className="readiness-page readiness-detail-page">
      <header className="readiness-page-header readiness-detail-header">
        <div><button className="icon-button" type="button" onClick={leaveDetail} title="Back to readiness" aria-label="Back to readiness"><ArrowLeft size={17} /></button><div><h1><bdi dir="auto">{detailArticle.title}</bdi></h1><p>{detailArticle.teamId ? teamName.get(detailArticle.teamId) ?? detailArticle.teamId : "No team"}</p></div></div>
        {!editing && <button className="primary-button" type="button" onClick={() => begin(detailArticle)}><Edit3 size={15} /> Edit article</button>}
      </header>
      {editing ? editor : <>
        <RichTextPreview document={detailArticle.answer} emptyMessage="No answer added." />
        {detailArticle.tags.length > 0 && <div className="readiness-tags">{detailArticle.tags.map((tag) => <span key={tag}><Tag size={12} /> <bdi dir="auto">{tag}</bdi></span>)}</div>}
      </>}
    </section>;
  }

  return <section className="readiness-page">
    <header className="readiness-page-header">
      <div><button className="icon-button" type="button" onClick={onBack} title="Back to positions" aria-label="Back to positions"><ArrowLeft size={17} /></button><BookOpen size={18} /><div><h1>Readiness</h1><p>Reusable preparation articles across positions.</p></div></div>
      <button className="primary-button" type="button" onClick={() => begin()} disabled={activeId === "new"}><Plus size={15} /> New article</button>
    </header>
    <div className="readiness-filters">
      <label>Team<select value={teamFilter} onChange={(event) => setTeamFilter(event.target.value)}><option value="">All teams</option>{teams.map((team) => <option key={team.id} value={team.id}>{teamName.get(team.id)}</option>)}</select></label>
      <label>Tag<input dir="auto" list="readiness-tags" value={tagFilter} onChange={(event) => setTagFilter(event.target.value)} placeholder="Filter tag" /></label>
      <datalist id="readiness-tags">{allTags.map((tag) => <option key={tag} value={tag} />)}</datalist>
    </div>
    {editor}
    <div className="readiness-article-list">
      {visibleArticles.map((article) => <article className="readiness-article-card" key={article.id}>
        <header>
          <div><h2><bdi dir="auto">{article.title}</bdi></h2>{article.teamId && <span><bdi dir="auto">{teamName.get(article.teamId) ?? article.teamId}</bdi></span>}</div>
          <div className="readiness-card-actions"><button className="secondary-button" type="button" onClick={() => onOpenArticle(article.id)}><Eye size={14} /> Open</button><button className="secondary-button" type="button" onClick={() => begin(article)}><Edit3 size={14} /> Edit</button></div>
        </header>
        {article.tags.length > 0 && <div className="readiness-tags">{article.tags.map((tag) => <span key={tag}><Tag size={12} /> <bdi dir="auto">{tag}</bdi></span>)}</div>}
      </article>)}
      {!visibleArticles.length && !activeId && <EmptyState icon={BookOpen} className="list-empty-state" message="No readiness articles" actionLabel="New article" onAction={() => begin()} />}
    </div>
  </section>;
}
