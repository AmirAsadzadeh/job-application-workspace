# Phase 0 Research: Review Current Positions

## Decision 1: Use a Local Node Service for Filesystem JSON

**Decision**: Keep position records in `data/positions.json` and selectable values in
`data/reference-data.json`. A small local Node service owns filesystem reads and atomic
position updates for the browser UI.

**Rationale**: Ordinary browser code cannot silently open an arbitrary local file. The
browser File System Access API requires an explicit user gesture and permission picker,
which would add friction each time access is lost. Node provides direct asynchronous file
reads, while a local service keeps filesystem permissions outside the UI.

**Alternatives considered**:

- Browser `localStorage`: rejected because it violates the constitution and does not
  produce a user-owned JSON file.
- File System Access API: rejected because access requires picker interaction, support is
  browser-dependent, and it complicates a quick review workflow.
- Electron or Tauri: rejected because replacing the application shell is disproportionate
  to one local-file boundary.
- Bundling JSON as a static frontend asset: rejected because changes require rebuilding
  and the file is not a live source of records.

**References**: [MDN File System API](https://developer.mozilla.org/en-US/docs/Web/API/File_System_API),
[MDN showOpenFilePicker](https://developer.mozilla.org/en-US/docs/Web/API/Window/showOpenFilePicker),
[Node.js filesystem API](https://nodejs.org/api/fs.html)

## Decision 2: Retain React and Vite with a Narrow Server Boundary

**Decision**: Preserve the current React/Vite frontend. Add one Node entry point that
serves the positions API and integrates the Vite development server during development;
the production-like local command serves the built frontend and the same API.

**Rationale**: The current stack already renders the application and meets the UI needs.
Vite documents backend integration, so adding a narrow host process avoids a framework
migration while allowing one local origin for UI and data.

**Alternatives considered**:

- Separate frontend and API processes exposed to the user: rejected because it adds
  startup and port-management friction.
- A full web-service framework: rejected because the small read/update contract and static
  serving do not justify a larger dependency or application layer.
- Vite preview plugins as the permanent data service: rejected because Vite preview is a
  local build preview rather than the product's durable filesystem boundary.

**References**: [Vite backend integration](https://vite.dev/guide/backend-integration),
[Vite production build](https://vite.dev/guide/build)

## Decision 3: Validate JSON at the Service Boundary

**Decision**: Define shared runtime schemas for the complete positions and reference-data
documents and derive TypeScript types from them. Reject an invalid document with a stable
error response. For updates, validate the complete next document, write it to a sibling
temporary file, then rename it over the positions file.

**Rationale**: A human-editable file can contain malformed JSON or structurally invalid
records. Boundary validation prevents partially trusted values from reaching row markup
and keeps server and UI assumptions aligned.

**Alternatives considered**:

- Type assertions after `JSON.parse`: rejected because assertions provide no runtime
  protection.
- Silently dropping invalid records: rejected because it can hide user data problems and
  make the list appear complete when it is not.
- Custom field-by-field parsing in multiple layers: rejected because duplicated rules can
  drift.
- In-place overwrite: rejected because an interrupted write can leave the only data file
  truncated or malformed.

## Decision 4: Keep the List Dense with Stable Columns

**Decision**: Use a semantic list and CSS grid with a compact header, fixed row-height
range, single-line values, and controlled horizontal overflow at narrow widths.

**Rationale**: Stable columns make repeated values easy to compare. Keeping all approved
fields in one line preserves the thin-row requirement; horizontal overflow on constrained
screens is preferable to hiding fields or turning every item into a tall card.

**Alternatives considered**:

- Responsive cards: rejected because they expand row height and reduce scan density.
- Hiding lower-priority columns on mobile: rejected because the approved specification
  requires every row-visible field to remain visible.
- Free-flow flex layout: rejected because variable content would misalign comparable data.

## Decision 5: Use Focused Vite-Native Testing

**Decision**: Add Vitest and Testing Library for repository and component behavior. Add a
generated 1,000-record performance fixture, repeatable browser screenshots, manual
keyboard checks, and 10 documented timed usability trials.

**Rationale**: Vitest shares Vite's TypeScript transformation and configuration, keeping
test setup close to the existing toolchain. Component tests can prove content visibility
and interactions; real browser checks cover density, overflow, and overlap that DOM tests
cannot reliably evaluate.

**Alternatives considered**:

- No automated tests: rejected because row visibility and prohibited content are precise,
  regression-prone contracts.
- A separate Jest pipeline: rejected because it duplicates transformation configuration.
- Full visual snapshot infrastructure in this journey: deferred because stable baselines
  add maintenance beyond the current single-screen scope.

**References**: [Vitest getting started](https://vitest.dev/guide/),
[Vitest component testing](https://vitest.dev/guide/browser/component-testing),
[Playwright screenshots](https://playwright.dev/docs/screenshots)

## Decision 6: Store Select Options as Reference Data

**Decision**: Store departments with their teams and a separate location list in
`data/reference-data.json`. Positions store selected IDs. Changing department clears a
team selection that is not valid for the new department.

**Rationale**: Select controls need stable values independent of individual position
records. Nested department/team reference data preserves the relationship without adding
a database or duplicating labels in every position.

**Alternatives considered**:

- Deriving options from existing positions: rejected because users could not select a new
  valid value that had not already been assigned.
- Independent free-text fields: rejected because the user explicitly requested selectable
  values.
- One unstructured options array: rejected because it cannot validate team membership in
  a department.

## Decision 7: Preserve Existing Search and Status Filters

**Decision**: Keep the existing search and status filter controls, restyle them compactly,
and execute filtering through optional list-endpoint query parameters. Search continues to
match title, department, hiring manager, and location without rendering those hidden
detail values in rows.

**Rationale**: Search and status filtering already exist in the application. Preserving
their behavior avoids an unrelated regression while keeping new filter capabilities out
of this journey.

**Alternatives considered**:

- Remove both controls: rejected because removal was not approved.
- Return full detail records to filter in the browser: rejected because the list contract
  is clearer and less error-prone when it returns row summaries only.
- Expand filtering and sorting: rejected because those changes remain outside this journey.

## Decision 8: Use a Focused Tiptap Editor

**Decision**: Use Tiptap's React integration with ProseMirror and StarterKit's built-in
Link extension. Disable every unsupported StarterKit node and mark so the editor exposes
only headings, bold, italic, bullet lists, numbered lists, and links.

**Rationale**: Rich-text selection, keyboard behavior, document normalization, and nested
list editing are established editor concerns. Tiptap integrates with the current React and
Vite application, supports structured JSON input/output, and can be limited to the exact
approved formatting set.

**Alternatives considered**:

- Browser `contenteditable` with custom commands: rejected because selection handling,
  nested lists, paste cleanup, and undo behavior would be fragile custom editor logic.
- Markdown textarea: rejected because the user requested a rich-text editing experience.
- Storing arbitrary HTML: rejected because executable or unsupported markup is harder to
  validate and less understandable in the local data file.

**Reference**: [Tiptap React integration](https://tiptap.dev/docs/editor/getting-started/install/react),
[Tiptap editor content](https://tiptap.dev/docs/editor/api/editor)

## Decision 9: Store a Restricted Structured Description

**Decision**: Store the description as a Tiptap-compatible JSON document with an explicit
allowlist of node and mark types. Convert existing version 1 plain-text descriptions into
paragraph nodes and write version 2 only after successful save.

**Rationale**: Structured JSON preserves formatting without storing executable markup,
remains human-readable, and can be validated at the same local-file boundary as the rest
of each position. An explicit version transition prevents old text records from becoming
unreadable.

**Alternatives considered**:

- HTML strings: rejected because safely validating arbitrary nested markup adds a second
  sanitization boundary and makes the local data less predictable.
- Editor-specific binary state: rejected because it violates human-readable storage.
- Dropping old descriptions: rejected because migration must preserve existing content.

## Decision 10: Model Publication Links as Validated Detail Data

**Decision**: Add an ordered array of platform-name/URL pairs and one nullable career-page
URL to each position. Accept only absolute HTTP and HTTPS URLs and keep these fields out of
list summaries and search behavior.

**Rationale**: An ordered array supports any number of job-finding platforms without a
predefined provider list. Pair validation prevents ambiguous entries, while a separate
career-page field keeps the organization's canonical posting easy to find.

**Alternatives considered**:

- One platform URL: rejected because the approved specification requires multiple links.
- A fixed platform enum: rejected because new or regional services would require code changes.
- Including links in list rows: rejected because they are approved as detail-only data.
