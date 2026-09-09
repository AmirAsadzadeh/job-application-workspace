# Feature Specification: Position Preparation and Interview Questions

**Feature Branch**: `[005-position-questions]`

**Created**: 2026-09-08

**Amended**: 2026-09-09

**Status**: Approved

**Input**: User description: "Add position-specific interview questions with compact rows, optional categories, rich answers, formatted language-aware code snippets, local persistence, and unsaved-change protection. Add a Readiness section for position-specific reading items and the one resume submitted for that position."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Manage Position Questions (Priority: P1)

As a job seeker preparing for a particular position, I want to create, edit, and remove interview questions within that position so my preparation remains connected to the opportunity it supports.

**Why this priority**: Recording position-specific questions is the core value of this journey. The feature is useful even before answers, categories, or code examples are added.

**Independent Test**: Open a position, add a question using only its title, reload the position, edit the title, and delete the question after confirmation. Verify every change persists and questions from other positions remain unchanged.

**Acceptance Scenarios**:

1. **Given** a position with no questions, **When** the user adds a question with a title, **Then** the question appears in that position's Questions section and remains there after reload.
2. **Given** an existing question, **When** the user changes its title and saves, **Then** the saved title is shown after closing and reopening the question.
3. **Given** an existing question, **When** the user chooses Delete, **Then** the system asks for confirmation before removing it.
4. **Given** the deletion confirmation, **When** the user cancels, **Then** the question and its content remain unchanged.
5. **Given** questions attached to two different positions, **When** one position's questions are changed, **Then** the other position's questions remain unchanged.
6. **Given** a save failure, **When** the user attempts to create or update a question, **Then** the entered content remains available for retry and the previously saved data remains unchanged.

---

### User Story 2 - Track Position Readiness (Priority: P2)

As a job seeker preparing for a particular position, I want to track what I have read and retain the exact resume I submitted so I can see my preparation and application material in one place.

**Why this priority**: Preparation is broader than interview questions. A position-specific reading checklist and submitted resume provide immediate context before and during the interview process.

**Independent Test**: Add, edit, complete, and delete reading items; attach a PDF or DOCX resume, move the original source file, and verify the managed copy still opens. Replace and remove the submitted resume and verify each change survives reload without affecting another position.

**Acceptance Scenarios**:

1. **Given** a position detail page, **When** it loads, **Then** a Readiness section appears after Job description and before Questions.
2. **Given** an empty reading list, **When** the user adds an item with a title and optional link and notes, **Then** it appears in that position and remains after reload.
3. **Given** a compact reading row, **When** the user changes its Read/Not read checkbox, **Then** the new status persists without requiring the row editor to open.
4. **Given** an existing reading item, **When** the user expands, edits, saves, or deletes it after confirmation, **Then** only that item changes.
5. **Given** multiple reading items, **When** the Readiness section is shown, **Then** compact rows show the title and read status in newest-first order.
6. **Given** a PDF or DOCX selected as the submitted resume, **When** the import succeeds, **Then** the Readiness section shows its original filename, file type, and upload date with Open, Replace, and Remove actions.
7. **Given** an imported resume whose original source is later moved or deleted, **When** the user chooses Open, **Then** the managed submitted copy remains available.
8. **Given** an existing submitted resume, **When** replacement or removal fails, **Then** the previous resume and its metadata remain available and unchanged.
9. **Given** readiness data attached to two positions, **When** one position is changed, **Then** the other position's readings and resume remain unchanged.

---

### User Story 3 - Prepare Rich Answers and Code (Priority: P3)

As a frontend interview candidate, I want to write structured answers containing readable, formatted code so I can study explanations and implementation examples together.

**Why this priority**: Frontend interview preparation frequently requires code examples whose indentation, language, and formatting must remain clear.

**Independent Test**: Add an answer containing headings, paragraphs, lists, links, inline emphasis, and code blocks in multiple supported languages. Save and reload, then verify the structure, code language, whitespace, and readable formatting are preserved.

**Acceptance Scenarios**:

1. **Given** an expanded question editor, **When** the user writes and formats an answer, **Then** the supported rich-text structure is visible while editing and after saving.
2. **Given** an answer, **When** the user inserts a code block, **Then** the user can choose JavaScript, TypeScript, React JSX, React TSX, HTML, CSS, Browser JavaScript, JSON, or plain text formatting.
3. **Given** an answer with multiple code blocks, **When** it is saved and reopened, **Then** each block retains its selected language, indentation, line breaks, and code formatting.
4. **Given** an answer containing a long code line, **When** the answer is viewed on a narrow screen, **Then** the code remains readable without causing horizontal overflow for the whole page.
5. **Given** a question with no answer, **When** the user saves it, **Then** it remains valid and can receive an answer later.

