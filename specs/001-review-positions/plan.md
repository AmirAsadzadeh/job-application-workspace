# Implementation Plan: Review Current Positions

**Branch**: `001-review-positions` | **Date**: 2026-09-07 | **Spec**: [spec.md](spec.md)

**Input**: Approved feature specification from `specs/001-review-positions/spec.md`

**Status**: Approved

## Summary

Replace the current card-based, browser-stored positions view with a compact dark list
that displays only the approved row fields. A small local Node service will read validated
position records from `data/positions.json` and expose them to the React application. The
UI will use stable grid columns, restrained status treatments, keyboard-accessible row
navigation, and explicit loading/error/empty states. The detail route will provide
department, team, and location selectors, hiring-manager fields, repeatable job-platform
links, an organization career-page URL, and a focused rich-text job-description editor.
Saving will atomically update the local JSON record and its updated timestamp.

## Technical Context

**Language/Version**: TypeScript 5.8, ES2022, Node.js 24.x

**Primary Dependencies**: React 19, React DOM 19, Vite 7, Lucide React, Zod, Vitest,
Testing Library; planned Tiptap React, ProseMirror, and StarterKit with its built-in Link
extension for the focused rich-text editor

**Storage**: Local human-readable JSON at `data/positions.json` and selectable option data
at `data/reference-data.json`; company logos under `public/company-logos/`; no browser
local storage

**Testing**: TypeScript build, Vitest unit/component/service tests, Testing Library
interaction tests, 1,000-record performance checks, timed usability trials, and
browser-based desktop/mobile visual verification

**Target Platform**: Local desktop web application in a modern Chromium-based browser;
responsive behavior remains usable on narrow viewports

**Project Type**: Local web application with a React frontend and a file-backed Node service

**Performance Goals**: First list result visible within 1 second for 1,000 local records;
row interactions respond within 100 milliseconds under normal local use

**Constraints**: Dark and discreet presentation; at least 10 rows visible in a 768-pixel
application viewport; fixed compact row height; all approved fields visible; no hidden
detail fields in rows; keyboard-operable editor toolbar; only approved rich-text nodes and
marks; HTTP/HTTPS publication URLs; no `localStorage`

**Scale/Scope**: Single user, one positions list, detail editing for department, team,
location, hiring-manager fields, publication links, and formatted descriptions, two JSON
data files, and up to 1,000 records; no authentication, collaboration, new filtering
capabilities, media embeds, tables, or remote deployment

## Constitution Check

*GATE: Passed before Phase 0 research and re-checked after Phase 1 design.*

| Principle | Plan Evidence | Result |
|-----------|---------------|--------|
| Specifications are the source of truth | Every design artifact references `spec.md`; contracts map fields and states to FR identifiers. | PASS |
| Explicit approval gates | The amended specification is approved; this plan amendment requires approval before tasks are updated. | PASS |
| Small, testable user journeys | Work is limited to the single approved review journey and its navigation destination. | PASS |
| Quiet, scannable UX | UI contract fixes compact density, aligned columns, dark colors, subdued statuses, and keyboard behavior. | PASS |
| Local, human-readable data | `data/positions.json` is the source of records; browser local storage is removed from the data path. | PASS |
| Product and technical constraints | Existing React/Vite structure is retained; additions are limited to the required file boundary and tests. | PASS |

**Post-design re-check**: PASS. Phase 1 introduces no constitution violations. The local
service is necessary because browser code cannot silently access an ordinary local JSON
file; it is narrower than adopting a desktop application framework.

## Project Structure

### Documentation (this feature)

```text
specs/001-review-positions/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── checklists/
│   └── requirements.md
└── contracts/
    ├── positions-api.yaml
    └── positions-list-ui.md
```

### Source Code (repository root)

```text
data/
├── positions.json
└── reference-data.json

public/
└── company-logos/
    └── README.md

server/
├── index.ts
├── index.test.ts
├── positionsRepository.ts
├── positionsRepository.test.ts
└── positionsPerformance.test.ts

shared/
└── positionSchema.ts

src/
├── app/
│   └── App.tsx
├── features/
│   └── positions/
│       ├── components/
│       │   ├── PositionList.tsx
│       │   ├── PositionList.test.tsx
│       │   ├── PositionList.performance.test.tsx
│       │   ├── PositionRow.tsx
│       │   ├── PositionDetailsRoute.tsx
│       │   └── PositionDetailsRoute.test.tsx
│       ├── editor/
│       │   ├── JobDescriptionEditor.tsx
│       │   └── JobDescriptionEditor.test.tsx
│       ├── positionApi.ts
│       └── positionTypes.ts
├── main.tsx
└── styles.css

tests/
└── setup.ts
```

**Structure Decision**: Preserve the existing single React/Vite project and positions
feature boundary. Add a small `server/` boundary because only a Node process can access
the ordinary local JSON file without repeated browser permission prompts. Keep the shared
position schema in `shared/` so file validation and frontend types cannot drift. The
existing `positionTypes.ts` becomes the UI label-map and shared-type re-export boundary,
not a second type definition. Component tests remain beside the feature; shared test
setup stays under `tests/`.

## Design Decisions

### Data Boundary

- The local service reads and validates `data/positions.json` plus
  `data/reference-data.json`, and returns deterministic JSON responses.
- The frontend replaces `positionStorage.ts` usage with `positionApi.ts`; no fallback may
  write records into browser storage.
- The detail route may update only department, team, location, hiring-manager fields,
  publication links, and the formatted description.
  The service sets `updatedAt`, validates the resulting document, writes a temporary file,
  and renames it over `data/positions.json` after the write succeeds.
