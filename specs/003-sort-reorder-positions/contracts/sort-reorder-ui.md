# UI Contract: Sort and Reorder Positions

## Header Sorting

- Company, Position, Status, Work mode, Seniority, and Updated headers are compact buttons.
- The active column shows one ascending or descending icon and exposes the same state to assistive technology.
- First activation sorts ascending; activating the same header again sorts descending; activating another header starts ascending.
- Equal values remain in their previous relative order.

## Manual Order

- A compact `Manual order` control appears with the list tools.
- Activating it restores the most recently loaded or saved canonical sequence.
- It indicates when Manual order is active without relying only on color.
- Column sorting never changes the saved sequence.
- Activating Manual order saves Manual mode; activating a header saves column mode, column, and direction.
- Reload and restart restore the saved mode and corresponding displayed order.

## Row Reordering

- A grip icon button is the only drag activator.
- The handle occupies a fixed narrow column and does not increase row height.
- The remaining row content stays a separate control that opens position details.
- Pointer dragging is vertical and constrained to valid list targets.
- Keyboard activation supports pick up, arrow movement, drop, and cancel through the sortable interaction's documented keys.
- A polite announcement identifies the moved position and its new one-based position.
- While saving, handles are unavailable and the row sequence does not shift again.

## Availability

Reordering is enabled only when:

- Manual order is active.
- Search is empty.
- Status is All.
- The list contains at least two rows.
- No reorder save is in progress.

When unavailable, handles remain visually stable and their accessible description states the reason. Sorting remains available with search and status filtering.

## Failure State

- The previous saved sequence is restored.
- A concise list-level error states that the order could not be saved.
- Focus returns to the moved row's handle when possible.
- Retry occurs through another deliberate move; there is no automatic repeat write.
- A failed header or Manual-mode save restores the previous saved mode, direction, and displayed order.

## Responsive and Visual Rules

- Existing row fields, truncation, dark palette, and compact height remain unchanged.
- The handle and sort icons use fixed dimensions.
- At narrow widths, existing column visibility rules continue; no page-level horizontal scrolling or overlap is introduced.
- Motion respects reduced-motion preferences.
