import { DragDropProvider, type DragEndEvent } from "@dnd-kit/react";
import { isSortableOperation } from "@dnd-kit/react/sortable";
import { ArrowDown, ArrowUp, Briefcase, Download, FolderOpen, List, Plus, RotateCw, Search, SearchX, Upload } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { DEFAULT_LIST_VIEW, type ListViewPreference, type SortColumn } from "../../../../shared/positionSchema";
import { positionApi } from "../positionApi";
import { nextSortPreference, sortPositions } from "../positionSort";
import { positionStatuses, statusLabels, type PositionStatus, type PositionSummary } from "../positionTypes";
import { PositionRow } from "./PositionRow";
import { StatusHelp } from "./StatusHelp";
import { statusDefinitions } from "../positionTypes";
import { EmptyState } from "./EmptyState";
import { WorkspaceTransferDialog } from "./WorkspaceTransferDialog";
import { isDesktopApplication, openWorkspaceDataFolder, saveWorkspacePackage } from "../../../desktop/desktopBridge";

type ListApi = Pick<typeof positionApi, "listPositions" | "updateListView" | "reorderPosition" | "exportWorkspace" | "validateWorkspaceImport" | "cancelWorkspaceImport" | "restoreWorkspaceImport">;
type Props = { onOpen: (id: string) => void; onCreate?: () => void; api?: ListApi };
type StatusFilter = "all" | PositionStatus;

const columns: Array<{ key: SortColumn; label: string }> = [
  { key: "company", label: "Company" },
  { key: "title", label: "Position" },
  { key: "status", label: "Status" },
  { key: "workMode", label: "Work mode" },
  { key: "seniority", label: "Seniority" },
  { key: "updatedAt", label: "Updated" },
];

