# Data Model: Authenticated Online Workspace

## Model Boundaries

The feature has three persistence contexts:

1. **Standalone Offline workspace**: Existing local JSON document, reference data, managed files, and backups.
2. **Online working copy**: Account-scoped local JSON mirror plus non-secret synchronization state.
3. **Online workspace**: Authenticated PostgreSQL records plus private object storage.

All three use the existing domain identities and workspace package schema. Synchronization is complete directional replacement, never row-by-row merge.

## Local Filesystem Model

```text
workspace-root/
|-- offline/
|   |-- positions.json
|   |-- reference-data.json
|   |-- company-logos/
|   |-- resumes/
|   `-- backups/
|-- online/
|   `-- <account-id>/
|       |-- positions.json
|       |-- reference-data.json
|       |-- sync-state.json
|       |-- company-logos/
|       |-- resumes/
|       `-- backups/
`-- workspace-state.json
```

Existing installations are normalized into `offline/` without changing JSON document meaning. Migration of paths must be backup-first and idempotent.

### Workspace State

| Field | Type | Rules |
|-------|------|-------|
| `version` | integer | Local state schema version |
| `selectedMode` | `offline` or `online` | Defaults to `offline` for existing installations |
| `selectedAccountId` | string or null | Required only for Online mode; not an authentication credential |
| `updatedAt` | timestamp | Updated after explicit mode change |

### Online Sync State

| Field | Type | Rules |
|-------|------|-------|
| `version` | integer | Local sync-state schema version |
| `accountId` | string | Must match containing account directory |
| `lastConfirmedRemoteRevision` | non-negative integer or null | Revision represented by the last confirmed mirror |
| `pending` | boolean | True after any local edit not confirmed remotely |
| `pendingSince` | timestamp or null | Required when `pending` is true |
| `lastConfirmedAt` | timestamp or null | Set after successful fetch/write/synchronization |
| `lastConnectivityCheckAt` | timestamp or null | Informational only |

Authentication tokens, password material, PKCE verifiers, and refresh credentials are prohibited from both local JSON documents.

## Authentication Entities

Better Auth owns the physical schema and migrations for these entities. Domain tables reference only the stable user primary key.

### User

| Field | Type | Rules |
|-------|------|-------|
| `id` | text/UUID | Primary key, non-sequential external identity |
| `email` | text | Unique, normalized by auth provider |
| `emailVerified` | boolean | Online workspace blocked until true |
| `name` | text | May default from email during initial release |
| `createdAt` | timestamp | Server generated |
| `updatedAt` | timestamp | Server generated |

### Session

| Field | Type | Rules |
|-------|------|-------|
| `id` | text/UUID | Primary key |
| `userId` | foreign key | References User; cascade on user deletion |
| `token` | secret text | Unique; never returned in workspace payloads or logs |
| `expiresAt` | timestamp | Mandatory expiration |
| `ipAddress` | text or null | Security metadata with disclosed retention |
| `userAgent` | text or null | Used for session review |
| `createdAt` | timestamp | Server generated |
| `updatedAt` | timestamp | Server generated |

### Verification

Stores expiring email-verification, recovery, OAuth state, and PKCE records as defined by Better Auth. Values are single-purpose, expiring, and removed or invalidated after use.

### OAuth Client And Grant

The installed desktop application is a registered public native client with exact deep-link redirect URIs, no client secret, Authorization Code grant, refresh grant, and mandatory S256 PKCE.

## Online Workspace Entities

### Workspace

One row per account.

| Field | Type | Rules |
|-------|------|-------|
| `id` | UUID | Primary key |
| `ownerId` | foreign key | Unique reference to User; cascade deletion |
| `revision` | bigint | Starts at 0; increments on every confirmed domain write or replacement |
| `activeGenerationId` | UUID or null | References the visible workspace generation |
| `createdAt` | timestamp | Server generated |
| `updatedAt` | timestamp | Updated with revision |

Authorization invariant: every query begins with authenticated `ownerId`; request payloads cannot choose it.

