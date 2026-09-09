# UI Contract: Positions List

## View Entry

- The default application view requests `GET /api/positions`.
- While the request is unresolved, the list region exposes a quiet loading state.
- A successful response with no records shows the empty state.
- A data or network failure shows a clear error state and a Retry command.
- Returning to this view from a position detail route requests the list again.
- The existing search and status controls remain available in a compact toolbar. Their
  values are sent as list-request query parameters without exposing hidden fields in rows.

## Column Contract

Rows expose these columns in this order:

| Column | Content | Display rule |
|--------|---------|--------------|
| Company | Fixed-size logo or fallback plus company name | Single line; full company name remains accessible. |
| Position | Position title | Single line; full title remains accessible. |
| Status | Approved status label | Restrained text/border treatment; color is not the only signal. |
| Work mode | Remote, Hybrid, or Onsite | Plain text. |
| Seniority | Position seniority | Single line. |
| Updated | Concise localized date | Full date is available to assistive technology or as a tooltip. |

Department, team, location, employment type, hiring manager data, salary,
description, publication links, career-page address, and requirements must not be
rendered anywhere inside a list row.

## Density Contract

- Desktop standard row height is 36-42 pixels, including separators.
- Company marks are fixed at 20-24 pixels and never resize the row.
- Header labels use compact text and do not resemble a hero heading.
- The list must show at least 10 rows in a 768-pixel-high application viewport after
  persistent navigation and controls.
- Required columns remain present at narrow widths. The list may scroll horizontally,
  but row content may not stack into cards or overlap.
- Long company names, position names, and seniority values truncate within their column
  without changing row height. Their complete values remain accessible.

## Interaction Contract

- Each row represents one navigation target: `/positions/{positionId}`.
- Pointer selection and Enter activation open the same target.
- Each row has a visible keyboard focus state that does not change its dimensions.
- Browser Back returns to the positions list and restores a usable list state.
- A missing target displays a quiet not-found state with a Back to positions command.

## Detail Editing Contract

- The detail route loads the selected position and reference data.
- Department, team, and location use native select controls and are not shown in list rows.
- Team options belong to the selected department. Changing department clears an invalid
  team selection.
- Hiring manager uses labelled name, phone-number, and position inputs.
- All hiring-manager inputs may be blank together. When any is entered, all three are
  required before save.
- Job-platform links use repeatable rows with labelled platform-name and URL inputs.
- Users can add and remove platform-link rows. A partially completed row shows guidance
  and blocks save; a completely blank draft row is ignored.
- The organization career-page job address uses one labelled optional URL input.
- The job description uses a rich-text editing region with a compact toolbar for heading,
  bold, italic, bullet-list, numbered-list, and link commands only.
- Editor toolbar commands expose their active/pressed state and remain keyboard operable.
- Pasted unsupported formatting is removed while readable text is retained.
- Save updates only department, team, location, hiring-manager, publication-link, and
  formatted-description values in this journey.
- During save, the command shows a stable pending state and cannot submit twice.
- A successful save keeps the user on the detail route, confirms completion quietly, and
  uses the server-returned `updatedAt` value.
- Validation or write failures keep entered values and show a clear inline error.
- Returning to the list reloads rows so the saved last-updated date is visible.

## Visual Contract

- The view uses a dark neutral background with readable foreground contrast.
- Statuses use text labels plus restrained, distinct treatments; saturated fills and
  glowing effects are prohibited.
- The page title is compact and visually subordinate to the working list.
- Cards, large headings, decorative gradients, oversized gaps, and attention-grabbing
  animations are prohibited in this view.

## Accessibility Contract

- The list has an accessible name, and column meanings are available to assistive
  technology.
- Logos use the company name as alternative text; decorative fallback lettering is hidden
  when the company name is already announced.
- Loading and error changes are announced without moving keyboard focus unexpectedly.
- Text, focus indicators, and interactive states maintain readable contrast.
- Horizontal overflow is keyboard-scrollable and does not trap focus.

## State Matrix

| State | Required result |
|-------|-----------------|
| Loading | Stable list area with quiet progress feedback. |
| Populated | Header and one compact interactive row per API summary. |
| Empty | Clear no-positions message; no fake rows. |
| Data error | Error explanation and Retry command; no seed data substitution. |
| Missing logo | Fixed-size fallback and visible company name. |
| Long text | Truncation without row expansion or overlap. |
| Missing position | Not-found detail route with Back command. |
| Detail loading | Stable detail layout with quiet progress feedback. |
| Detail validation error | Field guidance; entered values remain intact. |
| Detail saving | Save command disabled against duplicate submission. |
| Detail save success | Quiet confirmation and server-updated timestamp. |
| Detail save failure | Inline error with entered values preserved. |
| Empty publication details | Save succeeds with no platform links, career-page address, or description. |
| Incomplete platform link | Field guidance appears; save is blocked and entries remain intact. |
| Invalid publication URL | URL-specific guidance appears; no data is changed. |
| Rich-text editing | Only approved toolbar commands and content structures are available. |
| Rich-text reload | Saved text and supported formatting are restored. |
