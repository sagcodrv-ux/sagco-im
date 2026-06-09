# SAGCO IMS Website — Rev.17 Deployment Guide
## Document & Evidence Management Module · June 2026

---

## What's New in Rev.17

| File | Change |
|---|---|
| `style.css` | Complete rewrite — full CSS variable system, all shared classes per Discussion Summary spec |
| `nav.js` | Full hierarchical tree with Document Management node added; hover-collapse spec-compliant |
| `data.js` | Updated TAB_KEYS map; same SHEETS_URL placeholder |
| `document-management.html` | **NEW** — fully IMS-conformant DMS page (sidebar, topbar, KPI cards, sec-banner, tbl-stripe, req-text, alert boxes) |
| `dms-widget.js` | **NEW** — drop-in panel for existing pages; uses shared style.css classes |
| `google-apps-script.js` | Updated — same 48 tabs, unchanged |

---

## Step 1 — Upload to GitHub

1. Go to `https://github.com/sagcodrv-ux/sagco-im`
2. Click **Add file → Upload files**
3. Upload these files:

| File | Action |
|---|---|
| `style.css` | **Replace** existing file |
| `nav.js` | **Replace** existing file |
| `data.js` | **Replace** existing file (SHEETS_URL unchanged — keep your existing URL) |
| `document-management.html` | **New file** |
| `dms-widget.js` | **New file** |
| `google-apps-script.js` | **Replace** existing file |

4. Commit message: `Rev.17 — Document & Evidence Management Module`
5. Wait 1–3 minutes → hard refresh (Ctrl+Shift+R)

---

## Step 2 — Preserve your SHEETS_URL

Before uploading `data.js`, open it and replace the placeholder:

```javascript
var SHEETS_URL = 'https://script.google.com/macros/s/REPLACE_WITH_YOUR_WEBAPPURL/exec';
```

Replace with your existing deployed Apps Script Web App URL.
(You can copy it from your current `data.js` on GitHub.)

---

## Step 3 — Add widget to existing pages (optional)

To show the Document & Evidence panel on any existing IMS page,
add this one line **before `</body>`**:

```html
<script src="dms-widget.js"></script>
```

The widget auto-detects which page it is on and shows only documents
linked to that page. All styling comes from `style.css` — no conflicts.

Recommended pages to add it to first:
- `documentation.html`
- `capa-register.html`
- `hira.html`
- `sea-register.html`
- `policies.html`

---

## Step 4 — Link documents to pages

When adding a document, the **Linked IMS Pages** field accepts
comma-separated page names (without `.html`):

```
hira, sea-register           ← shows on both pages
capa-register                ← shows on CAPA page only
index, energy, policies      ← shows on three pages
```

---

## Role system

| Role | Permissions |
|---|---|
| `viewer` | Read-only — view all documents |
| `contributor` | Add new documents |
| `editor` | Add + edit documents and revision notes |
| `admin` | Full access — also archive, restore, view Recycle Bin |

Click the **role pill** (● viewer) in the sec-banner to change role for your session.
Roles are session-only (sessionStorage) — reset on tab close.

---

## Document & Evidence features

| Feature | Detail |
|---|---|
| Add / edit documents | Full metadata: title, number, rev, type, issued, review due, owner, status, linked pages |
| Revision control | Each edit creates a revision history entry with date, role, and change note |
| File attachments | Upload and list files per document (metadata only on static site — files stored as names) |
| Soft delete | Documents moved to Recycle Bin — never permanently deleted — admin can restore |
| Review due alerts | Overdue highlighted red; ≤90 days amber; alert box shown if any overdue |
| CSV export | Exports all active documents with full metadata |
| Search + filter | Full-text search + filter by type, status, linked page |
| Sort | Click any column header to sort ascending / descending |
| Status auto-badges | Active → green · Under Review → amber · Obsolete → red · Archived → grey |
| Audit log | Every add / edit / archive / restore / file update logged with timestamp and role |

---

## Data storage

Documents are stored in **browser localStorage** (`sagco_dms_store`).
This means:
- ✅ Persists across page refreshes and browser restarts
- ✅ Shared between all IMS pages on the same browser
- ❌ Not shared between different computers or users

**For multi-user production:** Connect to Google Sheets by replacing
`getAll()` / `saveAll()` in `document-management.html` and `dms-widget.js`
with fetch calls to the same Apps Script Web App, using a new `documents` tab
in the Google Sheets database.

---

*SAGCO IMS Rev.17 · June 2026 · IMS Coordinator*
*Standards: ISO 9001 §7.5 · ISO 14001 §7.5 · ISO 45001 §7.5 · ISO 50001 §7.5*
