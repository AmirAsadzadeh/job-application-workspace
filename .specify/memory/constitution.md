<!--
Sync Impact Report
- Version change: 1.0.0 -> 2.0.0
- Modified principle:
  - V. Local, Human-Readable Data -> V. User-Owned, Portable Data
- Rationale: Permit approved authenticated remote persistence and offline-capable
  Online working copies while preserving explicit synchronization, local operation,
  portability, and user control.
- Affected artifacts:
  - specs/008-authenticated-backend/spec.md
  - Future feature 008 plan, tasks, tests, and storage documentation
- Migration impact: None immediately. Existing local JSON data remains unchanged;
  future remote transfer must be optional, previewed, backed up, and confirmed.
- Follow-up TODOs: none.
-->
# Front-end Interview Constitution

## Core Principles

### I. Specifications Are the Source of Truth

Every feature MUST begin with a Spec Kit feature specification that defines user value,
scope, acceptance scenarios, requirements, edge cases, and measurable outcomes. Plans,
tasks, implementation, and tests MUST trace back to an approved requirement. When code
and an approved specification disagree, work MUST pause until the user approves either a
specification amendment or a code correction. This keeps product decisions visible and
prevents implementation from silently defining behavior.

### II. Explicit Approval Gates

The user MUST explicitly approve each development phase before files for the next phase
are created or changed. The required gates are specification approval, constitution or
governance approval when affected, plan approval, task approval, and implementation
approval. Approval for one phase MUST NOT be interpreted as approval for later phases or
unrelated edits. Read-only inspection and verification are permitted when needed to
prepare an accurate response. This preserves user control over both scope and execution.

### III. Small, Testable User Journeys

Work MUST be divided into independently understandable user journeys. Only one journey
is specified and reviewed at a time unless the user explicitly approves a larger scope.
Requirements MUST be unambiguous and testable, and implementation tasks MUST remain
traceable to acceptance scenarios. Each completed journey MUST provide demonstrable user
value without depending on unapproved future work. This limits risk and makes progress
easy to review.

### IV. Quiet, Scannable User Experience

The interface MUST prioritize fast scanning, easy comparison, and discreet workplace use.
Layouts MUST avoid attention-grabbing headings, decorative excess, oversized spacing, and
visually loud status treatments. Dark mode, compact information density, readable
contrast, consistent alignment, and clear interaction states are required unless an
approved feature specification states otherwise. Important details MUST be easy to find,
and secondary details MUST not obscure primary workflows.

### V. User-Owned, Portable Data

Offline workspace data MUST remain in local, human-readable JSON files accessed through
the file system. Online workspace data MAY use authenticated remote persistence when
explicitly approved by a feature specification and plan.

Offline and Online modes MUST remain clearly distinguishable. Existing local data MUST
never be uploaded, downloaded, merged, replaced, or deleted without explicit user
confirmation. Account-specific local working copies MAY support Online mode during
connectivity loss.

Browser local storage MUST NOT hold persistent product records or reusable authentication
credentials. Users MUST retain a documented, provider-independent export and recovery
path. Changes to storage format, ownership, migration, synchronization, or data location
require an approved specification and plan. This enables cross-machine access without
sacrificing local operation, portability, or user control.

## Product and Technical Constraints

- The existing project architecture and established patterns MUST be reused unless an
  approved plan demonstrates a concrete need to change them.
- Feature scope MUST remain limited to the approved specification. Unrelated refactors,
  dependencies, metadata changes, and speculative capabilities are prohibited.
- User-facing controls and content MUST remain usable with keyboard navigation and
  readable at supported viewport sizes.
- Missing, empty, long, and invalid data states MUST be accounted for in specifications,
  plans, and verification where relevant.
- Secrets, credentials, or private user data MUST NOT be committed to the repository or
  exposed in generated artifacts.

## Development Workflow and Quality Gates

1. Create or amend a feature specification with `$speckit-specify`.
2. Validate requirements and obtain explicit user approval.
3. Use `$speckit-clarify` only when material ambiguity remains, then obtain approval for
   any resulting specification changes.
4. Create the implementation plan with `$speckit-plan`, then obtain plan approval.
5. Generate dependency-ordered tasks with `$speckit-tasks`, then obtain task approval.
6. Run `$speckit-analyze` to check consistency before implementation when plan and tasks
   exist.
7. Begin `$speckit-implement` only after explicit implementation approval.
8. Verify each implemented acceptance scenario with tests and appropriate visual checks.
   Build, lint, type, and focused test checks MUST pass when available and relevant.
9. Report completed work, verification results, and any residual risk without expanding
   the approved scope.

## Governance

This constitution governs all project specifications, plans, tasks, and implementation.
Conflicts MUST be resolved in favor of this constitution unless the user explicitly
approves an amendment.

Amendments MUST state the changed rule, rationale, affected artifacts, and any required
migration. The user MUST approve every amendment before it takes effect. Constitution
versions follow semantic versioning: MAJOR for incompatible governance changes, MINOR for
new or materially expanded principles, and PATCH for non-semantic clarification.

Every planning and implementation review MUST verify compliance with the current
constitution. Any justified exception MUST be documented in the relevant feature plan and
approved by the user before work proceeds.

**Version**: 2.0.0 | **Ratified**: 2026-09-06 | **Last Amended**: 2026-09-10
