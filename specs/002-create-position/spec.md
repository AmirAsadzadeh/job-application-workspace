# Feature Specification: Create a Job Position

**Feature Branch**: `002-create-position`
**Created**: 2026-09-07
**Status**: Approved
**Input**: Add a compact position-creation journey with company identity, assignment details, hiring-manager details, salary, publication links, and a rich job description.

## User Scenarios & Testing

### User Story 1 - Create a Position (Priority: P1)

As a user, I want to create a job position from one compact, clearly organized form so that I can record the position quickly and find it at the top of the positions list.

**Why this priority**: Creating positions is required before later recruiting journeys can use or manage them.

**Independent Test**: Start from the positions list, open the creation view, enter only the required information, save, and verify that the new position appears first in the list and opens with the saved details.

**Acceptance Scenarios**:

1. **Given** the user is on the positions list, **When** they activate the compact plus icon and `New position` control, **Then** a single compact creation page opens with Basics, Assignment, Hiring manager, Salary, Publication links, and Job description sections.
2. **Given** the creation page is open, **When** the user enters a company name and position name, selects a work mode and seniority, and saves, **Then** a position with `Draft` status and `Full-time` employment type is created.
3. **Given** the user provides optional details, **When** the form is saved, **Then** department, team, location, employment type, hiring-manager details, salary, logo, publication links, career-page link, and rich job description are retained and shown in the position detail view.
4. **Given** the user uploads a supported company logo, **When** the position is saved, **Then** the uploaded logo is retained locally and used for the company identity.
5. **Given** the user enters a valid HTTP or HTTPS company-logo URL, **When** the position is saved, **Then** the URL is retained directly without downloading the image, and a letter fallback is shown whenever the image cannot be loaded.
6. **Given** one or more required or conditional fields are incomplete or invalid, **When** the user attempts to save, **Then** creation is blocked, the entered information remains intact, and each problem is identified beside the relevant field.
7. **Given** the user has changed any field, **When** they attempt to leave without saving, **Then** they are asked to confirm discarding their changes; an untouched form can be exited immediately.
8. **Given** a valid form cannot be written to the local position records, **When** saving fails, **Then** no partial record is retained, existing records remain unchanged, and the user's entered information remains available for another attempt.
9. **Given** a company and position name already exist together, **When** the user saves another valid position with the same values, **Then** the new position is accepted with its own unique identity.
10. **Given** existing records contain a separate job-requirements value, **When** those records are brought into the current data model, **Then** the requirements content is preserved within the rich job description and no separate requirements field remains.

### Edge Cases

- If the selected department changes and the chosen team no longer belongs to it, the team selection is cleared and the user is informed.
- If only part of the hiring-manager group is entered, all of name, phone number, and position become required.
- If any salary value is entered, minimum, maximum, and currency all become required; maximum salary cannot be lower than minimum salary.
- Each job-platform entry requires both a platform name and a valid HTTP or HTTPS URL; incomplete entries do not create empty links.
- The organization career-page link, when supplied, must be a valid HTTP or HTTPS URL.
- A logo URL with valid syntax may be saved even if the remote image is unavailable; the fallback identity remains visible.
- An uploaded logo with an unsupported type or a size greater than 2 MB is rejected without clearing other form data.
- The logo control retains at most one source: either an uploaded image or a remote URL.
- Blank rich-text formatting is treated as an empty description.
- Repeated save actions cannot create multiple records from one successful submission.

## Requirements

### Functional Requirements

