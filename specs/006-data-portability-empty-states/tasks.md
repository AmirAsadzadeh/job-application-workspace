# Tasks: Data Portability and Empty States

**Input**: Design documents from `specs/006-data-portability-empty-states/`

**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`, `contracts/`, `quickstart.md`

**Tests**: Required by the approved specification, plan, constitution, and measurable outcomes. Write each test task before its corresponding implementation task and confirm it fails for the expected reason.

**Organization**: Tasks are grouped by user story so each journey can be implemented and tested independently.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel because it changes different files and has no dependency on an incomplete task
- **[Story]**: Maps work to User Story 1 or User Story 2
- Every task names its exact file path

## Phase 1: Setup

**Purpose**: Add only the approved standards-focused package dependencies.

- [x] T001 Add `@archiver/archiver`, `yauzl`, `csv-stringify`, and required TypeScript declarations using npm in `package.json` and `package-lock.json`

---

## Phase 2: Foundational Review

**Purpose**: Confirm the existing architecture boundaries before either independently deliverable story begins.

- [x] T002 Verify current Node 24, Zod schema, repository write-queue, managed-file containment, and test-fixture assumptions against `specs/006-data-portability-empty-states/plan.md`, stopping for plan correction if a material mismatch is found

**Checkpoint**: Setup matches the approved plan. US1 and US2 may now proceed independently.

---

## Phase 3: User Story 1 - Understand and Recover From Empty Views (Priority: P1)

**Goal**: Every approved empty collection explains its state and offers at most one relevant, keyboard-operable action while preserving the compact dark UI.

**Independent Test**: Exercise true-empty, filtered-empty, unavailable-reference, loading, and error fixtures for every context; verify exact copy/actions, focus behavior, and layout at 1440x900 and 390x844.

### Tests for User Story 1

- [x] T003 [P] [US1] Write failing semantic, one-action, keyboard, and focus tests for the shared component in `src/features/positions/components/EmptyState.test.tsx`
- [x] T004 [P] [US1] Write failing true-empty versus filtered-empty and Clear filters tests in `src/features/positions/components/PositionList.test.tsx`
- [x] T005 [P] [US1] Write failing no-platform-links and Add platform focus tests in `src/features/positions/components/PublicationLinksEditor.test.tsx`
- [x] T006 [P] [US1] Write failing reading and submitted-resume empty-state action tests in `src/features/positions/components/PositionReadinessSection.test.tsx`
- [x] T007 [P] [US1] Write failing no-questions, category-empty, Show all, and hidden-filter tests in `src/features/positions/components/PositionQuestionsSection.test.tsx`
- [x] T008 [P] [US1] Write failing unavailable department/team/location selector tests in `src/features/positions/components/PositionCreateRoute.test.tsx` and `src/features/positions/components/PositionDetailsRoute.test.tsx`

### Implementation for User Story 1

- [x] T009 [US1] Implement the context icon, message, and optional single-action primitive with accessible semantics in `src/features/positions/components/EmptyState.tsx`
- [x] T010 [US1] Add compact icon, empty-state, action, disabled-option, and responsive styling in `src/styles.css`
- [x] T011 [US1] Distinguish empty workspace from filtered-empty results and wire New position and Clear filters in `src/features/positions/components/PositionList.tsx`
- [x] T012 [P] [US1] Replace blank platform-link space with the approved Add platform state and focus behavior in `src/features/positions/components/PublicationLinksEditor.tsx`
- [x] T013 [P] [US1] Apply approved reading and resume empty states without changing existing editors in `src/features/positions/components/PositionReadinessSection.tsx`
- [x] T014 [P] [US1] Apply approved question states, Show all behavior, and empty-list filter hiding in `src/features/positions/components/PositionQuestionsSection.tsx`
- [x] T015 [P] [US1] Add non-selectable unavailable states for empty reference choices in `src/features/positions/components/PositionCreateRoute.tsx` and `src/features/positions/components/PositionDetailsRoute.tsx`
- [x] T016 [US1] Run all US1 component tests and fix only empty-state regressions in `src/features/positions/components/EmptyState.test.tsx`, `src/features/positions/components/PositionList.test.tsx`, `src/features/positions/components/PublicationLinksEditor.test.tsx`, `src/features/positions/components/PositionReadinessSection.test.tsx`, `src/features/positions/components/PositionQuestionsSection.test.tsx`, `src/features/positions/components/PositionCreateRoute.test.tsx`, and `src/features/positions/components/PositionDetailsRoute.test.tsx`

**Checkpoint**: User Story 1 is independently usable and demonstrable as the MVP.

---

## Phase 4: User Story 2 - Transfer and Restore the Workspace (Priority: P2)

**Goal**: Export a complete interoperable ZIP and safely restore it on another machine after validation, preview, explicit confirmation, automatic backup, and rollback-capable replacement.

**Independent Test**: Export a rich populated fixture, inspect ZIP and CSV contracts, validate it in a second populated app instance, cancel without change, then confirm and compare all restored JSON, order, relationships, preferences, resumes, and logos to the source.

### Tests for User Story 2

- [x] T017 [P] [US2] Write failing strict manifest, managed-file entry, preview, count, version, limit, and error-schema tests in `shared/workspacePackageSchema.test.ts`
- [x] T018 [P] [US2] Write failing package generation, canonical CSV equality, formula escaping, rich-text projection, empty export, managed-first/bundled-second logo resolution, integrity, path, size, checksum, signature, and version tests in `server/workspacePackage.test.ts`
- [x] T019 [P] [US2] Write failing import-session expiry, cleanup, backup path reporting, replacement, verified rollback, backup rematerialization after first rollback failure, and one-use-token tests in `server/workspaceTransfer.test.ts`
- [x] T020 [P] [US2] Write failing consistent snapshot, serialized mutation, restore verification, and byte-identical rollback tests in `server/positionsRepository.test.ts`
- [x] T021 [P] [US2] Write failing export, validate, cancel, restore, response-header, status-code, and raw-upload-limit tests in `server/index.test.ts`
- [x] T022 [P] [US2] Write failing export download, ZIP upload, preview parsing, cancel, restore, and categorized-error tests in `src/features/positions/positionApi.test.ts`
- [x] T023 [P] [US2] Write failing keyboard/focus tests for selection, validation, preview, confirmation, progress, error, cancellation, and success with recoverable backup path in `src/features/positions/components/WorkspaceTransferDialog.test.tsx`
- [x] T024 [P] [US2] Write failing toolbar integration, accessible-name, tooltip, reload, and announcement tests in `src/features/positions/components/PositionList.test.tsx`

### Package and Storage Implementation

- [x] T025 [US2] Implement strict version 1 manifest, file-entry, preview, count, limit, and error schemas in `shared/workspacePackageSchema.ts`
- [x] T026 [US2] Implement deterministic rich plain-text projection, eight explicit CSV tables, formula-safe serialization, managed-first/bundled-second local-logo resolution, file hashing, and completed temporary ZIP generation in `server/workspacePackage.ts`
- [x] T027 [US2] Implement lazy ZIP validation and materialization with allowlisted paths, unique entries, size limits, manifest/reference validation, canonical CSV byte comparison, file ownership, hashes, and detected content in `server/workspacePackage.ts`
- [x] T028 [US2] Expose serialized snapshot and rollback-capable whole-workspace replacement operations through the existing write queue in `server/positionsRepository.ts`
- [x] T029 [US2] Implement size-limited upload staging, 30-minute import sessions, startup/cancel cleanup, durable pre-restore backup, staged promotion, post-promotion validation, verified direct rollback, verified backup rematerialization fallback, backup-path reporting, and one-use invalidation in `server/workspaceTransfer.ts`

### API and UI Implementation

- [x] T030 [US2] Add export, validate-import, cancel-import, and restore-import routes plus categorized error mapping and safe headers in `server/index.ts`
- [x] T031 [US2] Add typed package download, raw ZIP upload, preview, cancel, and confirmed restore client methods in `src/features/positions/positionApi.ts`
- [x] T032 [US2] Implement the accessible staged import and replacement-confirmation flow with the recoverable backup's workspace-relative path in `src/features/positions/components/WorkspaceTransferDialog.tsx`
- [x] T033 [US2] Add compact transfer-dialog, progress, preview-count, warning, error, and responsive styles in `src/styles.css`
- [x] T034 [US2] Add icon-only Export and Import toolbar controls, tooltips, transfer-dialog lifecycle, post-restore list reload, and live announcements in `src/features/positions/components/PositionList.tsx`
- [x] T035 [US2] Extend the performance fixture to cover 100 positions, 10,000 questions, 3,000 readings, 500 links, 100 deterministic 512 KiB resumes, and 25 deterministic 64 KiB local logos in `server/positionsPerformance.test.ts`
- [x] T036 [US2] Run and reconcile US2 tests in `shared/workspacePackageSchema.test.ts`, `server/workspacePackage.test.ts`, `server/workspaceTransfer.test.ts`, `server/positionsRepository.test.ts`, `server/index.test.ts`, `src/features/positions/positionApi.test.ts`, `src/features/positions/components/WorkspaceTransferDialog.test.tsx`, `src/features/positions/components/PositionList.test.tsx`, and `server/positionsPerformance.test.ts`

**Checkpoint**: User Story 2 is independently usable; export, cancel, restore, rejection, and rollback satisfy the package and API contracts.

---

## Phase 5: Polish and Cross-Cutting Verification

**Purpose**: Prove the two completed stories together without adding scope.

- [x] T037 Run `npm test`, `npm run test:performance`, and `npm run build`, fixing only regressions caused by feature 006 in the files listed by `specs/006-data-portability-empty-states/plan.md`
- [x] T038 [P] Search `src/`, `server/`, and `shared/` for browser persistent storage and record the zero-use result in `artifacts/006-data-portability-empty-states/validation-results.md`
- [x] T039 Execute malformed-package, CSV-mismatch, bundled-logo, and injected direct/fallback rollback scenarios from `specs/006-data-portability-empty-states/quickstart.md` and record package counts, managed-file bytes, timings, backup path, and byte-identical recovery evidence in `artifacts/006-data-portability-empty-states/validation-results.md`
- [x] T040 Inspect all empty, loading, error, preview, confirmation, progress, and success states by keyboard at 1440x900 and 390x844 and record screenshots/findings in `artifacts/006-data-portability-empty-states/visual-review.md`
- [x] T041 Re-run the complete quickstart after visual fixes and record final acceptance-scenario and success-criteria results in `artifacts/006-data-portability-empty-states/validation-results.md`

---

## Dependencies and Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: Starts immediately.
- **Foundational Review (Phase 2)**: Depends on T001 and blocks both stories.
- **US1 (Phase 3)**: Depends on T002; otherwise independent from US2.
- **US2 (Phase 4)**: Depends on T002; otherwise independent from US1.
- **Polish (Phase 5)**: Depends on the selected stories; full acceptance requires T016 and T036.

### User Story Dependencies

- **US1 (P1)**: No dependency on US2. It is the suggested MVP.
- **US2 (P2)**: No dependency on US1. Its toolbar integration must preserve whichever US1 state is present.

### Within User Story 1

- T003-T008 are written before implementation and can run in parallel.
- T009 precedes T011-T015 because those components consume `EmptyState`.
- T010 can proceed after T009 while context integrations T011-T015 proceed in parallel.
- T016 follows T009-T015.

### Within User Story 2

- T017-T024 are written before implementation and can run in parallel except that T024 follows any US1 edits to `PositionList.test.tsx` when both stories are sequential.
- T025 precedes T026-T027; T026 precedes T027.
- T028 and T027 precede T029.
- T029 precedes T030; T030 precedes T031; T031 precedes T032 and T034.
- T032 precedes T034, and T033 follows US1 styling when both stories are sequential.
- T035 may run after package and transfer services exist; T036 follows all US2 implementation.

## Parallel Examples

### User Story 1

```text
T003 EmptyState component tests
T004 PositionList empty/filter tests
T005 PublicationLinksEditor empty tests
T006 PositionReadinessSection empty tests
T007 PositionQuestionsSection empty/filter tests
T008 Create/detail reference-selector tests
```

After T009:

```text
T012 Publication links integration
T013 Readiness integration
T014 Questions integration
T015 Reference selectors integration
```

### User Story 2

```text
T017 Shared schema tests
T018 Package contract tests
T019 Transfer transaction tests
T020 Repository transaction tests
T021 Server route tests
T022 Client API tests
T023 Dialog tests
T024 Toolbar integration tests
```

## Implementation Strategy

### MVP First

1. Complete T001-T002.
2. Complete T003-T016 for User Story 1.
3. Stop and independently validate every approved empty state.

### Incremental Delivery

1. Deliver US1 as the compact empty-state MVP.
2. Build US2 contract-first from schemas and package tests through transaction safety.
3. Add API and UI only after package validation and rollback are proven.
4. Complete T037-T041 before declaring the combined feature done.

## Notes

- Do not create migrations or change `DATA_VERSION`; the package format has its own version.
- Do not parse CSVs during restore; `manifest.json` is authoritative.
- Do not add merge, arbitrary CSV import, cloud storage, partial export, or backup history UI.
- Do not begin implementation until the user approves this task list and then separately approves implementation after consistency analysis.
