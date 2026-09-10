import type { DesktopCredentialVault } from "../features/auth/desktopAuth";

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

export async function registerDesktopAuthorization(input: { state: string; issuer: string; expiresAt: string }) {
  if (!isDesktopApplication()) throw new Error("Desktop authorization is only available in the installed application.");
  const { invoke } = await import("@tauri-apps/api/core");
  await invoke("register_auth_attempt", { state: input.state, issuer: input.issuer, expiresAtEpochMs: Date.parse(input.expiresAt) });
}

export async function waitForDesktopAuthorizationCallback() {
  if (!isDesktopApplication()) throw new Error("Desktop authorization is only available in the installed application.");
  const { once } = await import("@tauri-apps/api/event");
  return new Promise<string>((resolve, reject) => {
    let settled = false;
    const listeners: Array<Promise<() => void>> = [];
    const finish = (action: () => void) => {
      if (settled) return;
      settled = true;
      void Promise.allSettled(listeners).then((results) => {
        for (const result of results) if (result.status === "fulfilled") result.value();
        action();
      });
    };
    listeners.push(once<string>("desktop-auth-callback", (event) => finish(() => resolve(event.payload))));
    listeners.push(once<string>("desktop-auth-error", (event) => finish(() => reject(new Error(event.payload)))));
    void Promise.all(listeners).catch(reject);
  });
}

async function invokeDesktopCredential<T>(command: string, accountId: string, issuer: string, credential?: string) {
  if (!isDesktopApplication()) throw new Error("Protected credentials are only available in the installed application.");
  const { invoke } = await import("@tauri-apps/api/core");
  return invoke<T>(command, { accountId, issuer, ...(credential === undefined ? {} : { credential }) });
}

export function createDesktopCredentialVault(): DesktopCredentialVault {
  return {
    registerAuthorization: registerDesktopAuthorization,
    waitForCallback: waitForDesktopAuthorizationCallback,
    saveRefreshCredential: (accountId, issuer, credential) => invokeDesktopCredential<void>("save_refresh_credential", accountId, issuer, credential),
    readRefreshCredential: (accountId, issuer) => invokeDesktopCredential<string | null>("read_refresh_credential", accountId, issuer),
    deleteRefreshCredential: (accountId, issuer) => invokeDesktopCredential<void>("delete_refresh_credential", accountId, issuer),
  };
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