---

### User Story 4 - Find and Safely Navigate Questions (Priority: P4)

As a job seeker reviewing preparation notes, I want a compact question list with category filtering and protection for unsaved work so I can find material quickly without losing edits.

**Why this priority**: Compact scanning and safe navigation become important as a position accumulates questions, while remaining independently useful once questions exist.

**Independent Test**: Create questions across every category, verify newest-first order, filter by category, expand questions one at a time, and attempt to switch or leave with unsaved edits. Confirm filtering is accurate and discard confirmation protects the draft.

**Acceptance Scenarios**:

1. **Given** multiple questions, **When** the Questions section is shown, **Then** compact rows display each title and optional category in newest-first order.
2. **Given** multiple categorized questions, **When** the user selects a category, **Then** only matching questions are shown without changing their saved data.
3. **Given** an uncategorized question, **When** the user views all questions, **Then** the row remains visible without an empty category placeholder demanding attention.
4. **Given** one expanded question, **When** the user opens another, **Then** only the newly selected question remains expanded.
5. **Given** unsaved question changes, **When** the user closes the editor, opens another question, or leaves the position, **Then** the system asks before discarding those changes.
6. **Given** an unsaved-change warning, **When** the user cancels navigation, **Then** the editor remains open with all entered content intact.
7. **Given** the Questions section, **When** the user uses keyboard-only controls, **Then** adding, expanding, editing, filtering, saving, canceling, and deleting questions remain operable with visible focus.

### Edge Cases

