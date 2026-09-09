# Feature Specification: Review Current Positions

**Feature Branch**: `001-review-positions`

**Created**: 2026-09-06

**Status**: Approved

**Last Amended**: 2026-09-07

**Input**: User description: "Show all current job positions in a discreet, dark, highly compact list so they can be reviewed and compared quickly at work."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Review Positions and Update Details (Priority: P1)

As the user, I want to scan every current position in one compact list and open a
position to maintain its organizational details, hiring-manager details, publication
links, and formatted job description without adding those details to the list rows.

**Why this priority**: Reviewing current positions is the primary entry point to the product and provides immediate value before any position-management workflow is added.

**Independent Test**: Populate the product with several positions, verify the approved
information directly in compact rows, open one position, select its department, team, and
location, enter hiring-manager details, add publication links, format the job description,
save, and confirm the JSON-backed update and new last-updated date without exposing
detail-only values in the list.

**Acceptance Scenarios**:

1. **Given** current positions exist, **When** the user opens the positions view, **Then** every current position is displayed as one thin row in a single list.
2. **Given** a position row is displayed, **When** the user scans the row, **Then** the company logo, company name, position name, status, work mode, seniority, and last updated date are visible.
3. **Given** multiple position rows are displayed, **When** the user scans across the list, **Then** equivalent information remains consistently aligned and easy to compare.
4. **Given** a position row is displayed, **When** the user reviews it, **Then** department, team, location, employment type, hiring manager details, salary, description, and requirements are not displayed in the row.
5. **Given** a position row is displayed, **When** the user selects it, **Then** the corresponding position detail view opens.
6. **Given** a position was updated and saved, **When** the user returns to the positions view, **Then** the row reflects the saved values and updated date.
7. **Given** a position detail view is open, **When** reference values load, **Then** the user can select a department, a team belonging to that department, and a location.
8. **Given** a team is selected, **When** the user changes to a department that does not contain that team, **Then** the invalid team selection is cleared before saving.
9. **Given** a position detail view is open, **When** the user enters hiring-manager name, phone number, and position and saves valid changes, **Then** those details and the server-generated updated date are persisted to the local positions file.
10. **Given** any hiring-manager field is entered without the other required manager fields, **When** the user attempts to save, **Then** saving is blocked, field guidance is shown, and the local positions file remains unchanged.
11. **Given** a valid detail update cannot be written, **When** saving fails, **Then** the entered values remain available and a clear error is shown without corrupting the existing positions file.
12. **Given** a position detail view is open, **When** the user adds job-platform postings, **Then** each entry accepts a platform name and its job-posting web address, and the user can add or remove multiple entries.
13. **Given** a position detail view is open, **When** the user enters the organization's career-page job address, **Then** that optional address can be saved with the position.
14. **Given** a position detail view is open, **When** the user edits the job description, **Then** headings, bold text, italic text, bullet lists, numbered lists, and links can be applied and saved.
15. **Given** publication links and a formatted description were saved, **When** the user reloads the position details, **Then** the saved links, text, and formatting are restored.
16. **Given** the career-page address, platform links, and description are empty, **When** the user saves otherwise valid changes, **Then** saving succeeds because all three additions are optional.
17. **Given** a platform-link entry contains only a platform name or only a web address, or any entered address is invalid, **When** the user attempts to save, **Then** saving is blocked and guidance identifies the incomplete or invalid entry.

### Edge Cases

- When no positions exist, the view communicates that the list is empty without displaying placeholder rows as real positions.
- When a company logo is missing or cannot be displayed, the company remains identifiable through a quiet fallback that does not change row height.
- Long company and position names remain distinguishable without increasing row height or overlapping adjacent information.
- Missing optional detail values do not create empty columns or unexplained gaps in the list row.
- Status, work mode, seniority, and updated-date values remain readable at the supported viewport sizes.
- When selectable reference data is unavailable or invalid, the detail view explains the
  problem and does not offer unvalidated choices.
- A hiring manager may be entirely absent; when partially entered, all three manager
  fields are required before saving.
- A position may have no platform links, no career-page address, and no description.
- A platform-link entry is either entirely absent or contains both a platform name and a
  valid web address; empty entries are not saved.
- Long descriptions and many publication links remain usable without obscuring the
  assignment and hiring-manager sections.
