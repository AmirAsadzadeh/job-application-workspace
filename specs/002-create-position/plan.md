# Implementation Plan: Create a Job Position

**Branch**: `002-create-position` | **Date**: 2026-09-07 | **Spec**: [spec.md](spec.md)

**Input**: Approved feature specification from `specs/002-create-position/spec.md`

**Status**: Approved

## Summary

Add a compact `/positions/new` creation route to the existing React application and a
validated `POST /api/positions` boundary to the local Node service. The form reuses the
current reference-data selectors, publication-link editor, and Tiptap description editor.
The repository will serialize create and update writes through its existing queue, assign
identity and timestamps on the server, prepend successful creations to the local JSON
document, and retain the atomic temporary-file rename behavior.

Position documents move to version 3. The migration removes the standalone
`requirements` field, appends its existing content to the rich description, and expands
company identity to support at most one local logo path or remote image URL. Uploaded
logo bytes travel in the structured create request, are validated to the approved 2 MB
limit and formats, and are stored under a dedicated local asset directory. No browser
storage, remote persistence, new framework, or new dependency is introduced.

## Technical Context

**Language/Version**: TypeScript 5.8, ES2023 server target, Node.js 24.14, React 19

**Primary Dependencies**: Existing React, React DOM, Vite, Lucide React, Zod, Tiptap,
ProseMirror, Vitest, Testing Library, and Node standard-library file and crypto APIs; no
new dependency planned

**Storage**: Versioned human-readable JSON at `data/positions.json`, selector data at
`data/reference-data.json`, and uploaded logo files under `data/company-logos/`; no
browser local storage

**Testing**: TypeScript production build, Vitest schema/repository/API tests, Testing
Library route and form interaction tests, migration fixtures, file-write failure tests,
and browser-based desktop/mobile visual checks

**Target Platform**: Local desktop web application in a modern Chromium-based browser,
with the complete creation flow usable at 390 pixels wide

**Project Type**: Local React web application with a file-backed Node service

**Performance Goals**: Creation page interactive within 1 second after local reference
data resolves; successful local create returns and displays in the list within 1 second
for a 1,000-position document, excluding user-selected image decoding time

**Constraints**: Compact dark interface; no large project heading; one-page form; maximum
2 MB uploaded logo; PNG/JPG/SVG only; direct HTTP/HTTPS remote image references; atomic
position-record writes; unique server-generated IDs; generated timestamps; no
`requirements` field in version 3; no duplicate submission from one save action

**Scale/Scope**: Single-user local workspace, one creation route, one create endpoint,
one document migration, one local logo directory, and up to 1,000 position records; no
company directory, authentication, collaboration, remote upload service, or status-flow
management

## Constitution Check

*GATE: Passed before Phase 0 research and re-checked after Phase 1 design.*

| Principle | Plan Evidence | Result |
|-----------|---------------|--------|
| Specifications are the source of truth | The design and traceability table cover only the approved create-position requirements. | PASS |
| Explicit approval gates | The specification is approved; this plan remains draft until separately approved. Tasks and implementation are not created. | PASS |
| Small, testable user journeys | Scope is limited to creating one position and the migration necessary for that save. | PASS |
| Quiet, scannable UX | The UI contract requires compact sections, restrained controls, readable errors, and no attention-grabbing heading. | PASS |
| Local, human-readable data | Position records remain in local JSON; uploaded logos are local assets; browser storage is prohibited. | PASS |
| Product and technical constraints | Existing routing, service, repository, editor, schemas, and tests are extended without a new framework or unrelated refactor. | PASS |

**Post-design re-check**: PASS. The API, data model, UI contract, and validation guide add
no constitution violations. Local uploaded image files are supporting assets, while all
position metadata and references remain human-readable in `data/positions.json`.

## Project Structure

### Documentation (this feature)

```text
specs/002-create-position/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── checklists/
│   └── requirements.md
└── contracts/
    ├── create-position-api.yaml
    └── create-position-ui.md
```

### Source Code (repository root)

```text
data/
├── company-logos/
└── positions.json

server/
├── index.ts
├── index.test.ts
├── positionsRepository.ts
└── positionsRepository.test.ts

shared/
└── positionSchema.ts

src/
├── app/
│   └── App.tsx
├── features/
│   └── positions/
│       ├── components/
│       │   ├── CompanyLogoInput.tsx
│       │   ├── PositionCreateRoute.tsx
│       │   ├── PositionCreateRoute.test.tsx
│       │   ├── PositionList.tsx
│       │   ├── PositionList.test.tsx
│       │   ├── PositionRow.tsx
│       │   └── existing detail/editor components
│       ├── editor/
│       │   └── JobDescriptionEditor.tsx
│       ├── positionApi.ts
│       └── positionTypes.ts
└── styles.css
```

**Structure Decision**: Extend the existing single-project positions feature. Keep
creation in its own route component so this journey does not silently expand which basic
fields the existing detail journey can edit. Reuse the existing publication-link and rich
description components. Keep validation types in the shared schema and all file writes in
the repository. Add a focused company-logo input because upload preview, remote URL,
fallback, and mutually exclusive source selection form one bounded responsibility.

## Design Decisions

### Create Boundary and Persistence

- Add `POST /api/positions` accepting the contract in
  `contracts/create-position-api.yaml`; return `201` with the complete created position.
- The request omits `id`, `status`, `createdAt`, and `updatedAt`. The repository assigns a
  UUID-based position ID, `draft` status, and one ISO timestamp for both dates.
- Employment type defaults to `full_time` when omitted. All other optional groups are
  normalized to null, empty strings, empty arrays, or an empty rich-text document as
  defined in the data model.
