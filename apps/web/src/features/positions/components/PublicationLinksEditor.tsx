import { ExternalLink, Link2, Trash2 } from "lucide-react";
import { useEffect, useRef } from "react";
import { localDateString } from "@workspace/domain/positionSchema";
import {
  applicationChannelStatuses,
  applicationChannelStatusDefinitions,
  applicationChannelStatusLabels,
  type ApplicationChannelStatus,
  type JobPlatformLink,
} from "../positionTypes";
import { StatusHelp } from "./StatusHelp";
import { EmptyState } from "./EmptyState";
import { isDesktopApplication, openExternalUrl } from "../../../desktop/desktopBridge";

type Props = {
  links: JobPlatformLink[];
  careerPageUrl: string | null;
  careerPageApplicationStatus: ApplicationChannelStatus | null;
  careerPageApplicationDate: string | null;
  onLinksChange: (links: JobPlatformLink[]) => void;
  onCareerPageChange: (url: string | null, status: ApplicationChannelStatus | null, date: string | null) => void;
  errors?: Record<string, string>;
};

const definitions = applicationChannelStatuses.map((value) => ({
  value,
  label: applicationChannelStatusLabels[value],
  description: applicationChannelStatusDefinitions[value],
}));

function validExternalUrl(value: string | null) {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:" ? url.href : null;
  } catch { return null; }
}

function ExternalUrlAction({ value, label }: { value: string | null; label: string }) {
  const url = validExternalUrl(value);
  if (!url) return null;
  return <a className="icon-button small-icon-button" href={url} target="_blank" rel="noreferrer" aria-label={label} title={label} onClick={(event) => {
    if (!isDesktopApplication()) return;
    event.preventDefault();
    void openExternalUrl(url);
  }}><ExternalLink size={13} /></a>;
}

export function PublicationLinksEditor({ links, careerPageUrl, careerPageApplicationStatus, careerPageApplicationDate, onLinksChange, onCareerPageChange, errors = {} }: Props) {
  const today = localDateString(new Date());
  const previousCount = useRef(links.length);
  const lastPlatformRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (links.length > previousCount.current) lastPlatformRef.current?.focus();
    previousCount.current = links.length;
  }, [links.length]);

  const addPlatform = () => onLinksChange([...links, { platformName: "", url: "", applicationStatus: null, applicationDate: null }]);

  function replaceLink(index: number, next: JobPlatformLink) {
    onLinksChange(links.map((link, linkIndex) => linkIndex === index ? next : link));
  }

  function updateStatus(index: number, value: string) {
    const link = links[index];
    const applicationStatus = value ? value as ApplicationChannelStatus : null;
    if (!applicationStatus && link.applicationDate && !window.confirm("Clear this status and its application date?")) return;
    replaceLink(index, {
      ...link,
      applicationStatus,
      applicationDate: applicationStatus === null ? null : applicationStatus === "applied" && !link.applicationDate ? today : link.applicationDate,
    });
  }

  function updateUrl(index: number, url: string) {
    const link = links[index];
    if (!url && link.url && (link.applicationStatus || link.applicationDate)) {
      if (!window.confirm("Clear this URL and its application tracking details?")) return;
      replaceLink(index, { ...link, url, applicationStatus: null, applicationDate: null });
      return;
    }
    replaceLink(index, { ...link, url });
  }

  function updateCareerStatus(value: string) {
    const status = value ? value as ApplicationChannelStatus : null;
    if (!status && careerPageApplicationDate && !window.confirm("Clear this status and its application date?")) return;
    onCareerPageChange(careerPageUrl, status, status === null ? null : status === "applied" && !careerPageApplicationDate ? today : careerPageApplicationDate);
  }

  function updateCareerUrl(value: string) {
    const url = value || null;
    if (!url && careerPageUrl && (careerPageApplicationStatus || careerPageApplicationDate)) {
      if (!window.confirm("Clear this URL and its application tracking details?")) return;
      onCareerPageChange(null, null, null);
      return;
    }
    onCareerPageChange(url, careerPageApplicationStatus, careerPageApplicationDate);
  }

  return (
    <fieldset className="publication-editor">
      <legend>Publication links</legend>
      <div className="publication-heading"><span>Track each place where this position appears.</span><StatusHelp label="Channel status definitions" definitions={definitions} /></div>
      <div className="publication-links">
        {links.map((link, index) => (
          <div className="publication-link-row" key={index}>
            <label>Platform<input ref={index === links.length - 1 ? lastPlatformRef : undefined} aria-label={`Platform name ${index + 1}`} value={link.platformName} onChange={(event) => replaceLink(index, { ...link, platformName: event.target.value })} /></label>
            <div className="url-field-with-action"><label>Job posting URL<input aria-label={`Job posting URL ${index + 1}`} inputMode="url" value={link.url} onChange={(event) => updateUrl(index, event.target.value)} /></label><ExternalUrlAction value={link.url} label={`Open ${link.platformName || `platform ${index + 1}`} posting`} /></div>
            <label>Status<select aria-label={`Application status ${index + 1}`} value={link.applicationStatus ?? ""} onChange={(event) => updateStatus(index, event.target.value)}><option value="">Untracked</option>{applicationChannelStatuses.map((value) => <option key={value} value={value}>{applicationChannelStatusLabels[value]}</option>)}</select></label>
            <label>Application date<input aria-label={`Application date ${index + 1}`} type="date" max={today} value={link.applicationDate ?? ""} onChange={(event) => replaceLink(index, { ...link, applicationDate: event.target.value || null })} /></label>
            <button className="icon-button remove-link" type="button" aria-label={`Remove platform link ${index + 1}`} title="Remove platform link" onClick={() => onLinksChange(links.filter((_, linkIndex) => linkIndex !== index))}><Trash2 size={15} /></button>
            {(errors[`jobPlatformLinks.${index}`] || errors[`jobPlatformLinks.${index}.applicationDate`]) && <p className="field-error" role="alert">{errors[`jobPlatformLinks.${index}.applicationDate`] ?? errors[`jobPlatformLinks.${index}`]}</p>}
          </div>
        ))}
        {links.length ? <button className="secondary-button add-link" type="button" onClick={addPlatform}>Add platform</button> : <EmptyState icon={Link2} message="No job platforms added" actionLabel="Add platform" onAction={addPlatform} />}
      </div>
      <div className="career-page-grid">
        <div className="career-page-field url-field-with-action"><label>Organization career-page URL<input aria-label="Organization career-page URL" inputMode="url" value={careerPageUrl ?? ""} onChange={(event) => updateCareerUrl(event.target.value)} /></label><ExternalUrlAction value={careerPageUrl} label="Open organization career page" /></div>
        <label>Career-page status<select aria-label="Career-page application status" value={careerPageApplicationStatus ?? ""} disabled={!careerPageUrl} onChange={(event) => updateCareerStatus(event.target.value)}><option value="">Untracked</option>{applicationChannelStatuses.map((value) => <option key={value} value={value}>{applicationChannelStatusLabels[value]}</option>)}</select></label>
        <label>Application date<input aria-label="Career-page application date" type="date" max={today} disabled={!careerPageUrl} value={careerPageApplicationDate ?? ""} onChange={(event) => onCareerPageChange(careerPageUrl, careerPageApplicationStatus, event.target.value || null)} /></label>
      </div>
      {(errors.careerPageUrl || errors.careerPageApplicationDate || errors.careerPageApplicationStatus) && <p className="field-error" role="alert">{errors.careerPageApplicationDate ?? errors.careerPageApplicationStatus ?? errors.careerPageUrl}</p>}
    </fieldset>
  );
}
