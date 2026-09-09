# Quickstart Validation: Create a Job Position

This guide validates Journey 2 after its plan, tasks, and implementation receive their
separate approvals. It does not authorize task generation or implementation.

## Prerequisites

- Node.js 24.x and npm 11.x
- Dependencies installed with `npm install`
- Valid local `data/positions.json` and `data/reference-data.json` files
- A backup of `data/positions.json` before manual failure or migration checks

See [the data model](data-model.md), [API contract](contracts/create-position-api.yaml),
and [UI contract](contracts/create-position-ui.md).

## Automated Checks

```powershell
npm test -- --run
npm run build
```

Expected:

- Existing Journey 1 tests remain green.
- Creation schema, repository, API, route, upload, migration, failure, and navigation tests
  pass.
- TypeScript and the production build complete without errors.

## Start the Application

```powershell
npm run dev
```

Open the local URL printed by the command.

## Scenario 1: Minimum Valid Position

1. On the positions list, activate the plus icon and `New position` control.
2. Confirm the single compact page shows all six sections.
3. Enter a company name and position name.
4. Select work mode and seniority; leave every optional field empty.
5. Confirm status shows Draft and employment type shows Full-time.
6. Save.
7. Stop the application, start it again with `npm run dev`, and reopen the created
   position from the list.

Expected: the app returns to the list and the new compact row is first. It shows company,
position, Draft, work mode, seniority, and the current update date. Opening it shows the
defaults and empty optional details before and after the application restart.

## Scenario 2: Complete Position

1. Open the creation page and fill all required fields.
2. Select department, then one of its teams, location, and a non-default employment type.
3. Enter all hiring-manager fields.
4. Enter salary minimum, maximum, and currency.
5. Add two job-platform links and a career-page URL.
6. Enter a description using heading, bold, italic, bullets, numbering, and a link.
7. Save and reopen the position.

Expected: every value and formatting choice survives the round trip. Assignment,
employment, manager, salary, publication, and description values remain absent from the
compact list row.

## Scenario 3: Local Logo Upload

1. Select Upload and choose valid PNG, JPEG, and SVG samples in separate trials.
2. Confirm each preview is stable, then create a position.
3. Inspect `data/positions.json` and `data/company-logos/`.

Expected: each accepted file is at most 2 MB, has a generated filename, is referenced by
`logoPath`, and displays in the list. No base64 image data appears in the JSON file.

Repeat with an oversized file, mismatched media bytes, and unsupported format. Expected:
save is blocked, the logo field explains the problem, and all other values remain.

## Scenario 4: Remote Logo URL

1. Select Image URL and enter a valid HTTPS image address.
2. Save and inspect `data/positions.json`.

Expected: `logoUrl` contains the original address, `logoPath` is null, and no image is
downloaded into the project.

Repeat with a valid but unavailable image. Expected: creation succeeds and the company
initial appears. Repeat with a malformed or non-HTTP URL. Expected: creation is blocked.

## Scenario 5: Conditional Validation

Attempt separate saves with:

- A missing required field.
- Only one hiring-manager field.
- Only one salary field.
- Maximum salary lower than minimum.
- A partial platform-link row.
- Invalid platform or career-page URLs.

Expected: each save is blocked, guidance appears beside the responsible control, the first
invalid control receives focus, and all entered values remain.

## Scenario 6: Dependent Selectors

1. Select a department and team.
2. Change to a department that does not contain that team.

Expected: team is cleared and the change is communicated. Saving retains only valid
reference IDs.

## Scenario 7: Unsaved Changes

1. Open and immediately leave the untouched form.
2. Reopen it, change one value, and use Back, Cancel, browser Back, and refresh in separate
   trials.
3. Choose Stay, then repeat and choose Discard.

Expected: untouched exit is immediate. Dirty exits request confirmation; Stay preserves
the complete form and Discard leaves without creating a position.

## Scenario 8: Duplicate and Repeated Submission

1. Create a position using a company/title pair that already exists.
2. On another valid form, activate Save repeatedly while the first request is pending.

Expected: the duplicate pair is accepted with a unique ID. One save action produces only
one new record, and the save control remains disabled through navigation.

## Scenario 9: Write Failure

1. Use the repository/API failure fixture to force the final JSON rename to fail.
2. Submit a valid position with and without a local logo upload.

Expected: the original JSON bytes are unchanged, no position record is added, staged logo
files are cleaned up, and the complete form remains available for retry.

## Scenario 10: Version Migration

1. Run tests with a version 1 fixture containing plain description and requirements.
2. Run tests with a version 2 fixture containing rich description and requirements.
3. Perform a successful create against each fixture.

Expected: the resulting document is version 3, has no `requirements` properties, preserves
existing descriptions, appends every non-empty requirement under a Requirements heading
as bullets, preserves old record order, and prepends only the new position.

## Responsive and Accessibility Review

Check at 1440x900 and 390x844 using keyboard-only navigation.

Expected:

- No large project heading, decorative card stack, overlap, clipped text, or page-level
  horizontal overflow.
- Labels, required indicators, validation, focus, status, and image fallback remain clear
  without relying only on color.
- All sections, editor commands, link-row controls, and Save are reachable.
- The compact list still satisfies Journey 1's row contract after creation.

## Timed Usability Validation

Run the minimum-position flow from Scenario 1 with ten users who have not previously used
the creation form. Record whether each user completes a valid position on the first
attempt without assistance, along with completion time and the validation errors they
encountered. At least nine of ten users must succeed on their first attempt.

## Success-Criterion Trace

| Criterion | Validation evidence |
|-----------|---------------------|
| SC-001 | Timed minimum-position Scenario 1, including return to first list row. |
| SC-002 | Automated and manual validation in Scenarios 3-5. |
| SC-003 | Application restart and reopen check in Scenario 1 plus generated identity/timestamp tests. |
| SC-004 | Byte-for-byte unchanged-file and cleanup checks in Scenario 9. |
| SC-005 | Desktop/mobile responsive and accessibility review. |
| SC-006 | Version 1 and 2 migration checks in Scenario 10. |
| SC-007 | Timed usability validation with ten users and at least nine first-attempt completions. |
