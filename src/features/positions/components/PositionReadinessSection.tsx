import { BookOpen, ExternalLink, FileText, Plus, Save, Trash2, Upload, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { ReadingItemInputSchema } from "../../../../shared/positionSchema";
import { PositionApiError, positionApi } from "../positionApi";
import { submittedResumeTypeLabels, type Position, type ReadingItemInput } from "../positionTypes";
import { EmptyState } from "./EmptyState";
import { isDesktopApplication, openExternalUrl } from "../../../desktop/desktopBridge";

type ReadingApi = Pick<typeof positionApi, "createReading" | "updateReading" | "deleteReading">;
type ResumeApi = Pick<typeof positionApi, "uploadResume" | "getResumeOpenUrl" | "removeResume"> & Partial<Pick<typeof positionApi, "checkResumeAvailability">>;
type Props = { position: Position; onPositionChange: (position: Position) => void; api?: ReadingApi };
type ResumeProps = { position: Position; onPositionChange: (position: Position) => void; api?: ResumeApi };

const emptyReading = (): ReadingItemInput => ({ title: "", url: null, notes: "", isRead: false });

export function PositionSubmittedResume({ position, onPositionChange, api = positionApi }: ResumeProps) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [resumeUnavailable, setResumeUnavailable] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let active = true;
    setResumeUnavailable(false);
    if (position.submittedResume) (api.checkResumeAvailability ?? positionApi.checkResumeAvailability)(position.id).then((available) => { if (active) setResumeUnavailable(!available); }).catch(() => { if (active) setResumeUnavailable(true); });
    return () => { active = false; };
  }, [api.checkResumeAvailability, position.id, position.submittedResume?.relativePath]);

  const upload = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true);
    setError("");
    try { onPositionChange(await api.uploadResume(position.id, file)); }
    catch (requestError) { setError(requestError instanceof PositionApiError ? requestError.message : "Could not import the resume. The previous file is unchanged."); }
    finally { setBusy(false); if (fileRef.current) fileRef.current.value = ""; }
  };

  const removeResume = async () => {
    if (!window.confirm("Remove the submitted resume?")) return;
    setBusy(true);
    setError("");
    try { onPositionChange(await api.removeResume(position.id)); }
    catch (requestError) { setError(requestError instanceof PositionApiError ? requestError.message : "Could not remove the resume. The current file is unchanged."); }
    finally { setBusy(false); }
  };

  return <div className="readiness-block resume-block">
    <div className="readiness-subheading"><div><FileText size={15} /><h3>Submitted resume</h3></div></div>
    <input ref={fileRef} className="sr-only" aria-label="Choose submitted resume" type="file" accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document" onChange={(event) => void upload(event.target.files?.[0])} />
    {position.submittedResume ? <div className="resume-row">
      <div className="resume-summary"><strong title={position.submittedResume.originalFileName}>{position.submittedResume.originalFileName}</strong><span className={resumeUnavailable ? "resume-unavailable" : ""}>{resumeUnavailable ? "Managed file unavailable. Replace or remove it." : `${submittedResumeTypeLabels[position.submittedResume.fileType]} · ${new Date(position.submittedResume.uploadedAt).toLocaleDateString()}`}</span></div>
      <a className="secondary-button" href={api.getResumeOpenUrl(position.id)} target="_blank" rel="noreferrer"><ExternalLink size={14} /> Open</a>
      <button className="secondary-button" type="button" onClick={() => fileRef.current?.click()} disabled={busy}><Upload size={14} /> Replace</button>
      <button className="icon-button danger-button" type="button" onClick={() => void removeResume()} disabled={busy} title="Remove resume" aria-label="Remove resume"><Trash2 size={14} /></button>
    </div> : <EmptyState icon={FileText} className="resume-empty" message="No submitted resume" actionLabel={busy ? "Importing..." : "Import"} onAction={() => fileRef.current?.click()} />}
    {error && <p className="field-error" role="alert">{error}</p>}
  </div>;
}

