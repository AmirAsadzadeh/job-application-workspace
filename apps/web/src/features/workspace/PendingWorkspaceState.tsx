import { CloudOff, RefreshCw, WifiOff } from "lucide-react";

export function PendingWorkspaceState({ pending, connected, conflict, onReview }: { pending: boolean; connected: boolean; conflict: boolean; onReview: () => void }) {
  if (!pending) return null;
  return <div className={`pending-workspace ${conflict ? "conflict" : ""}`} role="status">
    {connected ? <RefreshCw size={14} /> : <WifiOff size={14} />}
    <span>{conflict ? "Online changed; review replacement" : connected ? "Local changes ready for review" : "Saved locally; Online unavailable"}</span>
    <button className="secondary-button" type="button" onClick={onReview}><CloudOff size={14} />Review</button>
  </div>;
}
