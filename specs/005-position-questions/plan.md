# Implementation Plan: Position Preparation and Interview Questions

**Branch**: `005-position-questions` | **Date**: 2026-09-09 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/005-position-questions/spec.md`

## Summary

Add two compact, position-owned preparation areas to each position detail page. Readiness tracks newest-first reading items and one locally managed submitted PDF or DOCX resume; Questions supports categorized prompts, rich answers, and language-aware code. Persist structured metadata inside each Position through one lossless version 6 migration, use dedicated atomic mutations so independent editors cannot overwrite unrelated fields, and keep resume bytes in a private position-owned folder served only through a scoped Open endpoint.

## Technical Context

**Language/Version**: TypeScript 5.8, React 19, Node.js 24-compatible ES2023

**Primary Dependencies**: React, Zod 4, Lucide React, Tiptap 3.31; add Tiptap CodeBlockLowlight and lowlight for code rendering, plus file-type for PDF/DOCX signature detection

**Storage**: Local `data/positions.json` advanced from version 5 to version 6; managed resume bytes under `data/resumes/<position-id>/`

**Testing**: Vitest 5, Testing Library, jsdom, repository/API/file integration tests, performance fixtures, and live browser inspection

**Target Platform**: Local desktop web application with keyboard support and responsive mobile behavior down to 390 CSS pixels

**Project Type**: Single web application with React frontend, Node HTTP API, and file-backed repository

**Performance Goals**: A detail page containing 100 compact questions is interactive within one second under the local fixture, and 30 compact reading items remain immediately usable; each metadata mutation performs one queued atomic JSON replacement

**Constraints**: No browser persistent storage, remote service, question/reading search, manual preparation ordering, time estimates, candidates, cross-position library, resume history, or changes to job-description formatting; only PDF/DOCX resumes; one submitted resume per position; one expanded editor in each preparation list

**Scale/Scope**: One user, one local positions document, at least 100 questions and 30 readings per position, multiple code blocks per answer, and one managed resume file per position

## Constitution Check

*GATE: Passed before research and re-checked after design.*

- **Specifications are the source of truth**: PASS. The revised approved specification defines both preparation sections, reading/resume behavior, question behavior, persistence, failure guarantees, and exclusions.
- **Explicit approval gates**: PASS. This phase changes planning artifacts only; the outdated tasks remain untouched until a separate task-generation approval.
- **Small, testable user journeys**: PASS. The four stories independently cover question lifecycle, readiness, rich answers/code, and safe question navigation.
- **Quiet, scannable user experience**: PASS. Both sections use thin collapsed rows, restrained actions, one inline editor per list, and no permanent explanatory copy.
- **Local, human-readable data**: PASS. All structured metadata remains readable in Position JSON; imported documents stay as user-owned local files in a predictable managed folder.
- **Architecture and accessibility constraints**: PASS. The design extends strict schemas, the queued repository, scoped HTTP routes, existing editor patterns, native file controls, and keyboard-operable components.

Post-design check: PASS. Code highlighting and binary file-type detection add narrowly scoped libraries for behavior not safely supplied by the existing stack. Resume file coordination is isolated behind one local storage module rather than introducing a second repository architecture.

## Project Structure

### Documentation (this feature)

```text
specs/005-position-questions/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── position-question-api.md
│   └── readiness-api.md
└── tasks.md                     # Regenerated only after separate approval
```

### Source Code (repository root)

```text
data/
├── positions.json
└── resumes/
    └── <position-id>/
        └── <opaque-file-id>.<pdf|docx>

shared/
├── positionSchema.ts
└── positionSchema.test.ts

server/
├── index.ts
├── index.test.ts
├── positionsRepository.ts
├── positionsRepository.test.ts
├── resumeStorage.ts
├── resumeStorage.test.ts
└── positionsPerformance.test.ts

src/features/positions/
├── positionApi.ts
├── positionApi.test.ts
├── positionTypes.ts
├── editor/
│   ├── JobDescriptionEditor.tsx
│   ├── QuestionAnswerEditor.tsx
│   └── QuestionAnswerEditor.test.tsx
└── components/
    ├── PositionDetailsRoute.tsx
    ├── PositionDetailsRoute.test.tsx
    ├── PositionReadinessSection.tsx
    ├── PositionReadinessSection.test.tsx
    ├── PositionQuestionsSection.tsx
    ├── PositionQuestionsSection.test.tsx
    └── PositionPreparation.performance.test.tsx

