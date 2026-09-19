export function validatedWebUrl(value: string) {
  const url = new URL(value);
  if (url.protocol !== "http:" && url.protocol !== "https:") throw new Error("Only HTTP or HTTPS links can be opened.");
  return url.href;
}

export async function openExternalUrl(value: string) {
  window.open(validatedWebUrl(value), "_blank", "noopener,noreferrer");
}

export async function saveWorkspacePackage(blob: Blob, suggestedName: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = suggestedName;
  anchor.click();
  URL.revokeObjectURL(url);
  return true;
}
