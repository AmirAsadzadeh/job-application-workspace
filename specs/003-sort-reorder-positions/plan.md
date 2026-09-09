# Implementation Plan: Sort and Reorder Positions

**Branch**: `003-sort-reorder-positions` | **Date**: 2026-09-08 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/003-sort-reorder-positions/spec.md`

## Summary

Add stable client-side sorting for every visible position-list column and a compact Manual order mode with pointer and keyboard row reordering. Keep the positions-array sequence as the canonical manual order and add a versioned list-view preference that persists Manual or column mode plus column direction. Persist view changes and anchor-based row moves through the existing local-file repository write queue so concurrent additions are preserved. Refactor each list row into separate drag-handle and open-position controls without increasing row height.

## Technical Context

**Language/Version**: TypeScript 5.8, React 19, Node.js 24
**Primary Dependencies**: React, Zod, Lucide React, dnd-kit React sortable packages
**Storage**: Project-local `data/positions.json`; version 4 adds `listView` while array order remains canonical Manual order
**Testing**: Vitest 5, Testing Library, jsdom, repository/API integration tests, browser visual checks
**Target Platform**: Local desktop web application with responsive support down to 390 CSS pixels
**Project Type**: React frontend with a local Node.js HTTP server and shared schemas
**Performance Goals**: Sort or reorder 1,000 positions with visible completion in under one second
**Constraints**: Compact dark UI, no browser persistent storage, no lost/duplicated records, no row-height increase, keyboard-accessible reordering, atomic local-file writes
**Scale/Scope**: One positions list, six sortable columns, one saved manual sequence, up to 1,000 records in acceptance testing

## Constitution Check

*GATE: Passed before Phase 0 research and re-checked after Phase 1 design.*

- **Specifications are source of truth**: PASS. The plan maps only to approved Journey 3 requirements.
- **Explicit approval gates**: PASS. Specification approval and planning approval were separate. Tasks and implementation remain uncreated and unapproved.
- **Small, testable journey**: PASS. Sorting and reordering form one independently testable list-organization journey.
- **Quiet, scannable UX**: PASS. Sort indicators, Manual order, and the handle remain compact; row data and height stay unchanged.
- **Local, human-readable data**: PASS. Manual order reuses the JSON array sequence and list-view state is added as readable metadata; no browser storage or new persistent service is introduced.
- **Architecture and quality**: PASS. Shared validation, repository queue, API client, focused tests, performance checks, and responsive visual checks follow existing boundaries.

Post-design re-check: PASS. A strict version 3-to-4 migration adds the approved list-view metadata without changing position records or sequence. The anchor-based contract and UI contract protect concurrency, row density, keyboard use, failure recovery, and filtered-state behavior.

## Project Structure

### Documentation (this feature)

```text
specs/003-sort-reorder-positions/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── reorder-position-api.yaml
│   ├── list-view-api.yaml
│   └── sort-reorder-ui.md
└── tasks.md                 # Created only after separate task-generation approval
```

### Source Code (repository root)

```text
shared/
├── positionSchema.ts
└── positionSchema.test.ts

server/
├── index.ts
├── index.test.ts
├── positionsRepository.ts
├── positionsRepository.test.ts
└── positionsPerformance.test.ts

src/
├── app/
│   └── App.tsx
├── features/positions/
│   ├── positionApi.ts
│   ├── positionApi.test.ts
│   ├── positionSort.ts
│   ├── positionSort.test.ts
│   ├── positionTypes.ts
│   └── components/
│       ├── PositionList.tsx
│       ├── PositionList.test.tsx
│       ├── PositionList.performance.test.tsx
│       ├── PositionRow.tsx
│       └── PositionRow.test.tsx
└── styles.css

data/
└── positions.json
```

**Structure Decision**: Extend the existing shared-schema, repository, HTTP, feature-client, component, and colocated-test structure. Add only a focused sort utility and document-level list-view metadata; do not introduce a new state layer or alter the individual position record shape.

## Complexity Tracking

No constitution violations require justification.
