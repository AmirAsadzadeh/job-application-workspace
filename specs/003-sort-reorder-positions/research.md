# Research: Sort and Reorder Positions

## Canonical Manual Order

**Decision**: Treat the existing order of records in `positions.json` as the canonical Manual order.

**Rationale**: The repository already preserves array order, list reads return it, and newly created positions are prepended. Reordering the array retains one source of truth for the manual sequence; separate document-level metadata records how that sequence is currently viewed.

**Alternatives considered**:

- Add an `order` number to every position: rejected because every move would rewrite many records and create duplicate/range repair rules.
- Add a separate order file: rejected because it can drift from the position records and complicates backup and inspection.
- Store order in the browser: rejected by the constitution and because it would not survive across application contexts reliably.

## Reorder Contract

**Decision**: Persist a move as the source position ID plus the ID that should follow it (`beforePositionId`), using `null` to move to the end.

**Rationale**: The server can apply the move to the newest file contents under the existing write queue. Positions added after the client loaded remain present, and the operation does not depend on stale numeric indexes or replace the full array.

**Alternatives considered**:

- Submit the complete ordered ID array: rejected because a stale client could omit a newly created position.
- Submit source and destination indexes: rejected because concurrent insertions can change index meaning.
- Store only client-side order: rejected because manual order must survive restart.

## Persisted List View

**Decision**: Sort the currently loaded result set in the frontend with explicit stable comparators and persist the active mode. Manual mode stores no column or direction; column mode stores both.

**Rationale**: All sortable values already exist in list summaries, so sorting locally remains immediate and works on searched or filtered results. Persisting only the small view preference restores the user's mode after reload while leaving the canonical Manual sequence untouched. Original result indexes provide a deterministic tie-breaker.

**Alternatives considered**:

- Ask the server to sort each request: rejected because it adds network latency and unnecessary query-contract surface for a local 1,000-row list.
- Store the preference in browser storage: rejected by the constitution and because workspace state must remain in local human-readable files.
- Persist a separately sorted position array: rejected because it would overwrite the canonical Manual sequence.

## Storage Version and Migration

**Decision**: Advance the positions document to version 4 with a required `listView` value. Normalize version 3 documents to `{ mode: "manual", column: null, direction: null }` while preserving every position and its sequence.

**Rationale**: The approved preference changes the document contract. An explicit version and deterministic migration keep checked-in and user-created data understandable and safely testable.

**Alternatives considered**:

- Infer missing metadata indefinitely: rejected because writes would produce inconsistent document shapes.
- Use a separate preferences file: rejected because the user approved list-view metadata in the positions document and a second file could drift.

## Drag-and-Drop Foundation

**Decision**: Use dnd-kit's sortable React integration with a dedicated handle, vertical movement, pointer input, keyboard input, cancellation, and customized screen-reader announcements.

**Rationale**: Sorting behavior, sensor activation, focus restoration, and accessible keyboard movement are established domain logic. The official sortable and sensor guidance supports dedicated handles and keyboard sensors, while the accessibility guidance recommends instructions and announcements tailored to the list.

**Alternatives considered**:

- Native HTML drag events: rejected because keyboard behavior, touch input, cancellation, and announcements would require substantial custom logic.
- Make the whole row draggable: rejected because rows already open details and the user approved a dedicated handle.
- Separate move-up/move-down buttons only: rejected because pointer drag-and-drop is an explicit requirement.

**Primary references**:

- [dnd-kit sortable concepts](https://dndkit.com/concepts/sortable/)
- [dnd-kit sensor configuration](https://dndkit.com/react/guides/sensors/)
- [dnd-kit accessibility guidance](https://dndkit.com/legacy/guides/accessibility/)

## Optimistic Feedback and Failure Recovery

**Decision**: Update row order immediately when a move ends, disable further reorders while saving, replace local state with the server response on success, and restore the captured prior sequence on failure.

**Rationale**: The interaction feels immediate while the returned server sequence remains authoritative. Rollback meets the requirement that failed saves restore the last persisted order without losing records.

**Alternatives considered**:

- Wait for the save before moving the row: rejected because it makes dragging feel broken.
- Keep the optimistic order after failure: rejected because it would misrepresent the saved state.

## Row Interaction Structure

**Decision**: Replace the single whole-row button with a row container holding a small handle button and a separate full-content open button.

**Rationale**: Interactive controls cannot be nested. Separate controls preserve reliable click, keyboard, and drag behavior while CSS keeps the approved row height and six-column content contract.

**Alternatives considered**:

- Place a handle button inside the current row button: rejected because nested interactive elements are invalid and unreliable.
- Remove whole-row opening: rejected because it would regress the established Journey 1 workflow.
