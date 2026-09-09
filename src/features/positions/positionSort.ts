import type { ListViewPreference, SortColumn } from "../../../shared/positionSchema";
import type { PositionSummary } from "./positionTypes";
import { workModeLabels } from "./positionTypes";

const collator = new Intl.Collator("en", { sensitivity: "base" });
const statusOrder = ["saved", "applied", "screening", "interviewing", "assignment", "paused", "offer", "rejected", "withdrawn"] as const;
const seniorityOrder = ["Intern", "Entry", "Associate", "Mid-level", "Senior", "Staff", "Lead", "Manager", "Director"] as const;

function compareColumn(left: PositionSummary, right: PositionSummary, column: SortColumn) {
  switch (column) {
    case "company": return collator.compare(left.company.name.trim(), right.company.name.trim());
    case "title": return collator.compare(left.title.trim(), right.title.trim());
    case "status": return statusOrder.indexOf(left.status) - statusOrder.indexOf(right.status);
    case "workMode": return collator.compare(workModeLabels[left.workMode], workModeLabels[right.workMode]);
    case "seniority": return seniorityOrder.indexOf(left.seniority) - seniorityOrder.indexOf(right.seniority);
    case "updatedAt": return Date.parse(left.updatedAt) - Date.parse(right.updatedAt);
  }
}

export function sortPositions(positions: readonly PositionSummary[], preference: ListViewPreference) {
  if (preference.mode === "manual") return positions;
  const direction = preference.direction === "asc" ? 1 : -1;
  return positions
    .map((position, index) => ({ position, index }))
    .sort((left, right) => {
      const result = compareColumn(left.position, right.position, preference.column);
      return result === 0 ? left.index - right.index : result * direction;
    })
    .map(({ position }) => position);
}

export function nextSortPreference(current: ListViewPreference, column: SortColumn): ListViewPreference {
  return {
    mode: "column",
    column,
    direction: current.mode === "column" && current.column === column && current.direction === "asc" ? "desc" : "asc",
  };
}
