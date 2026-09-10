import { createOnlineWorkingCopyService } from "./onlineWorkingCopyService.js";

export function createConnectivityService(workspaceRoot: string, accountId: string) {
  const workingCopy = createOnlineWorkingCopyService(workspaceRoot, accountId);
  return {
    async recordRemoteRevision(remoteRevision: number | null) {
      return workingCopy.recordConnectivity(remoteRevision);
    },
  };
}