- Pasted description content that uses unsupported formatting keeps its readable text
  without adding formatting options outside the approved set.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The product MUST display all current positions in a single list when the positions view opens.
- **FR-002**: The product MUST represent each position with one compact, table-like row.
- **FR-003**: Every position row MUST display the company logo, company name, position name, status, work mode, seniority, and last updated date.
- **FR-004**: Position rows MUST NOT display department, team, location, employment type, hiring manager details, salary, description, or requirements.
- **FR-005**: Position status MUST support Draft, Open, Interviewing, On Hold, and Closed.
- **FR-006**: Work mode MUST support Remote, Hybrid, and Onsite.
- **FR-007**: Selecting a position row MUST open the details for that position.
- **FR-008**: The position detail data MUST support selectable department, team, and location values.
- **FR-009**: Users MUST be able to enter and update a hiring manager's name, phone number, and position or title in position details.
- **FR-010**: Saving approved position-detail changes MUST persist them to the local positions file, assign a new last updated date, and show that date when the user returns to the list.
- **FR-011**: The positions view MUST use a dark visual theme with restrained contrast suitable for discreet workplace use.
- **FR-012**: The positions view MUST NOT use a large, bold, or attention-grabbing project title.
- **FR-013**: Status indicators MUST be distinguishable without using visually loud treatments.
- **FR-014**: Rows MUST keep a consistent compact height when logos are missing or text values are long.
- **FR-015**: When no positions exist, the product MUST display a clear empty state.
- **FR-016**: Position details MUST allow users to add, edit, and remove multiple optional job-platform links.
- **FR-017**: Every saved job-platform link MUST contain both a user-entered platform name and a valid web address.
- **FR-018**: Position details MUST allow users to enter, edit, or clear one optional organization career-page job address.
- **FR-019**: Position details MUST allow users to enter and edit an optional formatted job description.
- **FR-020**: Job-description formatting MUST support headings, bold text, italic text, bullet lists, numbered lists, and links.
- **FR-021**: The product MUST preserve the job description's supported formatting after saving and reopening the position.
- **FR-022**: Invalid or incomplete publication-link entries MUST block saving and show guidance without discarding the user's entered values.
- **FR-023**: Job-platform links, the career-page address, and the job description MUST remain detail-only and MUST NOT appear in position-list rows.
- **FR-024**: Users MUST be able to save a position when any or all of the new detail-only fields are empty.

### Key Entities

- **Position**: A job opening identified by position name, status, work mode, seniority, and last updated date. It also owns detail-only values including department, team, location, employment type, salary, formatted description, requirements, publication links, and a career-page address.
- **Company**: The organization associated with a position, identified in the list by its name and logo.
- **Hiring Manager**: An optional detail-only contact associated with a position, described by name, phone number, and position or title.
- **Job Platform Link**: An optional repeatable detail entry that identifies a job-finding platform by name and stores the position's posting address on that platform.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A user can identify a position's company, title, status, work mode, seniority, and last updated date within 10 seconds without opening its details.
- **SC-002**: A user can compare the row-visible information for 10 positions within 60 seconds.
- **SC-003**: At least 10 standard position rows are visible at once in a 768-pixel-high application viewport, excluding persistent navigation and controls.
- **SC-004**: In acceptance testing, 100% of populated rows show all required row-visible information and none of the detail-only information.
- **SC-005**: In usability testing, at least 90% of users can open the intended position details on their first attempt.
- **SC-006**: A user can add two platform links, one career-page address, and a formatted description and save them within 3 minutes.
- **SC-007**: In acceptance testing, 100% of valid saved publication links and supported description formatting are restored after reopening the position.
- **SC-008**: In acceptance testing, 100% of incomplete or invalid publication-link entries are identified before any position data is changed.

## Assumptions

- This feature is for a single user reviewing their own position records; multi-user permissions are outside this journey.
- This journey includes detail editing for department, team, location, hiring-manager
  information, job-platform links, the organization career-page address, and the formatted
  job description. Editing company, title, status, work mode, seniority, employment type,
  salary, and requirements remains outside this journey.
- The last updated date represents the most recent saved change to the position.
- A quiet visual fallback identifies a company when its logo is unavailable.
- Filtering, sorting, searching, grouping, pagination, and bulk actions are outside this journey unless specified later.
- Platform names are user-entered so the feature is not restricted to a predefined set of
  job-finding services.
