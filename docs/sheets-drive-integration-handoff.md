# Google Sheets and Drive integration handoff

## Safety status

- Work is isolated on `sheets-drive-integration`, branched from `backup-before-sheets-integration`.
- No existing page, existing backend file, configuration, or data file was edited or deleted.
- `assets/js/data-service.js` is an additive adapter only. It is not loaded by any page yet, so current behavior should remain unchanged.
- Do not merge this branch into `main` until the Apps Script routes are installed and tested.

## Browser adapter contract

The adapter expects the existing `MOSHAVER_API.request(payload)` helper and uses these future Apps Script actions:

- `records.list`: parameters `entity`, `filters` (JSON string)
- `records.save`: parameters `entity`, `record` (JSON string)
- `records.delete`: parameters `entity`, `recordId`
- `drive.upload`: parameters `fileName`, `mimeType`, `fileDataBase64`, optional `clientId`, `category`

Allowed entity names in this first adapter: `clients`, `appointments`, `followups`, `notes`, `finance`, `activity`.

## Required backend protections

1. Validate the access token on every protected action.
2. Derive the user's organization from the authenticated server-side session; do not trust a browser-supplied organization ID.
3. Resolve that organization's `databaseSpreadsheetId` from the organization registry, then read/write only that spreadsheet.
4. Resolve that organization's Drive folder server-side and store uploads there (or in a verified client subfolder).
5. Validate entity names, record IDs, file size, MIME type, and permissions on the server.
6. Return the existing response envelope (`success`, `data`, `error`) consistently.
7. Test list/create/update/delete and upload/download before wiring the adapter into existing pages.

## Next steps

1. Install and deploy the matching Apps Script routes.
2. Test against a test organization/database first.
3. Wire one screen at a time, starting with clients; remove demo seeding only after the real list endpoint is verified.
4. Migrate appointments, follow-ups, notes, finance, and reports; dashboard/report KPIs should be computed from server-backed records.
5. Keep localStorage only for harmless preferences and session cache, not as the source of business records.
