import { ArrowLeft, Save, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { CreatePositionInputSchema, EMPTY_RICH_TEXT_DOCUMENT, type CompanyLogoInput as CompanyLogoValue, type EmploymentType, type JobPlatformLink, type RichTextDocument } from "../../../../shared/positionSchema";
import { PositionApiError, positionApi } from "../positionApi";
import { employmentTypeLabels, employmentTypes, seniorities, workModeLabels, workModes, type ReferenceData } from "../positionTypes";
import { JobDescriptionEditor } from "../editor/JobDescriptionEditor";
import { CompanyLogoInput } from "./CompanyLogoInput";
import { PublicationLinksEditor } from "./PublicationLinksEditor";

type CreateApi = Pick<typeof positionApi, "createPosition" | "getReferenceData">;
type Props = {
  onBack: () => void;
  onCreated: () => void;
  onDirtyChange?: (dirty: boolean) => void;
  api?: CreateApi;
};

type FormState = {
  companyName: string;
  companyLogo: CompanyLogoValue;
  title: string;
  workMode: string;
  seniority: string;
  employmentType: EmploymentType;
  departmentId: string | null;
  teamId: string | null;
  locationId: string | null;
  hiringManager: { name: string; phone: string; position: string };
  salary: { min: string; max: string; currency: string };
  jobPlatformLinks: JobPlatformLink[];
  careerPageUrl: string | null;
  careerPageApplicationStatus: import("../../../../shared/positionSchema").ApplicationChannelStatus | null;
  careerPageApplicationDate: string | null;
  description: RichTextDocument;
};

function createInitialForm(): FormState {
  return {
    companyName: "",
    companyLogo: { kind: "none" },
    title: "",
    workMode: "",
    seniority: "",
    employmentType: "full_time",
    departmentId: null,
    teamId: null,
    locationId: null,
    hiringManager: { name: "", phone: "", position: "" },
    salary: { min: "", max: "", currency: "" },
    jobPlatformLinks: [],
    careerPageUrl: null,
    careerPageApplicationStatus: null,
    careerPageApplicationDate: null,
    description: structuredClone(EMPTY_RICH_TEXT_DOCUMENT),
  };
}

export function PositionCreateRoute({ onBack, onCreated, onDirtyChange = () => undefined, api = positionApi }: Props) {
  const initial = useRef(createInitialForm());
  const formElement = useRef<HTMLFormElement>(null);
  const [form, setForm] = useState<FormState>(() => structuredClone(initial.current));
  const [referenceData, setReferenceData] = useState<ReferenceData | null>(null);
  const [loadState, setLoadState] = useState<"loading" | "ready" | "error">("loading");
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "error">("idle");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [teamNotice, setTeamNotice] = useState("");
  const dirty = JSON.stringify(form) !== JSON.stringify(initial.current);

  useEffect(() => {
    let active = true;
    setLoadState("loading");
    api.getReferenceData()
      .then((data) => { if (active) { setReferenceData(data); setLoadState("ready"); } })
      .catch(() => { if (active) setLoadState("error"); });
    return () => { active = false; };
  }, [api, loadAttempt]);

  useEffect(() => {
    onDirtyChange(dirty);
    return () => onDirtyChange(false);
  }, [dirty, onDirtyChange]);

  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const teams = useMemo(() => referenceData?.departments.find((department) => department.id === form.departmentId)?.teams ?? [], [form.departmentId, referenceData]);

  function change(next: FormState) {
    setForm(next);
    setSaveState("idle");
    setErrors({});
  }

  function setManager(field: keyof FormState["hiringManager"], value: string) {
    change({ ...form, hiringManager: { ...form.hiringManager, [field]: value } });
  }

  function setSalary(field: keyof FormState["salary"], value: string) {
    change({ ...form, salary: { ...form.salary, [field]: value } });
  }

  function focusFirstError(nextErrors: Record<string, string>) {
    const first = Object.keys(nextErrors)[0]?.split(".")[0];
    if (!first) return;
    requestAnimationFrame(() => {
      const container = formElement.current?.querySelector<HTMLElement>(`[data-field="${first}"]`);
      (container?.matches("input,select,button") ? container : container?.querySelector<HTMLElement>("input,select,button"))?.focus();
    });
  }

  async function save() {
    if (saveState === "saving") return;
    const hasSalary = Object.values(form.salary).some((value) => value.trim());
    const candidate = {
      companyName: form.companyName,
      companyLogo: form.companyLogo,
      title: form.title,
      workMode: form.workMode,
      seniority: form.seniority,
      employmentType: form.employmentType,
      departmentId: form.departmentId,
      teamId: form.teamId,
      locationId: form.locationId,
      hiringManager: form.hiringManager,
      salary: hasSalary ? {
        min: form.salary.min.trim() ? Number(form.salary.min) : Number.NaN,
        max: form.salary.max.trim() ? Number(form.salary.max) : Number.NaN,
        currency: form.salary.currency,
      } : null,
      jobPlatformLinks: form.jobPlatformLinks.filter((link) => link.platformName.trim() || link.url.trim()),
      careerPageUrl: form.careerPageUrl,
      careerPageApplicationStatus: form.careerPageApplicationStatus,
      careerPageApplicationDate: form.careerPageApplicationDate,
      description: form.description,
    };
    const parsed = CreatePositionInputSchema.safeParse(candidate);
    if (!parsed.success) {
      const nextErrors: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const path = issue.path.join(".");
        const root = String(issue.path[0] ?? "form");
        const key = root === "jobPlatformLinks" ? `jobPlatformLinks.${String(issue.path[1] ?? 0)}` : root;
        nextErrors[key] ??= issue.message;
        if (path === "workMode") nextErrors.workMode = "Select a work mode.";
        if (path === "seniority") nextErrors.seniority = "Select a seniority.";
      }
      if (hasSalary && Object.values(form.salary).some((value) => !value.trim())) {
        nextErrors.salary = "Complete all salary fields.";
      }
      setErrors(nextErrors);
      focusFirstError(nextErrors);
      return;
    }

    setErrors({});
    setSaveState("saving");
    try {
      await api.createPosition(parsed.data);
      onDirtyChange(false);
      onCreated();
    } catch (error) {
      if (error instanceof PositionApiError && error.issues.length) {
        const nextErrors = Object.fromEntries(error.issues.map((issue) => [issue.path, issue.message]));
        setErrors(nextErrors);
        focusFirstError(nextErrors);
      }
      setSaveState("error");
    }
  }

  if (loadState === "loading") return <div className="detail-notice" role="status">Loading form...</div>;
  if (loadState === "error" || !referenceData) return <div className="detail-notice"><strong>Could not load form options</strong><button className="secondary-button" type="button" onClick={() => setLoadAttempt((value) => value + 1)}>Retry</button><button className="secondary-button" type="button" onClick={onBack}>Back</button></div>;

  return (
    <section className="detail-view create-view">
      <header className="detail-header create-header">
        <button className="icon-button" type="button" onClick={onBack} title="Back to positions" aria-label="Back to positions"><ArrowLeft size={17} /></button>
        <div className="detail-title"><span>Create</span><h1>New position</h1></div>
        <span className="status status-saved">Saved</span>
      </header>
      <form ref={formElement} className="detail-form create-form" onSubmit={(event) => { event.preventDefault(); void save(); }} noValidate>
        <fieldset>
          <legend>Basics</legend>
          <div className="form-grid basics-grid">
            <label data-field="companyName"><span>Company name <span className="required-label">Required</span></span><input value={form.companyName} onChange={(event) => change({ ...form, companyName: event.target.value })} aria-invalid={Boolean(errors.companyName)} />{errors.companyName && <span className="field-error" role="alert">{errors.companyName}</span>}</label>
            <label data-field="title"><span>Position name <span className="required-label">Required</span></span><input value={form.title} onChange={(event) => change({ ...form, title: event.target.value })} aria-invalid={Boolean(errors.title)} />{errors.title && <span className="field-error" role="alert">{errors.title}</span>}</label>
            <div className="static-field"><span>Status</span><strong>Saved</strong></div>
            <label data-field="workMode"><span>Work mode <span className="required-label">Required</span></span><select value={form.workMode} onChange={(event) => change({ ...form, workMode: event.target.value })} aria-invalid={Boolean(errors.workMode)}><option value="">Select</option>{workModes.map((value) => <option key={value} value={value}>{workModeLabels[value]}</option>)}</select>{errors.workMode && <span className="field-error" role="alert">{errors.workMode}</span>}</label>
            <label data-field="seniority"><span>Seniority <span className="required-label">Required</span></span><select value={form.seniority} onChange={(event) => change({ ...form, seniority: event.target.value })} aria-invalid={Boolean(errors.seniority)}><option value="">Select</option>{seniorities.map((value) => <option key={value} value={value}>{value}</option>)}</select>{errors.seniority && <span className="field-error" role="alert">{errors.seniority}</span>}</label>
            <label>Employment type<select value={form.employmentType} onChange={(event) => change({ ...form, employmentType: event.target.value as EmploymentType })}>{employmentTypes.map((value) => <option key={value} value={value}>{employmentTypeLabels[value]}</option>)}</select></label>
            <CompanyLogoInput value={form.companyLogo} companyName={form.companyName} error={errors.companyLogo} onChange={(companyLogo) => change({ ...form, companyLogo })} onError={(message) => setErrors((current) => ({ ...current, companyLogo: message }))} />
          </div>
        </fieldset>
        <fieldset>
          <legend>Assignment</legend>
          <div className="form-grid">
            <label>Department<select aria-label="Department" value={form.departmentId ?? ""} disabled={!referenceData.departments.length} onChange={(event) => { const departmentId = event.target.value || null; const cleared = Boolean(form.teamId); change({ ...form, departmentId, teamId: null }); setTeamNotice(cleared ? "Team selection cleared." : ""); }}><option value="" disabled={!referenceData.departments.length}>{referenceData.departments.length ? "Not selected" : "No options available"}</option>{referenceData.departments.map((department) => <option key={department.id} value={department.id}>{department.name}</option>)}</select></label>
            <label>Team<select aria-label="Team" value={form.teamId ?? ""} disabled={!form.departmentId || !teams.length} onChange={(event) => change({ ...form, teamId: event.target.value || null })}><option value="" disabled={!teams.length}>{!referenceData.departments.length || form.departmentId && !teams.length ? "No options available" : "Not selected"}</option>{teams.map((team) => <option key={team.id} value={team.id}>{team.name}</option>)}</select></label>
            <label>Location<select aria-label="Location" value={form.locationId ?? ""} disabled={!referenceData.locations.length} onChange={(event) => change({ ...form, locationId: event.target.value || null })}><option value="" disabled={!referenceData.locations.length}>{referenceData.locations.length ? "Not selected" : "No options available"}</option>{referenceData.locations.map((location) => <option key={location.id} value={location.id}>{location.name}</option>)}</select></label>
          </div>
          <span className="sr-only" aria-live="polite">{teamNotice}</span>
        </fieldset>
        <fieldset data-field="hiringManager">
          <legend>Hiring manager</legend>
          <div className="form-grid">
            <label>Name<input aria-label="Hiring manager name" value={form.hiringManager.name} onChange={(event) => setManager("name", event.target.value)} /></label>
            <label>Phone number<input aria-label="Hiring manager phone" type="tel" value={form.hiringManager.phone} onChange={(event) => setManager("phone", event.target.value)} /></label>
            <label>Position<input aria-label="Hiring manager position" value={form.hiringManager.position} onChange={(event) => setManager("position", event.target.value)} /></label>
          </div>
          {errors.hiringManager && <p className="field-error" role="alert">{errors.hiringManager}</p>}
        </fieldset>
        <fieldset data-field="salary">
          <legend>Salary</legend>
          <div className="form-grid">
            <label>Minimum<input aria-label="Salary minimum" type="number" min="0" value={form.salary.min} onChange={(event) => setSalary("min", event.target.value)} /></label>
            <label>Maximum<input aria-label="Salary maximum" type="number" min="0" value={form.salary.max} onChange={(event) => setSalary("max", event.target.value)} /></label>
            <label>Currency<input aria-label="Salary currency" maxLength={3} value={form.salary.currency} onChange={(event) => setSalary("currency", event.target.value.toUpperCase())} placeholder="USD" /></label>
          </div>
          {errors.salary && <p className="field-error" role="alert">{errors.salary}</p>}
        </fieldset>
        <PublicationLinksEditor links={form.jobPlatformLinks} careerPageUrl={form.careerPageUrl} careerPageApplicationStatus={form.careerPageApplicationStatus} careerPageApplicationDate={form.careerPageApplicationDate} errors={errors} onLinksChange={(jobPlatformLinks) => change({ ...form, jobPlatformLinks })} onCareerPageChange={(careerPageUrl, careerPageApplicationStatus, careerPageApplicationDate) => change({ ...form, careerPageUrl, careerPageApplicationStatus, careerPageApplicationDate })} />
        <fieldset>
          <legend>Job description</legend>
          <JobDescriptionEditor value={form.description} onChange={(description) => change({ ...form, description })} />
        </fieldset>
        <footer className="form-actions create-actions">
          <span className={`form-message ${saveState === "error" ? "error-text" : ""}`} role="status">{saveState === "error" ? "Could not create position. Your entries are still here." : ""}</span>
          <button className="secondary-button" type="button" onClick={onBack}><X size={15} /> Cancel</button>
          <button className="primary-button" type="submit" disabled={saveState === "saving"}><Save size={15} />{saveState === "saving" ? "Creating..." : "Create position"}</button>
        </footer>
      </form>
    </section>
  );
}
