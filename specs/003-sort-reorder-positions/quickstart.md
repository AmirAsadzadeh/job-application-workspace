# Quickstart Validation: Sort and Reorder Positions

This guide validates Journey 3 after plan, tasks, and implementation receive their separate approvals.

## Automated Checks

```powershell
npm test -- --run
npm run build
```

Expected: schema, repository, API, comparator, list, row, keyboard, rollback, performance, and existing Journey 1/Journey 2 tests pass.

## Start the Application

```powershell
npm start
```

Open the local URL printed by the command.

## Scenario 1: Header Sorting

Activate every visible header once and then twice. Verify alphabetical ordering for Company, Position, and Work mode; workflow ordering for Status; rank ordering for Seniority; and chronological ordering for Updated. Confirm the active header and direction remain obvious and equal values stay stable. Reload and restart with one column sort active; verify its mode, column, direction, and displayed order return.

## Scenario 2: Restore Manual Order

Record the initial sequence, sort a column, and activate Manual order. Verify the original sequence returns and no position details changed. Reload and confirm Manual mode remains active.

## Scenario 3: Pointer Reorder

In Manual order with Search empty and Status set to All, drag a middle row to the first, middle, and final positions in separate trials. Reload and restart the application after each save.

Expected: each new sequence survives, every position appears exactly once, and the moved row's details remain unchanged.

## Scenario 4: Keyboard Reorder

Use keyboard navigation to focus a drag handle, pick up its row, move it upward and downward, drop it, and cancel a separate move.

Expected: focus remains understandable, announcements identify the row and new position, a completed move persists, and a canceled move does not persist.

## Scenario 5: Disabled Reordering

Check drag handles while a column sort is active, while Search contains text, while a status other than All is selected, and while a save is pending.

Expected: row movement is unavailable with a clear reason, row dimensions remain stable, and header sorting still works while filtered.

## Scenario 6: Failed Save

Use the repository failure fixture to reject the final file replacement after a move.

Expected: the original file bytes remain unchanged, the UI restores the saved sequence and list-view mode, no position is lost or duplicated, and a concise error is shown. Repeat with a rejected header-mode save and a rejected Manual-mode save.

## Scenario 7: Concurrent Addition

Load Manual order, add a new position through a second request, and then submit a move anchored to an existing row.

Expected: the new position remains present, the requested relative move is applied, and every ID occurs once.

## Scenario 8: New Position Placement

Save a custom Manual order, create a position, and return to the list.

Expected: the new position is first and the remaining saved sequence is unchanged.

## Scenario 9: Version 3 Migration

Load a version 3 fixture with a known position sequence, then perform a successful list-view or reorder write.

Expected: the document becomes version 4, adds Manual list-view metadata, and preserves all position records and their sequence. No browser persistent storage is introduced.

## Performance and Responsive Review

- Measure sorting and moving within a 1,000-position fixture; each visible result must complete in under one second.
- Inspect at 1440x900 and 390x844.
- Confirm no overlap, clipped labels, horizontal page overflow, row-height increase, large title, or loud visual treatment.
- Confirm reduced-motion behavior and keyboard-only reachability.

## Timed Usability Validation

Ask ten first-time users to sort Updated newest-first, restore Manual order, and move one position. Record assistance and completion. At least nine users must finish without assistance.