- A missing or whitespace-only question title cannot be saved, and the title field receives a clear validation message.
- Duplicate question titles are allowed because similar prompts may require different answers or categories.
- Selecting Other requires a non-empty custom category name; changing away from Other removes the unused custom-category value from the saved question.
- Long titles truncate in compact rows without changing the stored title; the full title is available when the question is expanded.
- Canceling a new unsaved question removes only the draft editor and does not affect saved questions.
- Canceling edits to an existing question restores the last saved title, category, answer, and code blocks.
- A question may contain no category and no answer, but it must always have a title.
- Empty answers remain valid and do not render an unnecessary blank content area when collapsed.
- Failed create, update, or delete operations do not partially change the saved position or its question collection.
- Existing positions with no question data remain readable and receive an empty question collection without changes to their existing fields, order, or application data.
- The question section remains usable when a position contains many questions or a question contains several large code blocks.
- A missing or whitespace-only reading title cannot be saved, while the link and notes remain optional.
- Duplicate reading titles are allowed because the same subject may be covered by different sources.
- An invalid or unsupported reading link is rejected without losing the draft.
- Canceling a new or edited reading item restores the last saved reading list.
- A failed reading create, edit, status change, or deletion leaves the persisted list unchanged and preserves editable input where relevant.
- An unsupported resume type is rejected without replacing the current submitted resume.
- Two imported resumes with the same original filename cannot overwrite a file belonging to another position.
- Canceling resume replacement or removal leaves both the managed file and metadata unchanged.
- If a managed resume file is unavailable because it was changed outside the application, the position remains readable and offers a clear way to replace or remove the unavailable entry.
- Existing positions receive an empty reading list and no submitted resume without changes to existing data.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST provide a Questions section after the Readiness section on each position detail page.
- **FR-002**: The Questions section MUST show the total number of questions and an Add question command.
- **FR-003**: Users MUST be able to create a position-specific question using only a required title.
- **FR-004**: Each question MUST belong to exactly one position and MUST NOT appear in another position unless independently created there.
- **FR-005**: Each saved question MUST retain a unique identity plus created and last-updated timestamps.
- **FR-006**: Users MUST be able to edit a saved question's title, category, custom category, and answer.
- **FR-007**: Users MUST be able to delete a saved question only after an explicit confirmation.
- **FR-008**: Canceling deletion MUST leave the question unchanged.
- **FR-009**: The title MUST reject empty or whitespace-only values with a field-level message.
- **FR-010**: Question category MUST be optional.
- **FR-011**: The category choices MUST be JavaScript, TypeScript, React, HTML/CSS, Browser, Testing, Architecture, Behavioral, and Other.
- **FR-012**: Choosing Other MUST reveal and require a custom category name; choosing another category MUST remove any stale custom category from the saved value.
- **FR-013**: Duplicate titles MUST be accepted.
- **FR-014**: Each question MUST support an optional rich-text answer containing paragraphs, three heading levels, bold, italic, ordered lists, unordered lists, links, inline code, and code blocks.
- **FR-015**: Users MUST be able to include multiple code blocks in one answer.
- **FR-016**: Each code block MUST support a selectable language of JavaScript, TypeScript, React JSX, React TSX, HTML, CSS, Browser JavaScript, JSON, or plain text.
- **FR-017**: Saved code blocks MUST preserve their selected language, characters, indentation, whitespace, and line breaks.
- **FR-018**: Code blocks MUST be visually distinguishable from prose and formatted for readable code inspection.
- **FR-019**: Long code lines MUST remain inspectable without creating horizontal overflow for the entire page.
- **FR-020**: Questions MUST appear as compact rows showing the title and category when present.
- **FR-021**: Clicking or keyboard-activating a row MUST expand that question for viewing and editing.
- **FR-022**: Only one saved question or new-question editor MUST be expanded at a time.
- **FR-023**: Add question MUST open a new expanded editor at the top of the Questions section.
- **FR-024**: Expanded editors MUST provide Save and Cancel commands; saved-question editors MUST also provide Delete.
- **FR-025**: Questions MUST be ordered newest first using their creation time.
- **FR-026**: The system MUST provide an optional category filter containing All, Uncategorized, every predefined category, and any saved custom categories relevant to the position.
- **FR-027**: Category filtering MUST change only the displayed question set and MUST NOT modify saved questions.
- **FR-028**: Search, manual drag-and-drop ordering, time estimates, candidates, question sharing, and cross-position question libraries MUST NOT be added in this journey.
- **FR-029**: When an editor has unsaved changes, closing it, opening another question, or leaving the position MUST require discard confirmation.
- **FR-030**: Canceling discard confirmation MUST keep the current editor open with all draft content intact.
- **FR-031**: Canceling a clean editor MUST close it without an unnecessary warning.
- **FR-032**: Failed saves MUST preserve the user's draft for retry and MUST show a concise error without changing previously persisted data.
- **FR-033**: Create, update, and delete operations MUST persist the complete question collection atomically with its owning position.
- **FR-034**: Persistent question data MUST remain in the local, human-readable position data and MUST NOT use browser persistent storage.
- **FR-035**: Existing positions MUST receive an empty question collection during migration while preserving every existing position ID, order, field, application status, channel value, and list-view preference.
- **FR-036**: The Questions section and editor MUST remain compact, dark, keyboard operable, visibly focused, and readable on supported desktop and mobile viewports.
- **FR-037**: Collapsed questions MUST NOT display empty answer space, editing controls, or verbose instructional text.
- **FR-038**: The saved response MUST be authoritative after each operation, including question identity and timestamps.
- **FR-039**: The system MUST provide a Readiness section after Job description and before Questions on each position detail page.
- **FR-040**: The Readiness section MUST contain a position-specific reading list and one submitted-resume area.
- **FR-041**: Users MUST be able to create a reading item with a required title, optional HTTP(S) link, optional plain-text notes, and a Read/Not read status.
- **FR-042**: Each reading item MUST belong to exactly one position and retain a unique identity plus created and last-updated timestamps.
- **FR-043**: Reading titles MUST reject empty or whitespace-only values with a field-level message, while duplicate titles MUST be accepted.
- **FR-044**: Reading links MUST reject invalid or unsupported addresses without losing the user's draft.
- **FR-045**: Reading items MUST appear as compact newest-first rows showing the title and Read/Not read status.
- **FR-046**: Users MUST be able to change a reading item's Read/Not read status directly from its compact row and retain the change after reload.
- **FR-047**: Clicking or keyboard-activating a reading row MUST expand an inline editor for its title, link, and plain-text notes.
- **FR-048**: Reading editors MUST provide Save and Cancel commands, and saved items MUST provide Delete with explicit confirmation.
- **FR-049**: Reading items MUST NOT support search or manual drag-and-drop ordering in this journey.
- **FR-050**: Each position MUST support no more than one submitted resume in this journey.
- **FR-051**: Users MUST be able to import a PDF or DOCX file as the submitted resume for a position.
- **FR-052**: An imported resume MUST be retained as a managed local copy that remains available when its original source is moved or deleted.
- **FR-053**: The submitted-resume area MUST show the original filename, file type, and upload date.
- **FR-054**: Users MUST be able to open, replace, and remove the submitted resume from the Readiness section.
- **FR-055**: Removing a submitted resume MUST require explicit confirmation; canceling removal or replacement MUST leave the existing resume unchanged.
- **FR-056**: Successful replacement or removal MUST remove the superseded managed file without affecting a resume owned by another position.
- **FR-057**: Failed import, replacement, removal, or reading-list operations MUST leave the previous persisted readiness data and submitted resume unchanged and show a concise error.
- **FR-058**: Reading metadata and submitted-resume metadata MUST remain with the owning position in local, human-readable data; managed resume files MUST remain local and MUST NOT use browser persistent storage.
- **FR-059**: Existing positions MUST receive an empty reading collection and no submitted resume during migration while preserving every existing position ID, order, field, question, application value, and list-view preference.
- **FR-060**: The Readiness section MUST remain compact, dark, keyboard operable, visibly focused, and readable on supported desktop and mobile viewports.

