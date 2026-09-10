import { AlertTriangle, CloudUpload, LogOut, X } from "lucide-react";

export function SignOutGuard({ open, busy = false, error = "", onUpload, onDiscard, onCancel }: {
  open: boolean;
  busy?: boolean;
  error?: string;
  onUpload: () => void;
  onDiscard: () => void;
  onCancel: () => void;
}) {
  if (!open) return null;
  return <div className="modal-backdrop">
    <section className="sync-dialog" role="dialog" aria-modal="true" aria-labelledby="sign-out-guard-title">
      <header><h2 id="sign-out-guard-title">Pending Online changes</h2><button className="icon-button" type="button" onClick={onCancel} disabled={busy} aria-label="Cancel sign out"><X size={15} /></button></header>
      <p className="sync-warning"><AlertTriangle size={15} />This device has changes that have not been stored Online.</p>
      <p>Upload them before signing out, discard this account&apos;s local working copy, or stay signed in.</p>
      {error && <p role="alert">{error}</p>}
      <footer>
        <button className="secondary-button" type="button" onClick={onCancel} disabled={busy}>Cancel</button>
        <button className="danger-button" type="button" onClick={onDiscard} disabled={busy}><LogOut size={14} />Discard and sign out</button>
        <button className="primary-button" type="button" onClick={onUpload} disabled={busy}><CloudUpload size={14} />Upload and sign out</button>
      </footer>
    </section>
  </div>;
}
