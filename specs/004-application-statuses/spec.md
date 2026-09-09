# Feature Specification: Personal Application Statuses

**Feature Branch**: `004-application-statuses`

**Created**: 2026-09-08

**Status**: Approved

**Input**: User description: "Replace recruiter-oriented position statuses with personal job-search statuses, explain each status in the product, and track where and when an application was submitted."

## User Scenarios & Testing

### User Story 1 - Track Overall Application Progress (Priority: P1)

As a job seeker, I want each position to show my current application stage so that the workspace reflects my own progress rather than the employer's vacancy workflow.

**Why this priority**: Status appears throughout the main workspace and must match the project's personal interview-preparation purpose before more preparation features are added.

**Independent Test**: Create a position, confirm it starts as Saved, change it through each approved status from its detail view, and verify the selected status persists and is reflected in the list and status filters after reload.

**Acceptance Scenarios**:

1. **Given** the user creates a position without recording an Applied, Viewed, or Contacted channel, **When** creation succeeds, **Then** its overall status is Saved.
2. **Given** the user creates a position and records an Applied, Viewed, or Contacted channel, **When** creation succeeds, **Then** its overall status is Applied.
3. **Given** an existing position, **When** the user changes its overall status, **Then** the new status is saved and shown consistently in its detail view and compact list row.
4. **Given** the positions list, **When** the user filters by an approved personal status, **Then** only positions with that overall status are shown.
5. **Given** data containing an old status, **When** it is loaded or migrated, **Then** Draft becomes Saved, Open becomes Applied, Interviewing remains Interviewing, On Hold becomes Paused, and Closed becomes Rejected.

---

### User Story 2 - Track Application Channels (Priority: P2)

As a job seeker, I want to record the status and date for each job platform and the organization's career page so that I know where I applied and what happened through each channel.

**Why this priority**: A position can be listed in several places, while only one channel may contain the submitted application or platform feedback.

**Independent Test**: Add multiple platform links and a career-page link, assign independent application statuses and dates, save, reload, and confirm every channel retains its own values without changing the others.

**Acceptance Scenarios**:

1. **Given** a job-platform link, **When** the user records Not applied, Applied, Viewed, Contacted, or Closed, **Then** that status is saved only for that platform entry.
2. **Given** a career-page link, **When** the user records an application status, **Then** it supports the same status choices as a platform link.
3. **Given** a channel is changed to Applied, **When** no application date exists, **Then** today's date is suggested and remains editable before saving.
4. **Given** several application channels, **When** one channel is edited or removed, **Then** all other channel records remain unchanged.
5. **Given** a position is Saved, **When** one of its channels is saved as Applied, Viewed, or Contacted, **Then** the overall position status advances to Applied without overriding any overall status already beyond Applied.

---

### User Story 3 - Understand Status Meanings (Priority: P3)

As a job seeker, I want status definitions available where I manage statuses so that I can apply them consistently without cluttering the positions table.

**Why this priority**: Clear definitions prevent ambiguity between similar stages such as Screening, Interviewing, Assignment, and Paused.

**Independent Test**: Open status help from the list and position detail areas using pointer and keyboard controls, verify every main and channel status is defined, then dismiss it without changing data.

**Acceptance Scenarios**:

1. **Given** a status control, **When** the user activates its adjacent help control, **Then** concise definitions are displayed without leaving the current workflow.
2. **Given** status help is open, **When** the user uses keyboard navigation or dismisses it, **Then** focus remains understandable and no status value changes.
3. **Given** the compact positions list, **When** status help is closed, **Then** definitions do not occupy row space or add a new visible column.

### Edge Cases

- A user may choose any overall status directly; the workflow does not enforce a fixed transition sequence.
- A channel without a tracked status remains distinct from an explicit Not applied status.
- Existing platform and career-page links migrate with no channel status or application date so the system does not invent application history.
- An application date may be today or in the past, but not in the future.
- Clearing a channel status also clears its application date after confirmation if a date was present.
- A channel status of Viewed or Contacted without an application date is allowed because some platforms may not expose the submission date.
- Automatic overall advancement applies only when the overall status is Saved; it never regresses or overwrites Screening, Interviewing, Assignment, Paused, Offer, Rejected, or Withdrawn.
- Removing a link removes only the application metadata belonging to that link.
- A failed save leaves the last saved overall status and all channel metadata intact and reports the failure clearly.
- Long platform names and localized status descriptions do not expand compact list rows.

## Requirements

### Functional Requirements

