# Interface Contract: Application Status Updates

## List Positions

`GET /api/positions`

Existing query parameters remain:

- `q`: optional search text
- `status`: optional Overall Application Status

Each summary row contains the new overall status value. The response shape and saved `listView` are otherwise unchanged.

```json
{
  "positions": [
    {
      "id": "pos-001",
      "company": { "name": "Acme", "logoPath": null, "logoUrl": null },
      "title": "Frontend Engineer",
      "status": "screening",
      "workMode": "hybrid",
      "seniority": "Senior",
      "updatedAt": "2026-09-08T10:00:00.000Z"
    }
  ],
  "listView": { "mode": "manual", "column": null, "direction": null }
}
```

An unsupported legacy or unknown query status returns the existing bad-request response.

## Read Position Details

`GET /api/positions/:id`

The returned Position includes extended channel metadata:

```json
{
  "position": {
    "id": "pos-001",
    "status": "screening",
    "jobPlatformLinks": [
      {
        "platformName": "LinkedIn",
        "url": "https://example.com/jobs/1",
        "applicationStatus": "viewed",
        "applicationDate": "2026-09-06"
      }
    ],
    "careerPageUrl": "https://company.example/careers/1",
    "careerPageApplicationStatus": "applied",
    "careerPageApplicationDate": "2026-09-05"
  }
}
```

Unchanged Position fields are omitted from this example only for readability.

## Update Position Details

`PATCH /api/positions/:id`

The existing strict detail body adds overall and channel status fields:

```json
{
  "status": "saved",
  "departmentId": null,
  "teamId": null,
  "locationId": null,
  "hiringManager": { "name": "", "phone": "", "position": "" },
  "jobPlatformLinks": [
    {
      "platformName": "LinkedIn",
      "url": "https://example.com/jobs/1",
      "applicationStatus": "applied",
      "applicationDate": "2026-09-08"
    }
  ],
  "careerPageUrl": null,
  "careerPageApplicationStatus": null,
  "careerPageApplicationDate": null,
  "description": { "type": "doc", "content": [{ "type": "paragraph" }] }
}
```

Because a qualifying channel exists while the submitted overall status is Saved, the successful response returns the authoritative position with `status: "applied"`.

### Validation behavior

- Unknown overall or channel statuses are rejected.
- Future or impossible application dates are rejected with field paths.
- Career-page metadata is rejected when `careerPageUrl` is null.
- Unknown body properties are rejected.
- Invalid input uses the existing `UPDATE_INVALID` response family.
- Missing positions continue returning `POSITION_NOT_FOUND`.
- Failed atomic persistence continues returning `POSITION_WRITE_FAILED` and leaves the prior document unchanged.

## Create Position

`POST /api/positions`

The request remains unchanged except that platform links use the extended shape and career-page metadata is accepted with null defaults. The server begins with `status: "saved"`; if the submitted channels already contain Applied, Viewed, or Contacted, the same approved advancement rule returns `status: "applied"`. Clients do not choose the initial overall status directly.

The response returns the complete created Position with the new status and channel metadata.
