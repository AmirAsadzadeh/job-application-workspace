import { useEffect, useState } from "react";
import { LogOut, RefreshCw, Trash2, X } from "lucide-react";
import { authClient } from "../auth/authClient";
import { SignOutGuard } from "../auth/SignOutGuard";

type AccountSession = {
  id: string;
  createdAt: string;
  updatedAt: string;
  expiresAt: string;
  ipAddress: string | null;
  userAgent: string | null;
  current: boolean;
};

export function AccountPanel({ onClose, pendingChanges = false, onUploadPending, onDiscardPending }: { onClose: () => void; pendingChanges?: boolean; onUploadPending?: () => Promise<void>; onDiscardPending?: () => Promise<void> }) {
  const [sessions, setSessions] = useState<AccountSession[]>([]);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [signOutGuardOpen, setSignOutGuardOpen] = useState(false);

  async function load() {
    setBusy(true);
    try {
      const response = await fetch("/api/account/sessions", { credentials: "include", cache: "no-store" });
      if (!response.ok) throw new Error("Could not load sessions.");
      setSessions((await response.json()).sessions);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not load sessions.");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => { void load(); }, []);

  async function revoke(id: string) {
    const response = await fetch(`/api/account/sessions/${encodeURIComponent(id)}`, { method: "DELETE", credentials: "include" });
    if (!response.ok) { setMessage("Could not revoke that session."); return; }
    await load();
  }

  async function deleteAccount() {
    const password = window.prompt("Enter your password to permanently delete Online account data. Offline data will remain on this device.");
    if (password === null) return;
    if (!window.confirm("Permanently delete this account and its Online workspace? This cannot be undone.")) return;
    const response = await fetch("/api/account", { method: "DELETE", credentials: "include", headers: { "content-type": "application/json" }, body: JSON.stringify({ password }) });
    if (!response.ok) { setMessage("Account deletion was not completed. Sign in again and verify your password."); return; }
    window.location.assign("/");
  }

  async function signOut(resolvePending?: () => Promise<void>) {
    if (pendingChanges && !resolvePending) { setSignOutGuardOpen(true); return; }
    setBusy(true);
    setMessage("");
    try {
      await resolvePending?.();
      await authClient.signOut();
      setSignOutGuardOpen(false);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Sign out was not completed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="account-panel" aria-labelledby="account-title">
      <header><h2 id="account-title">Account and sessions</h2><button className="icon-button" type="button" onClick={onClose} aria-label="Close account panel"><X size={15} /></button></header>
      <p>Online mode stores your positions and managed files in your private account workspace. Offline data on this device remains independent.</p>
      <div className="account-heading"><h3>Active sessions</h3><button className="icon-button" type="button" onClick={() => void load()} disabled={busy} aria-label="Refresh sessions"><RefreshCw size={14} /></button></div>
      <ul className="session-list">
        {sessions.map((item) => <li key={item.id}><span><strong>{item.current ? "This session" : "Signed-in session"}</strong><small>{item.userAgent ?? "Unknown device"} · expires {new Date(item.expiresAt).toLocaleDateString()}</small></span><button className="secondary-button" type="button" onClick={() => void revoke(item.id)}>Revoke</button></li>)}
      </ul>
      {message && <p role="status">{message}</p>}
      <footer><button className="secondary-button" type="button" onClick={() => void signOut()}><LogOut size={14} />Sign out</button><button className="danger-button" type="button" onClick={() => void deleteAccount()}><Trash2 size={14} />Delete account</button></footer>
      <SignOutGuard open={signOutGuardOpen} busy={busy} error={message} onCancel={() => setSignOutGuardOpen(false)} onUpload={() => void signOut(onUploadPending ?? (async () => { throw new Error("Review and upload pending changes before signing out."); }))} onDiscard={() => void signOut(onDiscardPending ?? (async () => { throw new Error("The local working copy could not be discarded."); }))} />
    </section>
  );
}
