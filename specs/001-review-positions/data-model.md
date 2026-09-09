# Data Model: Review Current Positions

## Positions Document

The local `data/positions.json` file contains one versioned document.

| Field | Type | Required | Rules |
|-------|------|----------|-------|
| `version` | integer | Yes | Version 2 stores structured descriptions; version 1 is accepted for migration. |
| `positions` | Position[] | Yes | May be empty; position IDs must be unique. |

An empty `positions` array represents the approved empty state. Missing, unreadable,
malformed, or invalid documents represent a data error and must not be treated as an
empty list.

## Position

| Field | Type | Required | Row-visible | Rules |
|-------|------|----------|-------------|-------|
| `id` | string | Yes | No | Non-empty and unique within the document. |
| `company` | Company | Yes | Yes | Company name is always available; logo is optional. |
| `title` | string | Yes | Yes | Non-empty; displayed on one line with full value accessible. |
| `status` | PositionStatus | Yes | Yes | One of the approved status values. |
| `workMode` | WorkMode | Yes | Yes | One of the approved work-mode values. |
| `seniority` | string | Yes | Yes | Non-empty user-facing value. |
| `updatedAt` | string | Yes | Yes | Valid ISO 8601 date-time; shown in a concise local format. |
| `createdAt` | string | Yes | No | Valid ISO 8601 date-time. |
| `departmentId` | string or null | No | No | Must match a reference-data department when set. |
| `teamId` | string or null | No | No | Must belong to the selected department when set. |
| `locationId` | string or null | No | No | Must match a reference-data location when set. |
| `employmentType` | EmploymentType or null | No | No | Detail-only value. |
| `hiringManager` | HiringManager | Yes | No | Detail-only contact; all fields may be blank together. |
| `salary` | Salary or null | No | No | Detail-only value. |
| `description` | RichTextDocument | Yes | No | Detail-only formatted content; defaults to an empty document. |
| `jobPlatformLinks` | JobPlatformLink[] | Yes | No | Ordered detail-only links; defaults to an empty array. |
| `careerPageUrl` | string or null | Yes | No | Absolute HTTP/HTTPS address when set. |
| `requirements` | string[] | Yes | No | Detail-only requirement entries; defaults to an empty array. |

### PositionStatus

| Stored value | Display label |
|--------------|---------------|
| `draft` | Draft |
| `open` | Open |
| `interviewing` | Interviewing |
| `on_hold` | On Hold |
| `closed` | Closed |

This review journey reads status but does not change it. Status-transition rules belong to
a later position-status journey.

### WorkMode

| Stored value | Display label |
|--------------|---------------|
| `remote` | Remote |
| `hybrid` | Hybrid |
| `onsite` | Onsite |

### EmploymentType

Supported detail-only values are `full_time`, `part_time`, `contract`, and `internship`.
Employment type is never included in position-row markup.

## Company

| Field | Type | Required | Rules |
|-------|------|----------|-------|
| `name` | string | Yes | Non-empty; used as the logo alternative text and fallback identity. |
| `logoPath` | string | No | Must match `/company-logos/<filename>`; traversal, remote URLs, and filesystem paths are rejected. |

When `logoPath` is absent or the asset cannot load, the row uses a fixed-size fallback
derived from the company name. The fallback must not change row height.

## HiringManager

| Field | Type | Required | Rules |
|-------|------|----------|-------|
| `name` | string | Yes | Non-empty. |
| `phone` | string | Yes | Preserved as entered; not interpreted as a number. |
| `position` | string | Yes | Manager's position or title; non-empty. |

The complete object is detail-only and must not be returned as row markup. All three
fields may be omitted together. If any hiring-manager value is entered, all three fields
are required before saving.

## Salary

| Field | Type | Required | Rules |
|-------|------|----------|-------|
| `minimum` | number | No | Non-negative when present. |
| `maximum` | number | No | Non-negative and not less than `minimum` when both exist. |
| `currency` | string | Yes | Three-letter uppercase currency code when salary exists. |

Salary is detail-only and does not affect list layout.

## JobPlatformLink

| Field | Type | Required | Rules |
|-------|------|----------|-------|
| `platformName` | string | Yes | Trimmed, non-empty, and user-entered. |
| `url` | string | Yes | Absolute HTTP or HTTPS address. |

