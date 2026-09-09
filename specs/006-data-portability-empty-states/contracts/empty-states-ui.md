# Contract: Empty-State UI

## Shared Pattern

An empty state uses a compact outlined square-pattern container with one small muted context-specific icon in a fixed square tile, one concise reason, and zero or one relevant action. It has no illustration, large heading, tutorial copy, nested card, or decorative treatment. Loading and error/retry notices remain separate. The icon is decorative to assistive technology because the adjacent message communicates the state.

## Required Variants

| Context | Condition | Icon | Message | Action | Result |
|---|---|---|---|---|---|
| Positions | No records and no filters | Briefcase | No positions yet | New position | Opens creation |
| Positions | Query or status has no matches | Search unavailable | No matching positions | Clear filters | Clears query and status |
| Platform links | No saved or draft rows | Link | No job platforms added | Add platform | Adds and focuses one row |
| Readings | No item or new editor | Book | No reading items yet | Add reading | Opens and focuses editor |
| Resume | No submitted resume | File | No submitted resume | Import | Opens file chooser |
| Questions | No question or new editor | Question | No questions yet | Add question | Opens and focuses editor |
| Questions | Category has no matches | Search unavailable | No questions in this category | Show all | Changes filter to All only |
| Reference selector | No departments, teams, or locations | None | No options available | None | Creates no selectable record |

The Questions filter is hidden when there are no questions. A selector may retain its optional "Not selected" value only when valid choices exist; unavailable text is disabled and never a data value.

## Accessibility and Layout

- Actions are keyboard operable with visible focus.
- Icons sit in fixed 26 by 26 pixel square tiles, remain muted and consistently aligned, and do not materially increase empty-state height.
- Icon-only transfer controls use Lucide icons, accessible names, and tooltips.
- Messages fit at 1440x900 and 390x844 without clipping, overlap, or page overflow.
- Existing thin rows and section dimensions do not shift unexpectedly.
- Live announcements cover filter clearing, editor opening, validation, restore completion, and failures where visual state alone is insufficient.
