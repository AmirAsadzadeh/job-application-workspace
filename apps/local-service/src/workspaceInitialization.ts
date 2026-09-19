import { copyFile, mkdir, rename, rm, stat } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { join } from "node:path";

async function exists(path: string) {
  try {
    await stat(path);
    return true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return false;
    throw error;
  }
}

export async function initializeWorkspaceFiles(workspacePath: string, resourcesPath: string) {
  await mkdir(workspacePath, { recursive: true });
  for (const name of ["positions", "reference-data"]) {
    const target = join(workspacePath, `${name}.json`);
    if (await exists(target)) continue;
    const temporary = `${target}.${randomUUID()}.tmp`;
    try {
      await copyFile(join(resourcesPath, `${name}.example.json`), temporary);
      await rename(temporary, target);
    } finally {
      await rm(temporary, { force: true });
    }
  }
}