- Create and update operations share the existing write queue. Each create re-reads and
  validates both local data files, validates reference relationships, prepends the record,
  validates the complete next document, writes a sibling temporary file, and atomically
  renames it over `data/positions.json`.
- Duplicate company/title values are accepted. Uniqueness applies only to generated IDs.
- The save command is disabled while a request is active and remains inactive after a
  successful response while navigation returns to the list, preventing repeated UI
  activation from creating multiple records.
- Validation responses include stable field paths so the form can show guidance beside
  the responsible control. A failed validation or write leaves entered client state and
  the previous positions document unchanged.

### Logo Handling

- Company identity stores `logoPath` and `logoUrl` as nullable alternatives with a schema
  rule that prohibits both being populated.
- Remote mode accepts only an absolute HTTP or HTTPS URL. It stores the URL unchanged and
  never downloads it. Row and detail image error handling falls back to the company
  initial without changing layout.
- Upload mode sends a filename, declared media type, and base64 payload inside the JSON
  create request. The service enforces a 2 MB decoded-byte limit, permits PNG, JPEG, and
  SVG, checks that bytes agree with the declared format, and generates the stored filename
  rather than trusting the client name.
- Uploaded assets are staged and written under `data/company-logos/`. The stored JSON path
  uses `/company-logos/<generated-name>`. Failed position writes remove the staged or
  newly finalized upload on a best-effort basis and never add a position record.
- The server exposes only generated filenames from the logo directory and serves them
  with an explicit media type, `nosniff`, and a restrictive content-security policy. SVG
  is never inserted as markup; it is loaded only through an image element.
- Existing bundled logos under `public/company-logos/` remain readable. The server checks
  the uploaded-logo directory first, then the existing static asset location, without
  exposing directory listings.

### Version 3 Migration

- Version 3 removes `requirements` from every position and adds nullable `logoUrl` to
  company identity while retaining nullable `logoPath` for existing and uploaded assets.
- Version 1 plain descriptions are first normalized to the approved rich-text structure.
  Version 1 and version 2 `requirements` entries are then appended as a level-2
  `Requirements` heading followed by a bullet list, preserving every non-empty entry.
- Legacy reads normalize in memory without rewriting files. The first successful create
  or detail update validates and atomically writes the complete version 3 document.
- The checked-in `data/positions.json` fixture is migrated during implementation so the
  shipped data visibly demonstrates the current format. Tests retain version 1 and 2
  fixtures to prove backward-compatible migration.

### Form and Navigation

- Extend the lightweight router to distinguish list, `/positions/new`, and
  `/positions/{id}` routes. The list passes a dedicated create callback to its compact
  plus-icon and `New position` control.
- The creation page loads reference data once and initializes `Draft`, `Full-time`, empty
  optional groups, and an empty rich-text document. It does not require a company lookup.
- Use six compact fieldsets in the approved order. Basics contains company name, logo,
  position name, visible Draft status, work mode, seniority, and employment type.
- Department, team, and location use the existing reference data. Changing department
  clears team; team stays disabled until a department is selected.
- Salary inputs use numeric values in the UI but are normalized before shared-schema
  validation. Currency is normalized to uppercase. Any partially populated optional
  group remains visible and blocks save with field-level guidance.
- Reuse `PublicationLinksEditor` and `JobDescriptionEditor`; job requirements have no
  separate input.
- Dirty state compares the normalized form with its initial value. Internal Back/Cancel,
  browser Back, refresh, and tab/window close are guarded only after a change. The native
  unload prompt covers document exit; the custom route guard covers in-app and history
  navigation.
- Successful creation navigates to `/`, where the existing list fetches again. Prepending
  the new record in the JSON document makes it the first unfiltered row.

### Verification Strategy

- Schema tests cover defaults, fixed seniority, grouped manager/salary rules, URL rules,
  exclusive logo sources, upload metadata, and the removed `requirements` field.
- Migration tests cover version 1 and 2 descriptions, requirement order and formatting,
  logos, unrelated fields, record order, and a version 3 round trip.
- Repository tests cover generated identity/timestamps, duplicate names, prepend order,
  relationship validation, serialized concurrent writes, upload cleanup, and unchanged
  JSON after validation or rename failure.
- API tests cover `201`, field-specific `400`, `413`, and stable `500` responses plus
  serving local images safely.
- Component tests cover entry from the list, defaults, minimum and complete forms,
  dependent selectors, conditional validation, upload/URL modes, fallback preview,
  duplicate-submit prevention, dirty guards, retained values after failure, and return to
  the refreshed list.
- Browser checks at 1440x900 and 390x844 verify density, keyboard use, focus, readable
  validation, non-overlap, and that the first list row contains the newly created record.

## Requirement Traceability

| Requirement | Planned design and verification |
|-------------|---------------------------------|
| FR-001-FR-002 | List create control, creation route, compact six-section UI contract, and route tests. |
| FR-003-FR-007 | Shared create schema, server defaults, fixed enums, and minimum-form tests. |
| FR-008-FR-009 | Reference-data selectors, department-scoped teams, row-exclusion regression tests. |
| FR-010-FR-012 | Exclusive logo source model, validated local upload, direct remote URL, and fallback tests. |
| FR-013-FR-014 | Conditional grouped validation and preserved form-state tests. |
| FR-015-FR-017 | Reused repeatable links and Tiptap editor with URL and formatting tests. |
| FR-018-FR-019 | Version 3 model, legacy requirement-to-description migration, and fixture checks. |
| FR-020-FR-021 | Server-generated UUID/timestamps and duplicate company/title repository tests. |
| FR-022-FR-024 | Field issue contract, navigation guards, atomic write path, and failure tests. |
| FR-025-FR-027 | Prepend order, list refetch, compact row regression checks, and version 3 JSON persistence. |

## Complexity Tracking

No constitution violations require justification.
