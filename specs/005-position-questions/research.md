# Research: Position Preparation and Interview Questions

## Decision 1: Store questions inside their owning position

**Decision**: Add a `questions` array directly to each Position in version 6 of `data/positions.json`.

**Rationale**: Position ownership is the defining relationship, and embedding makes isolation, portability, manual inspection, backup, and atomic persistence straightforward.

**Alternatives considered**: A separate questions file, rejected because it creates cross-file consistency work; a shared question library, rejected because the approved journey explicitly excludes cross-position reuse.

## Decision 2: Use dedicated question mutation endpoints

**Decision**: Keep questions in Position responses but create dedicated POST, PATCH, and DELETE routes for question mutations.

**Rationale**: Question editing has an independent save lifecycle from the existing position detail form. Narrow mutations prevent a stale detail-form payload from replacing a newer question collection and keep retry behavior understandable.

**Alternatives considered**: Extend the existing whole-position PATCH body, rejected because unrelated form and question drafts could overwrite each other; a separate questions GET endpoint, rejected because the existing position read already returns the owning aggregate.

## Decision 3: Preserve two distinct rich-text schemas

**Decision**: Leave the job-description document grammar unchanged and define a question-answer grammar that adds the inline-code mark and language-bearing code-block node.

**Rationale**: The approved feature extends answers, not job descriptions. Separate validation prevents a code-editor change from silently enlarging an older feature's stored contract.

**Alternatives considered**: Expand the existing shared grammar for every rich-text field, rejected because it changes job-description behavior outside scope; store HTML, rejected because it is less structured, harder to validate strictly, and less readable in the JSON source of truth.

## Decision 4: Use Tiptap CodeBlockLowlight with registered languages

**Decision**: Add `@tiptap/extension-code-block-lowlight` and `lowlight`, disable StarterKit's basic code block in the answer editor, and register only grammars needed by the approved language list.

**Rationale**: Tiptap's official extension is designed for language-aware code blocks and integrates with the editor already used by the project. Lowlight produces a syntax tree rather than injecting executable HTML and allows a small, explicit language registry. Sources: [Tiptap CodeBlockLowlight](https://tiptap.dev/docs/editor/extensions/nodes/code-block-lowlight), [lowlight](https://github.com/wooorm/lowlight).

**Alternatives considered**: Plain unhighlighted `<pre>` blocks, rejected because the user asked for formatted, language-aware snippets; a second editor framework, rejected because it duplicates editor behavior and bundle cost; CDN highlighting, rejected because the application is local and must not depend on a remote service.

## Decision 5: Persist product labels separately from highlighting grammars

**Decision**: Persist one of the nine approved language identifiers on each code block. Translate React JSX, React TSX, and Browser JavaScript to registered highlighter grammars only at render time.

**Rationale**: The user's selected label remains exact after reload even when two choices share a parser. This also keeps persisted data stable if highlighting internals change.

**Alternatives considered**: Persist lowlight grammar names directly, rejected because that would collapse product choices and couple user data to one library.

## Decision 6: Use server-owned IDs, timestamps, and newest-first insertion

**Decision**: The repository generates question identity and timestamps. Creation prepends the new question; reads also compare `createdAt` descending with stable array order as the tie-breaker.

**Rationale**: Authoritative metadata satisfies reload behavior and avoids trusting a client clock. Persisting newest-first makes the human-readable file and visible order agree.

**Alternatives considered**: Client-generated timestamps, rejected because they are not authoritative; a mutable order field, rejected because manual ordering is excluded.

## Decision 7: Detect dirty state from normalized structured drafts

**Decision**: Compare the active draft's normalized title, category fields, and answer document with the baseline captured when the editor opened or last saved.

**Rationale**: Structured comparison catches formatting and code changes that visible text comparison misses. One draft coordinator can guard Close, switch, Back, and browser unload consistently.

**Alternatives considered**: A boolean set by input events, rejected because editor initialization and programmatic updates can create false positives; tracking only plain text, rejected because formatting and language changes would be lost.

## Decision 8: Keep preparation editing outside the existing detail form

**Decision**: Render Readiness and Questions after the position detail form while keeping them visually after Job description in the approved order.

**Rationale**: Reading, resume, and question mutations need independent controls, and HTML forms cannot be nested. This boundary also prevents a preparation action from submitting unrelated position fields.

**Alternatives considered**: Place question controls inside the existing form with button-type discipline, rejected because validation, Enter behavior, dirty state, and save ownership remain unnecessarily coupled.

## Decision 9: Use native confirmation and navigation primitives

**Decision**: Use the existing application navigation callback plus `window.confirm` for discard/delete decisions and `beforeunload` for reload or external navigation protection.

**Rationale**: These mechanisms already match the project, are keyboard accessible, and need no dependency. Save failures retain the active draft and display an inline concise error.

**Alternatives considered**: A custom modal system, rejected because no established dialog framework exists and adding one would enlarge this journey.