Entries preserve user order. A completely blank draft row is discarded before save. A
partially completed entry blocks saving and remains visible with field guidance.

## RichTextDocument

The description is stored as a restricted structured document rather than executable
markup.

| Content | Allowed values and rules |
|---------|--------------------------|
| Root | Exactly one `doc` node containing zero or more block nodes. |
| Blocks | `paragraph`, heading levels 1-3, `bulletList`, `orderedList`, and `listItem`. |
| Inline nodes | `text` and `hardBreak`. |
| Marks | `bold`, `italic`, and `link`. |
| Link mark | Absolute HTTP or HTTPS `href`; no executable URL schemes. |

Unsupported nodes, marks, and attributes are never persisted. Empty content is represented
by a document containing one empty paragraph, giving the editor a stable cursor target.

## Reference Data Document

The local `data/reference-data.json` file defines values for the detail selectors.

| Field | Type | Required | Rules |
|-------|------|----------|-------|
| `version` | integer | Yes | Must equal `1`; reference-data shape is unchanged. |
| `departments` | Department[] | Yes | IDs must be unique; may be empty. |
| `locations` | Location[] | Yes | IDs must be unique; may be empty. |

### Department and Team

| Field | Type | Required | Rules |
|-------|------|----------|-------|
| `Department.id` | string | Yes | Stable, non-empty, unique department ID. |
| `Department.name` | string | Yes | Non-empty display label. |
| `Department.teams` | Team[] | Yes | Team IDs must be unique across the document. |
| `Team.id` | string | Yes | Stable, non-empty team ID. |
| `Team.name` | string | Yes | Non-empty display label. |

### Location

| Field | Type | Required | Rules |
|-------|------|----------|-------|
| `id` | string | Yes | Stable, non-empty, unique location ID. |
| `name` | string | Yes | Non-empty display label. |

## Relationships

- A Positions Document contains zero or more Positions.
- Each Position has exactly one Company.
- Each Position has zero or one Hiring Manager.
- Each Position contains zero or more Job Platform Links and zero or one career-page URL.
- Each Position contains exactly one Rich Text Document, which may be visually empty.
- A Position may reference one Department and one Location.
- A Position may reference one Team only when that Team belongs to its selected Department.
- Changing a Position's Department clears an incompatible Team selection before save.

## Validation and Error Behavior

- The full document is validated before any positions are returned.
- Duplicate IDs, invalid enum values, invalid dates, unsafe logo paths, or invalid nested
  objects reject the document.
- Invalid URL schemes, incomplete platform-link pairs, or unsupported rich-text structures
  reject the document or update without writing partial data.
- Position reference IDs are validated against the complete Reference Data Document.
- Validation errors produce the stable `POSITIONS_DATA_INVALID` service error without
  returning a partial list.
- A missing or unreadable file produces `POSITIONS_DATA_UNAVAILABLE`.
- API responses preserve file order; sorting is outside this journey.

## Refresh Behavior

The service reads the file for each positions request. The UI requests the list when the
positions view opens and when the user returns from the detail route. This makes a saved
file change visible without introducing filesystem watching or browser storage.

## Update Behavior

- The detail route may update only `departmentId`, `teamId`, `locationId`,
  `hiringManager`, `jobPlatformLinks`, `careerPageUrl`, and `description` in this journey.
- The service assigns `updatedAt` after successful validation; clients cannot set it.
- Each update validates reference relationships and the complete next Positions Document.
- The service writes the complete next document to a sibling temporary file, waits for the
  write to finish, and renames it over `data/positions.json`.
- Failed validation or file operations leave the original positions file unchanged and
  return a stable error response.

## Version Transition

- Version 1 positions contain a plain string `description` and no publication-link fields.
- Reading version 1 converts the string into paragraph-based RichTextDocument content and
  supplies an empty `jobPlatformLinks` array plus null `careerPageUrl` in memory.
- Reads never rewrite the file. The next successful detail save validates the normalized
  document and atomically writes the complete document as version 2.
- Existing description text, line breaks, unrelated position fields, and record order are
  preserved through normalization.
