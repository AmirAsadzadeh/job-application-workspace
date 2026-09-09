import { ArrowLeft, BookOpen, BriefcaseBusiness, CircleHelp, FileText, Save, UserRound } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { PositionDetailsUpdateSchema } from "../../../../shared/positionSchema";
import { PositionApiError, positionApi } from "../positionApi";
import { positionStatuses, statusDefinitions, statusLabels, workModeLabels, type Position, type PositionDetailsUpdate, type ReferenceData } from "../positionTypes";
import { JobDescriptionEditor } from "../editor/JobDescriptionEditor";
import { PublicationLinksEditor } from "./PublicationLinksEditor";
import { PositionQuestionsSection } from "./PositionQuestionsSection";
import { PositionReadinessSection, PositionSubmittedResume } from "./PositionReadinessSection";
import { StatusHelp } from "./StatusHelp";

type DetailsApi = Pick<typeof positionApi, "getPosition" | "getReferenceData" | "updatePosition"> & Partial<Pick<typeof positionApi, "createQuestion" | "updateQuestion" | "deleteQuestion" | "createReading" | "updateReading" | "deleteReading" | "uploadResume" | "getResumeOpenUrl" | "checkResumeAvailability" | "removeResume">>;
export type PositionDetailSection = "application" | "role-details" | "readiness" | "questions";
type Props = { positionId: string; section?: PositionDetailSection; onBack: () => void; onSectionChange?: (section: PositionDetailSection) => void; onDirtyChange?: (dirty: boolean) => void; api?: DetailsApi };

const noOp = () => undefined;

function positionDetails(position: Position): PositionDetailsUpdate {
  return {
    status: position.status,
    departmentId: position.departmentId,
    teamId: position.teamId,
    locationId: position.locationId,
    hiringManager: position.hiringManager,
    jobPlatformLinks: position.jobPlatformLinks,
    careerPageUrl: position.careerPageUrl,
    careerPageApplicationStatus: position.careerPageApplicationStatus,
    careerPageApplicationDate: position.careerPageApplicationDate,
    description: position.description,
  };
}

