# Contract: Workspace Transfer API

All responses use `cache-control: no-store`. Errors use `{ "error": { "code": string, "message": string, "issues"?: [...] } }`.

## Export Workspace

`GET /api/workspace/export`

Builds a complete package from one serialized snapshot before sending headers.

Success `200` uses `application/zip`, an attachment filename, and package bytes. A missing required file returns `409`; package/storage failure returns `500`. No partial ZIP response starts.

## Validate Import

`PUT /api/workspace/import`

- `content-type: application/zip`
- `x-workspace-filename`: percent-encoded display filename
- Body: raw ZIP stream, limited by the format contract

Success `200`:

```json
{
  "importId": "opaque-id",
  "sourceFileName": "backup.zip",
  "formatVersion": 1,
  "applicationVersion": "0.1.0",
  "exportedAt": "2026-09-09T12:00:00.000Z",
  "counts": {
    "positions": 1,
    "platformLinks": 2,
    "questions": 4,
    "readings": 3,
    "resumes": 1,
    "logos": 1,
    "departments": 2,
    "teams": 3,
    "locations": 2
  },
  "notices": [],
  "willReplaceWorkspace": true,
  "expiresAt": "2026-09-09T12:30:00.000Z"
}
```

Failure codes: `IMPORT_TOO_LARGE`, `IMPORT_ARCHIVE_INVALID`, `IMPORT_PATH_UNSAFE`, `IMPORT_ENTRY_UNSUPPORTED`, `IMPORT_VERSION_UNSUPPORTED`, `IMPORT_MANIFEST_INVALID`, `IMPORT_RELATION_INVALID`, `IMPORT_FILE_MISSING`, `IMPORT_FILE_INVALID`, or `IMPORT_STORAGE_FAILED`. Failure creates no session and changes no live path.

## Cancel Import

`DELETE /api/workspace/import/{importId}`

Success `204` removes staged content. Unknown, expired, or consumed IDs return `404` without affecting live data.

## Restore Validated Import

`POST /api/workspace/import/{importId}/restore`

The empty request is the explicit confirmation to replace the current workspace.

Success `200`:

```json
{
  "restored": true,
  "counts": {
    "positions": 1,
    "platformLinks": 2,
    "questions": 4,
    "readings": 3,
    "resumes": 1,
    "logos": 1,
    "departments": 2,
    "teams": 3,
    "locations": 2
  },
  "backup": {
    "fileName": "positions-workspace-before-restore-<timestamp>.zip",
    "relativePath": "data/backups/positions-workspace-before-restore-<timestamp>.zip",
    "createdAt": "2026-09-09T12:01:00.000Z"
  }
}
```

Failure codes: `IMPORT_SESSION_NOT_FOUND`, `IMPORT_SESSION_EXPIRED`, `IMPORT_IN_PROGRESS`, `BACKUP_FAILED`, or `RESTORE_FAILED`. Backup failure precedes replacement. Restore failure triggers direct rollback and verification; if direct rollback fails, the service rematerializes and verifies the previous workspace from the durable backup before responding or serving workspace requests.

## Concurrency and Lifecycle

- IDs are random, path-safe, one-use, and expire after 30 minutes.
- Only one restore runs at a time.
- Export, backup, restore, and repository writes share one serialized boundary.
- Cancel is accepted only while a session is validated and idle.
- Startup removes stale transfer staging but retains durable backups.
