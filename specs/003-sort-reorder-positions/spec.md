# Feature Specification: Sort and Reorder Positions

**Feature Branch**: `003-sort-reorder-positions`

**Created**: 2026-09-08

**Status**: Amended - Awaiting Re-approval

**Input**: User description: "Sort the positions list by clicking table headers and change the saved manual order with drag and drop."

## User Scenarios & Testing

### User Story 1 - Organize the Positions List (Priority: P1)

As a user, I want to sort positions by the information visible in the list or arrange them manually so that I can compare records quickly and keep important positions in a useful order.

**Why this priority**: The positions list is the main workspace. Sorting and manual ordering make records easier to find without adding more information or visual noise to its compact rows.

**Independent Test**: Open a list containing positions with different companies, titles, statuses, work modes, seniorities, and update dates. Sort each visible column in both directions, reload and confirm the active column and direction remain, return to Manual order, move a row with pointer and keyboard controls, reload again, and confirm the saved manual order and mode remain.

**Acceptance Scenarios**:

1. **Given** the list is in Manual order, **When** the user activates a sortable column header, **Then** the rows are sorted ascending by that column and the active direction is shown clearly.
2. **Given** a column is sorted ascending, **When** the user activates the same header again, **Then** the rows are sorted descending and the direction indicator updates.
3. **Given** a column sort is active, **When** the user activates Manual order, **Then** the last saved manual sequence is restored and row reordering becomes available.
4. **Given** Manual order is active with no search or status filter, **When** the user moves a row with the drag handle, **Then** the row is placed at the chosen position and the new order is saved.
5. **Given** a manual reorder was saved, **When** the application is restarted or the list is reloaded, **Then** positions appear in the saved manual sequence.
6. **Given** the list is filtered, searched, or column-sorted, **When** the user views a drag handle, **Then** reordering is unavailable and the interface communicates why without removing access to sorting.
7. **Given** the user relies on a keyboard, **When** they focus a row's reorder control in Manual order, **Then** they can move the row and receive confirmation of its new position.
8. **Given** saving a new manual order fails, **When** the move completes locally, **Then** the list returns to the last saved order and clearly reports that the change was not saved.
9. **Given** a column and direction or Manual order is active, **When** the application reloads or restarts, **Then** the same mode, column, direction, and resulting row order are restored.
10. **Given** saving a changed sorting mode fails, **When** the user activates a header or Manual order, **Then** the previous saved mode and order are restored and a concise error is shown.

### Edge Cases

- Equal values retain their prior relative order so rows do not jump unpredictably.
- Company and position sorting ignores letter case and surrounding whitespace.
- Status follows workflow order: Draft, Open, Interviewing, On Hold, Closed.
- Seniority follows rank order: Intern, Entry, Associate, Mid-level, Senior, Staff, Lead, Manager, Director.
- Missing optional display values do not affect sorting because only visible row fields are sortable.
- A newly created position is added first in Manual order without replacing the user's remaining saved sequence.
- A row cannot be dropped outside the list or into a different filtered result set.
- Reordering a list with zero or one position has no effect.
- If another position is added between viewing and saving an order, no position is lost or duplicated.
- Existing position data without saved list-view metadata opens in Manual order without changing its position sequence.

## Requirements

### Functional Requirements

