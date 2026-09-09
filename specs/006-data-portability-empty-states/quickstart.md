# Quickstart: Validate Data Portability and Empty States

## Prerequisites

- Node.js 24
- Dependencies installed with `npm install`
- A disposable copy of `data/` for restore tests

## Automated Validation

```powershell
npm test
npm run test:performance
npm run build
rg -n "localStorage|sessionStorage|indexedDB" src server shared
```

Expected: all tests and build pass; the storage search finds no feature persistence.

## Empty-State Journey

1. Start with `npm run dev` and open the printed local URL.
2. Use empty fixtures for workspace, platform links, readings, resume, questions, filtered questions, and reference choices.
3. Verify [the UI contract](contracts/empty-states-ui.md), including distinct empty/loading/error states.
4. Complete every action by keyboard at 1440x900 and 390x844.

Expected: each empty state explains itself, exposes at most one action, preserves thin layouts, and creates no overlap or page overflow.

## Export Journey

1. Load duplicate names/titles, null and empty values, Unicode, delimiters, multiline rich content, formula-like text, local logos, and PDF/DOCX resumes.
2. Export from the positions toolbar.
3. Compare ZIP paths to [the package contract](contracts/package-format.md).
4. Open CSVs in a text editor and spreadsheet reader; compare manifest, relationships, order, hashes, and files to the source.
5. Modify one CSV cell without changing the manifest and verify the package is rejected as internally inconsistent.

Expected: the package is complete and lossless; CSVs are readable and formula-like values display as text. A missing managed file fails before download starts.

## Restore Journey

1. Copy the ZIP to a disposable second app instance containing different data.
2. Import it and verify current data remains unchanged during validation and preview.
3. Cancel once and confirm the original workspace remains unchanged.
4. Repeat and confirm replacement.
5. Verify the success state reports the workspace-relative backup path and that the ZIP exists there, then reload and compare all restored JSON, relationships, order, preferences, rich content, resumes, and logos.

Expected: restoration is exact, the backup predates replacement, and success reports matching counts.

## Rejection and Rollback

Test traversal, absolute/backslash/duplicate paths, duplicate IDs, unsupported entries or versions, missing files, CSV/manifest mismatch, bad hashes/signatures, broken relationships, excessive sizes, and corrupt ZIPs. Inject failure during backup, staging, promotion, persistence, post-promotion validation, and the first direct rollback operation.

Expected: every rejection or failure leaves prior JSON and managed files byte-for-byte unchanged. Expired, canceled, and consumed IDs cannot restore.

## Performance Fixture

Use 100 positions with 100 questions, 30 readings, 5 links, one deterministic 512 KiB resume per position, and 25 deterministic 64 KiB local logos. The uncompressed managed-file payload is approximately 52 MiB and should resist trivial compression well enough to exercise streaming behavior.

Expected: export completes within 30 seconds; validation, backup, restore, and usable reload complete within 60 seconds.
