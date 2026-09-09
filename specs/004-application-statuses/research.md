# Research: Personal Application Statuses

## Decision 1: Advance the persisted document to version 5

**Decision**: Introduce a strict version 5 position document and retain explicit readers for historical versions 1 through 4.

**Rationale**: The status vocabulary changes incompatibly and channel records gain fields. A versioned migration makes the mapping reviewable and prevents old records from becoming unreadable when the current enum changes.

**Alternatives considered**: Accept old and new statuses in the current schema. Rejected because invalid legacy values could continue leaking into current UI and sorting behavior.

## Decision 2: Keep channel metadata beside its link

**Decision**: Add nullable application status and date fields to each platform-link object. Keep matching nullable fields beside the existing career-page URL on the position.

**Rationale**: Platform metadata then moves and deletes with the link it describes. The career page remains a single channel, so replacing it with a separate collection would add needless migration and UI complexity.

**Alternatives considered**: Create a universal application-channel collection with IDs. Rejected because the feature does not require shared channels, event history, or independent channel lifecycle.

## Decision 3: Reuse the existing detail update boundary

**Decision**: Extend the current position-detail update request and return the repository's authoritative position after applying automatic advancement.

**Rationale**: Overall status, platform metadata, and career metadata are edited together in the same screen and must succeed or fail atomically.

**Alternatives considered**: Add separate status and channel endpoints. Rejected because partial success would complicate rollback and create more request states without user value.

## Decision 4: Apply automatic advancement in the repository

**Decision**: When the persisted current overall status is Saved and a submitted channel is Applied, Viewed, or Contacted, save the overall status as Applied in the same operation. Explicit or existing later statuses are never overwritten.

**Rationale**: The rule remains consistent for every caller and survives reload. Applying it only in the form could allow inconsistent files through another client.

**Alternatives considered**: Frontend-only advancement, rejected as unenforced; unrestricted advancement, rejected because it could regress or overwrite meaningful progress.

## Decision 5: Use calendar dates, not timestamps

**Decision**: Store application dates as strict `YYYY-MM-DD` calendar values. Suggest the browser's local today value and reject dates later than the repository clock's local calendar date.

**Rationale**: The user chose a day, not an instant. Calendar values avoid timezone shifts when rendered and remain easy to inspect manually in JSON.

**Alternatives considered**: ISO timestamps, rejected because time and timezone are irrelevant; locale-formatted strings, rejected because parsing and ordering are ambiguous.

## Decision 6: Replace nine filter tabs with a compact menu

**Decision**: Use one labeled status filter menu with All plus the nine statuses, accompanied by an on-demand overall-status help control.

**Rationale**: Nine tabs plus search, Manual order, and New position would crowd the toolbar, especially on a discreet workplace UI and narrow screens. A menu keeps every option reachable and named.

**Alternatives considered**: Retain horizontally scrolling tabs. Rejected because important states become hidden and the toolbar grows visually noisy.

## Decision 7: Present definitions with a reusable on-demand help control

**Decision**: Use a small info-icon trigger and compact dismissible panel for overall or channel definitions, with keyboard activation, Escape dismissal, and focus restoration.

**Rationale**: Definitions remain easy to find without occupying rows or permanently expanding forms.

**Alternatives considered**: Tooltips only, rejected because long definitions are hard to read and unavailable on touch; permanent explanatory text, rejected because it adds visual density.

## Decision 8: Add no dependency

**Decision**: Implement the controls and validation with existing React, Zod, Lucide, and CSS capabilities.

**Rationale**: The project already has all required primitives, and a new library would enlarge the bundle and maintenance surface for a small interaction.

**Alternatives considered**: A dedicated popover library, rejected because this feature needs only a focused, local help panel.
