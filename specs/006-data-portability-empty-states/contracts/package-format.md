# Contract: Workspace Package Format Version 1

## Archive Layout

```text
manifest.json
positions.csv
job-platform-links.csv
questions.csv
readings.csv
submitted-resumes.csv
departments.csv
teams.csv
locations.csv
resume-files/
  <position-id>--<opaque-file-id>.<pdf|docx>
company-logo-files/
  <position-id>--<opaque-file-id>.<png|jpg|svg>
```

Directories may be omitted when empty. All nine root files are required, including header-only CSVs. Paths use forward slashes and exact case.

## Manifest Shape

```json
{
  "formatVersion": 1,
  "exportedAt": "2026-09-09T12:00:00.000Z",
  "application": { "name": "job-positions", "version": "0.1.0" },
  "positionsDocument": {},
  "referenceData": {},
  "files": [
    {
      "kind": "submitted_resume",
      "ownerPositionId": "pos-1",
      "sourceRelativePath": "pos-1/file.pdf",
      "archivePath": "resume-files/pos-1--file.pdf",
      "mediaType": "application/pdf",
      "byteLength": 1234,
      "sha256": "<64 lowercase hexadecimal characters>",
      "originalFileName": "resume.pdf"
    }
  ]
}
```

The two document fields contain their complete existing validated structures. Unknown manifest keys are rejected for version 1.

## CSV Rules

- UTF-8 with a header row and CRLF record delimiters.
- Standards-based quoting for commas, quotes, and line breaks.
- Values beginning with `=`, `+`, `-`, `@`, tab, or carriage return are escaped for spreadsheet display.
- Boolean values are `true` or `false`; sequence values are zero-based integers.
- Date and date-time strings retain their source representation.
- Rich content has readable `*_text` and exact compact JSON `*_json` columns.
- Stable IDs and parent IDs are never replaced by display names.
- Row order follows manifest position and child-array order.

## Integrity Rules

1. Every authoritative local logo and submitted resume maps to exactly one file entry and archive entry. Local logos resolve from managed storage first and the active bundled asset directory second; the effective bytes are included.
2. No unreferenced file entry or managed archive file is accepted.
3. Bytes match declared length, digest, media type, extension, and owner.
4. The eight CSV filenames and schemas are fixed for format version 1.
5. CSV content is informational for restore and `manifest.json` is authoritative, but every CSV must exactly equal the canonical formula-safe projection regenerated from the normalized manifest or the package is rejected as internally inconsistent.
6. Backups, temporary files, staging metadata, and remote-logo content are excluded.

## Compatibility

- Format version `1` is accepted.
- Future format versions are rejected without changing live data.
- Historical position-document versions already supported by normalization may be normalized during validation and previewed before restore.