- **FR-001**: The positions list MUST provide a compact plus icon and `New position` control that opens the position-creation page.
- **FR-002**: The creation page MUST use one compact form organized into Basics, Assignment, Hiring manager, Salary, Publication links, and Job description sections.
- **FR-003**: Company name, position name, work mode, and seniority MUST be required.
- **FR-004**: New positions MUST default to `Draft` status.
- **FR-005**: Employment type MUST default to `Full-time` and allow `Full-time`, `Part-time`, `Contract`, and `Internship`.
- **FR-006**: Work mode MUST allow `Remote`, `Hybrid`, and `Onsite`.
- **FR-007**: Seniority MUST allow `Intern`, `Entry`, `Associate`, `Mid-level`, `Senior`, `Staff`, `Lead`, `Manager`, and `Director`.
- **FR-008**: Department, team, location, and employment type MUST be selectable in the creation form while remaining excluded from the compact positions-list rows.
- **FR-009**: Team options MUST be limited to the selected department, and an incompatible team selection MUST be cleared when the department changes.
- **FR-010**: The company logo MUST be optional and accept either a local PNG, JPG, or SVG upload no larger than 2 MB, or a direct HTTP or HTTPS image URL.
- **FR-011**: Remote company-logo URLs MUST be retained as URLs and MUST NOT be downloaded into local storage.
- **FR-012**: An unavailable remote logo MUST NOT block position creation and MUST use the company-letter fallback.
- **FR-013**: Hiring-manager name, phone number, and position MUST be optional as a group; entering any one of them MUST require all three.
- **FR-014**: Salary MUST be optional and consist of minimum, maximum, and currency; entering any salary value MUST require all three, and maximum MUST be greater than or equal to minimum.
- **FR-015**: A position MUST support zero or more job-platform links, each containing a platform name and an HTTP or HTTPS URL.
- **FR-016**: A position MUST support one optional organization career-page HTTP or HTTPS URL.
- **FR-017**: The job description MUST use rich text supporting headings, bold, italic, bulleted lists, numbered lists, and links.
- **FR-018**: Job requirements MUST be recorded within the job description; the position model and form MUST NOT expose a separate job-requirements field.
- **FR-019**: Existing separate job-requirements content MUST be migrated into the corresponding rich job description without loss.
- **FR-020**: Position identity and created/updated timestamps MUST be generated automatically and MUST NOT be entered by the user.
- **FR-021**: Duplicate company-name and position-name combinations MUST be allowed, while every created position receives a unique identity.
- **FR-022**: Invalid or incomplete input MUST block saving, preserve entered values, and identify errors beside the relevant fields.
- **FR-023**: Leaving a changed form without saving MUST require discard confirmation; leaving an untouched form MUST not require confirmation.
- **FR-024**: A failed local-file write MUST leave all existing position records unchanged and preserve the form values for retry.
- **FR-025**: A successful save MUST return the user to the positions list with the newly created position at the top.
- **FR-026**: The new compact list row MUST show company identity, position name, status, work mode, seniority, and last update, consistent with the approved review-positions journey.
- **FR-027**: The complete created record MUST be retained in the project's local, human-readable position data file.

### Key Entities

- **Position**: A uniquely identified job opening with company identity, title, status, work mode, seniority, optional assignment and employment data, hiring-manager details, salary, publication destinations, rich description, and timestamps.
- **Company Identity**: Company name plus an optional single logo source, represented by either a local upload or a remote image URL, with a letter fallback.
- **Assignment**: Optional department, team, and location selections, with team constrained by department.
- **Hiring Manager**: Optional grouped contact information containing name, phone number, and position.
- **Salary**: Optional grouped minimum, maximum, and currency values.
- **Publication Link**: A platform name paired with its job-posting URL; a position can contain multiple entries.
- **Job Description**: Rich content containing the role description and its requirements.

## Success Criteria

### Measurable Outcomes

- **SC-001**: A user can create a valid position using only required fields and see it at the top of the positions list in under two minutes.
- **SC-002**: In validation testing, 100% of missing required fields, incomplete grouped fields, invalid URLs, invalid salary ranges, and unsupported uploads block creation without losing entered values.
- **SC-003**: In persistence testing, 100% of successfully created positions retain all entered values, a unique identity, and generated timestamps after the application is restarted.
- **SC-004**: In failure testing, an interrupted or failed save produces no partial record and changes none of the previously stored positions.
- **SC-005**: On desktop and a 390-pixel-wide viewport, all creation sections and controls remain readable, reachable, and free of overlapping content.
- **SC-006**: After migration, 100% of existing job-requirements content appears in the corresponding rich job description, with no separate requirements field remaining.
- **SC-007**: In task-based usability testing, at least 90% of users complete a valid position on their first attempt without assistance.

## Assumptions

- Position data remains in project-local, human-readable files; no browser local storage or remote service is introduced.
- The approved compact dark visual language from the review-positions journey also applies to the creation page.
- Status values remain `Draft`, `Open`, `Interviewing`, `On Hold`, and `Closed`, although creation defaults to `Draft`.
- Company names are entered manually; there is no company search or company-directory selection step.
- A remote logo's availability can change independently of the saved position, so image-load failure is handled visually rather than treated as invalid saved data.
