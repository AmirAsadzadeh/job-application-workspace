import { and, asc, eq, inArray } from "drizzle-orm";
import { PositionsDocumentSchema, ReferenceDataSchema, type Position, type PositionsDocument, type ReferenceData } from "@workspace/domain/positionSchema";
import type { Database } from "../db/connection.js";
import { departments, jobPlatformLinks, locations, managedFiles, positionQuestions, positions, readingItems, teams, workspacePreferences, workspaces } from "../db/schema/index.js";

const iso = (value: Date | string) => value instanceof Date ? value.toISOString() : new Date(value).toISOString();

export type OnlineWorkspaceRecord = {
  id: string;
  ownerId: string;
  revision: number;
  updatedAt: string;
  positions: PositionsDocument;
  referenceData: ReferenceData;
};

export async function loadOnlineWorkspace(db: Database["db"], ownerId: string): Promise<OnlineWorkspaceRecord | null> {
  const workspace = (await db.select().from(workspaces).where(eq(workspaces.ownerId, ownerId)).limit(1))[0];
  if (!workspace) return null;
  const workspaceId = workspace.id;
  const [positionRows, preferenceRows, departmentRows, teamRows, locationRows] = await Promise.all([
    db.select().from(positions).where(eq(positions.workspaceId, workspaceId)).orderBy(asc(positions.sequence)),
    db.select().from(workspacePreferences).where(eq(workspacePreferences.workspaceId, workspaceId)).limit(1),
    db.select().from(departments).where(eq(departments.workspaceId, workspaceId)).orderBy(asc(departments.sequence)),
    db.select().from(teams).where(eq(teams.workspaceId, workspaceId)).orderBy(asc(teams.sequence)),
    db.select().from(locations).where(eq(locations.workspaceId, workspaceId)).orderBy(asc(locations.sequence)),
  ]);
  const ids = positionRows.map((position) => position.id);
  const [linkRows, questionRows, readingRows, fileRows] = ids.length === 0 ? [[], [], [], []] : await Promise.all([
    db.select().from(jobPlatformLinks).where(and(eq(jobPlatformLinks.workspaceId, workspaceId), inArray(jobPlatformLinks.positionId, ids))).orderBy(asc(jobPlatformLinks.sequence)),
    db.select().from(positionQuestions).where(and(eq(positionQuestions.workspaceId, workspaceId), inArray(positionQuestions.positionId, ids))).orderBy(asc(positionQuestions.sequence)),
    db.select().from(readingItems).where(and(eq(readingItems.workspaceId, workspaceId), inArray(readingItems.positionId, ids))).orderBy(asc(readingItems.sequence)),
    db.select().from(managedFiles).where(and(eq(managedFiles.workspaceId, workspaceId), inArray(managedFiles.positionId, ids))),
  ]);

  const mappedPositions: Position[] = positionRows.map((row) => {
    const logo = row.companyLogoFileId ? fileRows.find((file) => file.id === row.companyLogoFileId && file.kind === "company_logo") : undefined;
    const resume = fileRows.find((file) => file.positionId === row.id && file.kind === "submitted_resume");
    const submittedResume: Position["submittedResume"] = !resume ? null : resume.mediaType === "application/pdf"
      ? { originalFileName: resume.originalFileName, fileType: "pdf", mediaType: "application/pdf", relativePath: `${row.id}/${resume.id}.pdf`, uploadedAt: iso(resume.createdAt) }
      : { originalFileName: resume.originalFileName, fileType: "docx", mediaType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", relativePath: `${row.id}/${resume.id}.docx`, uploadedAt: iso(resume.createdAt) };
    return {
      id: row.id,
      company: { name: row.companyName, logoPath: logo ? `/company-logos/${logo.id}` : null, logoUrl: row.companyLogoUrl },
      title: row.title,
      status: row.status,
      workMode: row.workMode,
      employmentType: row.employmentType,
      seniority: row.seniority as Position["seniority"],
      departmentId: row.departmentId,
      teamId: row.teamId,
      locationId: row.locationId,
      hiringManager: { name: row.hiringManagerName, phone: row.hiringManagerPhone, position: row.hiringManagerPosition },
      salary: row.salaryMin !== null && row.salaryMax !== null && row.salaryCurrency ? { min: Number(row.salaryMin), max: Number(row.salaryMax), currency: row.salaryCurrency } : null,
      jobPlatformLinks: linkRows.filter((link) => link.positionId === row.id).map((link) => ({ platformName: link.platformName, url: link.url, applicationStatus: link.applicationStatus, applicationDate: link.applicationDate })),
      careerPageUrl: row.careerPageUrl,
      careerPageApplicationStatus: row.careerApplicationStatus,
      careerPageApplicationDate: row.careerApplicationDate,
      description: row.description as Position["description"],
      questions: questionRows.filter((question) => question.positionId === row.id).map((question) => ({ id: question.id, title: question.title, category: question.category as Position["questions"][number]["category"], customCategory: question.customCategory, answer: question.answer as Position["questions"][number]["answer"], createdAt: iso(question.createdAt), updatedAt: iso(question.updatedAt) })),
      readingItems: readingRows.filter((reading) => reading.positionId === row.id).map((reading) => ({ id: reading.id, title: reading.title, url: reading.url, notes: reading.notes, isRead: reading.isRead, createdAt: iso(reading.createdAt), updatedAt: iso(reading.updatedAt) })),
      submittedResume,
      createdAt: iso(row.createdAt),
      updatedAt: iso(row.updatedAt),
    };
  });
  const preference = preferenceRows[0];
  const listView = !preference || preference.listMode === "manual"
    ? { mode: "manual" as const, column: null, direction: null }
    : { mode: "column" as const, column: preference.sortColumn!, direction: preference.sortDirection! };
  return {
    id: workspace.id,
    ownerId,
    revision: workspace.revision,
    updatedAt: iso(workspace.updatedAt),
    positions: PositionsDocumentSchema.parse({ version: 6, listView, positions: mappedPositions }),
    referenceData: ReferenceDataSchema.parse({
      version: 1,
      departments: departmentRows.map((department) => ({ id: department.id, name: department.name, teams: teamRows.filter((team) => team.departmentId === department.id).map((team) => ({ id: team.id, name: team.name })) })),
      locations: locationRows.map((location) => ({ id: location.id, name: location.name })),
    }),
  };
}