- **FR-001**: Every visible list column—Company, Position, Status, Work mode, Seniority, and Updated—MUST have an accessible sorting control in its header.
- **FR-002**: The first activation of a column header MUST sort that column ascending; the second consecutive activation MUST sort it descending.
- **FR-003**: Activating a different column header MUST apply ascending order to the newly selected column.
- **FR-004**: The active sort column and direction MUST be visually identifiable and available to assistive technology.
- **FR-005**: Company and Position MUST sort alphabetically without case sensitivity.
- **FR-006**: Status MUST sort by Draft, Open, Interviewing, On Hold, and Closed in ascending order, with the reverse sequence used for descending order.
- **FR-007**: Work mode MUST sort alphabetically by its displayed label.
- **FR-008**: Seniority MUST sort by Intern, Entry, Associate, Mid-level, Senior, Staff, Lead, Manager, and Director in ascending order, with the reverse sequence used for descending order.
- **FR-009**: Updated MUST sort chronologically, oldest first for ascending and newest first for descending.
- **FR-010**: Equal sort values MUST preserve their previous relative order.
- **FR-011**: The list MUST provide a compact Manual order control that restores the last saved manual sequence.
- **FR-012**: In Manual order, each row MUST provide a dedicated drag handle rather than making the entire row draggable.
- **FR-013**: The drag handle MUST remain visually discreet and MUST NOT increase the approved compact row height.
- **FR-014**: Pointer users MUST be able to move a row to any valid position in the unfiltered list.
- **FR-015**: Keyboard users MUST be able to move a focused row upward or downward and receive an accessible announcement of the result.
- **FR-016**: Manual reordering MUST be available only when Manual order is active and both search and status filtering are inactive.
- **FR-017**: When reordering is unavailable, the control MUST communicate the reason without relying only on color.
- **FR-018**: A successful manual move MUST be retained in the project's local, human-readable position data and survive reload or restart.
- **FR-019**: A failed reorder save MUST restore the last saved sequence, preserve every position, and show a concise error.
- **FR-020**: A newly created position MUST appear first in Manual order while preserving the relative order of existing positions.
- **FR-021**: Column sorting MUST NOT overwrite or mutate the saved manual sequence.
- **FR-022**: Returning to Manual order MUST restore the saved sequence after any column sort.
- **FR-023**: Search and status filters MUST continue to work with every column sort.
- **FR-024**: Sorting and reordering MUST NOT change the approved data displayed in compact rows or introduce a large page heading.
- **FR-025**: All sorting, Manual order, and reorder controls MUST be usable by keyboard and expose clear accessible names and states.
- **FR-026**: No position may be lost, duplicated, or have its details changed as a result of sorting or reordering.
- **FR-027**: The active list mode MUST be retained in the project's local, human-readable position data.
- **FR-028**: Column mode persistence MUST retain the selected column and ascending or descending direction.
- **FR-029**: Reloading or restarting the application MUST restore the saved mode and display the corresponding row order.
- **FR-030**: Activating Manual order MUST save Manual mode while retaining the canonical manual sequence.
- **FR-031**: Existing position documents without list-view metadata MUST migrate to a valid saved Manual mode without changing position records or sequence.
- **FR-032**: A failed mode save MUST restore the previous saved mode and order without changing position records.

### Key Entities

- **Position Sequence**: The complete ordered set of position identities representing the user's saved Manual order.
- **List View Preference**: The saved Manual or column mode and, for column mode, its selected column and direction; it changes presentation without changing Position Sequence.
- **Reorder Operation**: A requested move of one position from its saved location to another, including success or failure feedback.

## Success Criteria

### Measurable Outcomes

- **SC-001**: Users can sort any visible column in either direction with no more than two activations of its header.
- **SC-002**: For a list of 1,000 positions, 95% of sort actions visibly complete within one second.
- **SC-003**: In validation, 100% of successful manual moves remain in the same order after reload and application restart.
- **SC-004**: In failure testing, 100% of rejected reorder saves retain every position exactly once and restore the previous saved order.
- **SC-005**: In keyboard testing, users can move a position and identify its new list position without pointer input.
- **SC-006**: At desktop and 390-pixel-wide viewports, sort indicators and drag handles remain readable and cause no row-content overlap or horizontal page overflow.
- **SC-007**: In task-based testing, at least 9 of 10 users can sort a column and manually move one position without assistance.
- **SC-008**: In persistence testing, 100% of saved Manual and column modes restore the same mode, column, direction, and row order after reload and application restart.

## Assumptions

- Existing data without a saved list-view preference defaults to Manual order during migration.
- Column sorting does not replace the saved Manual sequence, but its active mode, column, and direction are persisted.
- A compact Manual order control is the explicit way to leave a column sort and restore drag-and-drop availability.
- Search and status filtering keep their existing behavior and do not alter the saved Manual order.
- Manual ordering and the active list-view preference are stored with the local position data rather than in browser storage.
- The existing compact dark visual language and thin row density remain unchanged.
- Sorting and reordering apply to positions only; company lookup, grouping, multi-select, and bulk operations remain outside this journey.
