# Interface Contract: Position Readiness

## Read Position Details

`GET /api/positions/:positionId`

The existing Position response includes readiness metadata:

```json
{
  "position": {
    "id": "pos-001",
    "readingItems": [
      {
        "id": "reading-001",
        "title": "Event loop deep dive",
        "url": "https://example.com/event-loop",
        "notes": "Review task and microtask ordering.",
        "isRead": true,
        "createdAt": "2026-09-09T08:00:00.000Z",
        "updatedAt": "2026-09-09T09:00:00.000Z"
      }
    ],
    "submittedResume": {
      "originalFileName": "frontend-resume.pdf",
      "fileType": "pdf",
      "mediaType": "application/pdf",
      "relativePath": "pos-001/0ec9b464.pdf",
      "uploadedAt": "2026-09-09T10:00:00.000Z"
    }
  }
}
```

Unchanged Position fields are omitted for readability. `submittedResume` is null when no resume is retained. The binary file is never embedded in this response.

## Create Reading Item

`POST /api/positions/:positionId/readiness/readings`

```json
{
  "title": "Event loop deep dive",
  "url": "https://example.com/event-loop",
  "notes": "Review task and microtask ordering.",
  "isRead": false
}
```

On success, return `201` with the authoritative complete Position. The server supplies the reading identity and timestamps and places it first.

## Update Reading Item or Read Status

`PATCH /api/positions/:positionId/readiness/readings/:readingId`

The strict body has the same complete editable fields as Create Reading Item. The compact Read checkbox sends the last saved title, URL, and notes with the new `isRead` value. On success, return `200` with the authoritative complete Position; identity, `createdAt`, and order are preserved.

## Delete Reading Item

`DELETE /api/positions/:positionId/readiness/readings/:readingId`

The request has no body. After UI confirmation, success returns `200` with the authoritative Position after removing only that reading item.

## Import or Replace Submitted Resume

`PUT /api/positions/:positionId/readiness/resume`

Request headers:

| Header | Value |
| --- | --- |
| `Content-Type` | Optional browser-declared MIME hint; it may be empty, generic, or inaccurate |
| `X-Resume-Filename` | `encodeURIComponent` form of the original filename |

The request body is the raw File bytes. An existing submitted resume means PUT is a replacement. Staged-file detection is authoritative; headers and filename extensions do not override detected supported content.

On success, return `200` with the authoritative complete Position containing new resume metadata. The previous managed file is no longer retained.

## Open Submitted Resume

`GET /api/positions/:positionId/readiness/resume`

The server rechecks the Position's current metadata, resolves its opaque path beneath the configured resume root, and streams the bytes.

Successful response headers include:

- Detected `Content-Type`
- Safe `Content-Disposition` using the original filename; PDF is inline and DOCX is an attachment/open handoff
- `X-Content-Type-Options: nosniff`
- `Cache-Control: private, no-store`
- Restrictive `Content-Security-Policy`

The response is binary, not JSON. A missing externally altered file returns a JSON `404` without clearing metadata.

## Remove Submitted Resume

`DELETE /api/positions/:positionId/readiness/resume`

The request has no body. After UI confirmation, success returns `200` with the authoritative Position containing `submittedResume: null`. The managed file is removed as part of the coordinated operation.

## Validation Behavior

- Reading title is required after trimming; duplicate titles are accepted.
- Reading URL is null or a valid HTTP(S) address; notes are plain text.
- Unknown reading properties, IDs, and timestamps are rejected.
- Resume filename must decode to a non-empty display filename and cannot control a storage path.
- Resume content must be detected as PDF or DOCX; an empty, generic, or conflicting browser-declared media type does not reject otherwise supported detected content.
- Importing an unsupported or empty file does not change an existing resume.

## Error Responses

JSON failures use the existing error envelope.

| Condition | HTTP status | Stable code |
| --- | --- | --- |
| Malformed JSON or invalid reading body | 400 | `READING_INVALID` |
| Missing/invalid resume headers or unsupported content | 400 | `RESUME_INVALID` |
| Owning position does not exist | 404 | `POSITION_NOT_FOUND` |
| Reading item does not exist in that position | 404 | `READING_NOT_FOUND` |
| No resume metadata exists for Open/Remove | 404 | `RESUME_NOT_FOUND` |
| Metadata exists but managed file is unavailable | 404 | `RESUME_FILE_UNAVAILABLE` |
| JSON or managed-file operation fails | 500 | `POSITION_WRITE_FAILED` |

Validation errors contain field paths where relevant. Failed writes never return an optimistic Position; the client retains reading drafts and continues displaying the previous submitted resume.

## Atomicity, Containment, and Isolation

- Reading and resume mutations enter the repository's existing serialized write queue.
- Reading metadata changes use one atomic positions-document replacement.
- Resume mutations stage file changes and compensate failures so any reported failure retains the previous visible metadata/file pair.
- Generated managed names do not derive from user filenames.
- Every resolved managed path must remain inside the configured resume root and owning position directory.
- No generic `/data` or static-directory route serves resume files.
- Same-named source files for different positions remain independent.
