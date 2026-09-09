# Interface Contract: Position Questions

## Read Position Details

`GET /api/positions/:positionId`

The existing response adds the complete position-owned question collection:

```json
{
  "position": {
    "id": "pos-001",
    "questions": [
      {
        "id": "question-001",
        "title": "How does the browser event loop schedule work?",
        "category": "browser",
        "customCategory": null,
        "answer": {
          "type": "doc",
          "content": [{ "type": "paragraph" }]
        },
        "createdAt": "2026-09-08T12:00:00.000Z",
        "updatedAt": "2026-09-08T12:00:00.000Z"
      }
    ]
  }
}
```

Unchanged Position fields are omitted from the example only for readability. No separate list/search endpoint is added.

## Create Question

`POST /api/positions/:positionId/questions`

```json
{
  "title": "Explain a typed reducer",
  "category": "typescript",
  "customCategory": null,
  "answer": {
    "type": "doc",
    "content": [
      {
        "type": "codeBlock",
        "attrs": { "language": "typescript" },
        "content": [{ "type": "text", "text": "type State = { count: number };\n" }]
      }
    ]
  }
}
```

On success, return `201` with the authoritative complete Position. Its question collection contains the newly generated question first.

## Update Question

`PATCH /api/positions/:positionId/questions/:questionId`

The strict body has the same editable fields as Create Question. The client sends the complete editable question state, not a partial patch. On success, return `200` with the authoritative complete Position. The server preserves question ID and `createdAt`, advances question and Position `updatedAt`, and does not move the question.

## Delete Question

`DELETE /api/positions/:positionId/questions/:questionId`

The request has no body. Confirmation is a required UI behavior before this request is sent. On success, return `200` with the authoritative complete Position after removing only the selected question.

## Validation Behavior

- A missing or whitespace-only title is rejected with a title field path.
- `other` without a non-whitespace custom category is rejected.
- A custom category with any category other than `other` is rejected rather than silently persisted.
- Unknown categories, answer nodes, marks, code languages, and request properties are rejected.
- Client-supplied question IDs and timestamps are rejected.
- Duplicate question titles are accepted.
- An empty answer document and null category are accepted.

## Error Responses

All failures use the existing JSON error envelope.

| Condition | HTTP status | Stable code |
| --- | --- | --- |
| Malformed JSON or invalid question body | 400 | `QUESTION_INVALID` |
| Owning position does not exist | 404 | `POSITION_NOT_FOUND` |
| Question does not exist in that position | 404 | `QUESTION_NOT_FOUND` |
| Atomic persistence fails | 500 | `POSITION_WRITE_FAILED` |

Validation errors include field paths suitable for placing the title or custom-category message beside its control. A failed mutation returns no optimistic persisted state; the client retains its local draft for retry.

## Atomicity and Isolation

- Every mutation enters the repository's existing serialized write queue.
- Each successful mutation replaces the complete positions document atomically.
- A question lookup is scoped to `positionId`; the same `questionId` path under another position cannot access it.
- Failed create, update, or delete operations leave the prior file bytes unchanged.
- Responses are authoritative for collection order, generated identity, timestamps, and the owning Position's `updatedAt`.
