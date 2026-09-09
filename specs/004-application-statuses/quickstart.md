# Quickstart Validation: Personal Application Statuses

This guide is for validation after tasks and implementation receive separate approval.

## Automated Checks

```powershell
npm test -- --run
npm run test:performance
npm run build
```

Expected: shared migration, repository, API, status sorting/filtering, creation, detail form, publication-link, help, and prior-journey tests pass.

## Start the Application

```powershell
npm start
```

Open the local URL printed by the command.

## Scenario 1: New Position Default

Create a position without qualifying channel activity and return to the list. Verify its overall status is Saved in the detail view and compact row after reload. Create another position with an Applied channel and verify the saved result is Applied.

## Scenario 2: Overall Status Workflow

Time a first-attempt overall-status identification and save; verify it completes within 20 seconds. Then save each overall status in turn. Verify the detail header and compact row show the same value, Updated changes, and each status filter finds the position. Confirm direct transitions are allowed.

## Scenario 3: Definitions

Open overall status help beside the list filter and detail selector. Verify all nine meanings match the specification. Repeat for channel status help and all five meanings. Use keyboard-only activation and Escape dismissal; verify focus returns to the trigger and no data changes.

## Scenario 4: Multiple Platform Channels

Add at least five platform links with different status/date combinations. Save and reload. Time finding where the position was applied and identifying each channel status; verify it completes within 30 seconds. Edit and remove one entry, then verify all other platform names, URLs, statuses, and dates are unchanged.

## Scenario 5: Career-Page Channel

Add a career-page URL, channel status, and application date. Save and reload. Remove the URL and verify channel metadata must also be cleared.

## Scenario 6: Applied Date Suggestion

Choose Applied on an untracked channel. Verify today's local date is suggested, can be edited to a past date, and can be cleared. Verify a future or impossible date is rejected beside the affected channel.

## Scenario 7: Safe Automatic Advancement

Set a position to Saved, mark a channel Applied, and save. Verify the returned overall status is Applied. Repeat from Screening, Interviewing, Assignment, Paused, Offer, Rejected, and Withdrawn; verify none is overwritten.

## Scenario 8: Failed Save

Use the repository write-failure fixture for an overall and channel update. Verify the original file bytes remain unchanged, the UI preserves the user's entries for retry, and a concise error appears.

## Scenario 9: Version 4 Migration

Normalize a known version 4 fixture and compare it with the version 5 result. Verify the approved status mapping, null channel metadata, unchanged position count/order/details/links, and identical list-view preference. Repeat historical fixture tests for versions 1 through 3.

## Integrity and Responsive Review

- Confirm every checked-in position ID remains unique and in its previous Manual sequence.
- Confirm the compact list still contains only Company, Position, Status, Work mode, Seniority, and Updated.
- Confirm status sorting follows the nine-value order in the data model.
- Search source and data paths for browser persistent-storage use; expect none.
- Inspect the list, detail status control, publication links, and both help panels at 1440x900 and 390x844.
- Confirm no overlap, clipped labels, horizontal page overflow, row-height increase, large title, or loud visual treatment.
