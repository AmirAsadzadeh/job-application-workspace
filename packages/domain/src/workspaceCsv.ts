import { stringify } from "csv-stringify/sync";
import type { PositionsDocument, ReferenceData } from "./positionSchema.js";
import type { WorkspaceManifest } from "./workspacePackageSchema.js";

function richText(value: unknown): string {
  if (!value || typeof value !== "object") return "";
  const node = value as { type?: string; text?: string; content?: unknown[] };
  if (node.type === "text") return node.text ?? "";
  if (node.type === "hardBreak") return "\n";
  const separator = node.type === "doc" || node.type === "bulletList" || node.type === "orderedList" || node.type === "listItem" ? "\n" : "";
  return (node.content ?? []).map(richText).filter(Boolean).join(separator).replace(/\n{3,}/g, "\n\n").trim();
}

function csv(records: Record<string, unknown>[], columns: string[]) {
  return stringify(records, { header: true, columns, record_delimiter: "windows", escape_formulas: true });
}

export function createCanonicalCsvs(document: PositionsDocument, referenceData: ReferenceData, files: WorkspaceManifest["files"]) {
  const fileBySource = new Map(files.map((file) => [`${file.kind}:${file.ownerPositionId}:${file.sourceRelativePath}`, file]));
  const positions = document.positions.map((p, sequence) => ({ sequence, id: p.id, company_name: p.company.name, company_logo_path: p.company.logoPath ?? "", company_logo_url: p.company.logoUrl ?? "", title: p.title, status: p.status, work_mode: p.workMode, employment_type: p.employmentType, seniority: p.seniority, department_id: p.departmentId ?? "", team_id: p.teamId ?? "", location_id: p.locationId ?? "", hiring_manager_name: p.hiringManager.name, hiring_manager_phone: p.hiringManager.phone, hiring_manager_position: p.hiringManager.position, salary_min: p.salary?.min ?? "", salary_max: p.salary?.max ?? "", salary_currency: p.salary?.currency ?? "", career_page_url: p.careerPageUrl ?? "", career_page_application_status: p.careerPageApplicationStatus ?? "", career_page_application_date: p.careerPageApplicationDate ?? "", description_text: richText(p.description), description_json: JSON.stringify(p.description), created_at: p.createdAt, updated_at: p.updatedAt }));
  const links = document.positions.flatMap((p) => p.jobPlatformLinks.map((link, sequence) => ({ position_id: p.id, sequence, platform_name: link.platformName, url: link.url, application_status: link.applicationStatus ?? "", application_date: link.applicationDate ?? "" })));
  const questions = document.positions.flatMap((p) => p.questions.map((q, sequence) => ({ position_id: p.id, sequence, question_id: q.id, title: q.title, category: q.category ?? "", custom_category: q.customCategory ?? "", answer_text: richText(q.answer), answer_json: JSON.stringify(q.answer), created_at: q.createdAt, updated_at: q.updatedAt })));
  const readings = document.positions.flatMap((p) => p.readingItems.map((item, sequence) => ({ position_id: p.id, sequence, reading_id: item.id, title: item.title, url: item.url ?? "", notes: item.notes, is_read: item.isRead, created_at: item.createdAt, updated_at: item.updatedAt })));
  const resumes = document.positions.flatMap((p) => p.submittedResume ? (() => { const file = fileBySource.get(`submitted_resume:${p.id}:${p.submittedResume.relativePath}`); return [{ position_id: p.id, original_file_name: p.submittedResume.originalFileName, file_type: p.submittedResume.fileType, media_type: p.submittedResume.mediaType, relative_path: p.submittedResume.relativePath, uploaded_at: p.submittedResume.uploadedAt, archive_path: file?.archivePath ?? "", byte_length: file?.byteLength ?? "", sha256: file?.sha256 ?? "" }]; })() : []);
  const departments = referenceData.departments.map((d, sequence) => ({ sequence, department_id: d.id, name: d.name }));
  const teams = referenceData.departments.flatMap((d, department_sequence) => d.teams.map((t, sequence) => ({ department_sequence, sequence, department_id: d.id, team_id: t.id, name: t.name })));
  const locations = referenceData.locations.map((l, sequence) => ({ sequence, location_id: l.id, name: l.name }));
  return {
    "positions.csv": csv(positions, ["sequence", "id", "company_name", "company_logo_path", "company_logo_url", "title", "status", "work_mode", "employment_type", "seniority", "department_id", "team_id", "location_id", "hiring_manager_name", "hiring_manager_phone", "hiring_manager_position", "salary_min", "salary_max", "salary_currency", "career_page_url", "career_page_application_status", "career_page_application_date", "description_text", "description_json", "created_at", "updated_at"]),
    "job-platform-links.csv": csv(links, ["position_id", "sequence", "platform_name", "url", "application_status", "application_date"]),
    "questions.csv": csv(questions, ["position_id", "sequence", "question_id", "title", "category", "custom_category", "answer_text", "answer_json", "created_at", "updated_at"]),
    "readings.csv": csv(readings, ["position_id", "sequence", "reading_id", "title", "url", "notes", "is_read", "created_at", "updated_at"]),
    "submitted-resumes.csv": csv(resumes, ["position_id", "original_file_name", "file_type", "media_type", "relative_path", "uploaded_at", "archive_path", "byte_length", "sha256"]),
    "departments.csv": csv(departments, ["sequence", "department_id", "name"]),
    "teams.csv": csv(teams, ["department_sequence", "sequence", "department_id", "team_id", "name"]),
    "locations.csv": csv(locations, ["sequence", "location_id", "name"]),
  } as const;
}
