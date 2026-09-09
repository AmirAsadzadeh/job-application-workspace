# Tasks: Create a Job Position

**Input**: Approved design documents from `specs/002-create-position/`

**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`, `contracts/`, and `quickstart.md`

**Status**: Approved

**Tests**: Required by the approved plan and success criteria. Write each listed test before
its corresponding implementation and confirm it fails for the expected reason.

**Organization**: This feature contains one independently testable P1 user story. Shared
versioning and migration work is foundational because every repository read and write
depends on the version 3 model.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel because it targets a separate file and has no dependency on
  another incomplete task in the same group.
- **[US1]**: Implements or verifies User Story 1, Create a Position.

## Phase 1: Setup

**Purpose**: Establish the runtime-owned local logo location without changing application
behavior.

- [X] T001 Create the runtime logo-directory policy, generated-filename rules, and non-secret asset guidance in `data/company-logos/README.md`

**Checkpoint**: The planned local upload location exists and its ownership is documented.

---

## Phase 2: Foundational Data Model and Migration

**Purpose**: Establish the version 3 data contract required by every Journey 2 code path.

**CRITICAL**: User Story 1 implementation cannot begin until the shared schema can parse
version 3 and normalize legacy documents without losing data.

- [X] T002 [P] Add failing version 3 schema, exclusive-logo-source, fixed-seniority, create-input, upload-size/format, and version 1/version 2 requirements-migration tests in `shared/positionSchema.test.ts`
- [X] T003 Implement version 3 position, company-logo, seniority, create-input, field-issue, and legacy-normalization schemas and helpers in `shared/positionSchema.ts`
- [X] T004 Update existing typed fixtures for the version 3 company shape and removed `requirements` field in `server/index.test.ts`, `server/positionsRepository.test.ts`, `server/positionsPerformance.test.ts`, `src/features/positions/components/PositionDetailsRoute.test.tsx`, and `src/features/positions/components/PositionList.performance.test.tsx`
- [X] T005 Migrate the checked-in records to version 3 by adding `logoUrl`, appending each requirements array to its rich description, and removing every `requirements` property in `data/positions.json`

**Checkpoint**: Shared tests prove versions 1 and 2 normalize losslessly to strict version
3, and the checked-in JSON is valid version 3 data.

---

## Phase 3: User Story 1 - Create a Position (Priority: P1) MVP

**Goal**: Create a valid Draft position from one compact page, persist it safely in local
files, and return to the list with its compact row first.

**Independent Test**: From the positions list, open `New position`, enter only company
name, position name, work mode, and seniority, save, and verify the generated Draft record
is first in the reloaded list and opens with Full-time plus empty optional details.

### Tests for User Story 1

- [X] T006 [P] [US1] Add failing repository tests for defaults, generated IDs/timestamps, prepend order, duplicate names, relationships, serialized creates/updates, upload persistence/cleanup, and unchanged JSON on failure in `server/positionsRepository.test.ts`
- [X] T007 [P] [US1] Add failing API contract tests for `POST /api/positions`, field issues, request-size rejection, stable errors, and safely served uploaded logos in `server/index.test.ts`
- [X] T008 [P] [US1] Add failing list-entry tests for the compact plus icon, `New position` label, accessible activation, and unchanged compact row fields in `src/features/positions/components/PositionList.test.tsx`
- [X] T009 [P] [US1] Add failing minimum-form, complete-form, defaults, conditional validation, selector dependency, retry, retained-value, and duplicate-submit tests in `src/features/positions/components/PositionCreateRoute.test.tsx`
- [X] T010 [P] [US1] Add failing logo-mode, preview, fallback, file-type, byte-limit, malformed-URL, and exclusive-source tests in `src/features/positions/components/CompanyLogoInput.test.tsx`
- [X] T011 [P] [US1] Add failing list/create/detail route and dirty navigation-guard tests in `src/app/App.test.tsx`
- [X] T012 [P] [US1] Add failing remote-logo display and fixed fallback-size regression tests in `src/features/positions/components/PositionRow.test.tsx`
- [X] T013 [P] [US1] Extend detail-route tests for remote company logos and version 3 records in `src/features/positions/components/PositionDetailsRoute.test.tsx`

### Persistence and API Implementation

- [X] T014 [US1] Extend the shared repository write queue with validated create, UUID/timestamp defaults, prepend behavior, staged logo writes, generated filenames, rollback cleanup, and version 3 atomic persistence in `server/positionsRepository.ts`
- [X] T015 [US1] Implement the bounded JSON body reader, `POST /api/positions`, structured validation responses, `413` handling, and restricted uploaded-logo serving in `server/index.ts`
- [X] T016 [US1] Add create request/response parsing, structured API errors, and `createPosition` to the frontend client in `src/features/positions/positionApi.ts`
- [X] T017 [P] [US1] Export fixed seniority and employment-type values and labels with version 3 types in `src/features/positions/positionTypes.ts`

### Creation UI Implementation

- [X] T018 [US1] Implement mutually exclusive None, Upload, and Image URL modes with base64 conversion, validation, preview, and fallback in `src/features/positions/components/CompanyLogoInput.tsx`
- [X] T019 [US1] Implement the six-section compact creation form, defaults, reference selectors, manager/salary normalization, publication links, rich description, field errors, focus handling, save states, and success navigation in `src/features/positions/components/PositionCreateRoute.tsx`
- [X] T020 [P] [US1] Add the compact plus icon and `New position` toolbar control without changing row content or density in `src/features/positions/components/PositionList.tsx`
- [X] T021 [US1] Extend route parsing and navigation for `/positions/new`, wire creation/list callbacks, and guard dirty internal, history, and unload navigation in `src/app/App.tsx`
- [X] T022 [P] [US1] Render `logoUrl` or `logoPath` with the existing error fallback and stable dimensions in `src/features/positions/components/PositionRow.tsx`
- [X] T023 [P] [US1] Render remote or local company logos with fallback on the existing detail route in `src/features/positions/components/PositionDetailsRoute.tsx`
- [X] T024 [US1] Add compact dark creation-page grids, logo modes, inline errors, stable saving controls, and non-overlapping 390-pixel responsive rules in `src/styles.css`

**Checkpoint**: User Story 1 passes its focused automated tests and the independent minimum
creation test without relying on future journeys.

---

## Phase 4: Polish and Cross-Cutting Verification

**Purpose**: Prove migration, performance, visual quality, and Journey 1 regression safety.

- [X] T025 Add a 1,000-record create-and-prepend performance case to `server/positionsPerformance.test.ts`
- [X] T026 Run the full automated suite and production build from `package.json`, fixing only Journey 2 regressions in the files named by failing tests
- [ ] T027 Execute all ten manual scenarios in `specs/002-create-position/quickstart.md` and record results in `artifacts/002-create-position/validation-results.md`
- [ ] T028 Capture and inspect the creation form and resulting list at 1440x900 and 390x844, recording non-overlap, focus, contrast, density, and fallback evidence in `artifacts/002-create-position/visual-review.md`
- [X] T029 Verify the final `data/positions.json` is strict version 3, contains no `requirements` fields or base64 images, and confirm `src/` contains no persistent `localStorage` usage in `artifacts/002-create-position/validation-results.md`
- [ ] T030 Conduct ten first-attempt minimum-position usability trials and record completion, timing, assistance, and validation outcomes in `artifacts/002-create-position/usability-results.md`

**Checkpoint**: All automated and manual acceptance evidence passes, existing Journey 1
behavior remains intact, and no unapproved scope has been added.

---

## Dependencies and Execution Order

### Phase Dependencies

- **Phase 1, Setup**: Starts immediately.
- **Phase 2, Foundation**: Starts after T001. T002 must fail first; T003 makes it pass; T004
  and T005 then align existing fixtures and checked-in data.
- **Phase 3, User Story 1**: Starts after Phase 2. Tests T006-T013 are written before their
  corresponding implementation. Persistence/API work T014-T017 precedes creation form
  integration T018-T024.
- **Phase 4, Polish**: Starts only after the complete User Story 1 checkpoint passes.

### User Story Dependency

- **User Story 1 (P1)**: Depends only on the version 3 foundation. It has no dependency on
  another user story and constitutes the Journey 2 MVP.

### Within User Story 1

1. Write T006-T013 and verify each fails for missing Journey 2 behavior.
2. Complete T014 before T015 because the endpoint depends on repository creation.
3. Complete T015 before T016 so the client follows the implemented contract.
4. T017 can proceed in parallel with persistence/API work after the shared schema exists.
5. Complete T018 before T019; the creation route owns logo-input integration.
6. T020, T022, and T023 can proceed in parallel after the version 3 types compile.
7. Complete T019 and T020 before T021 wires routes and guards.
8. Complete T024 after the final component structure is known.

## Parallel Opportunities

- T002 begins after the small T001 setup checkpoint; parallel work starts within the later
  test and implementation groups.
- T006-T013 target separate test files and can be authored in parallel after Phase 2.
- T017 can run in parallel with T014-T016 after T003.
- T020, T022, and T023 target separate existing components and can run in parallel after
  their tests and shared types are ready.

## Parallel Example: User Story 1

```text
Task T006: Repository create and failure tests in server/positionsRepository.test.ts
Task T007: API create and logo-serving tests in server/index.test.ts
Task T008: List entry-control tests in src/features/positions/components/PositionList.test.tsx
Task T009: Creation-route interaction tests in src/features/positions/components/PositionCreateRoute.test.tsx
Task T010: Logo-input tests in src/features/positions/components/CompanyLogoInput.test.tsx
Task T011: Route and dirty-guard tests in src/app/App.test.tsx
Task T012: Row remote-logo tests in src/features/positions/components/PositionRow.test.tsx
Task T013: Detail remote-logo tests in src/features/positions/components/PositionDetailsRoute.test.tsx
```

## Implementation Strategy

### MVP First

1. Complete setup and strict version 3 migration.
2. Build repository and API creation behavior with failure safety.
3. Build and wire the minimum valid creation form.
4. Verify the independent test and stop if it does not pass.

### Complete Approved Journey

1. Add optional logo, assignment, manager, salary, publication, and description controls.
2. Add dirty navigation protection and remote-logo rendering.
3. Run all automated checks and the ten quickstart scenarios.
4. Complete desktop/mobile visual review and persistence inspection.

## Notes

- All tasks are limited to the approved Journey 2 specification and plan.
- Tests precede implementation for each behavior group.
- `[P]` tasks touch separate files but still respect their phase prerequisites.
- No task expands status management, company lookup, list row fields, authentication,
  collaboration, remote persistence, or filtering.
- Task generation was explicitly approved by the user on 2026-09-07. Implementation was
  explicitly approved by the user before execution.
