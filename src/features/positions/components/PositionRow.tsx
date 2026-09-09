import { useSortable } from "@dnd-kit/react/sortable";
import { GripVertical } from "lucide-react";
import { useState } from "react";
import type { PositionSummary } from "../positionTypes";
import { statusLabels, workModeLabels } from "../positionTypes";

type Props = {
  position: PositionSummary;
  onOpen: (id: string) => void;
  index?: number;
  reorderEnabled?: boolean;
  reorderReason?: string;
};

export function PositionRow({ position, onOpen, index = 0, reorderEnabled = false, reorderReason = "Manual reordering is unavailable" }: Props) {
  const [logoFailed, setLogoFailed] = useState(false);
  const { ref, handleRef, isDragging } = useSortable({ id: position.id, index, disabled: !reorderEnabled });
  const initial = position.company.name.trim().charAt(0).toLocaleUpperCase() || "?";
  const logoSource = position.company.logoUrl ?? position.company.logoPath;
  const updated = new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(new Date(position.updatedAt));
  const actionName = `${position.title} at ${position.company.name}`;

  return (
    <div ref={ref} className={`position-row-shell${isDragging ? " dragging" : ""}`}>
      <button ref={handleRef} className="reorder-handle" type="button" aria-label={`Move ${actionName}`} title={reorderEnabled ? `Move ${actionName}` : reorderReason} disabled={!reorderEnabled}>
        <GripVertical size={14} aria-hidden="true" />
      </button>
      <button className="position-row" type="button" onClick={() => onOpen(position.id)} aria-label={`Open ${actionName}`}>
        <span className="company-cell">
          <span className="company-logo" aria-hidden="true">
            {logoSource && !logoFailed ? <img src={logoSource} alt="" onError={() => setLogoFailed(true)} /> : initial}
          </span>
          <span className="truncate">{position.company.name}</span>
        </span>
        <span className="truncate position-title">{position.title}</span>
        <span><span className={`status status-${position.status}`}>{statusLabels[position.status]}</span></span>
        <span className="truncate muted">{workModeLabels[position.workMode]}</span>
        <span className="truncate muted">{position.seniority}</span>
        <time className="muted" dateTime={position.updatedAt}>{updated}</time>
      </button>
    </div>
  );
}
