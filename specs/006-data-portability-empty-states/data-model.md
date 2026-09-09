# Data Model: Data Portability and Empty States

## Existing Authoritative Data

### Positions Document

- `version`: current position schema version, presently `6`
- `listView`: manual or column sort preference
- `positions[]`: ordered position aggregates

The package reuses the existing document without changing its schema version. Array order is the authoritative manual position order.

### Reference Data

- `version`: current reference-data schema version
- `departments[]`: department identities, names, and owned teams
- `locations[]`: location identities and names

Position reference IDs must resolve under existing relationship rules.

## Portable Package

### Workspace Package Manifest

| Field | Type | Rules |
|---|---|---|
| `formatVersion` | integer | Version `1`; future versions rejected |
| `exportedAt` | ISO timestamp | Required UTC instant |
| `application` | object | Producer name and version |
| `positionsDocument` | object | Must normalize and validate from a supported version |
| `referenceData` | object | Must validate and satisfy position relationships |
| `files` | array | One entry per required managed resume or local logo |

### Managed File Entry

| Field | Type | Rules |
|---|---|---|
| `kind` | enum | `submitted_resume` or `company_logo` |
| `ownerPositionId` | string | Identifies one manifest position |
| `sourceRelativePath` | string | Matches the authoritative owning field |
| `archivePath` | string | Canonical allowlisted package path |
| `mediaType` | string | Matches detected content and extension |
| `byteLength` | integer | Non-negative and equal to extracted bytes |
| `sha256` | string | Lowercase SHA-256 digest |
| `originalFileName` | string or null | Required for resumes; null for logos |

Each local file referenced by authoritative data has exactly one entry, and each file entry is referenced. Logo bytes resolve from `data/company-logos/` first and the active bundled `public/company-logos/` or `dist/company-logos/` second; the effective bytes are packaged and restored into managed logo storage. Remote logo URLs have no file entry.

### CSV Table Set

All CSVs use UTF-8, headers, stable columns, explicit parent IDs, zero-based sequence values where ordering matters, and formula-safe encoding. Empty optional values use empty cells; `*_json` columns use literal JSON `null` when null distinction is required.

- `positions.csv`: scalar position/company/manager/salary/application fields, sequence, description text, and `description_json`
- `job-platform-links.csv`: position ID, sequence, platform, URL, application status, and date
- `questions.csv`: position/question IDs, sequence, title/category, timestamps, answer text, and `answer_json`
- `readings.csv`: position/reading IDs, sequence, title, URL, notes, read flag, and timestamps
- `submitted-resumes.csv`: position, filename/type/path/upload time, archive path, size, and digest
- `departments.csv`: department ID, name, and sequence
- `teams.csv`: department/team IDs, name, and sequence values
- `locations.csv`: location ID, name, and sequence

CSVs are derived views. Restoration never reconstructs authoritative data from them, but validation regenerates every canonical CSV from the normalized manifest and requires exact byte equality so a misleading or internally inconsistent package is rejected.

## Restore State

### Import Session

| Field | Type | Rules |
|---|---|---|
| `id` | opaque string | Random, path-safe, one use |
| `sourceFileName` | string | Display only; never a storage path |
| `stagedArchivePath` | local path | Contained under transfer staging |
| `stagedWorkspacePath` | local path | Contains only validated content |
| `manifest` | validated manifest | Immutable for the session |
| `preview` | restore preview | Derived counts and notices |
| `createdAt` / `expiresAt` | timestamp | Maximum lifetime 30 minutes |
| `state` | enum | `validated`, `restoring`, `consumed`, `cancelled`, or `expired` |

Transitions: upload -> validated; validated -> restoring -> consumed; validated -> cancelled; validated -> expired. Failed validation creates no session. Failed restore rolls back and invalidates the session.

### Restore Preview

- Import ID
- Source filename, package/application versions, and export timestamp
- Counts for positions, links, questions, readings, resumes, logos, departments, teams, and locations
- Compatibility notices and non-blocking warnings
- `willReplaceWorkspace: true`

### Pre-Restore Backup

- Unique timestamped filename and durable `data/backups/` path
- Workspace-relative recovery path returned to the success UI
- Creation time and byte length
- Complete package produced immediately before replacement

## Validation Limits

- Maximum compressed upload: 512 MiB
- Maximum total expanded content: 1 GiB
- Maximum archive entries: 10,000
- Maximum `manifest.json`: 32 MiB
- Allowed roots: nine required manifest/CSV files, `resume-files/`, and `company-logo-files/`
- No absolute paths, drive prefixes, backslashes, `.`/`..` segments, control characters, encrypted entries, links, duplicate paths, or unsupported entry types

## Replacement Invariants

1. Validation completes before live paths change.
2. The repository write queue excludes concurrent mutations during backup and replacement.
3. A complete pre-restore backup exists before promotion.
4. Live paths move to rollback names before staged paths are promoted.
5. The promoted workspace is relationship-validated before rollback paths are retired.
6. Any failure restores and verifies all old paths; if a direct rollback operation fails, the old workspace is rematerialized from the durable backup and verified before the service becomes available.
7. Backups and transfer staging are never included in exported packages.