### Workspace Generation

Represents a complete synchronization staging/backup boundary.

| Field | Type | Rules |
|-------|------|-------|
| `id` | UUID | Primary key |
| `workspaceId` | foreign key | References Workspace |
| `state` | enum | `staging`, `active`, `backup`, `failed`, `expired` |
| `sourceKind` | enum | `initial`, `normal`, `offline_upload`, `online_backup`, `restore` |
| `sourceRevision` | bigint or null | Revision represented by source |
| `packageFormatVersion` | integer | Existing workspace package format |
| `packageChecksum` | text or null | SHA-256 when generated from a package |
| `backupObjectKey` | text or null | Private immutable ZIP key |
| `createdAt` | timestamp | Server generated |
| `activatedAt` | timestamp or null | Set only for a successful activation |
| `expiresAt` | timestamp or null | Retention boundary for staging/backups |

Only one generation per workspace may be `active`. Failed staging generations cannot be activated.

### Workspace Preference

| Field | Type | Rules |
|-------|------|-------|
| `workspaceId` | foreign key | Primary key; references Workspace |
| `listMode` | enum | `manual` or `column` |
| `sortColumn` | enum or null | Required for `column`, null for `manual` |
| `sortDirection` | enum or null | `asc` or `desc`; required for `column` |

### Position

| Field | Type | Rules |
|-------|------|-------|
| `id` | text | Existing stable position ID; unique within workspace |
| `workspaceId` | foreign key | Required owner boundary |
| `sequence` | integer | Unique within workspace for manual ordering |
| `companyName` | text | Required, trimmed |
| `companyLogoUrl` | URL or null | Remote company-provided URL |
| `companyLogoFileId` | foreign key or null | References owned Managed File |
| `title` | text | Required, trimmed |
| `status` | enum | Existing position-status values |
| `workMode` | enum | Existing work-mode values |
| `employmentType` | enum | Existing employment-type values |
| `seniority` | enum | Existing seniority values |
| `departmentId` | foreign key or null | Must belong to same workspace |
| `teamId` | foreign key or null | Must belong to selected department |
| `locationId` | foreign key or null | Must belong to same workspace |
| `hiringManagerName` | text | May be empty |
| `hiringManagerPhone` | text | May be empty |
| `hiringManagerPosition` | text | May be empty |
| `salaryMin` | decimal or null | Optional; cannot exceed maximum |
| `salaryMax` | decimal or null | Optional; cannot be below minimum |
| `salaryCurrency` | text or null | Required when either amount exists |
| `careerPageUrl` | URL or null | HTTPS/HTTP only |
| `careerApplicationStatus` | enum or null | Requires career-page URL |
| `careerApplicationDate` | date or null | Cannot be future; requires URL/status rules |
| `description` | JSON | Validated rich-text document |
| `revision` | bigint | Optimistic concurrency value |
| `createdAt` | timestamp | Preserved across synchronization |
| `updatedAt` | timestamp | Server generated for normal edits; preserved package value on replacement |

Unique key: `(workspaceId, id)`. Normal updates require expected position revision and current workspace revision.

### Job Platform Link

| Field | Type | Rules |
|-------|------|-------|
| `id` | UUID | Stable online identifier |
| `positionId` | foreign key | Same workspace as parent |
| `sequence` | integer | Preserves display order |
| `platformName` | text | Required |
| `url` | URL | Required HTTP/HTTPS URL |
| `applicationStatus` | enum or null | Existing channel-status values |
| `applicationDate` | date or null | Cannot be future |

### Position Question

| Field | Type | Rules |
|-------|------|-------|
| `id` | text | Existing stable identity |
| `positionId` | foreign key | Same workspace as parent |
| `sequence` | integer | Preserves existing order |
| `title` | text | Required |
| `category` | enum or null | Existing question categories |
| `customCategory` | text or null | Required only when category is `other` |
| `answer` | JSON | Validated rich-text/code document |
| `createdAt` | timestamp | Preserved |
| `updatedAt` | timestamp | Preserved or server updated |

