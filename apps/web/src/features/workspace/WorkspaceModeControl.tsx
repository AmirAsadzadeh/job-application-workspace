import { Cloud, HardDrive } from "lucide-react";

export function WorkspaceModeControl({ mode, accountLabel, disabled = false, onChange }: { mode: "offline" | "online"; accountLabel?: string; disabled?: boolean; onChange: (mode: "offline" | "online") => void }) {
  return <div className="workspace-mode-control" aria-label="Workspace mode">
    <button type="button" aria-pressed={mode === "offline"} disabled={disabled} onClick={() => onChange("offline")}><HardDrive size={13} />Offline</button>
    <button type="button" aria-pressed={mode === "online"} disabled={disabled} onClick={() => onChange("online")}><Cloud size={13} />Online{mode === "online" && accountLabel ? <span>{accountLabel}</span> : null}</button>
  </div>;
}
