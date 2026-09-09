# AI-Assisted Roadmap

## Working Method

Use a light BMad-style loop:

1. Brief: define the product goal and current assumptions.
2. Model: name the domain objects and workflows.
3. Architecture: choose the simplest structure that can survive the MVP.
4. Stories: write thin vertical slices.
5. Build: implement one slice at a time.
6. Verify: run tests, inspect UI, and update docs when assumptions change.

## Epic 1: Project Foundation

Goal: create a runnable frontend project with basic layout and domain types.

Stories:

- As a user, I can open the app and see a positions workspace.
- As a developer, I have typed position models and seed data.
- As a developer, I have a simple file-backed JSON persistence boundary for positions.

Acceptance:

- App runs locally.
- TypeScript checks pass.
- The first screen renders seeded positions.

## Epic 2: Position List

Goal: make positions scannable.

Stories:

- As a user, I can see a list of positions with title, team, location, status, and updated date.
- As a user, I can filter by status.
- As a user, I can search by title, department, or hiring manager.

Acceptance:

- Empty, loading, and populated states are handled.
- Filters can be cleared.
- The list remains usable on mobile and desktop.

## Epic 3: Create And Edit Position

Goal: let users manage core role details.

Stories:

- As a user, I can create a new position.
- As a user, I can edit an existing position.
- As a user, I see validation for required fields.

Acceptance:

- Required fields are title, department, location, employment type, work mode, status, and description.
- Saving writes the position through the JSON file repository or API.
- Cancel returns without changing data.

## Epic 4: Position Detail

Goal: provide a focused page or panel for one position.

Stories:

- As a user, I can open a position and review its full details.
- As a user, I can change status from the detail view.
- As a user, I can delete a position after confirmation.

Acceptance:

- Status changes update the list and detail view.
- Deletion is guarded by confirmation.
- Missing positions show a useful not-found state.

## Epic 5: Polish And Verification

Goal: make the MVP feel complete enough to demo.

Stories:

- As a user, I get a responsive, work-focused interface.
- As a developer, I have focused tests for filtering, validation, and JSON file persistence.
- As a reviewer, I can understand the project from the docs.

Acceptance:

- Build passes.
- Main workflows are manually verified.
- README explains setup and current scope.

## First Implementation Slice

Recommended first slice:

- Scaffold React + TypeScript + Vite.
- Add domain types and seed positions.
- Render a positions list from seed data.
- Add basic status filter.

This gives immediate feedback and establishes the project’s shape without locking in backend choices too early.
