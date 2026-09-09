# MVP And Architecture

## MVP Scope

The first version should be a complete positions workflow, not a partial shell. It should support listing, creating, viewing, editing, deleting, filtering, and changing status for job positions.

## Recommended First Stack

Because the current workspace is blank, a practical default would be:

- React with TypeScript
- Vite
- A small component layer built locally
- File-backed JSON persistence for the first vertical slices
- Optional later move to a database

This keeps the project fast to start and suitable for frontend interview practice while still allowing clean architecture boundaries.

## Domain Model

```ts
type PositionStatus = "draft" | "open" | "interviewing" | "on_hold" | "closed";

type WorkMode = "remote" | "hybrid" | "onsite";

type EmploymentType = "full_time" | "part_time" | "contract" | "internship";

type JobPosition = {
  id: string;
  title: string;
  department: string;
  location: string;
  workMode: WorkMode;
  employmentType: EmploymentType;
  seniority: string;
  status: PositionStatus;
  salaryMin?: number;
  salaryMax?: number;
  description: string;
  requirements: string;
  hiringManager: string;
  createdAt: string;
  updatedAt: string;
};
```

## Suggested App Structure

```txt
src/
  app/
    App.tsx
  features/
    positions/
      components/
      data/
      domain/
      pages/
      positionRepository.ts
      positionTypes.ts
  shared/
    components/
    utils/
server/
  data/
    positions.json
  routes/
    positions.ts
```

## Architecture Decisions

- Keep position domain types separate from UI components.
- Store MVP data in local JSON files through a small filesystem-backed repository or server API.
- Keep persistence behind a repository boundary so JSON files can be replaced by a database later.
- Use controlled forms with explicit validation.
- Keep filters in URL search params if routing is added; otherwise keep them in component state for MVP.
- Avoid global state until the app needs cross-feature coordination.

## Later Extension Points

- Candidate pipeline per position.
- Interview stages and scorecards.
- Team members and role-based permissions.
- Backend API.
- Analytics such as time open, roles by department, and closure reasons.