- The list refreshes when first opened and when the user returns from the detail route so
  saved file changes are reflected.
- Company logo paths are restricted to `/company-logos/<filename>` and served only from
  `public/company-logos/`; the data directory is never exposed as static content.
- Position documents move to version 2 because description changes from plain text to a
  structured document. Version 1 records are normalized in memory to a paragraph-based
  description and written as version 2 only after a successful atomic save.
- Publication URLs accept only absolute HTTP or HTTPS addresses. Platform entries are
  ordered, require both name and URL when present, and discard completely blank drafts.
- Rich text is stored as structured JSON restricted to paragraphs, headings, bullet and
  numbered lists, list items, hard breaks, text, bold, italic, and link marks.

### List Presentation

- Use a semantic list with a compact column header and one interactive row per position.
- Use a stable CSS grid for company, position, status, work mode, seniority, and updated
  date. Company logo and name share the company column.
- Keep standard desktop rows between 36 and 42 pixels high. Long text truncates with an
  accessible full-value label or tooltip and never changes row height.
- Preserve all required columns on narrow screens using controlled horizontal scrolling;
  do not hide required values or convert rows into tall cards.
- Remove description, department, manager, location, employment type, and other detail
  content from row markup, not merely from visual display.

### Navigation and States

- Make each row keyboard focusable and activate the matching `/positions/{id}` route.
- The detail route provides native selectors for department, team, and location using
  reference data. Team options are scoped to the selected department.
- Hiring manager is edited through name, phone number, and position fields. All three may
  be blank together; once any value is entered, all three are required.
- Publication links use compact repeatable rows with platform-name and URL inputs plus
  icon commands to add or remove entries. The career-page URL is a separate labelled field.
- The description uses Tiptap StarterKit with its built-in Link extension. Every
  unsupported StarterKit node and mark is disabled, leaving a restrained toolbar for
  headings, bold, italic, bullet lists, numbered lists, and links. Unsupported pasted
  formatting is removed while text is retained; stored content remains structured rather
  than executable markup.
- Saving updates only these approved detail fields, reports validation or write failures
  without losing entered values, and returns the saved record with server-set `updatedAt`.
- Provide loading, data-error, empty, and missing-position states that keep the layout
  quiet and explain the next available action.
- Use a fixed-size company fallback mark when `logoPath` is absent or fails to load.
- Preserve the existing search and status filters in a compact toolbar. Search continues
  to match title, department, hiring manager, and location through API query parameters;
  no new filter, sorting, or grouping behavior is introduced.

### Verification Strategy

- Repository tests validate successful reads, missing files, malformed JSON, invalid
  records, atomic writes, write failures, and deterministic API errors.
- Component tests validate required columns, prohibited row content, status labels,
  fallback logos, loading/error/empty states, row navigation, selectors, manager-field
  validation, save success, and save failure.
- Editor tests validate every approved toolbar command, keyboard focus, paste sanitization,
  JSON round trips, optional empty content, and restoration after a saved detail reload.
- Repository and API tests cover version 1 description normalization, version 2 writes,
  multiple platform links, URL schemes, incomplete pairs, and unchanged files on failure.
- A server performance check uses a generated 1,000-record fixture to verify list loading
  within 1 second. A separate UI performance check instruments row activation within 100
  milliseconds in the component environment.
- Browser verification covers a 1440x900 desktop viewport and a 390x844 narrow viewport,
  including row count, overflow, keyboard focus, contrast, and text overlap.
- Timed usability validation uses 10 documented trials to measure SC-001, SC-002, and
  SC-005, with outcomes recorded under `artifacts/001-review-positions/`.
- `npm run build` and the focused test command must pass before implementation is reported
  complete.

## Requirement Traceability

| Requirement | Planned design and verification |
|-------------|---------------------------------|
| FR-001 | List API, populated-list component test, and empty-list distinction. |
| FR-002 | Compact semantic list and 36-42 pixel desktop row contract. |
| FR-003 | Position summary contract and required-column component assertions. |
| FR-004 | Summary-only list response plus prohibited-row-content assertions. |
| FR-005 | Shared status enum, label map, and all-status rendering test. |
| FR-006 | Shared work-mode enum, label map, and rendering test. |
| FR-007 | Keyboard-accessible row target and detail-route navigation test. |
| FR-008 | Reference-data endpoint, detail selectors, dependent team options, and save tests. |
| FR-009 | Structured hiring-manager fields, completeness validation, persistence, and UI tests. |
| FR-010 | Atomic JSON update, server-set timestamp, return refresh, and save-path tests. |
| FR-011 | Dark neutral visual contract and browser contrast review. |
| FR-012 | Compact subordinate title contract and screenshot review. |
| FR-013 | Text-labelled restrained statuses and non-color identification test. |
| FR-014 | Fixed media dimensions, truncation rules, and long-content viewport test. |
| FR-015 | Empty API result and explicit empty-state component test. |
| FR-016 | Repeatable platform-link controls, array schema, and add/edit/remove tests. |
| FR-017 | Complete name/HTTP(S) URL pair validation at UI and service boundaries. |
| FR-018 | Optional labelled career-page URL field and persistence test. |
| FR-019 | Focused job-description editor on the detail route. |
| FR-020 | Explicit editor extension and toolbar-command allowlist. |
| FR-021 | Structured description JSON round-trip and reopen test. |
| FR-022 | Inline link validation with retained form state and atomic-write tests. |
| FR-023 | Summary schema exclusion plus prohibited-row-content assertions. |
| FR-024 | Empty new-field fixtures and successful-save acceptance test. |

## Complexity Tracking

No constitution violations require justification.