## Decision 10: Store readiness metadata inside its owning position

**Decision**: Add `readingItems` and nullable `submittedResume` metadata directly to each Position in version 6 alongside `questions`.

**Rationale**: All three records describe preparation for exactly one position. Embedding keeps ownership obvious, allows one lossless migration, and lets the existing queued document writer preserve metadata atomically.

**Alternatives considered**: A separate readiness JSON file, rejected because it creates cross-file joins and partial-update risks; storing resume bytes in JSON, rejected because binary encoding would make the position document large and less human-readable.

## Decision 11: Use dedicated reading mutations

**Decision**: Add position-scoped create, complete-update, and delete endpoints for reading items. The direct Read checkbox uses the same update contract with the last saved title/link/notes.

**Rationale**: Narrow mutations avoid stale preparation or position-form state replacing another collection. A single update shape keeps direct status changes and expanded-editor saves consistent.

**Alternatives considered**: Save the whole readiness section at once, rejected because a quick status change could overwrite an open editor; add a status-only endpoint, rejected because it adds a second write contract for the same entity without a material benefit.

## Decision 12: Keep resume bytes in a private managed directory

**Decision**: Store each imported file under `data/resumes/<position-id>/<opaque-id>.<extension>` and persist only its original filename, detected type, relative managed path, and upload timestamp in Position JSON.

**Rationale**: Opaque names prevent collisions and path injection, while position directories make ownership inspectable. The original file can move without breaking the managed copy. The server's existing `/data` denial remains in place, so resumes are opened only through a scoped API route.

**Alternatives considered**: Retain the original absolute source path, rejected because moved files break and expose machine-specific paths; copy into the public directory, rejected because it bypasses position scoping; use original filenames as managed names, rejected because collisions and unsafe path characters become storage concerns.

## Decision 13: Stream raw file uploads to a staged path

**Decision**: Use `PUT /api/positions/:positionId/readiness/resume` with the File as the raw body and encoded original filename plus any browser-declared media type in headers. Stream the request to a unique temporary file before validation and commit.

**Rationale**: The application needs exactly one binary value and no multipart form fields. Raw streaming avoids base64 expansion and full-file buffering, fits the native Node server, and introduces no multipart parser. Node's documentation recommends ordered asynchronous operations and provides file streams for this purpose: [Node.js file system documentation](https://nodejs.org/api/fs.html), [Node.js stream documentation](https://nodejs.org/api/stream.html).

**Alternatives considered**: JSON base64, rejected because it expands the request and conflicts with readable JSON; multipart form data, rejected because it adds parser complexity for one file; direct writes to final paths, rejected because interrupted uploads could become visible.

## Decision 14: Verify actual PDF or DOCX content

**Decision**: Add the ESM `file-type` package and accept an upload when staged-file detection reports PDF or DOCX. Treat the browser-declared media type as an optional hint that cannot override or invalidate detected supported content.

**Rationale**: Filename extensions and browser MIME declarations are not reliable enough to protect the managed folder from accidental unsupported files, and browsers may provide empty or generic declarations for valid documents. The selected package supports file-path detection for PDF and DOCX and is compatible with the project's ESM/Node runtime. Detection remains a format hint rather than document safety validation, which is sufficient for this single-user local import boundary: [file-type project](https://github.com/sindresorhus/file-type).

**Alternatives considered**: Trust extension/MIME only, rejected because renamed files would be accepted; hand-roll Office ZIP inspection, rejected because it duplicates a mature binary-signature parser; parse document contents, rejected because previews, extraction, and malware scanning are outside scope.

## Decision 15: Coordinate resume file and metadata changes with staged compensation

**Decision**: Serialize resume changes through the repository queue. Stage new files before promotion, retain the prior file until new metadata commits, and use rollback/tombstone paths so any reported import, replacement, or removal failure restores the previous visible metadata/file pair.

**Rationale**: JSON rename is atomic but a JSON file and resume file cannot share one filesystem transaction. Explicit staging plus compensating operations provides the approved user-visible guarantee and makes every failure point injectable in tests.

**Alternatives considered**: Delete the old file before writing metadata, rejected because a JSON failure loses the resume; write metadata before a new file is durable, rejected because Open can point to a missing file; accept orphan files as normal, rejected because successful replacement/removal must retire the superseded managed copy.

## Decision 16: Serve resumes through a scoped binary endpoint

**Decision**: Resolve the stored relative path inside the configured resume root and stream it from the position-scoped Open endpoint with detected content type, safe Content-Disposition filename handling, `nosniff`, private no-store caching, and a restrictive content security policy.

**Rationale**: Position ownership is rechecked for every open request, raw storage paths remain hidden, PDF can open inline, and DOCX can be handed to the operating system/browser without making the data directory public.

**Alternatives considered**: A generic static resume directory, rejected because it weakens ownership and path controls; embed file data in the detail response, rejected because every position load would carry unnecessary binary content.
