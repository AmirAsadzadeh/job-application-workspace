---
description: "Dependency-ordered tasks for Review Current Positions and its approved publication-details amendment"
---

# Tasks: Review Current Positions

**Input**: Corrected design documents from `specs/001-review-positions/`

**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`, `contracts/`,
`quickstart.md`

**Status**: Approved

**Tests**: Included because the constitution requires focused automated, visual,
performance, and acceptance verification.

**Organization**: Tasks implement the single P1 journey. T001-T030 preserve the original
implementation record; T031 onward covers the approved publication links and rich-text
description amendment without creating a second journey.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel after its stated prerequisites because it has a distinct write set.
- **[US1]**: Maps directly to User Story 1, Scan Current Positions.

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Add the approved local-service and test tooling without changing product behavior.

- [X] T001 Add Zod, tsx, Vitest, Testing Library, jest-dom, and jsdom dependencies plus test, performance, build, and local-service scripts in `package.json` and `package-lock.json`
- [X] T002 [P] Extend TypeScript coverage for `server/`, `shared/`, and tests in `tsconfig.app.json`, `tsconfig.node.json`, and new `tsconfig.server.json`
- [X] T003 [P] Configure the jsdom environment and setup reference in `vite.config.ts`
- [X] T004 [P] Register shared DOM assertions and test cleanup in `tests/setup.ts`

**Checkpoint**: Dependencies, scripts, compilation boundaries, and test environment are ready.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Establish one validated type and local-file contract for list and detail data.

**CRITICAL**: User Story 1 work cannot begin until this phase is complete.

- [X] T005 Define versioned positions, reference-data, detail-update, Company, HiringManager, Salary, Department, Team, Location, status, work-mode, and employment-type schemas and inferred types in `shared/positionSchema.ts`
- [X] T006 [P] Convert seed records to validated IDs, company data, and structured hiring-manager data in `data/positions.json`
- [X] T007 [P] Add selectable departments with nested teams and selectable locations in `data/reference-data.json`
- [X] T008 [P] Define the `/company-logos/<filename>` asset policy and fallback expectation in `public/company-logos/README.md`
- [X] T009 Rework UI labels and shared type re-exports without duplicate domain definitions in `src/features/positions/positionTypes.ts`

**Checkpoint**: Positions, selector options, logo paths, and frontend types share one validated contract.

---

## Phase 3: User Story 1 - Review and Update Position Details (Priority: P1) MVP

**Goal**: Let the user review every position in one discreet, thin list, preserve existing
search/status filters, open a position, select department/team/location, edit hiring-manager
details, and save those changes to local JSON.

**Independent Test**: Start the local app with valid data; confirm compact row content,
filters, navigation, selectors, manager validation, atomic save, updated timestamp, file
refresh, and all loading/error/empty states without another user journey.

### Tests for User Story 1

> Write these tests first and confirm they fail for the expected missing behavior before implementation.

- [X] T010 [P] [US1] Test positions/reference reads, relationship validation, atomic updates, unchanged originals on failure, duplicate IDs, and unsafe logo paths in `server/positionsRepository.test.ts`
- [X] T011 [P] [US1] Test list/search/status queries, summary-only responses, detail/reference reads, approved PATCH fields, stable errors, and missing IDs in `server/index.test.ts`
- [X] T012 [P] [US1] Test required columns, prohibited row content, existing filters, statuses, logo fallback, loading, empty, error, retry, long text, and navigation in `src/features/positions/components/PositionList.test.tsx`
- [X] T013 [P] [US1] Test department/team/location selectors, dependent team clearing, manager completeness, pending state, save success, and retained values on failure in `src/features/positions/components/PositionDetailsRoute.test.tsx`
- [X] T014 [P] [US1] Add a generated 1,000-record file-read and list-response performance check in `server/positionsPerformance.test.ts`
- [X] T015 [P] [US1] Add a focused row-activation performance check in `src/features/positions/components/PositionList.performance.test.tsx`

### Implementation for User Story 1

- [X] T016 [P] [US1] Implement validated positions/reference reads, query matching, relationship checks, serialized temporary-file writes, atomic rename, and stable repository errors in `server/positionsRepository.ts`
- [X] T017 [US1] Implement the local host, list/detail/reference endpoints, approved PATCH endpoint, safe company-logo serving, frontend serving, and app-route fallback in `server/index.ts`
- [X] T018 [P] [US1] Implement typed list filters, detail/reference loading, and detail-update requests in `src/features/positions/positionApi.ts`
- [X] T019 [P] [US1] Implement the accessible fixed-height company, position, status, work-mode, seniority, and updated-date row in `src/features/positions/components/PositionRow.tsx`
- [X] T020 [US1] Implement aligned headers, compact preserved filters, and loading/populated/empty/error/retry list states in `src/features/positions/components/PositionList.tsx`
- [X] T021 [P] [US1] Implement detail loading, department/team/location selects, manager inputs, validation, pending/success/error save states, and not-found behavior in `src/features/positions/components/PositionDetailsRoute.tsx`
- [X] T022 [US1] Integrate API state, list filtering, return refresh, built-in routing, detail saving, and compact page chrome in `src/app/App.tsx`
- [X] T023 [US1] Replace card styling with the dark neutral grid, 36-42 pixel desktop rows, fixed logos, truncation, compact form controls, focus states, and narrow horizontal overflow in `src/styles.css`
- [X] T024 [US1] Remove obsolete browser-storage and in-bundle seed modules at `src/features/positions/positionStorage.ts` and `src/features/positions/data/seedPositions.ts`

**Checkpoint**: User Story 1 is independently functional and all focused tests pass.

---

## Phase 4: Cross-Cutting Verification

**Purpose**: Prove the corrected journey meets every measurable and constitutional gate.

- [X] T025 Run all automated tests and resolve only journey-related failures in `server/positionsRepository.test.ts`, `server/index.test.ts`, `server/positionsPerformance.test.ts`, `src/features/positions/components/PositionList.test.tsx`, `src/features/positions/components/PositionList.performance.test.tsx`, and `src/features/positions/components/PositionDetailsRoute.test.tsx`
- [X] T026 Run TypeScript and production builds and resolve only feature-related failures in `tsconfig.app.json`, `tsconfig.server.json`, `vite.config.ts`, `server/`, `shared/`, and `src/features/positions/`
- [ ] T027 [P] Validate the desktop and narrow scenarios and save screenshots under `artifacts/001-review-positions/screenshots/` using `specs/001-review-positions/quickstart.md`
- [X] T028 [P] Verify keyboard operation, focus visibility, readable contrast, overflow, text overlap, selector labels, and at least 10 visible rows against `specs/001-review-positions/contracts/positions-list-ui.md`
- [X] T029 [P] Run both server and UI performance validations and record conditions and results in `artifacts/001-review-positions/performance-results.md`
- [ ] T030 [P] Conduct and record 10 timed SC-001, SC-002, and SC-005 usability trials in `artifacts/001-review-positions/usability-results.md`

**Checkpoint**: Automated checks pass and recorded evidence demonstrates all approved outcomes.

---

## Phase 5: Amendment Setup and Test Contracts

**Purpose**: Add the approved editor dependency and define the amended behavior with
failing tests before changing production behavior.

- [X] T031 Add `@tiptap/react`, `@tiptap/pm`, and `@tiptap/starter-kit` dependencies in `package.json` and `package-lock.json`
- [X] T032 [P] [US1] Test version 1 description normalization, version 2 rich-text and publication-link reads, HTTP/HTTPS URL validation, incomplete pairs, atomic version 2 writes, and unchanged originals on failure in `server/positionsRepository.test.ts`
- [X] T033 [P] [US1] Test expanded detail responses and PATCH acceptance/rejection for `jobPlatformLinks`, `careerPageUrl`, and structured `description` in `server/index.test.ts`
- [X] T034 [P] [US1] Test heading, bold, italic, bullet-list, numbered-list, link, keyboard-focus, empty-content, paste-cleanup, and JSON round-trip behavior in `src/features/positions/editor/JobDescriptionEditor.test.tsx`
- [X] T035 [P] [US1] Test adding/removing platform rows, optional empty values, partial-pair and URL guidance, retained failed-save values, and restored saved details in `src/features/positions/components/PositionDetailsRoute.test.tsx`
- [X] T036 [P] [US1] Extend prohibited row-content assertions for platform links, career-page addresses, and rich descriptions in `src/features/positions/components/PositionList.test.tsx`

**Checkpoint**: Amendment tests fail only for the new unimplemented behavior.

---

## Phase 6: Amendment Data and Detail Implementation

**Goal**: Let the user maintain optional publication links and a focused formatted job
description in position details while preserving the compact first-page list.

**Independent Test**: Open one position, add two named platform links and one career-page
address, format the description with every approved command, save, reload, and verify the
values and formatting return while none appears in the list row. Repeat with empty and
invalid values to verify optional and blocked-save behavior.

- [X] T037 [US1] Add version 1 and version 2 document schemas, `JobPlatformLink`, restricted recursive rich-text nodes/marks, HTTP/HTTPS URL rules, migration types, and expanded detail-update schema in `shared/positionSchema.ts`
- [X] T038 [P] [US1] Convert sample records to version 2 with readable structured descriptions, optional platform links, and optional career-page addresses in `data/positions.json`
- [X] T039 [US1] Implement version 1 normalization, version 2 relationship/content validation, publication-link validation, and atomic version 2 persistence in `server/positionsRepository.ts`
- [X] T040 [US1] Expand detail and PATCH handling for publication links and structured descriptions while preserving summary-only list responses in `server/index.ts`
- [X] T041 [P] [US1] Expand typed detail loading and update requests for the amended contract in `src/features/positions/positionApi.ts` and `src/features/positions/positionTypes.ts`
- [X] T042 [P] [US1] Implement the restricted Tiptap editor using StarterKit's built-in Link, explicitly disable unsupported StarterKit nodes and marks, and add the icon toolbar, active states, link entry, paste cleanup, accessible labels, and JSON change contract in `src/features/positions/editor/JobDescriptionEditor.tsx`
- [X] T043 [P] [US1] Implement compact repeatable platform-name/URL rows, add/remove icon commands, career-page input, and inline field guidance in `src/features/positions/components/PublicationLinksEditor.tsx`
- [X] T044 [US1] Integrate publication fields and the rich-text editor into loading, validation, pending, success, failure, and reload behavior in `src/features/positions/components/PositionDetailsRoute.tsx`
- [X] T045 [US1] Add restrained editor, toolbar, link-row, validation, focus, and responsive detail styling without changing list density in `src/styles.css`

**Checkpoint**: The amended User Story 1 is independently functional and focused tests pass.

---

## Phase 7: Amendment Verification

**Purpose**: Prove migration, persistence, accessibility, and visual behavior without
regressing the approved compact list.

- [X] T046 Run all repository, API, list, detail, and editor tests and resolve amendment-related failures in `server/*.test.ts` and `src/features/positions/**/*.test.tsx`
- [X] T047 Run TypeScript and production builds and resolve amendment-related failures in `shared/`, `server/`, and `src/features/positions/`
- [X] T048 [P] Extend the 1,000-record fixture with version 2 descriptions and publication links and confirm the one-second list target in `server/positionsPerformance.test.ts` and `artifacts/001-review-positions/performance-results.md`
- [X] T049 [P] Validate desktop and 390-pixel detail layouts, keyboard toolbar operation, focus visibility, text overflow, list-row exclusion, and saved-content reload against `specs/001-review-positions/quickstart.md`, recording results in `artifacts/001-review-positions/visual-verification.md`
- [X] T050 [P] Verify and time a real version 1-to-version 2 save with two platform links, one career-page address, and every supported description format; confirm completion within three minutes, valid and invalid link behavior, atomic replacement, and unchanged unrelated fields in `artifacts/001-review-positions/amendment-acceptance.md`

**Checkpoint**: Automated and browser-assisted evidence covers FR-016 through FR-024 and
SC-006 through SC-008.

---

## Dependencies and Execution Order

### Phase Dependencies

- **Phase 1 - Setup**: No dependencies; starts after corrected task-list approval.
- **Phase 2 - Foundational**: Depends on Phase 1 and blocks User Story 1.
- **Phase 3 - User Story 1**: Depends on Phase 2. Tests T010-T015 precede implementation.
- **Phase 4 - Verification**: Depends on completed User Story 1 implementation.
- **Phase 5 - Amendment Setup and Tests**: Depends on the approved amended plan; T031
  precedes editor tests, while T032, T033, T035, and T036 can otherwise proceed in parallel.
- **Phase 6 - Amendment Implementation**: Depends on the failing amendment tests. T037
  precedes T038-T044; T042 and T043 can proceed in parallel before T044 integration.
- **Phase 7 - Amendment Verification**: Depends on completed amendment implementation;
  T048-T050 may proceed in parallel after T046 and T047 pass.

### Within User Story 1

1. T010-T015 define expected failures before implementation.
2. T016, T018, T019, and T021 may proceed in parallel after tests exist.
3. T017 depends on T016.
4. T020 depends on T018 and T019.
5. T022 depends on T017, T018, T020, and T021.
6. T023 follows stable component markup from T019-T022.
7. T024 follows successful API integration so browser storage is not removed early.
8. T025-T030 verify the integrated journey.
9. T031-T036 establish the amendment dependency and failing test contracts.
10. T037-T043 implement shared data, service, API, editor, and publication-link boundaries.
11. T044-T045 integrate and style the complete amended detail route.
12. T046-T050 verify the amended journey and preserve original list behavior.

## Parallel Opportunities

- T002-T004 modify separate setup files after T001.
- T006-T008 modify separate data/asset files after T005; T009 then resolves UI ownership.
- T010-T015 create separate test files after Phase 2.
- T016, T018, T019, and T021 modify separate implementation boundaries after tests exist.
- T027-T030 record separate verification evidence after a successful build.
- T032-T036 modify separate amendment test boundaries after T031.
- T038, T041, T042, and T043 have distinct write sets after T037.
- T048-T050 record separate verification evidence after the amendment build passes.

## Parallel Example: User Story 1

```text
Task T016: Implement file repository in server/positionsRepository.ts
Task T018: Implement typed API client in src/features/positions/positionApi.ts
Task T019: Implement compact row in src/features/positions/components/PositionRow.tsx
Task T021: Implement editable details in src/features/positions/components/PositionDetailsRoute.tsx
```

## Parallel Example: Publication Details Amendment

```text
Task T038: Convert the sample positions document to version 2 in data/positions.json
Task T041: Expand frontend API types in src/features/positions/positionApi.ts
Task T042: Implement the rich-text editor in src/features/positions/editor/JobDescriptionEditor.tsx
Task T043: Implement repeatable links in src/features/positions/components/PublicationLinksEditor.tsx
```

## Implementation Strategy

### MVP First

1. Complete setup and the shared schema/data foundation.
2. Write and observe expected failures in T010-T015.
3. Implement list review, detail selection/editing, and local JSON saving.
4. Stop and complete all verification before expanding product scope.
5. For the amendment, establish failing tests, migrate the shared schema, implement the
   two focused detail editors, integrate save behavior, and rerun all original checks.

### Approval Gate

This amended task list does not authorize implementation. After user approval, rerun
`$speckit-analyze`; implementation begins only after the user reviews that result and
explicitly approves `$speckit-implement`.

## Notes

- Department, team, location, and hiring-manager values are editable only in details and
  never appear in first-page rows.
- Publication links and the formatted description are also editable only in details and
  never appear in first-page rows.
- Preserve existing search and status filters; do not add sorting, grouping, authentication,
  remote storage, status editing, or unrelated detail fields.
- Every task names its exact file boundary and stays within the corrected journey.