export function PositionReadinessSection({ position, onPositionChange, api = positionApi }: Props) {
  const [activeId, setActiveId] = useState<string | "new" | null>(null);
  const [draft, setDraft] = useState<ReadingItemInput>(emptyReading);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");
  const titleRef = useRef<HTMLInputElement>(null);
  const addReadingRef = useRef<HTMLButtonElement>(null);

  useEffect(() => { if (activeId) titleRef.current?.focus(); }, [activeId]);
  useEffect(() => { setActiveId(null); setError(""); setBusy(null); }, [position.id]);

  const openReading = (id: string) => {
    const reading = position.readingItems.find((item) => item.id === id);
    if (!reading) return;
    setDraft({ title: reading.title, url: reading.url, notes: reading.notes, isRead: reading.isRead });
    setActiveId(id);
    setError("");
  };

  const addReading = () => { setDraft(emptyReading()); setActiveId("new"); setError(""); };

  const saveReading = async () => {
    const parsed = ReadingItemInputSchema.safeParse(draft);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Check the reading item.");
      titleRef.current?.focus();
      return;
    }
    setBusy("reading-save");
    setError("");
    try {
      const updated = activeId === "new"
        ? await api.createReading(position.id, parsed.data)
        : await api.updateReading(position.id, activeId as string, parsed.data);
      onPositionChange(updated);
      setActiveId(null);
    } catch (requestError) {
      setError(requestError instanceof PositionApiError ? requestError.message : "Could not save the reading item. Your entries are still here.");
    } finally { setBusy(null); }
  };

  const toggleRead = async (id: string) => {
    const reading = position.readingItems.find((item) => item.id === id);
    if (!reading) return;
    setBusy(`reading-${id}`);
    setError("");
    try {
      onPositionChange(await api.updateReading(position.id, id, { title: reading.title, url: reading.url, notes: reading.notes, isRead: !reading.isRead }));
    } catch (requestError) {
      setError(requestError instanceof PositionApiError ? requestError.message : "Could not update the reading status.");
    } finally { setBusy(null); }
  };

  const deleteReading = async () => {
    if (!activeId || activeId === "new" || !window.confirm("Delete this reading item?")) return;
    setBusy("reading-delete");
    setError("");
    try {
      onPositionChange(await api.deleteReading(position.id, activeId));
      setActiveId(null);
    } catch (requestError) {
      setError(requestError instanceof PositionApiError ? requestError.message : "Could not delete the reading item.");
    } finally { setBusy(null); }
  };

  const editor = <div className="preparation-editor reading-editor">
    <div className="reading-fields">
      <label>Title<input ref={titleRef} value={draft.title} onChange={(event) => { setDraft({ ...draft, title: event.target.value }); setError(""); }} /></label>
      <label>Link <span className="optional-label">Optional</span><input type="url" value={draft.url ?? ""} onChange={(event) => { setDraft({ ...draft, url: event.target.value || null }); setError(""); }} placeholder="https://" /></label>
    </div>
    <label>Notes <span className="optional-label">Optional</span><textarea rows={3} value={draft.notes} onChange={(event) => setDraft({ ...draft, notes: event.target.value })} /></label>
    <label className="checkbox-label"><input type="checkbox" checked={draft.isRead} onChange={(event) => setDraft({ ...draft, isRead: event.target.checked })} /> Read</label>
    {error && <p className="field-error" role="alert">{error}</p>}
    <div className="preparation-editor-actions">
      {activeId !== "new" && <button className="secondary-button danger-button" type="button" onClick={() => void deleteReading()} disabled={Boolean(busy)}><Trash2 size={14} /> Delete</button>}
      <span />
      <button className="secondary-button" type="button" onClick={() => { setActiveId(null); setError(""); }} disabled={Boolean(busy)}><X size={14} /> Cancel</button>
      <button className="primary-button" type="button" onClick={() => void saveReading()} disabled={Boolean(busy)}><Save size={14} /> {busy === "reading-save" ? "Saving..." : "Save"}</button>
    </div>
  </div>;

  return <section id="position-readiness" className="preparation-section readiness-section detail-band" aria-labelledby="readiness-heading">
    <header className="preparation-heading">
      <div><BookOpen size={18} /><div><h2 id="readiness-heading">Readiness</h2><p>Preparation material for this position.</p></div></div>
    </header>
    <div className="readiness-block">
      <div className="readiness-subheading"><div><BookOpen size={15} /><h3>Reading</h3><span className="preparation-count">{position.readingItems.length}</span></div>{(position.readingItems.length > 0 || activeId === "new") && <button ref={addReadingRef} className="secondary-button" type="button" onClick={addReading} disabled={activeId === "new"}><Plus size={14} /> Add reading</button>}</div>
      {activeId === "new" && editor}
      <div className="preparation-list">
        {position.readingItems.map((reading) => activeId === reading.id ? <div key={reading.id}>{editor}</div> : <div className="preparation-row reading-row" key={reading.id}>
          <label className="reading-check" title={reading.isRead ? "Mark as not read" : "Mark as read"}><input type="checkbox" checked={reading.isRead} disabled={busy === `reading-${reading.id}`} onChange={() => void toggleRead(reading.id)} /><span className="sr-only">{reading.isRead ? "Read" : "Not read"}: {reading.title}</span></label>
          <button className="reading-title" type="button" onClick={() => openReading(reading.id)} title={reading.title}><span className={reading.isRead ? "reading-complete" : ""}>{reading.title}</span></button>
          <span className="reading-status">{reading.isRead ? "Read" : "Not read"}</span>
          {reading.url && <a className="icon-button small-icon-button" href={reading.url} target="_blank" rel="noreferrer" onClick={(event) => {
            if (!isDesktopApplication()) return;
            event.preventDefault();
            void openExternalUrl(reading.url!);
          }} aria-label={`Open ${reading.title}`} title="Open link"><ExternalLink size={13} /></a>}
        </div>)}
        {!position.readingItems.length && activeId !== "new" && <EmptyState icon={BookOpen} message="No reading items yet" actionLabel="Add reading" onAction={addReading} actionRef={addReadingRef} />}
      </div>
    </div>
  </section>;
}
