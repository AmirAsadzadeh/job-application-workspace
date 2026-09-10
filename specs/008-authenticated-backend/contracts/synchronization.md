# Synchronization Contract

## Scope

Synchronization means complete directional replacement. It never means automatic upload, background replay, or record-level merge.

## Stores

- **Offline**: standalone local workspace.
- **Online working copy**: account-specific local mirror used by the desktop app.
- **Online**: authenticated remote workspace.

## Supported Directions

| Direction | Source | Destination |
|-----------|--------|-------------|
| `offline_to_online` | Offline | Online |
| `working_copy_to_online` | Online working copy | Online |
| `online_to_offline` | Online | Offline |
| `online_to_working_copy` | Online | Online working copy |

## Required Preview

Every attempt produces a preview before replacement:

```json
{
  "attemptId": "uuid",
  "direction": "working_copy_to_online",
  "source": {
    "revision": 14,
    "updatedAt": "2026-09-10T10:00:00.000Z",
    "checksum": "sha256",
    "counts": { "positions": 12, "questions": 30, "readings": 8, "resumes": 4, "logos": 6 }
  },
  "destination": {
    "revision": 16,
    "updatedAt": "2026-09-10T11:00:00.000Z",
    "counts": { "positions": 13, "questions": 31, "readings": 8, "resumes": 4, "logos": 6 }
  },
  "conflict": true,
  "willReplace": "online",
  "willMerge": false,
  "backupRequired": true,
  "expiresAt": "2026-09-10T11:30:00.000Z"
}
```

The UI must say which complete destination will be overwritten. A conflict is true when the current Online revision differs from the local working copy's last confirmed remote revision.

## Confirmation

Confirmation includes:

- Attempt ID
- Original source checksum
- Expected destination revision
- Explicit `confirmReplacement: true`

The destination rejects confirmation when the preview expired, source changed, authenticated owner changed, destination revision changed after preview, backup failed, or validation is no longer valid. The user must generate a new preview.

## Local-to-Remote Protocol

1. Local sidecar exports the selected local source using the existing workspace ZIP format.
2. Remote API receives a bounded streaming upload and computes SHA-256.
3. Remote API validates manifest, CSV consistency, paths, relationships, file types, sizes, and checksums.
4. Remote API reads current Online counts/revision and returns preview.
5. User confirms.
6. Remote API exports the current destination to a private backup object.
7. Remote API stages source files under a new generation prefix.
8. One database transaction verifies expected revision, replaces owned domain rows, records file metadata, increments revision, and activates the generation.
9. Client downloads the confirmed remote representation into the Online working copy and clears pending state.

## Remote-to-Local Protocol

1. Remote API exports the authenticated Online workspace package and revision.
2. Local sidecar validates it using the existing import validator.
3. Local sidecar summarizes the selected local destination and returns the combined preview.
4. User confirms.
5. Local sidecar creates a destination ZIP backup.
6. Existing atomic local restore replaces Offline or the account Online working copy.
7. For an Online working copy, sync state records the downloaded remote revision and clears pending state.

## Idempotency

- Attempt ID and source checksum identify one logical synchronization.
- Repeating confirmation after success returns the same completed result.
- Re-uploading an identical package for the same owner and direction may reuse the valid preview or create a new preview, but cannot duplicate domain rows or managed objects.
- Staged objects use immutable generation paths; failed or expired staging is cleanup-only and never active.

## Failure Guarantees

- Cancel: no source or destination change.
- Validation failure: no backup or destination change.
- Backup failure: replacement does not begin.
- Object staging failure: active destination remains unchanged.
- Database conflict/failure: active destination remains unchanged; staged objects are inactive.
- Client disconnect after server completion: confirmation is idempotent and the client can fetch the completed result.
- Local mirror refresh failure after remote success: remote completion is reported; local state remains pending until it is refreshed explicitly.

## Error Codes

| Code | Meaning |
|------|---------|
| `SYNC_SOURCE_INVALID` | Package or local source failed validation |
| `SYNC_UPLOAD_TOO_LARGE` | Compressed or expanded size limit exceeded |
| `SYNC_PREVIEW_EXPIRED` | Confirmation window elapsed |
| `SYNC_SOURCE_CHANGED` | Source checksum no longer matches preview |
| `SYNC_DESTINATION_CHANGED` | Destination revision changed after preview |
| `SYNC_BACKUP_FAILED` | Recoverable destination backup could not be created |
| `SYNC_REPLACEMENT_FAILED` | Staging or transaction failed; active destination unchanged |
| `SYNC_ATTEMPT_NOT_FOUND` | Attempt absent or owned by another account |
| `SYNC_DIRECTION_INVALID` | Direction is unsupported or does not match attempt |
