import { CircleHelp, X } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";

type Definition = { value: string; label: string; description: string };
type Props = { label: string; definitions: Definition[] };

export function StatusHelp({ label, definitions }: Props) {
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const panelId = useId();

  function close() {
    setOpen(false);
    requestAnimationFrame(() => trigger.current?.focus());
  }

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        close();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  return (
    <span className="status-help">
      <button ref={trigger} className="icon-button status-help-trigger" type="button" aria-label={label} aria-expanded={open} aria-controls={panelId} onClick={() => setOpen((value) => !value)}>
        <CircleHelp size={15} aria-hidden="true" />
      </button>
      {open && (
        <span id={panelId} className="status-help-panel" role="dialog" aria-label={label}>
          <span className="status-help-heading">Status definitions</span>
          <button className="icon-button status-help-close" type="button" aria-label="Close status definitions" onClick={close}><X size={14} /></button>
          <dl>{definitions.map((definition) => <div key={definition.value}><dt>{definition.label}</dt><dd>{definition.description}</dd></div>)}</dl>
        </span>
      )}
    </span>
  );
}