### Key Entities

- **Position Question**: A preparation prompt owned by one position. It has a unique identity, required title, optional category, optional rich answer, creation time, and last-updated time.
- **Question Category**: An optional classification selected from the approved frontend and behavioral categories, or represented by a custom name when Other is selected.
- **Question Answer**: Optional structured notes belonging to one question. It may contain prose, lists, links, inline code, and multiple code blocks.
- **Code Block**: A formatted portion of an answer with a selected supported language and preserved code text.
- **Question Draft**: The current unsaved editor state used to detect changes, support cancellation, and protect work during navigation.
- **Reading Item**: A position-owned preparation resource with a required title, optional link, optional plain-text notes, Read/Not read status, identity, and timestamps.
- **Submitted Resume**: The single managed PDF or DOCX copy sent for one position, identified by its original filename, file type, and upload date.
- **Readiness Section**: The position-detail area that combines the reading checklist and submitted resume before interview questions.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: On a first attempt, a user can add and persist a titled question to a position within 30 seconds.
- **SC-002**: A user can find and open a question in a set of 30 questions within 15 seconds using compact rows and category filtering.
- **SC-003**: All supported answer structures and code-block languages retain their content and formatting after save, reload, and reopen in 100% of acceptance tests.
- **SC-004**: Creating, editing, deleting, filtering, canceling, and discard protection are fully operable by keyboard with visible focus in 100% of tested controls.
- **SC-005**: No failed create, update, or delete operation produces a partial saved change in 100% of simulated write-failure tests.
- **SC-006**: A position containing 100 compact questions becomes ready for interaction within one second under the local validation fixture.
- **SC-007**: At supported desktop and mobile viewport sizes, the Questions section introduces no page-level horizontal overflow, overlapping controls, clipped action labels, or expansion of unrelated compact rows.
- **SC-008**: Migration preserves 100% of existing position IDs, sequence, non-question fields, application tracking values, and list-view preferences while initializing questions as empty.
- **SC-009**: Source and runtime inspection find zero use of browser persistent storage for question records.
- **SC-010**: On a first attempt, a user can add a reading item and mark it Read within 30 seconds.
- **SC-011**: A user can identify what has been read from a set of 30 compact reading items within 15 seconds.
- **SC-012**: A user can import and reopen a supported submitted resume from its position within 30 seconds, including after the original source file has moved.
- **SC-013**: Replacement and removal failure tests preserve the previous submitted resume and metadata in 100% of simulated failures.
- **SC-014**: Reading create, edit, status, and deletion failures produce no partial persisted changes in 100% of simulated failures.
- **SC-015**: At supported desktop and mobile viewport sizes, the Readiness section introduces no page-level horizontal overflow, overlapping controls, clipped filenames, or expansion of unrelated compact rows.
- **SC-016**: Migration preserves 100% of existing position and question data while initializing empty readiness data and no submitted resume.
- **SC-017**: Source and runtime inspection find zero use of browser persistent storage for readiness records or submitted resumes.

## Assumptions

- This is a single-user personal preparation workspace; collaboration, permissions, and sharing are outside this journey.
- Questions are authored manually for a position rather than imported or generated.
- Reading items are entered manually and track preparation resources only; they do not change application status.
- Reading notes are plain text, and reading items use newest-created-first order without manual reordering.
- Each position retains only the currently submitted resume; resume history and multiple-version comparison are outside this journey.
- Submitted resumes are limited to PDF and DOCX files and are copied into application-managed local storage.
- The existing position detail page, save-error conventions, dark visual language, and supported viewport range remain authoritative.
- Question categories classify preparation material only; they do not affect a position's application status.
- Newest-first order is determined by creation time and is not manually adjustable in this journey.
- Rich answers use the same familiar editing behaviors as the existing job-description experience, extended for inline code and language-aware code blocks.