function moveItem(items: PositionSummary[], from: number, to: number) {
  const next = [...items];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

export function PositionList({ onOpen, onCreate = () => undefined, api = positionApi }: Props) {
  const [positions, setPositions] = useState<PositionSummary[]>([]);
  const [listView, setListView] = useState<ListViewPreference>(DEFAULT_LIST_VIEW);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [announcement, setAnnouncement] = useState("");
  const [reload, setReload] = useState(0);
  const [transferOpen, setTransferOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const listViewLoaded = useRef(false);

  useEffect(() => {
    let active = true;
    setState("loading");
    api.listPositions({ q: query, status: status === "all" ? undefined : status })
      .then((result) => {
        if (active) {
          setPositions(result.positions);
          if (!listViewLoaded.current) {
            setListView(result.listView);
            listViewLoaded.current = true;
          }
          setState("ready");
        }
      })
      .catch(() => { if (active) setState("error"); });
    return () => { active = false; };
  }, [api, query, status, reload]);

  const displayedPositions = useMemo(() => sortPositions(positions, listView), [positions, listView]);
  const hasFilters = Boolean(query.trim()) || status !== "all";
  const reorderReason = listView.mode !== "manual" ? "Use Manual order to reorder"
    : query.trim() ? "Clear search to reorder"
      : status !== "all" ? "Show all statuses to reorder"
        : saving ? "Saving order"
          : positions.length < 2 ? "At least two positions are needed"
            : "";
  const reorderEnabled = reorderReason === "";

  async function saveListView(next: ListViewPreference) {
    if (saving || JSON.stringify(next) === JSON.stringify(listView)) return;
    const previous = listView;
    setListView(next);
    setMessage("");
    setSaving(true);
    try {
      setListView(await api.updateListView(next));
    } catch {
      setListView(previous);
      setMessage("Could not save list order. Previous order restored.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDragEnd(event: DragEndEvent) {
    if (!reorderEnabled || !isSortableOperation(event.operation)) return;
    const source = event.operation.source;
    if (!source) return;
    const from = source.initialIndex;
    const to = source.index;
    if (from === to || from < 0 || to < 0) return;
    const previous = positions;
    const next = moveItem(positions, from, to);
    const moved = next[to];
    const beforePositionId = next[to + 1]?.id ?? null;
    setPositions(next);
    setMessage("");
    setSaving(true);
    try {
      setPositions(await api.reorderPosition({ positionId: moved.id, beforePositionId }));
      setAnnouncement(`${moved.title} moved to position ${to + 1}.`);
    } catch {
      setPositions(previous);
      setMessage("Could not save manual order. Previous order restored.");
      setAnnouncement("Manual order was not saved.");
    } finally {
      setSaving(false);
    }
  }

  async function handleExport() {
    setExporting(true); setMessage("");
    try {
      const exported = await api.exportWorkspace();
      const saved = await saveWorkspacePackage(exported.blob, exported.fileName);
      setAnnouncement(saved ? "Workspace export saved." : "Workspace export cancelled.");
    } catch { setMessage("Could not export the workspace."); setAnnouncement("Workspace export failed."); }
    finally { setExporting(false); }
  }

  async function handleOpenDataFolder() {
    setMessage("");
    try { await openWorkspaceDataFolder(); }
    catch { setMessage("Could not open the workspace data folder."); }
  }

  return (
    <>
      <section className="toolbar" aria-label="Position tools">
        <label className="search-field">
          <Search size={15} aria-hidden="true" />
          <span className="sr-only">Search positions</span>
          <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search title, department, manager, location" />
        </label>
        <div className="status-filter">
          <label><span>Status</span><select aria-label="Filter by status" value={status} onChange={(event) => setStatus(event.target.value as StatusFilter)}><option value="all">All statuses</option>{positionStatuses.map((value) => <option key={value} value={value}>{statusLabels[value]}</option>)}</select></label>
          <StatusHelp label="Overall status definitions" definitions={positionStatuses.map((value) => ({ value, label: statusLabels[value], description: statusDefinitions[value] }))} />
        </div>
        <button className="secondary-button manual-order-button" type="button" aria-pressed={listView.mode === "manual"} onClick={() => void saveListView(DEFAULT_LIST_VIEW)} disabled={saving} title="Use saved manual order"><List size={14} /> Manual order</button>
        <div className="transfer-tools">
          <button className="icon-button" type="button" aria-label="Export workspace" title="Export workspace" disabled={exporting} onClick={() => void handleExport()}><Download size={15} /></button>
          <button className="icon-button" type="button" aria-label="Import workspace" title="Import workspace" onClick={() => setTransferOpen(true)}><Upload size={15} /></button>
          {isDesktopApplication() && <button className="icon-button" type="button" aria-label="Open workspace data folder" title="Open workspace data folder" onClick={() => void handleOpenDataFolder()}><FolderOpen size={15} /></button>}
        </div>
        {!(state === "ready" && positions.length === 0 && !hasFilters) && <button className="primary-button create-position-button" type="button" onClick={onCreate}><Plus size={15} /> New position</button>}
      </section>
      {message && <div className="list-message error-text" role="alert">{message}</div>}
      <div className="sr-only" role="status" aria-live="polite">{announcement}</div>
      <section className="list-frame" aria-label="Positions">
        <div className="position-grid-header">
          <span aria-hidden="true" />
          {columns.map(({ key, label }) => {
            const active = listView.mode === "column" && listView.column === key;
            const nextDirection = active && listView.direction === "asc" ? "descending" : "ascending";
            return (
              <button key={key} type="button" aria-label={`Sort ${label} ${nextDirection}`} aria-pressed={active} onClick={() => void saveListView(nextSortPreference(listView, key))} disabled={saving}>
                <span>{label}</span>
                {active && (listView.direction === "asc" ? <ArrowUp size={12} aria-hidden="true" /> : <ArrowDown size={12} aria-hidden="true" />)}
              </button>
            );
          })}
        </div>
        {state === "loading" && <div className="notice" role="status">Loading positions...</div>}
        {state === "error" && <div className="notice error-notice"><strong>Could not load positions</strong><button type="button" onClick={() => setReload((value) => value + 1)}><RotateCw size={14} /> Retry</button></div>}
        {state === "ready" && positions.length === 0 && (hasFilters
          ? <EmptyState icon={SearchX} className="list-empty-state" message="No matching positions" actionLabel="Clear filters" onAction={() => { setQuery(""); setStatus("all"); }} />
          : <EmptyState icon={Briefcase} className="list-empty-state" message="No positions yet" actionLabel="New position" onAction={onCreate} />)}
        {state === "ready" && <DragDropProvider onDragEnd={handleDragEnd}>
          {displayedPositions.map((position, index) => <PositionRow key={position.id} position={position} index={index} reorderEnabled={reorderEnabled} reorderReason={reorderReason} onOpen={onOpen} />)}
        </DragDropProvider>}
      </section>
      <WorkspaceTransferDialog open={transferOpen} onClose={() => setTransferOpen(false)} onRestored={() => { setReload((value) => value + 1); setAnnouncement("Workspace restored and positions reloaded."); }} api={api} />
    </>
  );
}
