import type { WorkspaceCounts } from "@workspace/domain/workspacePackageSchema";
import type { PositionsDocument, ReferenceData } from "@workspace/domain/positionSchema";
import type { Database } from "../db/connection.js";
import { createOnlineWorkspaceRepository } from "../repositories/onlineWorkspaceRepository.js";
import { createSynchronizationRepository } from "./synchronizationRepository.js";

function documentCounts(positions: PositionsDocument, referenceData: ReferenceData): WorkspaceCounts {
  return {
    positions: positions.positions.length,
    platformLinks: positions.positions.reduce((total, position) => total + position.jobPlatformLinks.length, 0),
    questions: positions.positions.reduce((total, position) => total + position.questions.length, 0),
    readings: positions.positions.reduce((total, position) => total + position.readingItems.length, 0),
    resumes: positions.positions.filter((position) => position.submittedResume).length,
    logos: positions.positions.filter((position) => position.company.logoPath).length,
    departments: referenceData.departments.length,
    teams: referenceData.departments.reduce((total, department) => total + department.teams.length, 0),
    locations: referenceData.locations.length,
  };
}

export function createPreviewService(database: Database) {
  const workspaces = createOnlineWorkspaceRepository(database);
  const attempts = createSynchronizationRepository(database);
  return {
    async create(ownerId: string, input: { attemptId: string; direction: "offline_to_online" | "working_copy_to_online"; sourceRevision: number | null; lastConfirmedRevision: number | null; checksum: string; sourceCounts: WorkspaceCounts; sourceUpdatedAt: string | null; stagingGenerationId: string }) {
      const destination = await workspaces.ensure(ownerId);
      const destinationCounts = documentCounts(destination.positions, destination.referenceData);
      const conflict = input.lastConfirmedRevision !== null && input.lastConfirmedRevision !== destination.revision;
      const expiresAt = new Date(Date.now() + 30 * 60 * 1000);
      const attempt = await attempts.create(ownerId, { id: input.attemptId, direction: input.direction, sourceRevision: input.sourceRevision, expectedDestinationRevision: destination.revision, sourceChecksum: input.checksum, sourceCounts: input.sourceCounts, destinationCounts, conflict, expiresAt, stagingGenerationId: input.stagingGenerationId });
      return {
        attemptId: attempt.id,
        direction: attempt.direction,
        source: { revision: attempt.sourceRevision, updatedAt: input.sourceUpdatedAt, checksum: attempt.sourceChecksum, counts: attempt.sourceCounts as WorkspaceCounts },
        destination: { revision: attempt.expectedDestinationRevision, updatedAt: destination.updatedAt, counts: attempt.destinationCounts as WorkspaceCounts },
        conflict: attempt.conflict,
        willReplace: "online" as const,
        willMerge: false as const,
        backupRequired: true as const,
        expiresAt: attempt.expiresAt.toISOString(),
        stagingGenerationId: attempt.stagingGenerationId,
      };
    },
  };
}
