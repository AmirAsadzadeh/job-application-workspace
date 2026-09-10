import { createPositionsRepository } from "./positionsRepository.js";
import { accountWorkspacePaths, offlineWorkspacePaths } from "./workspaceLayout.js";

export function createWorkspaceRepositoryFactory(workspaceRoot: string) {
  const fromPaths = (paths: ReturnType<typeof offlineWorkspacePaths>) => createPositionsRepository({
    positionsPath: paths.positionsPath,
    referenceDataPath: paths.referenceDataPath,
    logoDirectoryPath: paths.logoDirectoryPath,
    resumeDirectoryPath: paths.resumeDirectoryPath,
  });
  return {
    offline: () => fromPaths(offlineWorkspacePaths(workspaceRoot)),
    online: (accountId: string) => fromPaths(accountWorkspacePaths(workspaceRoot, accountId)),
  };
}
