# Guestbook Apps Script Update

The Vercel proxy in `api/guestbook.js` already sends the guestbook IP as a
separate field. To make Google Sheets store and display guestbook rows
correctly, the remote Google Apps Script project must be updated too.

Files:

- Source to paste into Apps Script: `scripts/guestbook-apps-script.gs`
- Local admin viewer: `scripts/guestbook-admin.ps1`

Sheet layout:

- `ts`
- `name`
- `msg`
- `ip`

Display behavior:

- The `ts` column is stored as a real spreadsheet date, not plain Unix
  milliseconds.
- The spreadsheet timezone is forced to `Asia/Seoul`.
- The display format is `2026년 3월 14일 11시 22분 33초`.
- Legacy rows that still contain Unix milliseconds such as `1773480009254` are
  automatically converted to readable spreadsheet dates after redeploy.
- The public API still converts that value back to a Unix millisecond timestamp
  for the wedding site and admin tools.

Apply steps:

1. Open the current Google Apps Script project connected to the guestbook sheet.
2. Replace the existing `doGet` / `doPost` code with the content of
   `scripts/guestbook-apps-script.gs`.
3. Make sure the connected spreadsheet uses the sheet name `guestbook`.
4. In Apps Script, set a Script Property named `GUESTBOOK_ADMIN_KEY` to a random
   secret string.
5. Redeploy the web app.
6. If the web app URL changes, update `APPS_SCRIPT_GUESTBOOK_ENDPOINT` in
   `api/guestbook.js`.

Notes:

- Public `action=list` responses do not expose IP addresses.
- Admin-only `action=listAdmin&adminKey=...` responses include the `ip` field.
- Existing `__GBV1__...` rows remain readable after the update.
- The local admin script can use the same key through
  `$env:GUESTBOOK_ADMIN_KEY` or `-AdminKey`.
