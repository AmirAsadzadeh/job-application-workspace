# UI Contract: Create a Job Position

## Entry and Route

- The positions toolbar contains a compact plus icon with `New position` text.
- The command is keyboard operable, has an accessible name, and opens `/positions/new`.
- The create route has a compact header with Back, a modest `New position` title, and no
  large project or product heading.
- Loading reference data shows quiet progress without moving the form controls.
- A reference-data failure shows a clear retry or Back action and never substitutes fake
  options.

## Form Structure

The form is one page with these sections in this order:

| Section | Controls |
|---------|----------|
| Basics | Company name, logo mode/input, position name, Draft status, work mode, seniority, employment type |
| Assignment | Department, team, location |
| Hiring manager | Name, phone number, position |
| Salary | Minimum, maximum, currency |
| Publication links | Repeatable platform links and organization career-page URL |
| Job description | Existing restricted rich-text editor |

- Required fields are visibly identified without relying only on color.
- Status is visible as the fixed initial value `Draft`; the user does not select another
  status in this journey.
- Employment type initially shows `Full-time`.
- Department, team, location, and employment type remain detail-only after creation and
  do not appear in compact list rows.
- Team is disabled until a department is selected. Changing department clears the team
  and announces that change when a previous selection was removed.

## Logo Contract

- The optional logo control offers `None`, `Upload`, and `Image URL` as mutually exclusive
  modes and retains at most one source.
- Upload accepts PNG, JPG/JPEG, and SVG files up to 2 MB and shows the selected image or a
  fixed-size fallback preview.
- Image URL accepts an absolute HTTP or HTTPS address and previews it directly.
- A syntactically valid remote URL remains savable when its image cannot load; preview and
  later displays use the company-letter fallback.
- Invalid type, oversize upload, malformed URL, or both logo sources produce guidance at
  the logo control without clearing other fields.

## Validation Contract

- Company name, position name, work mode, and seniority are required.
- Hiring-manager fields are all blank or all complete.
- Salary fields are all blank or all complete; maximum is not below minimum and currency
  is three letters.
- Each non-blank platform row contains both a platform name and HTTP/HTTPS URL.
- Career-page URL is blank or absolute HTTP/HTTPS.
- Validation is performed before the network request and repeated at the service boundary.
- Every error appears beside the relevant field or grouped control, and the first invalid
  control receives focus after an attempted save.
- Errors use text, not color alone, and are announced to assistive technology.
- User-entered values and rich formatting remain intact after validation or service errors.

## Editing and Save Contract

- Publication rows support compact add and remove commands using familiar icons with
  accessible labels and tooltips.
- The description toolbar supports only headings 1-3, bold, italic, bulleted list,
  numbered list, add/edit link, and remove link.
- There is no separate job-requirements input.
- Save is a clear command at the end of the form and remains reachable by keyboard.
- While saving, Save is disabled and shows a stable pending state that does not resize the
  layout. Further activation cannot submit again.
- On success, the app returns to the positions list, reloads it, and shows the new compact
  row first when no filter excludes it.
- On failure, the form stays open with all entered values and a concise error near Save.

## Unsaved Changes Contract

- The form is untouched until a value differs from its normalized initial state.
- Back, Cancel, browser Back, refresh, close, and external navigation prompt before
  discarding a dirty form.
- Choosing to stay leaves the form and values unchanged.
- Choosing to discard leaves without creating a record.
- An untouched form exits without confirmation.

## Density and Responsive Contract

- Use the existing dark neutral palette, restrained borders, compact labels, and form
  controls consistent with the detail route.
- Sections are full-width fieldsets or unframed bands, not nested cards.
- Desktop layouts may use aligned multi-column form grids; at 390 pixels they become a
  single readable column without horizontal page overflow.
- Controls, error text, editor toolbar, and action row never overlap or cause labels to be
  clipped.
- Spacing remains compact while each interactive control retains a usable pointer and
  keyboard target.

## State Matrix

| State | Required result |
|-------|-----------------|
| Reference loading | Quiet stable progress state. |
| Reference failure | Error with Retry or Back; no fake selectors. |
| Untouched | Defaults visible; exit has no confirmation. |
| Dirty | Entered values visible; exit requires confirmation. |
| Invalid required field | Field guidance; save blocked; values retained. |
| Invalid optional group | Group guidance; save blocked; values retained. |
| Remote image unavailable | Fallback preview; valid URL remains savable. |
| Upload rejected | Logo guidance; other values retained. |
| Saving | Save disabled; no duplicate request. |
| Save failed | Form retained with concise error. |
| Save succeeded | Return to refreshed list with new row first. |
