import { X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { WorkspacePreview, WorkspaceRestoreResult } from "@workspace/domain/workspacePackageSchema";
import { positionApi, PositionApiError } from "../positionApi";
import { chooseWorkspaceZip, isDesktopApplication } from "../../../desktop/desktopBridge";

type TransferApi = Pick<typeof positionApi, "validateWorkspaceImport" | "cancelWorkspaceImport" | "restoreWorkspaceImport">;
type Props = { open: boolean; onClose: () => void; onRestored: (result: WorkspaceRestoreResult) => void; api?: TransferApi };
type Stage = "select" | "validating" | "preview" | "confirm" | "restoring" | "success" | "error";

export function WorkspaceTransferDialog({ open, onClose, onRestored, api = positionApi }: Props) {
  const [stage, setStage] = useState<Stage>("select"); const [preview, setPreview] = useState<WorkspacePreview | null>(null); const [result, setResult] = useState<WorkspaceRestoreResult | null>(null); const [error, setError] = useState("");
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => { if (open) closeRef.current?.focus(); }, [open]);
  if (!open) return null;

  async function selectFile(file?: File) {
    if (!file) return; setStage("validating"); setError("");
    try { setPreview(await api.validateWorkspaceImport(file)); setStage("preview"); }
    catch (cause) { setError(cause instanceof PositionApiError ? cause.message : "Could not validate this workspace package."); setStage("error"); }
  }
  async function selectDesktopFile() {
    try { await selectFile((await chooseWorkspaceZip()) ?? undefined); }
    catch { setError("Could not read the selected workspace package."); setStage("error"); }
  }
  async function close() { if (preview && stage !== "success" && stage !== "restoring") await api.cancelWorkspaceImport(preview.importId).catch(() => undefined); onClose(); }
  async function restore() {
    if (!preview) return; setStage("restoring"); setError("");
    try { const restored = await api.restoreWorkspaceImport(preview.importId); setResult(restored); setStage("success"); onRestored(restored); }
    catch (cause) { setError(cause instanceof PositionApiError ? cause.message : "Could not restore the workspace. Your previous data was retained."); setStage("error"); }
  }
  const counts = preview?.counts;
  return <div className="dialog-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget && stage !== "restoring") void close(); }}>
    <section className="transfer-dialog" role="dialog" aria-modal="true" aria-labelledby="transfer-title" onKeyDown={(event) => { if (event.key === "Escape" && stage !== "restoring") void close(); }}>
      <header><h2 id="transfer-title">Import workspace</h2><button ref={closeRef} className="icon-button" type="button" aria-label="Close import" title="Close" disabled={stage === "restoring"} onClick={() => void close()}><X size={16} /></button></header>
      {stage === "select" && <div className="transfer-body"><p>Select a workspace ZIP exported by this app.</p>{isDesktopApplication()
        ? <button className="primary-button" type="button" onClick={() => void selectDesktopFile()}>Choose ZIP</button>
        : <label className="primary-button file-button">Choose ZIP<input aria-label="Workspace ZIP" type="file" accept=".zip,application/zip" onChange={(event) => void selectFile(event.target.files?.[0])} /></label>}</div>}
      {stage === "validating" && <div className="transfer-body" role="status">Validating package...</div>}
      {stage === "preview" && preview && counts && <div className="transfer-body"><p><strong>{preview.sourceFileName}</strong></p><div className="transfer-counts"><span>{counts.positions} positions</span><span>{counts.questions} questions</span><span>{counts.readings} readings</span><span>{counts.platformLinks} platform links</span><span>{counts.resumes} resumes</span><span>{counts.logos} logos</span></div><p className="warning-text">Continuing will replace the complete current workspace.</p><footer><button className="secondary-button" type="button" onClick={() => void close()}>Cancel</button><button className="primary-button" type="button" onClick={() => setStage("confirm")}>Continue</button></footer></div>}
      {stage === "confirm" && <div className="transfer-body"><p className="warning-text"><strong>Replace the current workspace?</strong></p><p>A complete backup will be created first. Imported data will replace, not merge with, current data.</p><footer><button className="secondary-button" type="button" onClick={() => setStage("preview")}>Back</button><button className="danger-button" type="button" onClick={() => void restore()}>Replace workspace</button></footer></div>}
      {stage === "restoring" && <div className="transfer-body" role="status">Creating backup and restoring workspace...</div>}
      {stage === "error" && <div className="transfer-body"><p className="error-text" role="alert">{error}</p><footer><button className="secondary-button" type="button" onClick={() => void close()}>Cancel</button><button className="primary-button" type="button" onClick={() => { setPreview(null); setStage("select"); }}>Try again</button></footer></div>}
      {stage === "success" && result && <div className="transfer-body"><p role="status">Workspace restored.</p><p>Recovery backup: <code>{result.backup.relativePath}</code></p><footer><button className="primary-button" type="button" onClick={onClose}>Done</button></footer></div>}
    </section>
  </div>;
}