export function PositionDetailsRoute({ positionId, section = "application", onBack, onSectionChange = noOp, onDirtyChange = noOp, api = positionApi }: Props) {
  const [position, setPosition] = useState<Position | null>(null);
  const [referenceData, setReferenceData] = useState<ReferenceData | null>(null);
  const [form, setForm] = useState<PositionDetailsUpdate | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "not-found" | "error">("loading");
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [validation, setValidation] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [questionDirty, setQuestionDirty] = useState(false);
  const [managerEditing, setManagerEditing] = useState(false);
  const [managerFocusRequested, setManagerFocusRequested] = useState(false);
  const managerNameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let active = true;
    Promise.all([api.getPosition(positionId), api.getReferenceData()]).then(([loadedPosition, loadedReferenceData]) => {
      if (!active) return;
      setPosition(loadedPosition);
      setReferenceData(loadedReferenceData);
      setForm(positionDetails(loadedPosition));
      setManagerEditing(Boolean(loadedPosition.hiringManager.name || loadedPosition.hiringManager.phone || loadedPosition.hiringManager.position));
      setState("ready");
    }).catch((error) => { if (active) setState(error instanceof PositionApiError && error.status === 404 ? "not-found" : "error"); });
    return () => { active = false; };
  }, [api, positionId]);

  const teams = useMemo(() => referenceData?.departments.find((department) => department.id === form?.departmentId)?.teams ?? [], [form?.departmentId, referenceData]);
  const formDirty = useMemo(() => Boolean(position && form && JSON.stringify(form) !== JSON.stringify(positionDetails(position))), [form, position]);
  const [logoFailed, setLogoFailed] = useState(false);

  useEffect(() => {
    if (managerEditing && managerFocusRequested) {
      managerNameRef.current?.focus();
      setManagerFocusRequested(false);
    }
  }, [managerEditing, managerFocusRequested]);

  useEffect(() => { onDirtyChange(formDirty || questionDirty); }, [formDirty, onDirtyChange, questionDirty]);
  useEffect(() => () => onDirtyChange(false), [onDirtyChange]);
  useEffect(() => {
    const beforeUnload = (event: BeforeUnloadEvent) => { if (formDirty) event.preventDefault(); };
    window.addEventListener("beforeunload", beforeUnload);
    return () => window.removeEventListener("beforeunload", beforeUnload);
  }, [formDirty]);

  if (state === "loading") return <div className="detail-notice" role="status">Loading position...</div>;
  if (state === "not-found") return <div className="detail-notice"><strong>Position not found</strong><button className="secondary-button" type="button" onClick={onBack}><ArrowLeft size={15} /> Back to positions</button></div>;
  if (state === "error" || !position || !referenceData || !form) return <div className="detail-notice"><strong>Could not load this position</strong><button className="secondary-button" type="button" onClick={onBack}><ArrowLeft size={15} /> Back to positions</button></div>;

  function setManager(field: keyof PositionDetailsUpdate["hiringManager"], value: string) {
    setForm((current) => current ? { ...current, hiringManager: { ...current.hiringManager, [field]: value } } : current);
    setSaveState("idle");
    setValidation("");
    setFieldErrors({});
  }

  function navigate(action: () => void) {
    if (questionDirty && !window.confirm("Discard unsaved question changes?")) return;
    if (!questionDirty && formDirty && !window.confirm("Discard unsaved position changes?")) return;
    if (formDirty && position) {
      setForm(positionDetails(position));
      setValidation("");
      setFieldErrors({});
      setSaveState("idle");
    }
    if (questionDirty) setQuestionDirty(false);
    action();
  }

  async function save() {
    if (!form) return;
    const candidate = {
      ...form,
      jobPlatformLinks: form.jobPlatformLinks.filter((link) => link.platformName.trim() || link.url.trim()),
    };
    const parsed = PositionDetailsUpdateSchema.safeParse(candidate);
    if (!parsed.success) {
      const errors: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        if (issue.path[0] === "hiringManager") setValidation("Complete all hiring manager fields.");
        if (issue.path[0] === "careerPageUrl") errors.careerPageUrl = "Enter a valid HTTP or HTTPS address.";
        if (issue.path[0] === "jobPlatformLinks") {
          const path = issue.path.join(".");
          errors[path.endsWith("applicationDate") ? path : `jobPlatformLinks.${String(issue.path[1])}`] = path.endsWith("applicationDate") ? issue.message : "Enter both a platform name and a valid HTTP or HTTPS address.";
        }
      }
      setFieldErrors(errors);
      return;
    }
    setValidation("");
    setFieldErrors({});
    setSaveState("saving");
    try {
      const updated = await api.updatePosition(positionId, parsed.data);
      setPosition(updated);
      setForm(positionDetails(updated));
      setSaveState("saved");
    } catch (error) {
      if (error instanceof PositionApiError && error.issues.length) {
        setFieldErrors(Object.fromEntries(error.issues.map((issue) => [issue.path, issue.message])));
      }
      setSaveState("error");
    }
  }

  const sections = [
    { key: "application" as const, label: "Application", icon: BriefcaseBusiness },
    { key: "role-details" as const, label: "Role details", icon: FileText },
    { key: "readiness" as const, label: "Readiness", icon: BookOpen, count: position.readingItems.length },
    { key: "questions" as const, label: "Questions", icon: CircleHelp, count: position.questions.length },
  ];

  return (
    <section className="detail-view">
      <div className="detail-layout">
        <aside className="detail-rail" aria-label="Position overview">
          <button className="icon-button detail-back" type="button" onClick={() => navigate(onBack)} title="Back to positions" aria-label="Back to positions"><ArrowLeft size={17} /></button>
          <div className="detail-identity">
            <span className="company-logo" aria-hidden="true">{(position.company.logoUrl ?? position.company.logoPath) && !logoFailed ? <img src={(position.company.logoUrl ?? position.company.logoPath) ?? ""} alt="" onError={() => setLogoFailed(true)} /> : position.company.name.charAt(0)}</span>
            <div className="detail-title"><span>{position.company.name}</span><h1>{position.title}</h1></div>
          </div>
          <div className="detail-badges"><span className={`status status-${position.status}`}>{statusLabels[position.status]}</span><span className="detail-chip">{workModeLabels[position.workMode]}</span><span className="detail-chip">{position.seniority}</span></div>
          <nav className="detail-section-nav" aria-label="Position sections">
            {sections.map(({ key, label, icon: Icon, count }) => <button key={key} type="button" className={section === key ? "active" : ""} aria-current={section === key ? "page" : undefined} onClick={() => navigate(() => onSectionChange(key))}><Icon size={15} /><span>{label}</span>{count !== undefined && <span className="section-count" aria-hidden="true">{count}</span>}</button>)}
          </nav>
        </aside>

        <main className="detail-content">
          {(section === "application" || section === "role-details") && <form className="detail-form" onSubmit={(event) => { event.preventDefault(); void save(); }}>
            <div className="detail-savebar">
              <span className={`form-message ${saveState === "error" ? "error-text" : ""}`} role="status">{saveState === "saved" ? "Changes saved." : saveState === "error" ? "Could not save changes. Your entries are still here." : ""}</span>
              <button className="primary-button" type="submit" disabled={saveState === "saving"}><Save size={15} />{saveState === "saving" ? "Saving..." : "Save changes"}</button>
            </div>

            {section === "application" && <section id="position-application" className="detail-band" aria-labelledby="application-heading">
              <header className="detail-band-heading"><BriefcaseBusiness size={18} /><div><h2 id="application-heading">Application</h2><p>Status and where this position appears.</p></div></header>
              <div className="application-layout">
                <fieldset className="detail-subsection application-status">
                  <legend>Overall status</legend>
                  <div className="status-control">
                    <label><span className="sr-only">Overall status</span><select aria-label="Overall status" value={form.status} onChange={(event) => { setForm({ ...form, status: event.target.value as Position["status"] }); setSaveState("idle"); }}>{positionStatuses.map((value) => <option key={value} value={value}>{statusLabels[value]}</option>)}</select></label>
                    <StatusHelp label="Overall status definitions" definitions={positionStatuses.map((value) => ({ value, label: statusLabels[value], description: statusDefinitions[value] }))} />
                  </div>
                </fieldset>
                <PublicationLinksEditor
                  links={form.jobPlatformLinks}
                  careerPageUrl={form.careerPageUrl}
                  careerPageApplicationStatus={form.careerPageApplicationStatus}
                  careerPageApplicationDate={form.careerPageApplicationDate}
                  errors={fieldErrors}
                  onLinksChange={(jobPlatformLinks) => { setForm({ ...form, jobPlatformLinks }); setSaveState("idle"); setFieldErrors({}); }}
                  onCareerPageChange={(careerPageUrl, careerPageApplicationStatus, careerPageApplicationDate) => { setForm({ ...form, careerPageUrl, careerPageApplicationStatus, careerPageApplicationDate }); setSaveState("idle"); setFieldErrors({}); }}
                />
              </div>
              <div className="application-resume detail-subsection">
                <PositionSubmittedResume position={position} onPositionChange={setPosition} api={{ uploadResume: api.uploadResume ?? positionApi.uploadResume, getResumeOpenUrl: api.getResumeOpenUrl ?? positionApi.getResumeOpenUrl, checkResumeAvailability: api.checkResumeAvailability ?? positionApi.checkResumeAvailability, removeResume: api.removeResume ?? positionApi.removeResume }} />
              </div>
            </section>}

            {section === "role-details" && <section id="position-role-details" className="detail-band" aria-labelledby="role-details-heading">
              <header className="detail-band-heading"><FileText size={18} /><div><h2 id="role-details-heading">Role details</h2><p>Assignment, hiring manager, and job description.</p></div></header>
              <fieldset className="detail-subsection">
                <legend>Assignment</legend>
                <div className="form-grid">
                  <label>Department<select aria-label="Department" value={form.departmentId ?? ""} disabled={!referenceData.departments.length} onChange={(event) => { const departmentId = event.target.value || null; setForm({ ...form, departmentId, teamId: null }); setSaveState("idle"); }}><option value="" disabled={!referenceData.departments.length}>{referenceData.departments.length ? "Not selected" : "No options available"}</option>{referenceData.departments.map((department) => <option key={department.id} value={department.id}>{department.name}</option>)}</select></label>
                  <label>Team<select aria-label="Team" value={form.teamId ?? ""} disabled={!form.departmentId || !teams.length} onChange={(event) => { setForm({ ...form, teamId: event.target.value || null }); setSaveState("idle"); }}><option value="" disabled={!teams.length}>{!referenceData.departments.length || form.departmentId && !teams.length ? "No options available" : "Not selected"}</option>{teams.map((team) => <option key={team.id} value={team.id}>{team.name}</option>)}</select></label>
                  <label>Location<select aria-label="Location" value={form.locationId ?? ""} disabled={!referenceData.locations.length} onChange={(event) => { setForm({ ...form, locationId: event.target.value || null }); setSaveState("idle"); }}><option value="" disabled={!referenceData.locations.length}>{referenceData.locations.length ? "Not selected" : "No options available"}</option>{referenceData.locations.map((location) => <option key={location.id} value={location.id}>{location.name}</option>)}</select></label>
                </div>
              </fieldset>
              <fieldset className="detail-subsection manager-section">
                <legend><UserRound size={15} /> Hiring manager</legend>
                {managerEditing ? <div className="form-grid">
                  <label>Name<input ref={managerNameRef} aria-label="Hiring manager name" value={form.hiringManager.name} onChange={(event) => setManager("name", event.target.value)} /></label>
                  <label>Phone number<input aria-label="Hiring manager phone" type="tel" value={form.hiringManager.phone} onChange={(event) => setManager("phone", event.target.value)} /></label>
                  <label>Position<input aria-label="Hiring manager position" value={form.hiringManager.position} onChange={(event) => setManager("position", event.target.value)} /></label>
                </div> : <div className="manager-empty" role="status"><span className="empty-state-icon-frame"><UserRound className="empty-state-icon" size={15} /></span><div><strong>No hiring manager added</strong><span>Add a contact to track ownership and communication.</span></div><button className="secondary-button" type="button" onClick={() => { setManagerEditing(true); setManagerFocusRequested(true); }}>Add manager</button></div>}
                {validation && <p className="form-message error-text" role="alert">{validation}</p>}
              </fieldset>
              <fieldset className="detail-subsection job-description-section">
                <legend>Job description</legend>
                <JobDescriptionEditor value={form.description} onChange={(description) => { setForm((current) => current ? { ...current, description } : current); setSaveState("idle"); }} />
              </fieldset>
            </section>}
          </form>}

          {section === "readiness" && <div className="preparation-area detail-page">
            <PositionReadinessSection position={position} onPositionChange={setPosition} api={{ createReading: api.createReading ?? positionApi.createReading, updateReading: api.updateReading ?? positionApi.updateReading, deleteReading: api.deleteReading ?? positionApi.deleteReading }} />
          </div>}
          {section === "questions" && <div className="preparation-area detail-page">
            <PositionQuestionsSection position={position} onPositionChange={setPosition} onDirtyChange={setQuestionDirty} api={{ createQuestion: api.createQuestion ?? positionApi.createQuestion, updateQuestion: api.updateQuestion ?? positionApi.updateQuestion, deleteQuestion: api.deleteQuestion ?? positionApi.deleteQuestion }} />
          </div>}
        </main>
      </div>
    </section>
  );
}
