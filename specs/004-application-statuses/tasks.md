# Tasks: Personal Application Statuses

**Input**: Approved design documents from `specs/004-application-statuses/`

**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`, `contracts/`, and `quickstart.md`

**Status**: Approved

**Tests**: Required by the constitution, approved plan, acceptance scenarios, migration invariants, and measurable outcomes. Each test task must be written and confirmed to fail for the expected missing behavior before its implementation task begins.

**Organization**: Tasks are grouped by user story. Version 5 schema and migration support are foundational because all stories share the new overall and channel status types.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel because it targets a separate file and has no dependency on another incomplete task in the same group.
- **[US1]**: Track Overall Application Progress.
- **[US2]**: Track Application Channels.
- **[US3]**: Understand Status Meanings.

## Phase 1: Setup

**Purpose**: Establish a verified baseline and migration snapshot without changing application behavior.

- [X] T001 Run the current test, performance, and production-build scripts from `package.json` and record the version 4 position count, ID sequence, non-status fields, links, and list-view preference in `artifacts/004-application-statuses/baseline.json`

**Checkpoint**: Existing Journeys 1-3 pass and the exact pre-migration state is recorded.

---

## Phase 2: Foundational Version 5 Contracts

**Purpose**: Make every historical document readable under a strict version 5 model before story-specific behavior changes.

**CRITICAL**: No user story implementation begins until historical statuses are isolated from current statuses and migration invariants pass.

- [X] T002 Add failing tests for strict overall/channel enums, extended platform and career-page metadata, real calendar-date validation, version 4 list-view preservation, versions 1-3 compatibility, approved status mapping, null channel defaults, and unchanged identity/order/non-status fields in `shared/positionSchema.test.ts`
- [X] T003 Implement version 5 current schemas, dedicated legacy vacancy-status schemas, application-date validation helpers, and versions 1-4 normalization in `shared/positionSchema.ts`

**Checkpoint**: Shared tests prove all historical data normalizes losslessly into a valid version 5 document.

---

## Phase 3: User Story 1 - Track Overall Application Progress (Priority: P1) MVP

**Goal**: New and existing positions use the personal application workflow, and users can edit, filter, sort, and persist the overall status.

**Independent Test**: Create a position, confirm Saved is the default, change it through all nine statuses from details, reload, and verify detail, row, filter, and workflow sorting agree.

### Tests for User Story 1

- [X] T004 [P] [US1] Add failing tests for the nine labels, exact workflow sort order, reverse order, and equal-value stability in `src/features/positions/positionSort.test.ts`
- [X] T005 [P] [US1] Add failing repository tests for Saved creation, direct overall-status updates, timestamps, atomic rollback, and serialized status writes in `server/positionsRepository.test.ts`
- [X] T006 [P] [US1] Add failing API tests for new status filters, strict detail updates, Saved creation responses, malformed statuses, and stable write errors in `server/index.test.ts`
- [X] T007 [P] [US1] Add failing creation and detail tests for the Saved default, editable overall-status selector, authoritative saved response, validation, pending state, and retry-safe failure state in `src/features/positions/components/PositionCreateRoute.test.tsx` and `src/features/positions/components/PositionDetailsRoute.test.tsx`
- [X] T008 [P] [US1] Add failing list and row tests for the compact status filter menu, all nine options, new badge labels, filter requests, unchanged six columns, and unchanged row height contract in `src/features/positions/components/PositionList.test.tsx` and `src/features/positions/components/PositionRow.test.tsx`

### Implementation for User Story 1

- [X] T009 [P] [US1] Replace current overall status values and labels with the approved personal workflow exports in `src/features/positions/positionTypes.ts`
- [X] T010 [P] [US1] Update status comparison ranking to the approved nine-value order in `src/features/positions/positionSort.ts`
- [X] T011 [US1] Default new positions without qualifying channel activity to Saved and persist direct overall-status detail updates through the existing queued atomic write in `server/positionsRepository.ts`
- [X] T012 [US1] Return and validate new overall status values through existing list, create, and detail API routes in `server/index.ts` and `src/features/positions/positionApi.ts`
- [X] T013 [US1] Show Saved as the creation default and add the overall-status selector to the detail form, resetting from the authoritative saved Position response in `src/features/positions/components/PositionCreateRoute.tsx` and `src/features/positions/components/PositionDetailsRoute.tsx`
- [X] T014 [US1] Replace expanded status tabs with a labeled compact filter menu while preserving search, Manual order, sorting, and six compact columns in `src/features/positions/components/PositionList.tsx`
- [X] T015 [US1] Add restrained badge variants and compact responsive filter styles without changing the 38-pixel row shell in `src/styles.css`

**Checkpoint**: User Story 1 works independently with no channel metadata or help panel required for the main status workflow.

---

## Phase 4: User Story 2 - Track Application Channels (Priority: P2)

**Goal**: Each platform and career-page channel retains an independent optional status and application date, including safe overall advancement.

**Independent Test**: Save at least five platform channels plus a career page with different statuses/dates, reload, edit one, and verify every other channel remains unchanged; then prove qualifying channels advance only Saved positions.

### Tests for User Story 2

- [X] T016 [P] [US2] Add failing repository tests for independent channel persistence, local-clock future-date rejection, Saved-to-Applied advancement on create/update, no overwrite of later statuses, atomic rollback, and concurrent writes in `server/positionsRepository.test.ts`
- [X] T017 [P] [US2] Add failing API and client tests for extended channel requests/responses, field-path date errors, null career metadata rules, automatic advancement responses, and stable persistence failures in `server/index.test.ts` and `src/features/positions/positionApi.test.ts`
- [X] T018 [P] [US2] Create failing editor tests for per-platform and career-page status/date controls, untracked values, today suggestion, editable/clearable dates, link isolation, URL clearing confirmation, and field-level errors in `src/features/positions/components/PublicationLinksEditor.test.tsx`
- [X] T019 [P] [US2] Add failing create/detail integration tests for hydrating and submitting channel metadata, preserving entries after failure, and adopting the repository's automatically advanced status in `src/features/positions/components/PositionCreateRoute.test.tsx` and `src/features/positions/components/PositionDetailsRoute.test.tsx`

### Implementation for User Story 2

- [X] T020 [US2] Validate non-future application dates with the injectable local clock and apply the shared safe-advancement rule during queued create/update writes in `server/positionsRepository.ts`
- [X] T021 [US2] Map strict channel validation issues to stable field paths while preserving the existing detail and create routes in `server/index.ts` and `src/features/positions/positionApi.ts`
- [X] T022 [US2] Extend platform rows and the career-page area with optional status/date controls, local-today suggestion, clearing confirmation, and isolated immutable updates in `src/features/positions/components/PublicationLinksEditor.tsx`
- [X] T023 [US2] Hydrate, submit, and reconcile extended channel metadata in creation and detail forms while retaining retryable user input on failure in `src/features/positions/components/PositionCreateRoute.tsx` and `src/features/positions/components/PositionDetailsRoute.tsx`
- [X] T024 [US2] Add compact desktop/mobile grid rules for channel status and date controls without nested cards or page overflow in `src/styles.css`

**Checkpoint**: User Stories 1 and 2 persist independently and atomically, and channel state never detaches from its link.

---

## Phase 5: User Story 3 - Understand Status Meanings (Priority: P3)

**Goal**: Overall and channel definitions are available on demand wherever their statuses are filtered or edited, without adding permanent visual noise.

**Independent Test**: Use keyboard-only controls to open both definition sets from list and form contexts, verify every approved definition, dismiss with Escape, and confirm focus and data remain unchanged.

### Tests for User Story 3

- [X] T025 [P] [US3] Add failing keyboard, Escape, focus-restoration, accessible-name, definition-content, and no-data-change tests in `src/features/positions/components/StatusHelp.test.tsx`
- [X] T026 [P] [US3] Add failing placement tests for overall help beside the list/detail controls and channel help in the publication editor in `src/features/positions/components/PositionList.test.tsx`, `src/features/positions/components/PositionDetailsRoute.test.tsx`, and `src/features/positions/components/PublicationLinksEditor.test.tsx`

### Implementation for User Story 3

- [X] T027 [P] [US3] Add the approved overall and channel definitions as typed presentation constants in `src/features/positions/positionTypes.ts`
- [X] T028 [US3] Implement the reusable icon-triggered, dismissible, focus-restoring definition panel in `src/features/positions/components/StatusHelp.tsx`
- [X] T029 [US3] Integrate the appropriate StatusHelp variant beside list, detail, platform, and career-page status controls in `src/features/positions/components/PositionList.tsx`, `src/features/positions/components/PositionDetailsRoute.tsx`, and `src/features/positions/components/PublicationLinksEditor.tsx`
- [X] T030 [US3] Style the help trigger and panel for compact dark desktop/mobile layouts, clear focus, readable contrast, and no row expansion in `src/styles.css`

**Checkpoint**: All three user stories work independently and the definitions are discoverable without cluttering rows.

---

## Phase 6: Migration and Cross-Cutting Verification

**Purpose**: Apply the verified migration to real data and prove regression, integrity, performance, and visual requirements.

- [X] T031 Normalize `data/positions.json` to version 5 and compare it with `artifacts/004-application-statuses/baseline.json`, preserving all 13 IDs, Manual sequence, list-view preference, non-status details, and existing link values while applying only approved status mappings and null channel defaults
- [X] T032 Run the complete automated suite, performance suite, and production build from `./package.json`, fixing only regressions within files named by this feature's approved plan
- [X] T033 Verify no `localStorage` or `sessionStorage` persistence, strict version 5 data, unique IDs, exact status mapping, null migrated channel metadata, and unchanged list-view state in `artifacts/004-application-statuses/validation-results.md`
- [ ] T034 Execute and time Scenarios 1-9 from `specs/004-application-statuses/quickstart.md`, including the 20-second overall-status and 30-second channel-identification targets, and record outcomes, failures, advancement, and restart persistence in `artifacts/004-application-statuses/validation-results.md`
- [ ] T035 Capture and inspect list, detail form, publication editor, and help panels at 1440x900 and 390x844, recording overlap, clipping, focus, contrast, row height, and page-overflow evidence in `artifacts/004-application-statuses/visual-review.md`

**Checkpoint**: The checked-in application runs on version 5 with every approved scenario verified and no regression to Journeys 1-3.

---

## Dependencies and Execution Order

### Phase Dependencies

- **Setup**: Starts only after explicit implementation approval.
- **Foundation**: Depends on T001 and blocks all user stories.
- **User Story 1**: Depends on the version 5 contracts and provides the MVP.
- **User Story 2**: Depends on version 5 contracts and integrates with User Story 1's overall status update.
- **User Story 3**: Depends on the final overall/channel option sets but not on repository implementation.
- **Migration and verification**: Starts only after all desired stories pass focused tests.

### User Story Dependencies

- **User Story 1 (P1)**: Begins after Phase 2 and is independently demonstrable without channel metadata or help.
- **User Story 2 (P2)**: Begins after Phase 2; its automatic advancement integrates with the overall status behavior completed in User Story 1.
- **User Story 3 (P3)**: Can begin after Phase 2 constants are stable, but final placement requires the User Story 1 and 2 controls.

### Within Each User Story

1. Write the listed tests and verify expected failure before implementation.
2. Implement domain/repository behavior before API integration.
3. Implement controls before cross-component wiring and styling.
4. Run focused tests at each checkpoint.
5. Do not migrate checked-in data until all current readers accept version 5.

## Parallel Opportunities

- T004-T008 target distinct sorting, repository, API, and component test boundaries.
- T009 and T010 target separate presentation and comparator modules.
- T016-T019 split repository/API behavior from editor/form tests.
- T025 and T026 split the reusable help behavior from integration placement.
- Repository and UI work can proceed in parallel only after shared version 5 schemas pass.

## Parallel Example: User Story 2

```text
Task T016: Repository channel persistence and advancement tests
Task T017: API/client channel contract tests
Task T018: PublicationLinksEditor interaction tests
Task T019: Create/detail form integration tests
```

## Implementation Strategy

### MVP First

1. Capture the version 4 baseline.
2. Establish strict version 5 normalization.
3. Complete User Story 1 and verify the personal overall workflow independently.
4. Stop at the checkpoint if only the corrected main status is needed.

### Complete Approved Journey

1. Add independent platform and career-page tracking with safe advancement.
2. Add status definitions only after the controls and option sets are stable.
3. Migrate checked-in data and compare against the baseline.
4. Run full automated, persistence, and exact-viewport validation.

## Notes

- No new dependency, endpoint, persistent store, compact-row field, question feature, history timeline, reminder, notification, or analytics work is included.
- The position document changes only after implementation approval and passing migration tests.
- Test fixtures may use historical versions, but production data migration waits until T031.
- External or exact-viewport results must not be fabricated; leave their tasks open if the required evidence cannot be obtained.