- **FR-001**: The system MUST replace the overall status choices with Saved, Applied, Screening, Interviewing, Assignment, Paused, Offer, Rejected, and Withdrawn.
- **FR-002**: Each overall status MUST use the following meaning: Saved is not yet applied; Applied is submitted and awaiting progress; Screening is an initial recruiter or HR conversation; Interviewing is an active technical, behavioral, or team interview process; Assignment is an active take-home task or coding evaluation; Paused is delayed or inactive but may continue; Offer is a received verbal or written offer; Rejected means the employer ended the application; Withdrawn means the user ended it.
- **FR-003**: Newly created positions MUST default to Saved unless the user records an Applied, Viewed, or Contacted channel during creation, in which case the saved overall status MUST be Applied.
- **FR-004**: Users MUST be able to change an existing position's overall status from its detail view.
- **FR-005**: A saved overall status change MUST be reflected in the detail view, compact list row, list sorting, and list filters after reload or restart.
- **FR-006**: Existing statuses MUST migrate as follows: Draft to Saved, Open to Applied, Interviewing to Interviewing, On Hold to Paused, and Closed to Rejected.
- **FR-007**: Status migration MUST preserve every position, its sequence, its non-status details, and the saved list-view preference.
- **FR-008**: Every job-platform link MUST support an optional independent channel status of Not applied, Applied, Viewed, Contacted, or Closed.
- **FR-009**: The career-page link MUST support the same optional channel statuses as job-platform links.
- **FR-010**: A channel with no status MUST be represented as untracked and MUST NOT be interpreted as Not applied.
- **FR-011**: Every platform and career-page channel MUST support an optional application date.
- **FR-012**: Selecting Applied for a channel with no date MUST suggest today's date while allowing the user to edit or clear it before saving.
- **FR-013**: Application dates MUST accept today or a past calendar date and reject future dates with a clear field-level message.
- **FR-014**: Platform status and application date changes MUST remain associated with their specific link when other links are added, edited, or removed.
- **FR-015**: When a Saved position gains an Applied, Viewed, or Contacted channel, the system MUST advance its overall status to Applied.
- **FR-016**: Automatic status advancement MUST NOT overwrite an overall status other than Saved.
- **FR-017**: Existing platform and career-page links MUST migrate with no channel status and no application date.
- **FR-018**: Status controls MUST provide an adjacent, accessible help control containing the approved definitions.
- **FR-019**: Status help MUST be available in the positions-list status area and wherever overall or channel status is edited.
- **FR-020**: Opening or closing status help MUST NOT modify position data.
- **FR-021**: The compact position row MUST continue to show only the overall status and MUST NOT add channel, platform, or application-date fields.
- **FR-022**: Status labels and help MUST remain compact, readable, keyboard accessible, and consistent with the existing discreet dark interface.
- **FR-023**: Failed overall or channel status saves MUST preserve the last saved values and show a concise error.
- **FR-024**: All status and application metadata MUST remain in the project's local, human-readable data and MUST NOT use browser persistent storage.

### Key Entities

- **Overall Application Status**: The user's current progress for one job position, using one of the nine approved personal workflow values.
- **Application Channel**: A job-platform listing or organization career-page link associated with a position.
- **Channel Application Status**: Optional progress reported for one application channel: Not applied, Applied, Viewed, Contacted, or Closed.
- **Application Date**: An optional non-future calendar date associated with one application channel.
- **Status Definition**: User-facing explanatory text for an overall or channel status.

## Success Criteria

### Measurable Outcomes

- **SC-001**: Users can identify and save the correct overall application stage for a position in under 20 seconds.
- **SC-002**: In migration validation, 100% of existing positions retain their identity, sequence, non-status details, and saved list-view preference while receiving the approved mapped status.
- **SC-003**: In persistence testing, 100% of overall statuses, channel statuses, and application dates remain unchanged after reload and application restart.
- **SC-004**: Users can determine where they applied and the status of each channel from the position detail view in under 30 seconds.
- **SC-005**: In validation, editing one of at least five application channels leaves 100% of the other channel records unchanged.
- **SC-006**: In keyboard testing, users can open status help, read every definition, change a status, and return to the triggering control without pointer input.
- **SC-007**: At desktop and 390-pixel-wide viewports, status controls and help produce no overlapping content, clipped labels, or horizontal page overflow.
- **SC-008**: In failure testing, 100% of rejected saves restore the last saved status and channel values without losing or duplicating a position or link.

## Assumptions

- This feature corrects the current position workflow before position-specific interview questions are specified or implemented.
- Overall status describes the user's application journey; channel status describes only what happened through one listing or application route.
- Channel status and application date are optional because a link may be saved only for reference.
- Application history, multiple dated status events, reminders, notifications, and analytics are outside this journey.
- A single career-page link remains supported, while job-platform links remain a multi-entry list.
- Existing compact sorting and manual ordering behavior continues, using the new overall status sequence in the order listed by FR-001.
- No new information is added to the compact position row beyond replacing its existing overall status label.