src/styles.css
tests/setup.ts
```

**Structure Decision**: Extend the existing position aggregate vertically. Shared validation owns version 6 metadata and rich-document grammars; the repository owns metadata identities, timestamps, ordering, and serialized JSON writes; resumeStorage owns contained paths, staged streams, type detection, opening, and cleanup; dedicated API mutations prevent stale detail forms or separate preparation editors from replacing one another.

## Implementation Phases

### Phase 1 - Version 6 Domain Foundation

1. Write failing schema tests for question, reading-item, and submitted-resume metadata; category and file invariants; unique child IDs; strict mutation inputs; rich-answer nodes; and historical migrations.
2. Preserve the existing job-description grammar and introduce a separate question-answer grammar with inline code and language-bearing code blocks.
3. Add `questions`, `readingItems`, and `submittedResume` to Position, then migrate versions 1 through 5 to version 6 with empty/null preparation defaults while preserving every existing value and sequence.
4. Update checked-in JSON only after invariant tests compare IDs, order, all previous fields, application metadata, and list-view preference.

### Phase 2 - Atomic Question Mutations

1. Add repository create, update, and delete operations through the existing write queue and atomic JSON replacement.
2. Generate question IDs/timestamps on the server, prepend creations, preserve `createdAt` during edits, and advance the owning Position timestamp.
3. Add dedicated question routes and typed client methods that return the authoritative Position after every successful mutation.
4. Test invalid input, missing owner/item, concurrent writes, cross-position isolation, and byte-identical rollback.

### Phase 3 - Readiness Metadata and Resume Storage

1. Add reading create, update/status-toggle, and delete operations using the same position-scoped repository rules and authoritative responses.
2. Build a resume storage coordinator that resolves every opaque filename beneath `data/resumes/<position-id>/`, streams request bytes to a temporary file, detects PDF/DOCX content, and never serves the general data directory.
3. Add position-scoped resume PUT, GET/Open, and DELETE routes. Carry the encoded original filename and declared media type separately from the raw request body.
4. Coordinate staged file promotion, JSON metadata replacement, prior-file retirement, and compensating rollback inside the repository write queue so a failed import, replacement, or removal retains the previous visible resume.
5. Return authoritative metadata after mutations and hardened binary response headers when opening a file; report a missing externally altered file without making the Position unreadable.

### Phase 4 - Rich Question Answer Editor

1. Add Tiptap CodeBlockLowlight and lowlight at versions compatible with existing Tiptap packages.
2. Register only approved languages and map React JSX, React TSX, and Browser JavaScript to highlighting grammars while preserving their distinct stored labels.
3. Build the answer editor with approved prose controls, inline code, code blocks, and a current-block language selector.
4. Normalize output against the answer schema without enabling code in Job description.
5. Style prose and code for restrained contrast, preserved whitespace, and contained horizontal scrolling.

### Phase 5 - Compact Preparation Experience

1. End the existing position details form after Job description, then render independent Readiness and Questions sections in the approved order without nested forms.
2. Implement Readiness with a compact reading header/list, direct Read checkbox, newest-first inline editor, title/link/plain-notes controls, and confirmed deletion.
3. Implement the submitted-resume area with a native PDF/DOCX chooser plus filename, type, date, Open, Replace, Remove, pending, unavailable, and failure states.
4. Implement Questions with count, category filter, Add command, newest-first compact rows, one inline editor, authoritative reconciliation, and confirmed deletion.
5. Track normalized question draft baselines and confirm before closing, switching, Back navigation, reload, or external departure; preserve drafts after failed saves.
6. Keep reading filtering/search absent, prevent compact checkbox activation from unintentionally opening its editor, and restore logical focus after editors or files change.

### Phase 6 - Verification

1. Run focused schema, migration, repository, resume-storage, API/client, editor, readiness, questions, and position-detail tests.
2. Verify rich/code round trips, exact code whitespace/languages, reading ordering/status, managed-copy independence, supported file detection, same-name isolation, and failure compensation.
3. Verify keyboard operation, visible focus, confirmations, draft retention, direct checkbox behavior, cross-position isolation, and unavailable-file recovery.
4. Add and run the 100-question readiness fixture plus a 30-reading interaction fixture, the complete test suite, performance suite, production build, and browser-storage search.
5. Inspect empty, populated, editing, filtered, long-title, long-filename, long-code, error, and unavailable-file states at 1440x900 and 390x844.

## Complexity Tracking

No constitutional violations require justification.
