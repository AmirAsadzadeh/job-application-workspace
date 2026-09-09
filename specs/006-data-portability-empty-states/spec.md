# Feature Specification: Data Portability and Empty States

**Feature Branch**: `006-data-portability-empty-states`

**Created**: 2026-09-09

**Status**: Draft

**Input**: User description: "Provide proper empty states anywhere a list may be empty. Export the complete workspace as a portable ZIP that this app can restore on another machine, while also providing CSV files that other systems can import or map. A restore replaces existing data only after validation, preview, confirmation, and an automatic backup."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Understand and Recover From Empty Views (Priority: P1)

As a job seeker, I want every empty list to explain why it is empty and offer the most relevant next action so I can continue without guessing.

**Why this priority**: Empty views occur in core daily workflows and must remain understandable before any records exist or when filters hide them.

**Independent Test**: Open each supported empty or filtered-empty state using keyboard and pointer controls, then verify its message, action, visual density, and result.

**Acceptance Scenarios**:

1. **Given** a workspace with no positions, **When** the positions page opens, **Then** it shows a small recognizable position icon, "No positions yet", and a New position action.
2. **Given** positions exist but active filters match none, **When** the list is shown, **Then** it shows "No matching positions" and a Clear filters action rather than the new-workspace state.
3. **Given** a position has no job platform links, **When** its links area is shown, **Then** it shows "No job platforms added" and an Add platform action.
4. **Given** a position has no reading items, submitted resume, or questions, **When** its detail page is shown, **Then** each area has a small recognizable icon, its own concise empty message, and its existing Add reading, Import, or Add question action.
5. **Given** questions exist but the selected category contains none, **When** the filter is applied, **Then** the Questions section shows "No questions in this category" and a Show all action without changing saved questions.
6. **Given** no departments, teams, or locations are available, **When** the corresponding selector opens, **Then** it communicates that no options are available and does not present a fabricated or invalid record as selectable.

---

### User Story 2 - Transfer and Restore the Workspace (Priority: P2)

As a job seeker, I want to export my complete workspace and restore it in this app on another machine so my positions, preparation work, preferences, and submitted resumes remain portable and recoverable.

**Why this priority**: The workspace contains valuable personal preparation data and managed files that must not be trapped on one machine.

**Independent Test**: Export a populated workspace, inspect the package with standard archive and CSV tools, restore it into a different app instance containing existing data, and verify the preview, backup, replacement, reload, relationships, ordering, rich content, and managed files.

**Acceptance Scenarios**:

1. **Given** a populated workspace, **When** the user exports it, **Then** one ZIP package is downloaded containing an authoritative manifest, interoperable CSV tables, package version and export time, and every available submitted resume.
2. **Given** the exported package is opened outside the app, **When** its CSV files are inspected, **Then** positions, platform links, questions, readings, resume metadata, departments, teams, and locations are available in separate related tables.
3. **Given** job descriptions or question answers contain rich content, **When** they are exported, **Then** their CSV rows contain readable plain text and a lossless structured value while the manifest retains the exact authoritative value.
4. **Given** a valid package is selected in this app on another machine, **When** validation completes, **Then** no workspace data has changed and the user sees package identity, source counts, notices, and a clear replacement warning.
5. **Given** a validated package and an existing destination workspace, **When** the user confirms replacement, **Then** the app first creates a complete recoverable backup and replaces the destination only if both backup and restore can succeed.
6. **Given** a restore succeeds, **When** the app reloads, **Then** positions, manual order, list preferences, reference data, application tracking, preparation content, rich content, and submitted resumes match the source package.
7. **Given** a package is corrupt, incomplete, unsafe, internally inconsistent, or from an unsupported future version, **When** it is selected, **Then** restore is blocked with actionable errors and current workspace data remains unchanged.
8. **Given** a restore preview or confirmation is open, **When** the user cancels, **Then** the current workspace remains unchanged.
9. **Given** the automatic backup cannot be completed, **When** restore is attempted, **Then** replacement does not begin and the current workspace remains unchanged.

### Edge Cases

