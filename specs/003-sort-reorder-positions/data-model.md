# Data Model: Sort and Reorder Positions

## Positions Document Version 4

The positions document contains the canonical position sequence and one saved list-view preference.

| Field | Type | Rules |
|---|---|---|
| `version` | Literal `4` | Distinguishes the list-view-aware document contract. |
| `listView` | List View Preference | Required and valid for the complete document. |
| `positions` | Ordered collection of Position records | Every position ID appears exactly once; order is canonical Manual order. |

### Version 3 Migration

- Preserve every position record byte-for-byte in meaning and retain its array position.
- Add `{ mode: "manual", column: null, direction: null }` as `listView`.
- Write only version 4 documents after any successful create, update, reorder, or list-view preference change.

## Position Sequence

The order of position records in the existing positions document is the canonical Manual order.

### Fields

| Field | Type | Rules |
|---|---|---|
| `positions` | Ordered collection of Position records | Every position ID appears exactly once; record contents remain unchanged by a reorder. |

### Invariants

- Reordering changes sequence only.
- No reorder may create, delete, duplicate, or modify a position record.
- A newly created position is prepended to the latest Manual order.
- Failed persistence leaves the original document bytes unchanged.
- Individual position schemas remain unchanged.

## List View Preference

Persistent presentation state for the positions list.

### Fields

| Field | Type | Rules |
|---|---|---|
| `mode` | `manual` or `column` | Version 3 migration defaults to `manual`. |
| `column` | Company, Position, Status, Work mode, Seniority, Updated, or null | Null in Manual mode; required in column mode. |
| `direction` | Ascending, descending, or null | Null in Manual mode; required in column mode. |

### State Transitions

1. Manual + header activation -> selected column ascending.
2. Selected column ascending + same header -> selected column descending.
3. Any column sort + different header -> new column ascending.
4. Any column sort + Manual order -> saved Manual sequence.
5. Search/filter change -> saved selection remains, but reordering stays unavailable.
6. Reload/restart -> restore the saved selection and derive the corresponding displayed order.
7. Failed preference write -> restore the previously saved selection and displayed order.

List View Preference is persistent product data but never changes Position Sequence.

## Reorder Operation

A single requested change to Position Sequence.

### Fields

| Field | Type | Rules |
|---|---|---|
| `positionId` | Position ID | Must identify an existing source position. |
| `beforePositionId` | Position ID or null | Must identify a different existing position, or null to place the source last. |

### Validation

- Source and anchor IDs cannot be equal.
- Missing source or non-null anchor IDs reject the operation.
- Moving a position to its current location is a successful no-op.
- The operation is valid only from the complete, unfiltered Manual-order list in the UI.

### Persistence Transition

1. Read and validate the latest positions document.
2. Remove the source position from its current location.
3. Insert it immediately before the anchor, or at the end when the anchor is null.
4. Validate that the same complete ID set remains.
5. Atomically replace the local positions document.
6. Return summaries in the resulting Manual order.

## Derived Sort Keys

| Column | Key |
|---|---|
| Company | Trimmed, case-insensitive company name |
| Position | Trimmed, case-insensitive position title |
| Status | Draft=0, Open=1, Interviewing=2, On Hold=3, Closed=4 |
| Work mode | Case-insensitive displayed label |
| Seniority | Intern=0, Entry=1, Associate=2, Mid-level=3, Senior=4, Staff=5, Lead=6, Manager=7, Director=8 |
| Updated | Parsed timestamp |

Equal keys retain their order in the loaded result set.
