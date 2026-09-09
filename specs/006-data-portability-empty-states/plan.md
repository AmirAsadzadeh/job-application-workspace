# Implementation Plan: Data Portability and Empty States

**Branch**: `006-data-portability-empty-states` | **Date**: 2026-09-09 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/006-data-portability-empty-states/spec.md`

## Summary

Add one shared compact empty-state component with small muted context icons across position, publication-link, readiness, question, and reference-selector flows. Add a server-owned workspace package coordinator that creates a complete ZIP from a consistent repository snapshot, exposes human-readable CSV tables, stages and validates imported ZIPs, creates a durable pre-restore backup, and performs a rollback-capable whole-workspace replacement. Keep the current version 6 position document authoritative inside a versioned package manifest and preserve all managed resume and local-logo files.

## Technical Context

**Language/Version**: TypeScript 5.8, React 19, Node.js 24-compatible ES2023

**Primary Dependencies**: Existing React, Zod 4, Lucide React, and file-type; add `@archiver/archiver` for streaming ZIP creation, `yauzl` for lazy validated ZIP reading, and `csv-stringify` for standards-based CSV output with formula escaping

**Storage**: Existing local `data/positions.json`, `data/reference-data.json`, `data/resumes/`, and `data/company-logos/`; bundled logo fallback under `public/company-logos/` in development or `dist/company-logos/` in production; transient staging under `data/.workspace-transfer/`; durable automatic backups under `data/backups/`

**Testing**: Vitest 5, Testing Library, jsdom, package contract tests, repository/API/file integration tests, failure injection, performance fixtures, and live browser inspection

**Target Platform**: Local desktop web application on Node.js 24 with keyboard support and responsive behavior down to 390 CSS pixels

**Project Type**: Single web application with React frontend, Node HTTP API, and file-backed repository

**Performance Goals**: Export the approved 100-position fixture within 30 seconds; validate, back up, and restore the same package within 60 seconds; add no measurable list-render delay

**Constraints**: No browser persistent storage, cloud transfer, arbitrary CSV import, merge/conflict resolution, partial export, package editing, or unrelated storage migration; validation precedes mutation; backup precedes replacement; failed restore leaves the prior workspace usable

**Scale/Scope**: One local user; up to 100 positions, 10,000 questions, 3,000 readings, 500 platform links, 100 submitted resumes, and associated local logos in one transfer; the performance fixture carries 100 files of 512 KiB plus 25 logos of 64 KiB, approximately 52 MiB before ZIP compression

## Constitution Check

*GATE: Passed before research and re-checked after design.*

- **Specifications are the source of truth**: PASS. The approved specification defines both journeys, package behavior, replacement semantics, failure guarantees, empty-state copy, and exclusions.
- **Explicit approval gates**: PASS. This phase changes planning artifacts only; tasks and application code remain untouched pending separate approvals.
- **Small, testable user journeys**: PASS. Empty-state recovery and workspace transfer are independently testable and prioritized.
- **Quiet, scannable user experience**: PASS. The design uses a shared low-profile empty state, compact icon controls, and a focused restore dialog.
- **Local, human-readable data**: PASS. JSON remains authoritative, CSVs increase inspectability, managed files remain local, and no browser storage or remote service is introduced.
- **Architecture and accessibility constraints**: PASS. The design extends existing schemas, file-backed repository, write queue, HTTP handler, Lucide controls, and keyboard/focus conventions.

Post-design check: PASS. The three new dependencies each own a narrow standards-heavy concern. The transfer coordinator remains adjacent to existing repository and storage modules, and the shared empty-state component removes repeated UI behavior without changing unrelated screens.

## Project Structure

### Documentation (this feature)

```text
specs/006-data-portability-empty-states/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── empty-states-ui.md
│   ├── package-format.md
│   └── workspace-transfer-api.md
└── tasks.md             # Created only after separate approval
```

### Source Code (repository root)

```text
data/
├── positions.json
├── reference-data.json
├── resumes/
├── company-logos/
├── backups/
└── .workspace-transfer/

public/company-logos/

shared/
├── positionSchema.ts
├── positionSchema.test.ts
├── workspacePackageSchema.ts
└── workspacePackageSchema.test.ts

server/
├── index.ts
├── index.test.ts
├── positionsRepository.ts
├── positionsRepository.test.ts
├── resumeStorage.ts
├── workspacePackage.ts
├── workspacePackage.test.ts
├── workspaceTransfer.ts
├── workspaceTransfer.test.ts
└── positionsPerformance.test.ts

