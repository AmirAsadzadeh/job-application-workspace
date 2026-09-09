# Implementation Plan: Personal Application Statuses

**Branch**: `004-application-statuses` | **Date**: 2026-09-08 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/004-application-statuses/spec.md`

## Summary

Replace vacancy-oriented position statuses with the approved personal application workflow, make the overall status editable, and add optional status/date metadata to each existing platform and career-page channel. Advance the position from Saved to Applied only when a saved channel proves an application exists. Persist the change through a lossless version 5 migration and the existing atomic position-detail update path. Keep the list compact by replacing the expanded status-tab set with a small filter menu and adjacent status-help control.

## Technical Context

**Language/Version**: TypeScript 5.8, React 19, Node.js 24-compatible ES2023

**Primary Dependencies**: React, Zod 4, Lucide React, existing native HTTP server and Vite build

**Storage**: Local `data/positions.json`, advanced from document version 4 to version 5 through the shared normalizer

**Testing**: Vitest 5, Testing Library, jsdom, repository/API integration tests, and live browser inspection

**Target Platform**: Local desktop web application with keyboard support and responsive behavior down to 390 CSS pixels

**Project Type**: Single web application with React frontend, Node HTTP API, and file-backed repository

**Performance Goals**: Status filtering and sorting remain visibly complete within one second for 1,000 positions; a detail save performs one queued atomic document write

**Constraints**: No browser persistent storage, no remote service, no new dependency, no application-history timeline, no additional compact-row fields, and no loss or reordering during migration

**Scale/Scope**: One user, one local positions document, up to 1,000 positions, multiple platform links per position, and one career-page channel per position

## Constitution Check

*GATE: Passed before research and re-checked after design.*

- **Specifications are the source of truth**: PASS. The approved specification defines exact statuses, mappings, channel states, automatic advancement, and exclusions.
- **Explicit approval gates**: PASS. Only planning artifacts are changed in this phase; tasks and implementation require separate approvals.
- **Small, testable user journeys**: PASS. This journey corrects application tracking and explicitly leaves interview questions for the next feature.
- **Quiet, scannable user experience**: PASS. The design retains thin rows, uses a compact filter menu, and presents definitions on demand.
- **Local, human-readable data**: PASS. Version 5 remains local JSON and uses the existing queued atomic file replacement.
- **Architecture and accessibility constraints**: PASS. Existing schemas, repository, API, components, focus patterns, tests, and responsive rules are extended without a parallel subsystem.

Post-design check: PASS. Research and design introduce no constitutional exception or additional persistent store.

## Project Structure

### Documentation (this feature)

```text
specs/004-application-statuses/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── application-status-api.md
└── tasks.md                     # Created only after separate approval
```

### Source Code (repository root)

```text
data/
└── positions.json

shared/
├── positionSchema.ts
└── positionSchema.test.ts

server/
├── index.ts
├── index.test.ts
├── positionsRepository.ts
└── positionsRepository.test.ts

src/features/positions/
├── positionApi.ts
├── positionSort.ts
├── positionSort.test.ts
├── positionTypes.ts
└── components/
    ├── PositionCreateRoute.tsx
    ├── PositionCreateRoute.test.tsx
    ├── PositionDetailsRoute.tsx
    ├── PositionDetailsRoute.test.tsx
    ├── PositionList.tsx
    ├── PositionList.test.tsx
    ├── PositionRow.tsx
    ├── PublicationLinksEditor.tsx
    ├── PublicationLinksEditor.test.tsx
    ├── StatusHelp.tsx
    └── StatusHelp.test.tsx

src/styles.css
tests/setup.ts
```

**Structure Decision**: Extend the existing position feature vertically. Shared validation owns persisted shapes and migration, the repository owns atomic writes and automatic status advancement, the existing PATCH endpoint remains the write boundary, and position components own compact presentation and status help.

## Implementation Phases

### Phase 1 - Version 5 Domain Foundation

1. Write failing shared-schema tests for all new enums, channel metadata, real non-future calendar dates, strict inputs, and migrations from versions 1 through 4.
2. Separate legacy vacancy status validation from the new overall status schema so historical documents remain readable.
3. Add version 5 position fields and normalize every historical version through the approved mapping while preserving position order, list-view preference, and all unrelated fields.
4. Migrate the checked-in document only after a test compares identity, order, and every non-status field before and after normalization.

### Phase 2 - Repository and API Behavior

1. Extend position-detail updates with overall status and channel metadata.
2. Validate application dates against the repository's injectable clock.
3. During the same queued create or update, advance Saved to Applied when any channel is Applied, Viewed, or Contacted; never change another overall status automatically.
4. Return the authoritative updated position so the form reflects automatic advancement.
5. Reuse `PATCH /api/positions/:id`; update request validation and stable error tests without adding an endpoint.

### Phase 3 - Compact Status Experience

1. Replace old labels, definitions, filter options, badge styles, and sort ranking with the nine approved overall statuses.
2. Change the list's status tabs to a labeled compact menu with an adjacent help control so all values remain findable without expanding the toolbar.
3. Add an overall-status selector to the position detail form and show Saved as the fixed default on the creation form.
4. Extend each platform row and the career-page area with optional channel status and application date controls.
5. Suggest today's local date when Applied is chosen and no date exists; keep it editable and clearable.
6. Add a reusable on-demand StatusHelp control for overall and channel definitions, using native keyboard behavior and returning focus to its trigger when dismissed.
7. Preserve the existing compact row columns, 38-pixel row height, dark palette, and internal mobile overflow behavior.

### Phase 4 - Verification

1. Run schema, repository, API, sorting, creation, detail, publication-link, help, list, and regression tests.
2. Verify failed saves preserve form input and persisted bytes.
3. Verify version 4 migration preserves 13 unique position IDs, canonical order, and list-view mode before updating the checked-in file.
4. Run the complete test suite, performance suite, production build, and local-storage search.
5. Inspect status filtering, help, edit persistence, automatic advancement, and channel controls at desktop and 390-pixel widths.

## Complexity Tracking

No constitutional violations require justification.
