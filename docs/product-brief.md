# Job Positions Product Brief

## Intent

Build a small, focused application for managing job positions during a hiring process. The app should help a user create positions, track their status, keep core role details organized, and quickly understand what needs attention.

This project uses an AI-assisted, BMad-inspired workflow: define the product shape first, keep decisions visible, then implement in narrow vertical slices that each produce something usable.

## Problem

Hiring work often starts informally: role notes, requirements, salary ranges, status, and hiring team context are scattered across messages or documents. A lightweight positions tracker gives structure without becoming a full applicant tracking system.

## Primary User

A hiring manager, recruiter, founder, or team lead who needs to manage open roles and their lifecycle.

## MVP Outcome

The MVP is successful when the user can:

- See all job positions in one place.
- Create a new position with the most important details.
- View and edit a position.
- Change a position status.
- Search or filter positions enough to find current work quickly.
- Persist data in local project JSON files through a simple filesystem-backed boundary.

## Non-Goals For MVP

- Candidate tracking.
- Interview scheduling.
- Offer management.
- External job board publishing.
- AI-generated job descriptions or matching.
- Multi-tenant permissions and enterprise workflows.

## Position Lifecycle

Suggested statuses:

- `Draft`
- `Open`
- `Interviewing`
- `On Hold`
- `Closed`

## Core Fields

- Title
- Department or team
- Location
- Work mode: remote, hybrid, onsite
- Employment type: full-time, part-time, contract, internship
- Seniority
- Status
- Salary range
- Description
- Requirements
- Hiring manager
- Created date
- Updated date

## Experience Principles

- Make the current hiring workload scannable.
- Keep forms plain and fast.
- Prefer clear status and filters over decorative dashboards.
- Use a calm, restrained color palette that supports checking details instead of competing with them.
- Make important details easy to find through consistent layout, labels, spacing, and status treatment.
- Prioritize readable tables, lists, filters, and detail sections over fancy visual effects.
- Let the product grow toward candidates, interviews, and reports later without forcing those concepts into the MVP.

## UI Direction

The interface should feel like a practical operations tool. It should be clean, steady, and easy to scan for repeated daily use.

Recommended palette direction:

- Neutral base: white, soft gray, and near-black text.
- Primary action: muted blue.
- Success/open state: green.
- Warning/on-hold state: amber.
- Closed/inactive state: gray.
- Error/destructive state: red.

Avoid highly decorative gradients, loud colors, low-contrast text, and visual effects that make job details harder to compare.

## Open Questions

- Is this mainly for a single user, a small team, or a company workspace?
- Is the first deliverable intended for interview practice, portfolio demonstration, or real internal use?
- Which frontend stack should be used if the workspace is blank?