- An empty workspace exports a valid package with table headers, preferences, and reference data but no fabricated position records.
- Empty strings, absent optional values, and explicit null values remain distinguishable where the current data model distinguishes them.
- Commas, quotes, tabs, line breaks, Unicode text, and spreadsheet-formula-like values survive CSV export without corruption or unintended execution.
- Duplicate display names and titles remain separate records and do not collapse during transfer.
- If a referenced managed resume is missing, complete export stops and identifies the affected position and filename rather than producing an incomplete package.
- Malformed relationships, duplicate identities, or duplicate archive paths cause validation to fail rather than producing a partial restore.
- Absolute paths, parent-directory traversal, unsupported file types, content/type mismatches, and unreasonably expanded archives are rejected.
- Packages from unsupported future versions are rejected; supported older versions are normalized without losing their represented data.
- Closing or reloading during validation or confirmation cannot partially replace the workspace.
- Failure while staging or replacing data retains the previous workspace and managed resumes.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Every supported empty collection MUST show a purposeful empty state rather than blank space, an unexplained count, or an empty table body.
- **FR-002**: Empty states MUST use one compact, quiet square-pattern container consistent with the existing dark workspace, including one small muted context-specific icon inside a fixed square tile, and MUST avoid illustrations, large promotional cards, prominent headings, or unnecessary vertical bulk.
- **FR-002A**: Empty-state icons MUST be recognizable, visually secondary to the message, decorative to assistive technology, and consistently aligned with the message.
- **FR-003**: Each actionable empty state MUST provide exactly one most-relevant command that is keyboard operable and visibly focused.
- **FR-004**: An empty positions workspace MUST show "No positions yet" with New position.
- **FR-005**: A filtered positions list with no matches MUST be visually and textually distinct from an empty workspace and MUST offer Clear filters.
- **FR-006**: Empty platform-link, reading, submitted-resume, and question areas MUST offer Add platform, Add reading, Import, and Add question respectively.
- **FR-007**: A category with no matching questions MUST offer Show all and MUST NOT change any saved question.
- **FR-008**: Empty department, team, and location selectors MUST show an explicit unavailable state and MUST NOT create or allow selection of an invalid record.
- **FR-009**: Loading, failure, unfiltered-empty, and filtered-empty states MUST remain distinguishable.
- **FR-010**: The positions workspace MUST provide compact Export and Import controls that do not increase the table's row density or draw unnecessary attention.
- **FR-011**: Export MUST produce one ZIP package containing package metadata, an authoritative manifest, CSV tables, and all managed files required for a complete restore.
- **FR-012**: Package metadata MUST include a format version and export timestamp.
- **FR-013**: The authoritative manifest MUST represent all positions, reference data, list-view preferences, manual ordering, rich content, application tracking, readiness data, question data, and submitted-resume metadata.
- **FR-014**: The package MUST provide separate CSV tables for positions, job platform links, questions, reading items, submitted-resume metadata, departments, teams, and locations.
- **FR-015**: CSV tables MUST use stable identities and relationship columns so records with duplicate display values remain distinct and correctly associated.
- **FR-016**: Rich job descriptions and question answers MUST expose both readable plain text and a lossless structured value in CSV exports.
- **FR-017**: CSV export MUST preserve supported special characters and MUST prevent formula-like cell values from executing unintentionally when opened in common spreadsheet tools.
- **FR-018**: Position sequence, manual ordering, and list-view preference values MUST be preserved explicitly.
- **FR-019**: Each available submitted resume MUST appear exactly once in the package and MUST be associated with its owning position without filename collision.
- **FR-020**: If a required managed resume cannot be read, export MUST stop with an actionable position and filename message rather than create an incomplete package.
- **FR-021**: An empty workspace MUST still produce a structurally valid and restorable package.
- **FR-022**: Import MUST accept only a complete package produced by a supported version of this app; arbitrary CSV or spreadsheet import is outside this journey.
- **FR-023**: A selected package MUST be fully validated before any current data or managed file is changed.
- **FR-024**: Validation MUST reject unsafe archive paths, duplicate paths, unsupported entries, unreasonable expansion, file-content/type mismatches, invalid identities, broken relationships, and unsupported future versions.
- **FR-025**: Successful validation MUST show a preview containing format version, export time, record and file counts, compatibility notices, and validation warnings.
- **FR-026**: The preview MUST state clearly that continuing replaces the complete current workspace and MUST provide Cancel and Continue commands.
- **FR-027**: Restore MUST replace the whole workspace after explicit confirmation and MUST NOT merge imported records with current records.
- **FR-028**: Before replacement, the app MUST create a complete recoverable package of the current workspace using the same portable format.
- **FR-029**: If the automatic backup fails, restore MUST stop before changing current data or managed files.
- **FR-030**: Replacement MUST be atomic from the user's perspective: either the imported workspace becomes complete and usable or the prior workspace remains complete and usable.
- **FR-031**: Validation, staging, backup, persistence, or replacement failure MUST retain the prior workspace and managed files without partial imported records.
- **FR-032**: Restore MUST preserve exact values, stable identities, relationships, ordering, preferences, rich content, application tracking, and available submitted-resume files represented by the package.
- **FR-033**: After successful restore, the app MUST reload the restored workspace and show a concise success result with restored counts.
- **FR-034**: Canceling file selection, preview, or confirmation MUST leave the current workspace unchanged.
- **FR-035**: Import MUST NOT modify the selected source ZIP package.
- **FR-036**: Export, validation, backup, and restore MUST remain local to the user's machine and MUST NOT introduce browser persistent storage.
- **FR-037**: Import failures MUST identify the failure category and provide a clear retry path without exposing unnecessary technical detail.
- **FR-038**: Export and import controls, previews, errors, progress, and empty states MUST remain keyboard operable, visibly focused, compact, and readable on supported desktop and mobile viewports.

