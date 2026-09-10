import { createHash, randomUUID } from "node:crypto";
import { cp, mkdir, rename, stat } from "node:fs/promises";
import { join } from "node:path";

async function exists(path: string) {
  try { await stat(path); return true; } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return false;
    throw error;
  }
}

function workspacePaths(root: string) {
  return {
    root,
    positionsPath: join(root, "positions.json"),
    referenceDataPath: join(root, "reference-data.json"),
    logoDirectoryPath: join(root, "company-logos"),
    resumeDirectoryPath: join(root, "resumes"),
    backupDirectoryPath: join(root, "backups"),
  };
}

export function offlineWorkspacePaths(workspaceRoot: string) {
  return workspacePaths(join(workspaceRoot, "offline"));
}

export function accountWorkspacePaths(workspaceRoot: string, accountId: string) {
  const accountKey = createHash("sha256").update(accountId).digest("hex");
  return { ...workspacePaths(join(workspaceRoot, "online", accountKey)), accountKey, syncStatePath: join(workspaceRoot, "online", accountKey, "sync-state.json") };
}

export async function normalizeWorkspaceLayout(workspaceRoot: string) {
  const offline = offlineWorkspacePaths(workspaceRoot);
  if (await exists(offline.positionsPath)) return { migrated: false, backupPath: null, paths: offline };

  await mkdir(workspaceRoot, { recursive: true });
  const names = ["positions.json", "reference-data.json", "company-logos", "resumes", "backups"];
  const present: string[] = [];
  for (const name of names) if (await exists(join(workspaceRoot, name))) present.push(name);
  if (present.length === 0) {
    await mkdir(offline.root, { recursive: true });
    return { migrated: false, backupPath: null, paths: offline };
  }

  const backupPath = join(workspaceRoot, ".migration-backups", `${Date.now()}-${randomUUID()}`);
  await mkdir(backupPath, { recursive: true });
  for (const name of present) await cp(join(workspaceRoot, name), join(backupPath, name), { recursive: true });
  await mkdir(offline.root, { recursive: true });
  for (const name of present) await rename(join(workspaceRoot, name), join(offline.root, name));
  return { migrated: true, backupPath, paths: offline };
}
