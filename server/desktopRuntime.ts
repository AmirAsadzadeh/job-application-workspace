import { copyFile, mkdir, rename, rm, stat } from "node:fs/promises";
import { join, resolve } from "node:path";
import { randomUUID } from "node:crypto";

export type DesktopArguments = {
  desktop: true;
  host: "127.0.0.1";
  port: number;
  workspacePath: string;
  resourcesPath: string;
  parentProcessId: number;
};

function valueOf(argument: string, name: string) {
  return argument.startsWith(`${name}=`) ? argument.slice(name.length + 1) : undefined;
}

export function parseDesktopArguments(arguments_: string[]): DesktopArguments {
  const allowed = ["--desktop", "--host", "--port", "--workspace", "--resources", "--parent-pid"];
  for (const argument of arguments_) {
    if (!allowed.some((name) => argument === name || argument.startsWith(`${name}=`))) {
      throw new Error(`Unknown desktop argument: ${argument}`);
    }
  }
  if (!arguments_.includes("--desktop")) throw new Error("Missing --desktop argument.");
  const host = arguments_.map((argument) => valueOf(argument, "--host")).find(Boolean);
  const portText = arguments_.map((argument) => valueOf(argument, "--port")).find((value) => value !== undefined);
  const workspacePath = arguments_.map((argument) => valueOf(argument, "--workspace")).find(Boolean);
  const resourcesPath = arguments_.map((argument) => valueOf(argument, "--resources")).find(Boolean);
  const parentText = arguments_.map((argument) => valueOf(argument, "--parent-pid")).find(Boolean);
  const port = Number(portText);
  const parentProcessId = Number(parentText);
  if (host !== "127.0.0.1") throw new Error("Desktop host must be 127.0.0.1.");
  if (!Number.isInteger(port) || port < 0 || port > 65_535) throw new Error("Desktop port is invalid.");
  if (!workspacePath || !resourcesPath) throw new Error("Desktop workspace and resources paths are required.");
  if (!Number.isInteger(parentProcessId) || parentProcessId <= 0) throw new Error("Desktop parent process is invalid.");
  return { desktop: true, host, port, workspacePath: resolve(workspacePath), resourcesPath: resolve(resourcesPath), parentProcessId };
}

async function exists(path: string) {
  try { await stat(path); return true; } catch (error) {
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

export function isProcessAlive(processId: number) {
  try { process.kill(processId, 0); return true; } catch { return false; }
}

export function watchParentProcess(processId: number, onGone: () => void, intervalMs = 1_000, check = isProcessAlive) {
  let notified = false;
  const timer = setInterval(() => {
    if (notified || check(processId)) return;
    notified = true;
    clearInterval(timer);
    onGone();
  }, intervalMs);
  timer.unref?.();
  return () => clearInterval(timer);
}

export function formatWorkspaceReady(origin: string) {
  const url = new URL(origin);
  if (url.protocol !== "http:" || url.hostname !== "127.0.0.1" || !url.port) {
    throw new Error("Desktop readiness origin must be an HTTP loopback address with a port.");
  }
  return `WORKSPACE_READY ${JSON.stringify({ origin: url.origin })}\n`;
}
