# Quickstart Validation: Review Current Positions

This guide describes how to validate the feature after its implementation tasks are
approved and completed. It does not authorize implementation.

## Prerequisites

- Node.js 24.x and npm 11.x
- Dependencies installed with `npm install`
- A valid `data/positions.json` matching [the data model](data-model.md)

## Automated Checks

Run the complete focused verification sequence:

```powershell
npm test -- --run
npm run build
```

Expected results:

- Repository tests pass for valid, missing, malformed, schema-invalid, atomic-update, and
  write-failure cases.
- Component tests pass for populated, empty, loading, error, fallback-logo, long-text,
  navigation, selector, manager-validation, publication-link validation, rich-text
  commands, migration, save-success, and save-failure states.
- The generated 1,000-record performance check meets the approved load and interaction
  targets.
- TypeScript and the production build complete without errors.

## Start the Local Application

```powershell
npm run dev
```

Open the local URL printed by the command. The UI and file-backed API must be available
from the same local application origin.

## Scenario 1: Review Populated Rows

1. Ensure `data/positions.json` contains at least 12 valid records across all five statuses.
2. Open the positions view at a 1440x900 viewport.
3. Confirm each record appears once and in file order.
4. Confirm every row displays company logo/fallback, company name, position title, status,
   work mode, seniority, and updated date.
5. Inspect row markup and confirm department, team, location, employment type, hiring
   manager details, salary, description, and requirements are absent.
6. Confirm at least 10 standard rows fit within a 768-pixel-high application viewport.

Expected: rows are thin, aligned, readable, and visually quiet, with no card expansion or
overlap.

## Scenario 2: Keyboard Navigation

1. Use Tab to move focus into the positions list.
2. Confirm the focused row has a visible indicator without changing dimensions.
3. Press Enter on a known position.
4. Confirm `/positions/{positionId}` opens for that record.
5. Use browser Back.

Expected: the positions list returns in a usable state and refreshes its file-backed data.

## Scenario 3: Edit and Save Position Details

1. Open a position detail route and note its current updated timestamp.
2. Select a department, then select one of that department's teams.
3. Select a location.
4. Enter hiring-manager name, phone number, and position.
5. Save and confirm the quiet success state.
6. Inspect `data/positions.json` and confirm only the approved detail fields plus
   `updatedAt` changed.
7. Return to the positions list.

Expected: selectors load from `data/reference-data.json`, the JSON update is persisted,
and the corresponding row shows the new updated date without using browser storage.

Repeat with only one hiring-manager field populated. Expected: saving is blocked with
field guidance and the JSON file remains unchanged.

## Scenario 4: Add Publication Links and a Formatted Description

1. Open a position detail route.
2. Add two platform-link rows with different platform names and valid HTTP/HTTPS addresses.
3. Enter a valid organization career-page job address.
4. Enter a description and apply a heading, bold, italic, bullet list, numbered list, and link.
5. Save, reload the detail route, and compare every value and formatting choice.
6. Inspect `data/positions.json` and confirm the links and restricted structured description
   are readable, the document is version 2, and unrelated fields are unchanged.

Expected: all publication details and supported formatting survive the round trip, the
success state remains quiet, and none of these values appears in the list row.

Repeat with all three additions empty. Expected: saving succeeds.

Repeat with a partial platform pair, a non-web URL scheme, and an invalid career-page
address. Expected: saving is blocked with specific guidance and entered values remain.

## Scenario 5: Empty Data

1. Back up the current positions file.
2. Replace `positions` with an empty array while preserving `version`.
3. Reload the positions view.

Expected: a clear empty state appears and no placeholder records are presented as real
positions.

Restore the original file before continuing.

## Scenario 6: Invalid Data

1. Back up the current positions file.
2. Temporarily make the JSON malformed or assign an unsupported status.
3. Reload the positions view.

Expected: a stable error state and Retry command appear. No partial or seed list replaces
the invalid file.

Restore the original file before continuing.

## Scenario 7: Missing Logo and Long Text

1. Use a valid record with no `logoPath` and long company, title, and seniority values.
2. Check the view at 1440x900 and 390x844.
3. Confirm the logo fallback stays fixed-size, text does not overlap, and row height stays
   within the contract.
4. At the narrow viewport, confirm all required columns remain reachable through
   controlled horizontal scrolling.

Expected: complete values remain accessible without converting rows into cards.

## Scenario 8: Existing Filters

1. Search for a known position title, department, hiring manager, and location in turn.
2. Confirm each query returns the matching compact row without exposing the matched hidden
   detail in row markup.
3. Select each status filter and return to All.

Expected: existing search and status behavior remains available in a compact toolbar; no
new sorting, grouping, or filtering behavior appears.

## Timed Usability Validation

Run 10 documented trials and record anonymous results in
`artifacts/001-review-positions/usability-results.md`.

For each trial:

1. Ask the participant to identify company, title, status, work mode, seniority, and last
   updated date for a named row; record whether this finishes within 10 seconds.
2. Ask the participant to compare the visible fields for 10 positions; record whether this
   finishes within 60 seconds.
3. Ask the participant to open a named position; record whether the correct route opens on
   the first attempt.

Expected: all SC-001 and SC-002 timing thresholds are met, and at least 9 of 10
participants satisfy SC-005.

## Performance Validation

Run the automated 1,000-record server fixture check in
`server/positionsPerformance.test.ts` and the separate row-interaction check in
`src/features/positions/components/PositionList.performance.test.tsx`. Record both
measurements in `artifacts/001-review-positions/performance-results.md`.

Expected: the first list result is available within 1 second and instrumented row
interaction completes within 100 milliseconds under the documented local test conditions.

## Visual Evidence

Capture final screenshots at:

- Desktop: 1440x900
- Narrow: 390x844

Review screenshots against [the UI contract](contracts/positions-list-ui.md), with special
attention to row density, dark-theme contrast, focus treatment, text overlap, and the lack
of a large project heading.

## Requirement Trace

| Validation area | Requirements |
|-----------------|--------------|
| Populated list and row fields | FR-001 through FR-006 |
| Row navigation | FR-007 |
| Detail selectors and hiring-manager editing | FR-008, FR-009 |
| Atomic save, updated timestamp, and list refresh | FR-010 |
| Dark, discreet presentation | FR-011 through FR-013 |
| Stable compact rows and empty state | FR-014, FR-015 |
| Platform and career-page links | FR-016 through FR-018, FR-022 through FR-024 |
| Formatted job description | FR-019 through FR-021, FR-023, FR-024 |

## Success-Criterion Trace

| Criterion | Validation evidence |
|-----------|---------------------|
| SC-001 | Timed identification trial in `artifacts/001-review-positions/usability-results.md`. |
| SC-002 | Timed 10-position comparison trial in `artifacts/001-review-positions/usability-results.md`. |
| SC-003 | 768-pixel viewport row-count check and desktop screenshot evidence. |
| SC-004 | Required/prohibited row-content tests plus populated-list inspection. |
| SC-005 | First-attempt route result across 10 documented usability trials. |
| SC-006 | Timed detail-entry trial covering two platforms, career page, and formatting. |
| SC-007 | Saved detail reload plus structured-file inspection. |
| SC-008 | Invalid-link UI, service, and unchanged-file tests. |