### Key Entities

- **Portable Workspace Package**: A versioned ZIP representing one complete workspace for backup, transfer, and restore.
- **Package Manifest**: The authoritative structured record of workspace data, relationships, ordering, preferences, and managed-file associations.
- **CSV Table Set**: Interoperable tabular views of the workspace entities for inspection or mapping by other systems.
- **Resume Package Entry**: One submitted-resume file plus metadata associating it with its owning position.
- **Restore Preview**: A validated summary of package identity, contents, compatibility, warnings, and replacement impact shown before confirmation.
- **Pre-Restore Backup**: A complete portable package of the current workspace created before replacement begins.
- **Empty State**: A small recognizable icon, compact message, and, where useful, one recovery command for a collection with no visible records.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: In usability checks, users identify why a supported list is empty and locate its next action within 5 seconds in 100% of tested empty states.
- **SC-002**: All empty-state actions are keyboard operable and show no clipped text, overlap, or page-level horizontal overflow at 1440x900 and 390x844 viewports.
- **SC-003**: A restored workspace retains 100% of represented source values, stable relationships, manual order, preferences, rich content, and available submitted resumes.
- **SC-004**: Standard CSV readers preserve exported identities, relationships, special characters, multiline content, and formula-like text in 100% of portability fixtures.
- **SC-005**: A workspace containing 100 positions, 100 questions per position, 30 readings per position, 5 platform links per position, and one resume per position exports within 30 seconds on the local validation environment.
- **SC-006**: The same valid package validates, previews, backs up the destination, restores, and becomes usable within 60 seconds on the local validation environment.
- **SC-007**: Invalid or unsafe packages produce zero changes to current data and managed files in 100% of rejection tests.
- **SC-008**: Simulated validation, backup, staging, and replacement failures preserve 100% of the previous workspace and managed files.
- **SC-009**: An empty workspace exports and restores successfully without fabricated records in 100% of empty-workspace tests.
- **SC-010**: Source and runtime inspection find zero use of browser persistent storage for export, import, backup, preview, or empty-state behavior.

## Assumptions

- Export and restore operate on the complete single-user workspace; partial or selected export is outside this journey.
- Restore replaces the destination workspace rather than merging or resolving conflicts.
- The automatic pre-restore backup uses the same complete portable package and remains available for recovery.
- The manifest is authoritative for exact app restoration; CSV tables are provided for human inspection and mapping by unrelated systems.
- Submitted-resume binaries are included. Remote logo links remain links, while locally managed logo files are included when required for lossless transfer.
- All processing remains local and no cloud account, synchronization service, or browser storage is introduced.
- Unrelated applications may require the user to map the documented CSV columns during import.
- Existing dark, compact visual conventions, confirmation behavior, supported viewports, and local data ownership remain authoritative.

## Out of Scope

- Importing arbitrary CSV or spreadsheet files into this app.
- Automatic mapping to named third-party recruiting or spreadsheet products.
- Merge, deduplication, or conflict-resolution workflows.
- Scheduled or cloud backups.
- Partial workspace export, selected-position export, or resume version history.
- Editing package contents within the app.