src/features/positions/
├── positionApi.ts
├── positionApi.test.ts
└── components/
    ├── EmptyState.tsx
    ├── EmptyState.test.tsx
    ├── PositionList.tsx
    ├── PositionList.test.tsx
    ├── PublicationLinksEditor.tsx
    ├── PositionReadinessSection.tsx
    └── PositionQuestionsSection.tsx

src/styles.css
tests/setup.ts
```

**Structure Decision**: Keep the current single-app layout. Shared schemas define the portable manifest and preview response; `workspacePackage` serializes and validates the archive contract; `workspaceTransfer` owns expiring staging, backup, replacement, and rollback; the repository exposes one queued snapshot/restore boundary so transfer cannot race position mutations. The frontend adds one reusable empty-state primitive and a list-level transfer dialog rather than a new route.

## Implementation Phases

### Phase 1 - Package Contract and CSV Views

1. Define strict version 1 manifest, file-entry, preview, count, and error schemas without changing position data version 6.
2. Build deterministic plain-text projection for both rich-document grammars and explicit CSV row projections for every approved table.
3. Generate formula-safe UTF-8 CSVs with stable headers, IDs, parent IDs, sequence columns, null markers, rich plain text, and rich JSON.
4. Resolve each local logo using the server's existing managed-first and bundled-second lookup, then build a complete ZIP in a temporary file, hash every included file, and publish it only after all referenced resumes and effective local logos have been verified.

### Phase 2 - Safe Validation and Preview

1. Stream an uploaded ZIP to a size-limited temporary file without buffering it in browser or server memory.
2. Read entries lazily; enforce strict relative names, allowlisted paths/types, unique paths, entry/count/size limits, and declared-versus-actual expanded sizes.
3. Validate manifest data, reference relationships, file ownership, checksums, signatures, the exact required-file set, and byte-for-byte equality between each included CSV and the canonical CSV regenerated from the normalized manifest.
4. Materialize valid content in isolated staging and return an opaque expiring import ID plus preview counts, timestamp, version, and notices.
5. Delete staging on cancellation, expiry, startup cleanup, validation failure, or successful restore.

### Phase 3 - Backup and Atomic Restore

1. Run export, backup, and restore through the repository write queue so snapshots and replacements cannot race normal mutations.
2. On confirmation, generate and durably finish a complete pre-restore ZIP under `data/backups/`; abort before replacement if this fails.
3. Prepare replacement JSON and managed-file directories, move live paths to rollback names, promote staged paths, and validate the promoted workspace before retiring rollback paths.
4. On any promotion or verification failure, restore every previous path and verify the old workspace before releasing the write queue; if direct rollback fails, rematerialize the previous workspace from the durable backup and keep the service unavailable until recovery verification passes.
5. Invalidate the one-use import ID, retain the backup ZIP, and return restored counts plus backup identity.

### Phase 4 - Compact Transfer UI and Empty States

1. Add icon-only Export and Import controls with tooltips and accessible names to the positions toolbar.
2. Add one focused import dialog for selection, validation progress, preview, explicit replacement confirmation, restore progress, success, cancellation, and categorized retryable errors; successful restore identifies the recoverable backup's local path.
3. Reload the list from the server after restore and announce completion without persisting client state.
4. Introduce one compact `EmptyState` component with an optional single action and apply the exact approved variants to all specified contexts.
5. Keep loading and errors separate, hide the question filter when no questions exist, and restore logical focus after actions.

### Phase 5 - Verification

1. Verify manifest and CSV round trips, rich-text projection, Unicode/multiline/duplicate/null handling, formula escaping, package integrity, and empty-workspace packages.
2. Verify malformed or unsafe archives, expiry, and cancellation produce zero live changes.
3. Inject backup, stage, rename, write, post-promotion, and first rollback failures; require verified direct rollback or verified rematerialization from the durable backup, then compare the prior JSON/file tree byte-for-byte.
4. Verify API headers/statuses, streaming cleanup, one-use tokens, concurrent serialization, and source ZIP immutability.
5. Run focused component tests, complete tests, performance suite, production build, and browser-storage search.
6. Inspect every empty/loading/error/preview/progress/success state by keyboard at 1440x900 and 390x844.

## Complexity Tracking

No constitutional violations require justification.
