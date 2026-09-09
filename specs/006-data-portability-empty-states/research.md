# Research: Data Portability and Empty States

## ZIP Creation

**Decision**: Use `@archiver/archiver` to create ZIPs into temporary files before serving or retaining them.

**Rationale**: The project runs on Node.js 24 and uses ESM. The library is ESM and TypeScript-first, exposes a streaming ZIP transform, and avoids holding all managed files in memory. Completing the temporary package before response headers also prevents an incomplete download when a referenced file is missing.

**Alternatives considered**: Browser-side generation would duplicate server-owned file access and increase memory use. Hand-written ZIP generation is a standards risk. The older CommonJS `archiver` package adds type/runtime interop.

**Reference**: [Archiver project documentation](https://github.com/node-archiver/archiver)

## ZIP Reading and Safety

**Decision**: Use `yauzl` with lazy entry iteration, strict filenames, entry-size validation, and application-enforced entry/count/compressed/expanded limits.

**Rationale**: Import needs random access to the uploaded temporary file, controlled memory use, path validation, and protection against false or excessive expanded sizes. Lazy reads permit rejecting metadata before extraction and processing one entry at a time.

**Alternatives considered**: Extract-all libraries make pre-extraction validation and total expansion limits harder to guarantee. Loading the archive into memory conflicts with the approved scale. Shell tools introduce platform-specific behavior.

**Reference**: [yauzl documentation](https://github.com/thejoshwolfe/yauzl)

## CSV Serialization

**Decision**: Use `csv-stringify` with explicit columns, headers, UTF-8 output, and formula escaping.

**Rationale**: It handles commas, quotes, newlines, tabs, and Unicode consistently. Its formula-escaping option covers values beginning with `=`, `+`, `-`, `@`, tab, or carriage return.

**Alternatives considered**: Manual joining is fragile. Excel-only output is less portable. CSV parsing is unnecessary because restore uses the manifest.

**Reference**: [CSV Stringify formula escaping](https://csv.js.org/stringify/options/escape_formulas/)

## Authoritative and Interoperable Representations

**Decision**: Preserve the complete `PositionsDocument` and `ReferenceData` in `manifest.json`; derive CSVs from that validated snapshot and never use them as restore input.

**Rationale**: Existing nested rich content, null semantics, ordering, and relationships already have strict schemas. JSON preserves them losslessly, while normalized CSV tables make common data accessible to unrelated systems.

**Alternatives considered**: Reconstructing from CSV would make nulls, rich trees, and future fields lossy. One flattened CSV would duplicate data and obscure one-to-many relationships.

## Snapshot and Restore Consistency

**Decision**: Extend the repository's serialized write queue with snapshot and restore operations. Build exports and backups to completed temporary ZIPs; perform restore through staged paths and rollback renames.

**Rationale**: A transfer must represent one point in time and not race question, reading, resume, ordering, or detail updates. The project already serializes mutations and uses temporary-file rename for JSON replacement.

**Alternatives considered**: Independent path reads can mix revisions. Overwriting live files cannot satisfy rollback. A database or new primary layout exceeds scope.

## Automatic Backup Ownership

**Decision**: Save the pre-restore package under `data/backups/` and return its filename. Backups are excluded from subsequent packages.

**Rationale**: A server-side durable file can be confirmed before replacement and remains recoverable if browser downloading is interrupted.

**Alternatives considered**: Browser auto-download cannot prove retention. Memory is not durable. Cloud backup violates scope.

## Import Session Lifetime

**Decision**: Validation returns an opaque, one-use import ID tied to staged content. Staging expires after 30 minutes and is cleared on cancellation, restore, validation failure, and startup.

**Rationale**: Validation and confirmation are separate steps, but commit must use the exact validated bytes. Server staging avoids browser persistence.

**Alternatives considered**: Re-uploading risks validating one file and restoring another. Long-lived sessions accumulate private files.

## Empty-State Composition

**Decision**: Use one small semantic component with a message and at most one action; callers own copy and commands.

**Rationale**: The existing UI already has compact notice styles. A shared primitive standardizes focus and spacing while preserving distinct true-empty, filtered-empty, loading, and error meanings.

**Alternatives considered**: Generic "No data" copy fails recovery needs. Separate decorative cards add noise and duplicate accessibility behavior.

## Planning Questions

All planning questions are resolved.
