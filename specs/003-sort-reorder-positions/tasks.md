# Tasks: Sort and Reorder Positions

**Input**: Approved design documents from `specs/003-sort-reorder-positions/`

**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`, `contracts/`, and `quickstart.md`

**Status**: Implementation complete; exact viewport and external usability validation remain

**Tests**: Required by the approved plan, acceptance scenarios, and performance criteria. Write each listed test before its corresponding implementation and confirm it fails for the expected missing behavior.

**Organization**: This feature contains one independently testable P1 user story. Version 4 list-view persistence and the anchor-based reorder input are foundational because repository, API, and frontend behavior depend on them.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel because it targets a separate file and has no dependency on another incomplete task in the same group.
- **[US1]**: Implements or verifies User Story 1, Organize the Positions List.

## Phase 1: Setup

**Purpose**: Add the approved accessible sortable foundation without changing application behavior.

- [X] T001 Add the dnd-kit React sortable, DOM sensor, and helper dependencies to `package.json` and `package-lock.json`

**Checkpoint**: The existing application builds and tests with the new dependencies installed but unused.

---

## Phase 2: Foundational Version 4 Contracts

**Purpose**: Establish persisted list-view metadata and strict anchor-based move input shared by repository, API, and frontend code.

**CRITICAL**: User Story 1 implementation cannot begin until version 3 migration preserves all positions and order, and shared inputs reject invalid mode/column/direction combinations, empty IDs, equal source/anchor IDs, and unknown properties.

- [X] T002 Add failing version 4 document, version 3 migration, list-view preference, and anchor-based reorder input tests in `shared/positionSchema.test.ts`
- [X] T003 Implement version 4 document normalization plus strict `ListViewPreferenceSchema` and `ReorderPositionInputSchema` exports in `shared/positionSchema.ts`
- [X] T004 Migrate the checked-in document to version 4 with Manual list-view metadata while preserving every record and sequence in `data/positions.json`

**Checkpoint**: Shared tests prove strict Manual/column preferences, valid before-anchor/end moves, and lossless version 3 migration.

---

## Phase 3: User Story 1 - Organize the Positions List (Priority: P1) MVP

**Goal**: Persist the active sorting mode, sort every visible column, and persist pointer or keyboard row moves while preserving the compact row contract and every position record.

**Independent Test**: Sort each visible column ascending and descending, reload to verify the mode persists, restore Manual order, move a row with pointer and keyboard controls, reload again, and confirm the moved sequence and Manual mode persist with every position present exactly once.

### Tests for User Story 1

- [X] T005 [P] [US1] Add failing stable comparator tests for company, position, status workflow, work-mode label, seniority rank, updated date, direction reversal, and equal-value stability in `src/features/positions/positionSort.test.ts`
- [X] T006 [P] [US1] Add failing repository tests for list-view reads/writes, before-anchor moves, move-to-end, no-op moves, missing/equal IDs, unchanged record contents, atomic rollback, and serialized create/update/reorder/preference writes in `server/positionsRepository.test.ts`
- [X] T007 [P] [US1] Add failing API tests for list-view data on `GET /api/positions`, `PATCH /api/positions/list-view`, `PATCH /api/positions/order`, malformed input, missing positions, and stable write-failure errors in `server/index.test.ts`
- [X] T008 [P] [US1] Add failing response-parsing and structured-error tests for listing, view preference updates, and reorders in `src/features/positions/positionApi.test.ts`
- [X] T009 [P] [US1] Add failing row tests for a dedicated accessible handle, disabled reasons, separate open-position activation, stable logo fallback, and valid non-nested controls in `src/features/positions/components/PositionRow.test.tsx`
- [X] T010 [P] [US1] Add failing list tests for persisted initial mode, six sortable headers, direction indicators, preference saves, Manual restoration, filtering behavior, reorder eligibility, pointer/keyboard announcements, optimistic updates, pending state, and rollback/focus on failure in `src/features/positions/components/PositionList.test.tsx`
- [X] T011 [P] [US1] Add failing 1,000-position stable-sort and queued reorder/preference performance cases in `src/features/positions/components/PositionList.performance.test.tsx` and `server/positionsPerformance.test.ts`

### Sorting and Persistence Implementation

- [X] T012 [P] [US1] Implement typed stable sort selection, display-key comparators, and ascending/descending helpers in `src/features/positions/positionSort.ts`
- [X] T013 [US1] Implement list-view reads/writes, anchor-based reorders, queued atomic persistence, no-op behavior, and ordered-summary results in `server/positionsRepository.ts`
- [X] T014 [US1] Return list-view metadata from `GET /api/positions` and implement the list-view and reorder PATCH endpoints before the position-detail matcher in `server/index.ts`
- [X] T015 [P] [US1] Add typed list responses, `updateListView`, `reorderPosition`, response validation, and structured errors to `src/features/positions/positionApi.ts`

### List Interaction Implementation

- [X] T016 [US1] Refactor the row into a sortable container with a fixed drag-handle button and separate full-content open button in `src/features/positions/components/PositionRow.tsx`
- [X] T017 [US1] Load and persist sorting mode, implement sortable headers and Manual restoration, integrate dnd-kit pointer/keyboard sensors, derive anchors, announce moves, and roll back failed preference or reorder saves in `src/features/positions/components/PositionList.tsx`
- [X] T018 [US1] Add fixed handle/header-icon tracks, disabled/dragging/saving states, reduced-motion handling, and non-overlapping 390-pixel rules without increasing row height in `src/styles.css`

**Checkpoint**: User Story 1 passes focused tests and the independent persistence/reload test without changing row data or using browser persistent storage.

---

## Phase 4: Polish and Cross-Cutting Verification

**Purpose**: Prove migration, regression safety, performance, visual quality, and persistence integrity.

- [X] T019 Run the complete automated suite and production build from `package.json`, fixing only Journey 3 regressions in files named by failing tests
- [ ] T020 Execute Scenarios 1-9 from `specs/003-sort-reorder-positions/quickstart.md` and record automated/manual outcomes plus JSON identity, mode, direction, and order checks in `artifacts/003-sort-reorder-positions/validation-results.md`
- [ ] T021 Capture and inspect sorted and Manual-order lists at 1440x900 and 390x844, recording row height, overlap, indicators, handles, focus, contrast, and reduced-motion evidence in `artifacts/003-sort-reorder-positions/visual-review.md`
- [X] T022 Verify strict version 4 data, complete list-view metadata, unique position IDs, preserved manual sequence, and no persistent `localStorage` usage in `artifacts/003-sort-reorder-positions/validation-results.md`
- [ ] T023 Conduct ten first-attempt sort-and-reorder usability trials and record completion, assistance, and outcomes in `artifacts/003-sort-reorder-positions/usability-results.md`

**Checkpoint**: Automated and manual acceptance evidence passes, Journey 1 and Journey 2 remain intact, and no unapproved list fields or persistence mechanisms have been introduced.

---

## Dependencies and Execution Order

### Phase Dependencies

- **Phase 1, Setup**: Starts after renewed explicit implementation approval.
- **Phase 2, Foundation**: Starts after T001. T002 must fail first; T003 makes it pass; T004 applies the verified migration.
- **Phase 3, User Story 1**: Starts after Phase 2. Tests T005-T011 precede their matching implementation tasks.
- **Phase 4, Polish**: Starts only after the complete User Story 1 checkpoint passes.

### User Story Dependency

- **User Story 1 (P1)**: Depends only on the version 4 shared contracts. It has no dependency on another user story and is the Journey 3 MVP.

### Within User Story 1

1. Write T005-T011 and verify failure for the expected missing behavior.
2. T012, T013, and T015 target separate sort, repository, and client boundaries and can proceed in parallel after T003.
3. Complete T013 before T014 because both PATCH endpoints depend on repository behavior.
4. Complete T012, T015, and T016 before T017 integrates sorting, persistence, and sortable rows.
5. Complete T018 after the final row/header structure is known.
6. Run focused tests before Phase 4 validation.

## Parallel Opportunities

- T005-T011 target separate test files or non-overlapping performance cases and can be authored in parallel after the shared schema is ready.
- T012, T013, and T015 target independent sort, repository, and client files.
- T009 can guide T016 while T005 guides T012 and T006-T008 guide T013-T015.
- External visual and usability evidence can be scheduled separately after T019, but results must not be fabricated.

## Parallel Example: User Story 1

```text
Task T005: Comparator tests in src/features/positions/positionSort.test.ts
Task T006: Repository list-view and reorder tests in server/positionsRepository.test.ts
Task T007: API persistence tests in server/index.test.ts
Task T008: Frontend client contract tests in src/features/positions/positionApi.test.ts
Task T009: Sortable row tests in src/features/positions/components/PositionRow.test.tsx
Task T010: Integrated list interaction tests in src/features/positions/components/PositionList.test.tsx
Task T011: Performance tests in the existing frontend and server performance files
```

## Implementation Strategy

### MVP First

1. Install the approved sortable dependency set.
2. Establish version 4 migration and strict preference/reorder contracts.
3. Implement and verify stable column sorting and persisted mode changes.
4. Implement queued anchor-based persistence and both PATCH endpoints.
5. Integrate pointer and keyboard row movement with rollback.
6. Stop and validate the independent User Story 1 flow.

### Complete Approved Journey

1. Preserve all Journey 1 list density and row fields.
2. Verify Journey 2's newly created positions still prepend to Manual order without changing the saved view mode.
3. Run full migration, regression, and 1,000-record performance checks.
4. Complete exact desktop/mobile visual and external usability validation.

## Notes

- All tasks are limited to the corrected Journey 3 specification and plan.
- Active Manual or column mode is persisted; column sorting never overwrites the canonical Manual sequence.
- The position record shape remains unchanged; the document advances to version 4 with list-view metadata.
- No company grouping, bulk selection, new list fields, remote persistence, or browser persistent storage is included.
- The original task list was approved on 2026-09-08; this corrected list requires re-approval before implementation.
