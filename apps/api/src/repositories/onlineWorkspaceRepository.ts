import { randomUUID } from "node:crypto";
import { and, eq, sql } from "drizzle-orm";
import { PositionsDocumentSchema, ReferenceDataSchema, type PositionsDocument, type ReferenceData } from "@workspace/domain/positionSchema";
import type { Database } from "../db/connection.js";
import { departments, jobPlatformLinks, locations, managedFiles, positionQuestions, positions, readingItems, synchronizationAttempts, teams, workspaceGenerations, workspacePreferences, workspaces } from "../db/schema/index.js";
import { loadOnlineWorkspace } from "./onlineWorkspaceMapper.js";

export class OnlineWorkspaceError extends Error {
  readonly statusCode: number;
  constructor(public readonly code: "NOT_FOUND" | "REVISION_CONFLICT" | "VALIDATION_FAILED", message: string) {
    super(message);
    this.statusCode = code === "REVISION_CONFLICT" ? 409 : code === "NOT_FOUND" ? 404 : 422;
  }
}

export type OnlineReplacementFile = {
  id: string;
  positionId: string;
  kind: "company_logo" | "submitted_resume";
  originalFileName: string;
  mediaType: string;
  byteLength: number;
  sha256: string;
  objectKey: string;
};

export function createOnlineWorkspaceRepository(database: Database) {
  async function ensure(ownerId: string) {
    await database.db.insert(workspaces).values({ ownerId }).onConflictDoNothing({ target: workspaces.ownerId });
    const workspace = await loadOnlineWorkspace(database.db, ownerId);
    if (!workspace) throw new OnlineWorkspaceError("NOT_FOUND", "Workspace was not found.");
    await database.db.insert(workspacePreferences).values({ workspaceId: workspace.id }).onConflictDoNothing();
    return (await loadOnlineWorkspace(database.db, ownerId))!;
  }

  async function replace(ownerId: string, positionsDocument: PositionsDocument, referenceDataDocument: ReferenceData, expectedRevision: number, replacement?: { files: OnlineReplacementFile[]; generationId: string; attemptId: string; backupGenerationId: string }) {
    const parsedPositions = PositionsDocumentSchema.parse(positionsDocument);
    const parsedReference = ReferenceDataSchema.parse(referenceDataDocument);
    return database.db.transaction(async (tx) => {
      const workspace = (await tx.select().from(workspaces).where(eq(workspaces.ownerId, ownerId)).limit(1))[0];
      if (!workspace) throw new OnlineWorkspaceError("NOT_FOUND", "Workspace was not found.");
      if (workspace.revision !== expectedRevision) throw new OnlineWorkspaceError("REVISION_CONFLICT", "Online data changed. Reload and try again.");

      const existingPositions = await tx.select({ id: positions.id, companyLogoFileId: positions.companyLogoFileId })
        .from(positions)
        .where(eq(positions.workspaceId, workspace.id));
      const companyLogoByPosition = replacement
        ? new Map(replacement.files.filter((file) => file.kind === "company_logo").map((file) => [file.positionId, file.id]))
        : new Map(existingPositions.map((position) => [position.id, position.companyLogoFileId]));

      if (replacement) await tx.delete(managedFiles).where(eq(managedFiles.workspaceId, workspace.id));
      await tx.delete(jobPlatformLinks).where(eq(jobPlatformLinks.workspaceId, workspace.id));
      await tx.delete(positionQuestions).where(eq(positionQuestions.workspaceId, workspace.id));
      await tx.delete(readingItems).where(eq(readingItems.workspaceId, workspace.id));
      await tx.delete(positions).where(eq(positions.workspaceId, workspace.id));
      await tx.delete(teams).where(eq(teams.workspaceId, workspace.id));
      await tx.delete(departments).where(eq(departments.workspaceId, workspace.id));
      await tx.delete(locations).where(eq(locations.workspaceId, workspace.id));

      if (parsedReference.departments.length) {
        await tx.insert(departments).values(parsedReference.departments.map((department, sequence) => ({ workspaceId: workspace.id, id: department.id, name: department.name, sequence })));
        const teamValues = parsedReference.departments.flatMap((department) => department.teams.map((team, sequence) => ({ workspaceId: workspace.id, departmentId: department.id, id: team.id, name: team.name, sequence })));
        if (teamValues.length) await tx.insert(teams).values(teamValues);
      }
      if (parsedReference.locations.length) await tx.insert(locations).values(parsedReference.locations.map((location, sequence) => ({ workspaceId: workspace.id, id: location.id, name: location.name, sequence })));

      if (parsedPositions.positions.length) {
        await tx.insert(positions).values(parsedPositions.positions.map((position, sequence) => ({
          workspaceId: workspace.id, id: position.id, sequence, companyName: position.company.name, companyLogoUrl: position.company.logoUrl,
          companyLogoFileId: position.company.logoPath ? companyLogoByPosition.get(position.id) ?? null : null, title: position.title,
          status: position.status, workMode: position.workMode, employmentType: position.employmentType, seniority: position.seniority,
          departmentId: position.departmentId, teamId: position.teamId, locationId: position.locationId,
          hiringManagerName: position.hiringManager.name, hiringManagerPhone: position.hiringManager.phone, hiringManagerPosition: position.hiringManager.position,
          salaryMin: position.salary ? String(position.salary.min) : null, salaryMax: position.salary ? String(position.salary.max) : null, salaryCurrency: position.salary?.currency ?? null,
          careerPageUrl: position.careerPageUrl, careerApplicationStatus: position.careerPageApplicationStatus, careerApplicationDate: position.careerPageApplicationDate,
          description: position.description, createdAt: new Date(position.createdAt), updatedAt: new Date(position.updatedAt), revision: 0,
        })));
        const links = parsedPositions.positions.flatMap((position) => position.jobPlatformLinks.map((link, sequence) => ({ id: randomUUID(), workspaceId: workspace.id, positionId: position.id, sequence, platformName: link.platformName, url: link.url, applicationStatus: link.applicationStatus, applicationDate: link.applicationDate })));
        const questions = parsedPositions.positions.flatMap((position) => position.questions.map((question, sequence) => ({ workspaceId: workspace.id, positionId: position.id, id: question.id, sequence, title: question.title, category: question.category, customCategory: question.customCategory, answer: question.answer, createdAt: new Date(question.createdAt), updatedAt: new Date(question.updatedAt) })));
        const readings = parsedPositions.positions.flatMap((position) => position.readingItems.map((reading, sequence) => ({ workspaceId: workspace.id, positionId: position.id, id: reading.id, sequence, title: reading.title, url: reading.url, notes: reading.notes, isRead: reading.isRead, createdAt: new Date(reading.createdAt), updatedAt: new Date(reading.updatedAt) })));
        if (links.length) await tx.insert(jobPlatformLinks).values(links);
        if (questions.length) await tx.insert(positionQuestions).values(questions);
        if (readings.length) await tx.insert(readingItems).values(readings);
      }
      if (replacement?.files.length) await tx.insert(managedFiles).values(replacement.files.map((file) => ({ ...file, workspaceId: workspace.id, generationId: replacement.generationId })));
      const listView = parsedPositions.listView;
      await tx.insert(workspacePreferences).values({ workspaceId: workspace.id, listMode: listView.mode, sortColumn: listView.column, sortDirection: listView.direction }).onConflictDoUpdate({ target: workspacePreferences.workspaceId, set: { listMode: listView.mode, sortColumn: listView.column, sortDirection: listView.direction } });
      if (replacement) {
        await tx.update(workspaceGenerations).set({ state: "backup" }).where(and(eq(workspaceGenerations.workspaceId, workspace.id), eq(workspaceGenerations.state, "active")));
        const activated = await tx.update(workspaceGenerations).set({ state: "active", activatedAt: new Date(), backupObjectKey: null }).where(and(eq(workspaceGenerations.id, replacement.generationId), eq(workspaceGenerations.workspaceId, workspace.id), eq(workspaceGenerations.state, "staging"))).returning({ id: workspaceGenerations.id });
        if (!activated[0]) throw new OnlineWorkspaceError("VALIDATION_FAILED", "Synchronization generation is no longer available.");
      }
      const updated = await tx.update(workspaces).set({ revision: sql`${workspaces.revision} + 1`, updatedAt: new Date(), ...(replacement ? { activeGenerationId: replacement.generationId } : {}) }).where(and(eq(workspaces.id, workspace.id), eq(workspaces.revision, expectedRevision))).returning({ revision: workspaces.revision });
      if (!updated[0]) throw new OnlineWorkspaceError("REVISION_CONFLICT", "Online data changed. Reload and try again.");
      if (replacement) {
        const completed = await tx.update(synchronizationAttempts).set({ status: "completed", backupGenerationId: replacement.backupGenerationId, completedAt: new Date() }).where(and(eq(synchronizationAttempts.id, replacement.attemptId), eq(synchronizationAttempts.workspaceId, workspace.id), eq(synchronizationAttempts.status, "confirming"))).returning({ id: synchronizationAttempts.id });
        if (!completed[0]) throw new OnlineWorkspaceError("VALIDATION_FAILED", "Synchronization attempt could not be completed.");
      }
      return updated[0].revision;
    });
  }

  return { ensure, get: (ownerId: string) => loadOnlineWorkspace(database.db, ownerId), replace };
}
