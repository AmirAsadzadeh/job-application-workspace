import { useEffect, useState } from "react";
import { AlertTriangle, ArrowRight, X } from "lucide-react";
import type { WorkspaceCounts } from "@workspace/domain/workspacePackageSchema";

type Summary = { label: string; revision: number | null; counts: WorkspaceCounts };

function Counts({ value }: { value: WorkspaceCounts }) {
  return <dl className="sync-counts"><div><dt>Positions</dt><dd>{value.positions}</dd></div><div><dt>Questions</dt><dd>{value.questions}</dd></div><div><dt>Readings</dt><dd>{value.readings}</dd></div><div><dt>Files</dt><dd>{value.resumes + value.logos}</dd></div></dl>;
}

export function SynchronizationDialog({ open, source, destination, conflict, busy = false, onCancel, onConfirm }: { open: boolean; source: Summary; destination: Summary; conflict: boolean; busy?: boolean; onCancel: () => void; onConfirm: () => void }) {
  const [confirmed, setConfirmed] = useState(false);
  useEffect(() => { if (open) setConfirmed(false); }, [open]);
  if (!open) return null;
  return <div className="modal-backdrop"><section className="sync-dialog" role="dialog" aria-modal="true" aria-labelledby="sync-title">
    <header><h2 id="sync-title">Replace complete workspace</h2><button className="icon-button" type="button" onClick={onCancel} aria-label="Close synchronization"><X size={15} /></button></header>
    {conflict && <p className="sync-warning"><AlertTriangle size={15} />The destination changed after your last confirmed copy.</p>}
    <div className="sync-direction"><section><h3>{source.label}</h3><span>Revision {source.revision ?? "local"}</span><Counts value={source.counts} /></section><ArrowRight size={18} /><section><h3>{destination.label}</h3><span>Revision {destination.revision ?? "local"}</span><Counts value={destination.counts} /></section></div>
    <p>This replaces the entire destination. Records are not merged. A destination backup must succeed first.</p>
    <label className="checkbox-label"><input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} />I understand the complete destination will be overwritten.</label>
    <footer><button className="secondary-button" type="button" onClick={onCancel} disabled={busy}>Cancel</button><button className="danger-button" type="button" onClick={onConfirm} disabled={!confirmed || busy}>Confirm replacement</button></footer>
  </section></div>;
}
