# Quickstart Validation: Position Preparation and Interview Questions

This guide is for validation after revised tasks and implementation receive separate approval.

## Automated Checks

```powershell
npm test -- --run
npm run test:performance
npm run build
```

Expected: schema/migration, repository, resume storage, API/client, answer editor, Readiness, Questions, position-detail integration, performance, and previous-feature regression tests pass.

## Start the Application

```powershell
npm start
```

Open the local URL printed by the command and use an existing position detail page.

## Scenario 1: Section Order and Empty State

Open a position with no preparation data. Verify Job description is followed by Readiness and then Questions. Confirm both sections remain compact, do not display empty editors, and expose only their relevant add/import actions.

## Scenario 2: Reading Lifecycle

On a first attempt, add a reading and mark it Read within 30 seconds. Add another item containing an HTTP(S) link and plain-text notes. Reload, edit one, cancel another edit, and verify both persist correctly. Cancel one deletion, confirm another, and verify only the selected item changes and another position is untouched.

## Scenario 3: Reading Status and Ordering

Create at least 30 reading items. Toggle Read directly from compact rows using mouse and keyboard; verify the editor does not open accidentally and the status survives reload. Confirm rows remain newest-created first after content/status edits and there are no reading search or drag controls. Time identification of read items; verify it completes within 15 seconds.

## Scenario 4: Submitted Resume Lifecycle

On a first attempt, import and reopen a PDF within 30 seconds; verify its original filename, PDF type, and upload date. Move or delete the original source and Open the managed copy. Replace it with a DOCX bearing the same original filename, verify the new metadata/file, then cancel and confirm removal paths. Confirm another position's same-named resume remains available.

## Scenario 5: Resume Validation and Recovery

Attempt empty, renamed unsupported, and unsupported uploads; verify the previous resume remains unchanged. In a separate position, import valid PDF/DOCX content with empty, generic, and conflicting browser-declared media types; verify detected content determines the accepted stored type. Remove a managed file outside the app, verify the Position still opens with an unavailable state, then replace or remove the stale entry successfully.

## Scenario 6: Question Ownership and Basic Lifecycle

Add a question using only a title. Verify it appears at the top, survives reload, can be renamed, and is absent from another position. Cancel one deletion and confirm nothing changes; confirm another deletion and verify only that question is removed.

## Scenario 7: Optional Question Categories

Save an Uncategorized question and one in every predefined category. Save an Other question with a custom category. Verify Other requires a name, changing away from Other clears the stale custom value, and duplicate titles remain valid.

## Scenario 8: Rich Answer and Code Fidelity

Create an answer containing paragraphs, heading levels 1 through 3, bold, italic, both list types, a link, and inline code. Add multiple code blocks covering all nine language choices. Save, reload, and reopen; compare each language label and the exact code characters, spaces, tabs, indentation, and line breaks.

## Scenario 9: Compact Question Browsing and Filtering

Create at least 30 questions across predefined, custom, and Uncategorized categories. Verify collapsed rows show only title and category when present, newest-created appears first, edits do not move rows, and each filter produces the correct subset without changing persisted data. Verify there is no question search or drag handle and find a target question within 15 seconds.

## Scenario 10: Question Draft Protection

Open one saved question, change its title, then try to close it, open another question, add a new question, use Back, and reload. For each path, cancel the discard prompt and verify the current editor and draft remain intact; approve it and verify the last saved data returns. Confirm a clean Cancel closes without a prompt.

## Scenario 11: Failed Preparation Mutations

Inject failures for reading create/update/status/delete, resume import/replace/remove, and question create/update/delete. Verify prior JSON bytes and visible saved data remain unchanged. Confirm reading/question drafts stay available for retry, failed deletes retain rows, and failed resume operations retain the prior managed file and metadata.

## Scenario 12: Keyboard and Responsive Review

Using only the keyboard, operate every readiness, resume, question, filtering, formatting, confirmation, and navigation control with visible focus. At 1440x900 and 390x844 inspect empty, populated, editing, validation, failure, unavailable-file, long-title, long-filename, and long-code states. Verify internal code scrolling and no page overflow, overlap, clipped action, loud heading, or unrelated list-row expansion.

## Scenario 13: Performance and Migration

Load a fixture containing 100 questions and verify the Questions section is interactive within one second; load 30 readings and verify direct status changes and row expansion remain responsive. Normalize known version 1 through 5 fixtures and confirm version 6 preserves all existing position IDs, sequence, details, application channels, and list-view settings while adding empty question/reading collections and no submitted resume.

## Persistence Inspection

- Inspect `data/positions.json`; preparation metadata must be nested under the correct Position and remain human-readable structured JSON.
- Inspect `data/resumes/<position-id>/`; only the current opaque managed resume should remain for each position after successful replacement/removal.
- Confirm resume paths cannot escape the configured managed root and `/data` cannot serve resume bytes.
- Confirm each reading/question mutation performs one queued atomic JSON replacement and resume failure compensation retains the prior visible pair.
- Search source and runtime paths for `localStorage`, `sessionStorage`, or IndexedDB use for preparation records or files; expect none.