### Reading Item

| Field | Type | Rules |
|-------|------|-------|
| `id` | text | Existing stable identity |
| `positionId` | foreign key | Same workspace as parent |
| `sequence` | integer | Preserves display order |
| `title` | text | Required |
| `url` | URL or null | HTTP/HTTPS only |
| `notes` | text | Plain text, may be empty |
| `isRead` | boolean | Required |
| `createdAt` | timestamp | Preserved |
| `updatedAt` | timestamp | Preserved or server updated |

### Department, Team, And Location

- **Department**: `(workspaceId, id, name, sequence)`; ID unique within workspace.
- **Team**: `(workspaceId, departmentId, id, name, sequence)`; department must share workspace.
- **Location**: `(workspaceId, id, name, sequence)`; ID unique within workspace.

These remain workspace-owned because the current reference-data JSON is user editable and portable.

### Managed File

| Field | Type | Rules |
|-------|------|-------|
| `id` | UUID | Primary key |
| `workspaceId` | foreign key | Required owner boundary |
| `positionId` | foreign key | Required parent position |
| `kind` | enum | `company_logo` or `submitted_resume` |
| `originalFileName` | text | Sanitized display name |
| `mediaType` | enum | Existing approved logo/PDF/DOCX types |
| `byteLength` | bigint | Positive and within configured limit |
| `sha256` | text | Required checksum |
| `objectKey` | text | Unique immutable private key |
| `generationId` | foreign key or null | Set for staged/replacement objects |
| `createdAt` | timestamp | Server generated |

Constraint: at most one submitted resume per position. Objects are accessed only through authenticated or short-lived signed URLs.

### Synchronization Attempt

| Field | Type | Rules |
|-------|------|-------|
| `id` | UUID | Primary key and idempotency identity |
| `workspaceId` | foreign key | Authenticated owner workspace |
| `direction` | enum | `offline_to_online`, `working_copy_to_online`, `online_to_offline`, `online_to_working_copy` |
| `status` | enum | `uploading`, `validating`, `preview_ready`, `confirming`, `completed`, `cancelled`, `failed`, `expired` |
| `sourceRevision` | bigint or null | Remote source revision when applicable |
| `expectedDestinationRevision` | bigint or null | Required for online replacement |
| `sourceChecksum` | text | Package SHA-256; unique with owner/direction for retry safety |
| `sourceCounts` | JSON | Validated package counts |
| `destinationCounts` | JSON | Counts captured at preview |
| `conflict` | boolean | True when expected remote revision is stale |
| `stagingGenerationId` | foreign key or null | New validated generation |
| `backupGenerationId` | foreign key or null | Destination backup |
| `errorCode` | text or null | Stable non-secret failure category |
| `createdAt` | timestamp | Server generated |
| `expiresAt` | timestamp | Preview cannot be confirmed after expiration |
| `completedAt` | timestamp or null | Set on terminal success |

Only the owning account may read or confirm an attempt. Confirmation must match its original direction, source checksum, and expected destination revision.

## State Transitions

### Online Working Copy

```text
confirmed -> local edit without remote confirmation -> pending
pending -> reconnect/revision check -> pending (with or without conflict)
pending -> approved upload succeeds -> confirmed
pending -> approved online download succeeds -> confirmed
pending -> cancel/failure -> pending
```

### Synchronization Attempt

```text
uploading -> validating -> preview_ready -> confirming -> completed
     |           |              |              |
     `--------> failed          +-> cancelled  `-> failed
                                `-> expired
```

### Workspace Generation

```text
staging -> active
staging -> failed
active -> backup
backup -> expired
```

## Deletion And Retention

- Account deletion cascades active relational data and schedules owned object deletion.
- A pending local Online working copy is never silently deleted during sign-out; the user must cancel sign-out, upload, or explicitly discard pending work.
- Synchronization previews expire and staged objects are removed after their stated retention period.
- Destination backups follow a documented retention setting disclosed before synchronization/account deletion.
- Portable ZIP exports are user-owned and outside backend retention after download.
