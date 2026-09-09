# Research: Create a Job Position

## Decision 1: Extend the Existing Application Boundaries

**Decision**: Keep the current React/Vite frontend, custom history router, Node HTTP
service, shared Zod schemas, and file-backed repository. Add no dependency.

**Rationale**: Each required capability already has a nearby pattern: list/detail routes,
JSON requests, field validation, reference-data loading, rich text, and queued atomic
writes. Extending them keeps behavior coherent and limits the feature's blast radius.

**Alternatives considered**: React Router was rejected because three routes do not justify
a routing migration. A form framework was rejected because the form's conditional groups
can remain explicit and type-safe with the existing state and Zod pattern. A database or
browser storage conflicts with the approved local-file constraint.

## Decision 2: Use a Version 3 Position Document

**Decision**: Introduce document version 3, remove `requirements`, add nullable remote-logo
support, and continue reading versions 1 and 2 through deterministic normalization.

**Rationale**: The approved journey changes persisted shape. A version boundary makes the
migration visible and testable, preserves old files, and prevents optional legacy fields
from lingering indefinitely.

**Alternatives considered**: Keeping `requirements` as an ignored field was rejected
because the specification explicitly removes it. Mutating files on read was rejected
because inspection must not have write side effects. A one-off-only migration was
rejected because users may bring older valid local files into the workspace later.

## Decision 3: Append Requirements as Structured Rich Text

**Decision**: For each legacy position with non-empty requirements, append a level-2
`Requirements` heading and a bullet list containing the entries in their original order.

**Rationale**: The result preserves the content and its meaning while using only already
approved rich-text nodes. Appending avoids changing the user's existing description.

**Alternatives considered**: Concatenating plain text was rejected because it would lose
structure. Keeping a hidden requirements array was rejected because it would preserve two
sources of truth. Inserting at the beginning was rejected because it would displace the
existing role overview.

## Decision 4: Carry Uploaded Images in the Structured Create Request

**Decision**: Represent an upload as filename, media type, and base64 payload in the JSON
create request, then validate and decode it on the service.

**Rationale**: This works with the project's small custom JSON request boundary and Zod
validation without adding or hand-writing a multipart parser. The 2 MB product limit keeps
the expanded request bounded. The stored position contains only a concise local path.

**Alternatives considered**: Multipart form data was rejected because it needs another
parser dependency or fragile custom parsing. Storing data URLs in `positions.json` was
rejected because it would make the human-readable record file large and difficult to
inspect. A separate upload endpoint was rejected because it creates orphaned assets before
the user has successfully created a position.

## Decision 5: Store Uploaded Logos Outside the Build Output

**Decision**: Store generated logo files under `data/company-logos/` and serve that exact
directory through `/company-logos/<generated-name>`, with fallback to existing bundled
logos.

**Rationale**: Runtime uploads must survive application rebuilds and work in development
and production. `dist/` is replaceable build output and `public/` is copied at build time,
so neither is a reliable runtime-owned upload directory.

**Alternatives considered**: Writing to `dist/` was rejected because builds replace it.
Writing only to `public/` was rejected because production does not automatically copy new
files after startup. Embedding image bytes in JSON was rejected for readability.

## Decision 6: Keep One Shared Write Queue

**Decision**: Creation and detail updates use the repository's existing promise queue and
the same full-document validation plus temporary-file rename strategy.

**Rationale**: Serializing read-modify-write operations prevents one local save from
silently overwriting another. Reusing the proven path keeps failure behavior consistent.

**Alternatives considered**: Independent create/update queues were rejected because they
can race. Appending text directly to JSON was rejected because it can corrupt the document.
Per-record files were rejected because changing file ownership was not requested.

## Decision 7: Server-Generate Identity and Defaults

**Decision**: The service generates a UUID-based ID and ISO timestamps, forces initial
status to `draft`, and supplies the `full_time` employment default when omitted.

**Rationale**: These values remain consistent and cannot be forged accidentally by form
state. UUIDs allow duplicate company/title pairs without scanning for numeric sequences.

**Alternatives considered**: Client-generated record IDs were rejected by the approved
requirement. Sequential IDs were rejected because concurrent creation requires extra
coordination and exposes record count. Using array length was rejected because deletions
or imported files can cause collisions.

## Decision 8: Guard Dirty Navigation at Both Route and Document Levels

**Decision**: Use an explicit dirty signal for custom route/history navigation and the
browser `beforeunload` event for refresh, close, and external navigation.

**Rationale**: The project has no routing framework, and browser unload confirmation is
the only dependable protection when the document itself is leaving. Untouched forms do
not register a blocker.

**Alternatives considered**: Persisting drafts in browser storage was rejected by the
constitution and user direction. Guarding only the Back button was rejected because
browser Back and refresh would still lose work.

## Decision 9: Keep Creation Separate From Detail Editing

**Decision**: Add a dedicated create route that reuses the focused editor components but
does not broaden the existing detail route's editable fields.

**Rationale**: Journey 2 needs basic identity, salary, and logo inputs, while Journey 1's
approved detail editing scope is narrower. Separate route state keeps both contracts clear.

**Alternatives considered**: Turning the detail component into a universal form was
rejected because it would expand Journey 1 behavior and increase regression risk. A modal
was rejected because the rich description and six sections need a stable, accessible page.
