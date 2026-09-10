type TauriWindow = Window & { __TAURI_INTERNALS__?: unknown };

export function isDesktopApplication() {
  return Boolean((window as TauriWindow).__TAURI_INTERNALS__);
}

function validatedWebUrl(value: string) {
  const url = new URL(value);
  if (url.protocol !== "http:" && url.protocol !== "https:") throw new Error("Only HTTP or HTTPS links can be opened.");
  return url.href;
}

export async function openExternalUrl(value: string) {
  const url = validatedWebUrl(value);
  if (isDesktopApplication()) {
    const { openUrl } = await import("@tauri-apps/plugin-opener");
    await openUrl(url);
    return;
  }
  window.open(url, "_blank", "noopener,noreferrer");
}

export async function openWorkspaceDataFolder() {
  if (!isDesktopApplication()) return false;
  const { invoke } = await import("@tauri-apps/api/core");
  await invoke("reveal_workspace");
  return true;
}

export async function chooseWorkspaceZip() {
  if (!isDesktopApplication()) return null;
  const [{ open }, { readFile }] = await Promise.all([import("@tauri-apps/plugin-dialog"), import("@tauri-apps/plugin-fs")]);
  const selected = await open({ multiple: false, directory: false, filters: [{ name: "Workspace ZIP", extensions: ["zip"] }] });
  if (!selected || Array.isArray(selected)) return null;
  const bytes = await readFile(selected);
  const name = selected.split(/[\\/]/).pop() ?? "workspace.zip";
  return new File([bytes], name, { type: "application/zip" });
}

export async function saveWorkspacePackage(blob: Blob, suggestedName: string) {
  if (isDesktopApplication()) {
    const [{ save }, { writeFile }] = await Promise.all([import("@tauri-apps/plugin-dialog"), import("@tauri-apps/plugin-fs")]);
    const selected = await save({ defaultPath: suggestedName, filters: [{ name: "Workspace ZIP", extensions: ["zip"] }] });
    if (!selected) return false;
    await writeFile(selected, new Uint8Array(await blob.arrayBuffer()));
    return true;
  }
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = suggestedName;
  anchor.click();
  URL.revokeObjectURL(url);
  return true;
}
