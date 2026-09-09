# Data Model: Personal Application Statuses

## Version 5 Positions Document

The document remains the complete local source of truth.

| Field | Type | Rules |
| --- | --- | --- |
| `version` | literal `5` | Required |
| `listView` | List View Preference | Preserved unchanged from version 4 |
| `positions` | Position array | IDs remain unique; sequence remains canonical Manual order |

## Overall Application Status

Allowed persisted values, in ascending workflow/sort order:

1. `saved`
2. `applied`
3. `screening`
4. `interviewing`
5. `assignment`
6. `paused`
7. `offer`
8. `rejected`
9. `withdrawn`

New positions begin as `saved`; a qualifying channel submitted during creation advances the saved result to `applied`. Users may select any value directly when editing an existing position.

## Channel Application Status

Optional persisted values:

- `not_applied`
- `applied`
- `viewed`
- `contacted`
- `closed`

`null` means no channel status has been tracked. It is not equivalent to `not_applied`.

## Application Date

An optional calendar date represented as `YYYY-MM-DD`.

Validation rules:

- The value must represent a real calendar date.
- The value must be today or earlier according to the local repository clock.
- A date may be `null` for any channel status.
- Choosing Applied with a null date suggests today in the UI but does not prevent the user from clearing it.
- Clearing a channel status clears a present date only after user confirmation.

## Job Platform Link

| Field | Type | Rules |
| --- | --- | --- |
| `platformName` | string | Required, non-empty after trimming |
| `url` | HTTP(S) URL | Required |
| `applicationStatus` | Channel Application Status or `null` | Optional tracking value |
| `applicationDate` | Application Date or `null` | Optional, non-future |

Metadata is nested in the link so adding or removing another link cannot detach it from its platform and URL.

## Career-Page Channel

The position retains one career-page channel:

| Field | Type | Rules |
| --- | --- | --- |
| `careerPageUrl` | HTTP(S) URL or `null` | Existing field |
| `careerPageApplicationStatus` | Channel Application Status or `null` | Must be null when URL is null |
| `careerPageApplicationDate` | Application Date or `null` | Must be null when URL is null; non-future |

## Position Changes

The current Position entity changes only in these areas:

- `status` uses Overall Application Status.
- `jobPlatformLinks` use the extended Job Platform Link shape.
- `careerPageApplicationStatus` is added.
- `careerPageApplicationDate` is added.

All company, role, assignment, manager, salary, description, timestamp, and ordering fields remain unchanged.

## Detail Update Input

The atomic detail update includes:

- `status`
- assignment detail fields already editable
- hiring manager
- extended platform links
- career-page URL, status, and date
- rich-text job description

The update is strict and rejects unknown properties.

## Automatic Transition

After validating a detail update:

1. Read the currently persisted position.
2. Determine whether any submitted channel has `applied`, `viewed`, or `contacted`.
3. If the submitted overall status is `saved` and qualifying channel evidence exists, persist `applied`.
4. Otherwise persist the submitted overall status unchanged.
5. Save the position and all channel changes atomically.

## Migration to Version 5

### Status mapping

| Legacy value | Version 5 value |
| --- | --- |
| `draft` | `saved` |
| `open` | `applied` |
| `interviewing` | `interviewing` |
| `on_hold` | `paused` |
| `closed` | `rejected` |

### Channel defaults

For every historical platform link:

- `applicationStatus: null`
- `applicationDate: null`

For every historical position:

- `careerPageApplicationStatus: null`
- `careerPageApplicationDate: null`

Versions 1 through 3 continue receiving their previously defined description, requirements, logo, publication-link, and Manual-list-view normalization before the version 5 status/channel mapping. Version 4 retains its saved `listView` exactly.

## Migration Invariants

- Position count and unique IDs do not change.
- Position sequence does not change.
- Version 4 list-view mode, column, and direction do not change.
- No non-status position detail changes.
- Existing links retain platform name, URL, sequence, and career-page URL.
- Migration does not claim that an existing link was used to apply.
