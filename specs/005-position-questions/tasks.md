# Tasks: Position Preparation and Interview Questions

**Input**: Approved design documents from `specs/005-position-questions/`

**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`, `contracts/`, and `quickstart.md`

**Status**: Approved

**Tests**: Required by the constitution, approved plan, acceptance scenarios, migration invariants, and measurable outcomes. Each test task must be written and confirmed to fail for the expected missing behavior before its implementation task begins.

**Organization**: Tasks are grouped by user story. Version 6 Position ownership, preparation metadata, and question-answer contracts are foundational because every story shares them.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel because it targets a separate file and has no dependency on another incomplete task in the same group.
- **[US1]**: Manage Position Questions.
- **[US2]**: Track Position Readiness.
- **[US3]**: Prepare Rich Answers and Code.
- **[US4]**: Find and Safely Navigate Questions.

## Phase 1: Setup

**Purpose**: Establish a verified version 5 baseline before storage or dependencies change.

- [X] T001 Run the current test, performance, and production-build scripts from `package.json` and record Position count, ID sequence, complete fields, application metadata, and list-view preference in `artifacts/005-position-questions/baseline.json`

**Checkpoint**: Existing journeys pass and the exact pre-migration state is recorded.

---

## Phase 2: Foundational Version 6 Contracts

**Purpose**: Define strict position-owned question, reading, and submitted-resume metadata before story-specific implementation.

**CRITICAL**: No user story implementation begins until all historical documents normalize losslessly and current Position children are validated strictly.

- [X] T002 Add failing tests for question/reading/resume metadata, unique child IDs, title/category/custom-category/link/file invariants, strict mutation inputs, all answer nodes/marks/code languages, and versions 1-5 migration preservation in `shared/positionSchema.test.ts`
- [X] T003 Implement version 6 PositionQuestion, ReadingItem, SubmittedResume, question-answer document, strict mutation input schemas, unique-ID refinements, and versions 1-5 normalization in `shared/positionSchema.ts`
- [X] T004 Export frontend preparation types, category labels, code-language labels, reading defaults, and resume-type labels from `src/features/positions/positionTypes.ts`

**Checkpoint**: Shared tests prove all historical documents become valid version 6 data with empty preparation collections and no submitted resume while preserving every previous value.

---

## Phase 3: User Story 1 - Manage Position Questions (Priority: P1) MVP

**Goal**: Create, edit, and delete title-only questions within one position using authoritative atomic persistence.

**Independent Test**: Add a titled question, reload, rename it, cancel and confirm deletion, and verify another position remains unchanged.

### Tests for User Story 1

- [X] T005 [P] [US1] Add failing repository tests for question create/update/delete, generated identity/timestamps, newest-first insertion, stable edit order, isolation, missing records, serialized writes, and byte-identical rollback in `server/positionsRepository.test.ts`
- [X] T006 [P] [US1] Add failing HTTP tests for all question routes, strict bodies, authoritative Position responses, malformed JSON, stable errors, and failed persistence in `server/index.test.ts`
- [X] T007 [P] [US1] Add failing client tests for typed question requests, encoded paths, authoritative parsing, and error propagation in `src/features/positions/positionApi.test.ts`
- [X] T008 [P] [US1] Create failing tests for empty state, count, title-only create/edit, expansion, Save/Cancel, delete confirmation, duplicates, pending controls, and retry-safe failures in `src/features/positions/components/PositionQuestionsSection.test.tsx`
- [X] T009 [P] [US1] Add failing detail integration tests for question hydration, independent saves, authoritative reconciliation, and placement in the preparation area after the details form in `src/features/positions/components/PositionDetailsRoute.test.tsx`

### Implementation for User Story 1

- [X] T010 [US1] Implement queued atomic question create/update/delete methods with scoped lookup, generated metadata, Position timestamp changes, and stable repository errors in `server/positionsRepository.ts`
- [X] T011 [US1] Implement POST/PATCH/DELETE question routes with strict validation, path decoding, and stable JSON responses in `server/index.ts`
- [X] T012 [US1] Add typed question mutation methods and authoritative Position validation in `src/features/positions/positionApi.ts`
- [X] T013 [US1] Implement compact title-only question rows, one inline editor, authoritative reconciliation, pending/error states, and confirmed deletion in `src/features/positions/components/PositionQuestionsSection.tsx`
- [X] T014 [US1] Mount PositionQuestionsSection in an independent preparation area after the existing detail form without joining the position-save lifecycle in `src/features/positions/components/PositionDetailsRoute.tsx`
- [X] T015 [US1] Add restrained question header, count, compact row, inline editor, actions, errors, and empty-state styles in `src/styles.css`

**Checkpoint**: User Story 1 works independently with required titles, empty answers, Uncategorized questions, atomic persistence, and cross-position isolation.

---

## Phase 4: User Story 2 - Track Position Readiness (Priority: P2)

**Goal**: Track compact reading items and retain one managed submitted PDF or DOCX resume for each position.

**Independent Test**: Add/edit/complete/delete readings; import, reopen, replace, and remove one resume after moving its source; verify failures and same-named files never affect previous or other-position data.

### Tests for User Story 2

- [X] T016 [P] [US2] Add failing repository tests for reading lifecycle, direct status changes, newest-first/stable order, timestamps, isolation, strict links, serialized writes, and rollback in `server/positionsRepository.test.ts`
- [X] T017 [P] [US2] Create failing file-storage tests for streamed staging, authoritative PDF/DOCX detection with empty/generic/conflicting MIME hints, unsupported content, path containment, opaque same-name isolation, open streaming, unavailable files, cleanup, and injected compensation failures in `server/resumeStorage.test.ts`
- [X] T018 [P] [US2] Add failing HTTP tests for reading CRUD and resume PUT/GET/DELETE, raw headers/body, binary response headers, stable errors, authoritative metadata, and rollback behavior in `server/index.test.ts`
- [X] T019 [P] [US2] Add failing client tests for reading mutations, raw File upload, encoded filename header, resume open URL, removal, authoritative parsing, and errors in `src/features/positions/positionApi.test.ts`
- [X] T020 [P] [US2] Create failing Readiness tests for section structure, reading forms/rows, direct checkbox behavior, order, Save/Cancel/Delete, PDF/DOCX import, metadata, Open/Replace/Remove, pending/unavailable/error states, and keyboard focus in `src/features/positions/components/PositionReadinessSection.test.tsx`
- [X] T021 [P] [US2] Add failing detail integration tests for Job description/Readiness/Questions order, readiness hydration, independent mutation reconciliation, cross-position reset, and unrelated position-save preservation in `src/features/positions/components/PositionDetailsRoute.test.tsx`

### Implementation for User Story 2

- [X] T022 [US2] Add the ESM `file-type` dependency compatible with the current Node runtime to `package.json` and `package-lock.json`
- [X] T023 [US2] Implement contained resume paths, raw request streaming, staged-file detection, hardened opening, tombstones, cleanup, and injectable file operations in `server/resumeStorage.ts`
- [X] T024 [US2] Implement queued reading create/update/delete with strict complete inputs, direct status persistence, authoritative metadata, and isolation in `server/positionsRepository.ts`
- [X] T025 [US2] Coordinate resume import/replace/remove with staged promotion, Position metadata writes, prior-file retirement, and compensating rollback through the repository queue in `server/positionsRepository.ts`
- [X] T026 [US2] Implement reading routes plus position-scoped resume PUT/GET/DELETE streaming and stable errors without exposing `/data` in `server/index.ts`
- [X] T027 [US2] Add typed reading methods, raw resume upload, scoped open URL, resume removal, and authoritative parsing in `src/features/positions/positionApi.ts`
- [X] T028 [US2] Implement PositionReadinessSection with compact newest-first readings, direct Read checkbox, inline plain-text editor, confirmed deletion, and the single submitted-resume lifecycle in `src/features/positions/components/PositionReadinessSection.tsx`
- [X] T029 [US2] Render Readiness after Job description and before Questions, reconcile authoritative Position responses, and reset preparation state when positionId changes in `src/features/positions/components/PositionDetailsRoute.tsx`
- [X] T030 [US2] Add compact reading/resume layout, filename truncation, native file control, pending/error/unavailable states, visible focus, and desktop/mobile constraints in `src/styles.css`

**Checkpoint**: User Stories 1 and 2 work independently; readiness survives reload, managed copies survive source movement, and reported failures preserve the previous visible data/file pair.

---

## Phase 5: User Story 3 - Prepare Rich Answers and Code (Priority: P3)

**Goal**: Author and persist structured answers containing multiple readable, language-aware code blocks.

**Independent Test**: Save and reload every supported prose format, inline code, multiple code blocks, all nine language labels, and exact code whitespace.

### Tests for User Story 3

- [X] T031 [P] [US3] Create failing editor tests for prose controls, inline code, multiple blocks, language selection, exact JSON, external reset, keyboard operation, and empty normalization in `src/features/positions/editor/QuestionAnswerEditor.test.tsx`
- [X] T032 [P] [US3] Extend failing repository/API tests with every answer node/mark/language, exact code characters/whitespace, multiple blocks, invalid rejection, and save/reload fidelity in `server/positionsRepository.test.ts` and `server/index.test.ts`
- [X] T033 [P] [US3] Extend failing question-section tests for answer hydration, formatting, save/cancel restoration, editor errors, and no blank collapsed answer area in `src/features/positions/components/PositionQuestionsSection.test.tsx`

### Implementation for User Story 3

- [X] T034 [US3] Add compatible `@tiptap/extension-code-block-lowlight` and `lowlight` dependencies to `package.json` and `package-lock.json`
- [X] T035 [US3] Implement the approved-language lowlight registry and stored-label-to-grammar aliases in `src/features/positions/editor/questionCodeLanguages.ts`
- [X] T036 [US3] Implement QuestionAnswerEditor with prose controls, inline code, CodeBlockLowlight, current-block language selection, normalized updates, and accessible controls in `src/features/positions/editor/QuestionAnswerEditor.tsx`
- [X] T037 [US3] Integrate QuestionAnswerEditor into new and saved question drafts without changing JobDescriptionEditor in `src/features/positions/components/PositionQuestionsSection.tsx`
- [X] T038 [US3] Add restrained syntax colors, code labels, whitespace preservation, internal horizontal scrolling, toolbar constraints, and narrow-screen rules in `src/styles.css`

**Checkpoint**: User Stories 1-3 work together and every answer/code structure is identical after save, reload, and reopen.

---

## Phase 6: User Story 4 - Find and Safely Navigate Questions (Priority: P4)

**Goal**: Scan and filter compact newest-first questions while protecting the single active question draft from accidental loss.

**Independent Test**: Use 30 categorized questions to filter/open rows one at a time, then cancel and approve discard prompts for close, switch, Back, and reload using keyboard-only controls.

### Tests for User Story 4

- [X] T039 [P] [US4] Add failing section tests for predefined/custom/Uncategorized categories, custom-name validation/cleanup, presentation-only filtering, newest-first/stable order, title truncation, one editor, focus, and absence of search/drag in `src/features/positions/components/PositionQuestionsSection.test.tsx`
- [X] T040 [P] [US4] Add failing tests for normalized dirty comparison, clean Cancel, close/switch/add confirmation, canceled discard retention, failed-save retention, and `beforeunload` in `src/features/positions/components/PositionQuestionsSection.test.tsx`
- [X] T041 [P] [US4] Add failing route tests for guarded Back navigation, canceled/approved discard, and cleanup on position change or unmount in `src/features/positions/components/PositionDetailsRoute.test.tsx`

### Implementation for User Story 4

- [X] T042 [US4] Add optional category and conditional custom-category controls with field validation and stale-value cleanup in `src/features/positions/components/PositionQuestionsSection.tsx`
- [X] T043 [US4] Add All, Uncategorized, predefined, and saved-custom filtering while retaining creation-time order and compact row content in `src/features/positions/components/PositionQuestionsSection.tsx`
- [X] T044 [US4] Implement normalized draft baselines, one-editor coordination, close/switch/add confirmations, focus restoration, and `beforeunload` protection in `src/features/positions/components/PositionQuestionsSection.tsx`
- [X] T045 [US4] Connect question dirty state to guarded Back navigation and route lifecycle cleanup in `src/features/positions/components/PositionDetailsRoute.tsx`
- [X] T046 [US4] Add compact category/filter controls, ellipsis treatment, visible focus, responsive editor actions, and no-page-overflow rules in `src/styles.css`

**Checkpoint**: All four user stories are functional, keyboard operable, compact, and protected according to their approved interaction contracts.

---

## Phase 7: Migration and Cross-Cutting Verification

**Purpose**: Apply the verified migration to real data and prove regression, integrity, file safety, performance, and visual requirements.

- [X] T047 Normalize `data/positions.json` to version 6 and compare it with `artifacts/005-position-questions/baseline.json`, preserving every existing ID, sequence, field, application value, and list-view preference while adding only empty question/reading collections and null submitted resumes
- [X] T048 Add the 100-question one-second fixture and 30-reading interaction fixture without weakening existing list performance coverage in `server/positionsPerformance.test.ts` and `src/features/positions/components/PositionPreparation.performance.test.tsx`
- [X] T049 Run the complete automated suite, performance suite, and production build from `package.json`, fixing only regressions within files named by this feature's approved plan
- [X] T050 Verify strict version 6 data, unique child IDs, exact migration invariants, resume-root containment, one retained managed resume per position, atomic/compensated failure behavior, and zero browser persistence in `artifacts/005-position-questions/validation-results.md`
- [X] T051 Execute and time Scenarios 1-13 from `specs/005-position-questions/quickstart.md`, explicitly verifying 30-second reading creation/completion, 15-second reading/question finding, 30-second resume import/reopen, managed-copy retention, failure retention, one-second question readiness, and restart persistence in `artifacts/005-position-questions/validation-results.md`
- [X] T052 Capture and inspect Readiness and Questions empty/populated/editing/error/unavailable/long-content states at 1440x900 and 390x844, recording order, overlap, clipping, focus, contrast, code scrolling, filenames, and page overflow in `artifacts/005-position-questions/visual-review.md`

**Checkpoint**: The checked-in application runs on version 6 with all approved preparation scenarios verified and no regression to previous journeys.

---

## Dependencies and Execution Order

### Phase Dependencies

- **Setup**: Starts only after explicit implementation approval.
- **Foundation**: Depends on T001 and blocks all user stories.
- **User Story 1**: Depends on version 6 contracts and provides the question-lifecycle MVP.
- **User Story 2**: Depends on Foundation; can proceed beside User Story 1 after shared Position types stabilize, with final route placement integrating both sections.
- **User Story 3**: Depends on User Story 1's question editor shell and mutation flow.
- **User Story 4**: Depends on User Stories 1 and 3 because dirty comparison includes the final rich answer shape.
- **Migration and verification**: Starts only after all four stories pass focused tests.

### User Story Dependencies

- **User Story 1 (P1)**: Independently demonstrable with title-only Uncategorized questions.
- **User Story 2 (P2)**: Independently demonstrable with reading items and one managed resume; only final page ordering touches User Story 1 placement.
- **User Story 3 (P3)**: Extends saved questions but is independently verified through rich-answer and code round trips.
- **User Story 4 (P4)**: Extends final question drafts and is independently verified through filtering and navigation safety.

### Within Each User Story

1. Write the listed tests and verify expected failure before implementation.
2. Implement schemas/storage/repository behavior before HTTP and client integration.
3. Implement editors or controls before route wiring and styling.
4. Run focused tests at each checkpoint.
5. Do not migrate checked-in data until every version 6 reader and writer passes.

## Parallel Opportunities

- T005-T009 target separate repository, HTTP, client, section, and route test boundaries.
- T016-T021 split reading persistence, file storage, HTTP/client, section, and route tests.
- After Foundation, question lifecycle and readiness work can proceed in parallel except where they touch shared repository, route, API, and style files.
- T031-T033 split editor, persistence, and section tests.
- T039-T041 split question interaction and route-navigation tests.
- T048 can be prepared alongside final integrity verification after all story behavior stabilizes.

## Parallel Example: User Story 2

```text
Task T016: Reading repository behavior and rollback tests
Task T017: Managed resume storage and compensation tests
Task T018: Readiness and resume HTTP contract tests
Task T019: Frontend readiness API client tests
Task T020: Readiness section interaction tests
Task T021: Position detail integration tests
```

## Implementation Strategy

### MVP First

1. Capture the version 5 baseline.
2. Establish strict version 6 normalization.
3. Complete User Story 1 with title-only questions and atomic persistence.
4. Stop at the checkpoint and validate lifecycle and isolation independently.

### Complete Approved Journey

1. Add Readiness metadata and managed resume storage after the shared Position contract is stable.
2. Add rich answers and code after the basic question lifecycle passes.
3. Add question filtering and draft protection after the final answer shape is known.
4. Migrate checked-in data and compare it against the baseline.
5. Run full automated, persistence, file-safety, performance, and exact-viewport validation.

## Notes

- No question/reading search, drag-and-drop preparation order, time estimate, candidate, sharing, generation, cross-position library, or resume-history work is included.
- Position JSON, managed resume files, and package dependencies change only after separate implementation approval.
- JobDescriptionEditor must retain its existing schema and behavior.
- Resume paths are opaque, position-scoped, and never served by a generic static route.
- Test fixtures may use historical versions, but checked-in data migration waits until T047.
- External, timed, file-system, or exact-viewport results must not be fabricated; leave their tasks open if evidence cannot be obtained.
