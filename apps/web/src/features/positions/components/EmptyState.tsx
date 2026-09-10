import type { LucideIcon } from "lucide-react";
import type { Ref } from "react";

type Props = {
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  actionRef?: Ref<HTMLButtonElement>;
  className?: string;
  icon: LucideIcon;
};

export function EmptyState({ message, actionLabel, onAction, actionRef, className = "", icon: Icon }: Props) {
  return <div className={`empty-state ${className}`.trim()} role="status">
    <span className="empty-state-message"><span className="empty-state-icon-frame"><Icon className="empty-state-icon" size={15} strokeWidth={1.7} aria-hidden="true" /></span><span>{message}</span></span>
    {actionLabel && onAction && <button ref={actionRef} className="secondary-button" type="button" onClick={onAction}>{actionLabel}</button>}
  </div>;
}
