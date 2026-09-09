# User Journeys

## Purpose

These journeys define the product feature set from the user's point of view. Use them before implementation to confirm scope, and after implementation to verify that important details are easy to find and check.

## Primary User

The primary user is a hiring manager, recruiter, founder, or team lead who manages job positions and needs a clear view of hiring work.

## Journey 1: Review Current Positions

Goal: quickly understand the current hiring workload.

Steps:

1. User opens the app.
2. User sees all positions in a scannable list.
3. User checks role title, department, location, status, hiring manager, and last updated date.
4. User can visually separate open, interviewing, on-hold, draft, and closed positions.

Required features:

- Positions list
- Status labels
- Key metadata visible without opening detail
- Empty state
- Responsive layout

Findability checks:

- Title and status must be visible first.
- Department, location, and hiring manager must be visible without hunting.
- Status colors must help recognition without relying on color alone.

## Journey 2: Find A Specific Position

Goal: locate one role quickly.

Steps:

1. User enters a title, department, location, or hiring manager in search.
2. User narrows the list by status if needed.
3. User clears filters when done.

Required features:

- Search
- Status filter
- Clear filter behavior
- No-results state

Findability checks:

- Search field must be prominent near the list.
- Active filters must be obvious.
- No-results state must explain how to recover.

## Journey 3: Create A Position

Goal: add a new role with enough detail to start hiring work.

Steps:

1. User clicks New Position.
2. User fills required role details.
3. User adds optional salary, seniority, requirements, and hiring manager.
4. User saves the position.
5. User sees the new position in the list.

Required features:

- New Position action
- Position form
- Required field validation
- Save and cancel actions
- File-backed JSON persistence

Findability checks:

- Required fields must be clearly marked.
- Validation messages must appear near the related field.
- Save and cancel actions must be visually distinct.

## Journey 4: Check Position Details

Goal: inspect all information for one role.

Steps:

1. User selects a position from the list.
2. User views the full description, requirements, salary range, work mode, employment type, and owner.
3. User returns to the list.

Required features:

- Position detail view
- Back navigation
- Full field display
- Not-found state

Findability checks:

- Details should be grouped into clear sections.
- Critical fields should appear near the top.
- Long text should be readable, not cramped.

## Journey 5: Update A Position

Goal: keep position information accurate as hiring changes.

Steps:

1. User opens a position.
2. User chooses edit.
3. User changes details.
4. User saves changes.
5. User sees updated information in detail and list views.

Required features:

- Edit action
- Reusable position form
- Save and cancel actions
- Updated date handling
- File-backed JSON persistence

Findability checks:

- Edit action must be easy to find but not more prominent than primary review content.
- User must know whether they are viewing or editing.
- Changes should be reflected immediately after save.

## Journey 6: Change Position Status

Goal: update the hiring lifecycle without editing the whole role.

Steps:

1. User opens or scans a position.
2. User changes status to Draft, Open, Interviewing, On Hold, or Closed.
3. User sees the new status reflected in the list.

Required features:

- Status control
- Status update persistence
- Status-specific visual treatment

Findability checks:

- Current status must be obvious.
- Status change control must be near the current status.
- Closed and on-hold positions must be visually distinct from active work.

## Journey 7: Remove A Position

Goal: delete a position that is no longer needed.

Steps:

1. User opens a position.
2. User chooses delete.
3. User confirms the destructive action.
4. User returns to the list.

Required features:

- Delete action
- Confirmation dialog
- File-backed JSON persistence

Findability checks:

- Delete should not be easy to trigger accidentally.
- Confirmation must name the position being deleted.
- Destructive styling should be red and used sparingly.

## MVP Feature Checklist

- [ ] Positions list
- [ ] Search positions
- [ ] Filter by status
- [ ] Create position
- [ ] Validate required fields
- [ ] View position details
- [ ] Edit position
- [ ] Change status
- [ ] Delete position with confirmation
- [ ] Persist positions in local JSON files
- [ ] Show empty and no-results states
- [ ] Support mobile and desktop layouts

## Suggested Build Order

1. Positions list, search, and status filter.
2. File-backed JSON persistence.
3. Create position form.
4. Position detail view.
5. Edit position form.
6. Status change shortcut.
7. Delete confirmation.
8. UX audit and polish.
