/* ═══════════════════════════════════════════════════════════════

   SAGCO IMS — Google Apps Script

   google-apps-script.js  |  Rev.20  |  02 July 2026

   CHANGES IN Rev.20:
   - writeRows()        — Excel import writes to any register
   - scanAlerts()       — proactive alert engine (all 62 sheets)
   - searchRows()       — row-level content search
   - callClaude()       — proxies Anthropic API (key in Script Properties)
   - doGet/doPost       — new routing for all 4 functions

   SETUP FOR callClaude():
   Apps Script editor → Project Settings → Script Properties
   Add:  ANTHROPIC_API_KEY  =  sk-ant-api03-...your key...

   DEPLOYMENT INSTRUCTIONS:

   1. Open Google Sheet → Extensions → Apps Script
   2. Delete all existing code → paste this entire file
   3. Click Save
   4. Run testAllTabs() to verify all sheet names match
   5. Run testNewFunctions() to verify Rev.20 additions
   6. Deploy → New deployment → Web App
      - Execute as: Me
      - Who has access: Anyone
   7. Copy Web App URL → paste into SHEETS_URL in data.js
      and into SHEETS_URL in copilot_v2.html
   8. Upload updated files to GitHub

   CRITICAL: Never run doGet() from the editor Run button.
   Always use testAllTabs() or testNewFunctions() for testing.

═══════════════════════════════════════════════════════════════ */

/* ── Google Drive folder for IMS attachments ────────────────── */
var DRIVE_FOLDER_ID = '1PZQ2VLPg8548BIgbrfqg4mcojKE7J7lU';

/* ── Observations (AppSheet) — external spreadsheet ─────────────
   This is a SEPARATE Google Sheet, owned by the same Google account
   this script runs under but not the IMS sheet itself — it's the
   live backend behind the shop-floor QR-code observation system
   (AppSheet). We read it directly with SpreadsheetApp.openById()
   rather than getActiveSpreadsheet(), since it's a different file.
   Read-only from this script — nothing here ever writes back to it,
   so the AppSheet app's own intake flow is never touched.

   Unlike the IMS sheet (title rows 1-2, headers row 3), this is a
   plain AppSheet export: headers are in ROW 1, data starts ROW 2.
   See readExternalSheet() below, which uses that row offset instead
   of readSheet()'s row-3 offset. */
var OBS_SPREADSHEET_ID = '1fw-fmS2qQJuHaNSaXRoKRjwirpORKrP5i3TbbKnVW-4';
var OBS_TABS = {
  'obs_main':       'Main',             /* 390+ case rows — the core observation log */
  'obs_qr':         'QR Codes',         /* qr_code_id -> location text */
  'obs_acceptance': 'Acceptance',       /* case_ids that have been reviewed & accepted */
  'obs_rejection':  'Rejection',        /* case_ids that have been reviewed & rejected */
  'obs_risk':       'Risk Assessment',  /* case_id -> recurrence flag + risk levels */
  'obs_photo':      'photo',            /* case_id -> Drive path of the worker's submitted photo */
};

/* ── Overdue-CAPA notification config ────────────────────────
   auth.js's user directory (names/emails/roles) lives only in each
   person's own browser localStorage — this server-side script has
   no access to it. So: (a) an NCR owner's email must be captured
   directly on the CAPA row (see the wizard's new "Owner Email"
   field), not looked up from a name, and (b) the IMS Manager
   recipient list is a plain, manually-edited array here. Add every
   real IMS Manager's email who should get the weekly overdue digest. */
var IMS_MANAGER_EMAILS = ['imsmanager@sagco.com.sa']; /* TODO: confirm/replace with the real address(es) */

/* ── Sheet name map ─────────────────────────────────────────── */
var TABS = {

  /* Document Management + Admin */
  'documents':       'Document Register',
  'users':           'User Register',
  'audit_log':       'Access & Audit Log',

  /* Clause 4 */
  'context':         'Context',
  'pestle':          'PESTLE-SWOT',

  /* Clause 5 */
  'policies':        ' Policies',
  'worker_part':     ' Worker Part.',
  'policy_ack':      '✍ Policy Ack',
  'gemba_walks':     ' Gemba Walks',
  'steering_team':   ' ST Minutes',
  'enms_champion':   '⚡ EnMS Champion',
  'ceo_records':     ' CEO Records',
  'comms_matrix':    ' Comms Matrix',

  /* Clause 6 */
  'risks':           '⚠ Risk Register',
  'compliance':      '⚖ Compliance',
  'methodology':     ' Methodology',
  'objectives':      ' Objectives',
  'moc':             ' MOC',
  'energy':          '⚡ Energy',
  'hira':            '⚠ HIRA',
  'sea':             ' SEA Register',
  'bribery_risk':    ' Bribery Risk',
  'ghg_inventory':   ' GHG Inventory',
  'scope3':          ' Scope 3',

  /* Clause 7 */
  'competency':      ' Competency',
  'training':        ' Training',
  'training_attend': '✅ Train Attend',
  'induction':       ' Induction',
  'documentation':   ' Documentation',
  'calibration':     ' Calibration',

  /* Clause 8 */
  'ptw_register':    'ptw_register',
  'ptw_authorized_issuers': 'ptw_authorized_issuers',
  /* Rev.19 (Issam, voice, 2026-11-08) — PTW approval chain, step 2.
     ptw_area_managers: one row per Area, with that area's manager name
     and email — looked up by the permit's own Area when it's
     submitted. ptw_controllers: a shared list, name + email + Record
     Status; every active controller is emailed, and whichever one acts
     first takes the approval. Same literal-tab-name convention as the
     other ptw_* tabs above, not the "54d – description" pattern used
     elsewhere in this map. */
  'ptw_area_managers': 'ptw_area_managers',
  'ptw_controllers':   'ptw_controllers',
  'location_zones':  'Locations - Zones (Tier 1)',
  'emergency':       '34b – Emergency Response',
  'contractor':      '35 – Contractor Register',
  /* Rev.12 (Issam, 2026-10-15) — new tab, sub-numbered off the
     existing Contractor Register (same "34b" convention as
     'emergency' above). One row per contractor compliance review:
     CR / Civil Defense-municipal license / insurance / HSE induction
     expiry, each watched by its own DATE_RULES entry below with its
     own independent warning threshold (30/30/30/7 days) rather than
     one shared threshold for all four. */
  'contractor_compliance': '35b – Contractor Compliance Log',
  'loto_register':   '37 – LOTO Register',
  'loto_auth':       '70 – LOTO Authorised Persons',
  'loto_devices':    '71 – LOTO Device Register',
  'loto_station_audit': '72 – LOTO Station Audit Log',
  /* 'confined_space': '38 – Confined Space Log' — SUPERSEDED single-table plan, no longer
     used by confined-space.html (which now reads cs_register + cs_entry below). Left here
     only so nothing else that may reference 'confined_space' breaks; Sheet 38 can be
     repurposed or retired once confirmed unused elsewhere. */
  'confined_space':  '38 – Confined Space Log',
  'cs_register':     '73 – CS Site Register',
  'cs_entry':        '74 – CS Pre-Entry Atmos Test',
  'heat_stress':     '39 – Heat Stress WBGT Log',
  /* 'scaffold' below is the OLD generic placeholder tab (plain ID/
     Description/Date/Status/Owner/Reference columns, no real HSE-FRM-09
     checklist fields) — left untouched so nothing else that may still
     reference it breaks, same reasoning as 'confined_space' above.
     scaffold-inspection.html's real bilingual HSE-FRM-09 register reads
     'scaffold_inspection' instead, pointed at its own tab. */
  'scaffold_inspection': 'Scaffold Inspection',
  /* 'fire_pump' below is the OLD generic placeholder tab (no real
     HSE-FRM-11/HSE-FRM-12 checklist fields) — left untouched so
     nothing else that may still reference it breaks, same reasoning
     as 'confined_space' and 'scaffold' above. fire-pump.html's real
     four-scenario register (Diesel/Electrical × Daily/Monthly) reads
     'fire_pump_log' instead, pointed at its own tab — dropping
     numbered-sheet naming for the same reason as 'scaffold_inspection'. */
  'fire_pump_log':    'Fire Pump Log',
  // Rev.38 (Issam, voice, 2026-11-15) — two new standalone inspection
  // registers, both regular/periodic rather than PTW-triggered (see
  // machine-safeguarding.html and compressed-gas-inspection.html):
  // machine guarding is fixed equipment checked on a schedule, and
  // compressed-gas storage is likewise a routine log — Hot Work's own
  // checklist already covers cylinders actually in use for welding,
  // so this is specifically about ongoing storage/handling, not a
  // second PTW checklist.
  'machine_safeguarding':      'Machine Safeguarding Inspection',
  'compressed_gas_inspection': 'Compressed Gas Inspection',
  // Rev.41 (Issam, voice, 2026-11-16) — two more standalone periodic
  // registers, picked from the CAMP01 gap list as genuine shop-floor
  // checks rather than office paperwork.
  'harness_fall_protection':   'Harness Fall Protection Inspection',
  'fire_protection_systems':   'Fire Protection Systems Testing',
  // Rev.44 (Issam, voice, 2026-11-16) — last three shop-floor registers
  // from this gap-review pass: security rounds, the eyewash/shower
  // flush (weekly default per ANSI Z358.1, flagged on the page itself
  // as unconfirmed against SAGCO's own MODON 3.6.1 text), and a
  // pre-use check for vehicles/mobile equipment other than forklifts
  // and cranes, which already have their own checks.
  'security_patrol':           'Security Patrol',
  'eyewash_shower_testing':    'Eyewash Shower Flush Testing',
  'vehicle_preuse_inspection': 'Vehicle Pre-Use Inspection',
  'fe_master':        'FE Master Inventory',
  'fe_inspection_log': 'FE Monthly Inspection Log',
  'fe_service_log':    'FE Annual Service Log',
  'fire_pump':       '41 – Fire Pump Test Log',
  /* Rev.13 (Issam, 2026-10-15) — 'oh_surveillance' below is now the
     round-by-round SURVEILLANCE LOG for oh-surveillance.html (one row
     per round per programme line, carrying the "Next Due" field the
     DATE_RULES entry below already watches — unchanged, since that
     reminder was already correctly pointed at this exact tab before
     this register existed). 'oh_programme' is new: the hazard-to-test
     matrix (one row per OHS-0x line — who's tested for what, how
     often), dropping numbered-sheet naming for the same reason as
     'crane_checklist' / 'fak_inspection' / 'contractor_compliance'.
     Both tabs hold COUNTS and DATES only — no names, employee IDs, or
     individual medical results (Saudi PDPL — health data is
     sensitive); see oh-surveillance.html's own privacy banner. */
  'oh_surveillance': '42 – OH Surveillance Register',
  'oh_programme':    '42b – OH Surveillance Programme',
  'scaffold':        ' Scaffold',
  'ndt_permits':     '☢ NDT Permits',
  /* Rev.14 (Issam, 2026-10-17) — 'chemical_inv' below replaces the
     unbuilt placeholder sheet name with the real one now that
     chemical-inventory.html exists: the Stores master list, scoped to
     EXACTLY the 40 items on Issam's OL_100126 stock sheet (no batch-
     house raw materials or decorative coatings added). 'chemical_sds_log'
     is new: one row per SDS review event, dropping numbered-sheet
     naming for the same reason as 'oh_programme' / 'contractor_compliance'. */
  'chemical_inv':    '44 – Chemical Inventory Register',
  'chemical_sds_log':'44b – SDS Review Log',
  /* Rev.17 (Issam, 2026-10-18) — 'chemical_stock_monthly' is new: one
     row per CALENDAR MONTH (not per item), holding a full JSON snapshot
     of every chemical item's quantity at that point in time in an
     'Items JSON' column. This avoids needing a new sheet column every
     time an item is added to chemical_inv — the item list inside each
     month's JSON payload is whatever was current in Chemical Inventory
     when that month's record was created or last edited. Past months
     are never rewritten when new items are added later. */
  'chemical_stock_monthly':'44c – Monthly Stock Count',
  'crane_lifting':   ' Crane Lifting',
  /* Rev.10 (Issam, 2026-10-14) — 'crane_lifting' above is now the
     EQUIPMENT MASTER list for crane-lifting.html (one row per crane/
     lifting item, carrying the 3rd-party certificate's "Next
     Inspection Due" that DATE_RULES below already watches).
     'crane_checklist' is new: one row per HSE-FRM-18 pre-use
     inspection event, dropping numbered-sheet naming for the same
     reason as 'scaffold_inspection' / 'fire_pump_log'.
     Rev.20 (Issam, 2026-11-10) — crane-inspection.html now exists and
     reads this tab; it was reserved here on Rev.10 but no page read it
     until now. Links to the PTW Register by Permit ID, same pattern
     as Confined Space / LOTO. */
  'crane_checklist': 'Crane Inspection Checklist',
  /* Rev.11 (Issam, 2026-10-14) — First Aid Kit Register (master list
     of physical kit/box locations, one row per kit, carrying "Next
     Inspection Due" for the monthly reminder below) + First Aid Kit
     Inspection Log (one row per kit per monthly round, digitising
     HSE-FRM-14). Dropping numbered-sheet naming, same reason as
     'scaffold_inspection' / 'fire_pump_log' / 'crane_checklist'. */
  'fak_register':    'First Aid Kit Register',
  'fak_inspection':  'First Aid Kit Inspection Log',
  /* Rev.12 (Issam, 2026-10-15) — the 14 supply items' minimum required
     quantities were originally hardcoded in first-aid-kit.html from
     HSE-FRM-14's printed column, with no way to adjust them without a
     code change. Per Issam's request, this tab makes the minimum a
     single global, user-editable standard (same minimum for every
     kit — not per-kit) via the page's own "Edit Minimum Standards"
     control; the hardcoded form values remain as the fallback default
     whenever this tab is empty or missing a given item's row. */
  'fak_standards':   'First Aid Kit Item Standards',
  'waste_mgmt':      '45b – Waste Management',
  'chemical_store':  '46 – Chemical Storage',
  'furnace_monitor': '47 – Furnace Monitoring Logs',
  'meps':            '48 – MEPS Compliance Register',
  'product_release': '49 – Product Release Records',
  'nonconforming':   '50 – Nonconforming Products',
  'incoming_insp':   '51 – Incoming Inspection',
  'customer_reg':    '52 – Customer Register',
  'inprocess_insp':  '53 – In-Process Inspection Log',

  /* Clause 9 */
  'kpi_dashboard':   ' KPI Dashboard',
  'compliance_eval': '⚖ Comp. Eval.',
  'audit_programme': ' Audit Prog.',
  'mgmt_review':     ' Mgmt Review',

  /* Clause 10 */
  'capa':            ' CAPA Register',
  'capa_log':        'CAPA Progress Log', /* NEW — must be created as a real tab on the live sheet; row 3 headers: Log ID, CAPA ID, Date, Note, Photo URL, Logged By, Status Change */
  'notifications':  'Notifications', /* NEW — must be created as a real tab; row 3 headers: Notification ID, Recipient Email, CAPA ID, Message, Date Created, Read */
  'incidents':       ' Incidents',

  /* ESG */
  'supplier_esg':    ' Supplier ESG',
  'coi':             ' CoI Register',
  'gifts':           ' Gifts',
  'diversity':       ' Diversity',
  'tpdd':            ' TPDD',
  'water_waste':     ' Water & Waste',
  'supplier_scoc':   ' Supplier SCoC',
  'mock_drill': 'mock drill',

  /* New Safety & ESG Programmes — Rev.19 */
  'ppe_register':      '54 – PPE Register',
  /* Rev.18 (Issam, 2026-10-19) — 'ppe_register' above is the PPE
     Requirements per Work Area compliance log (unchanged). These three
     are new, migrated from the real HSE_Department.xlsm / PPE
     Issuance Log.xlsx: general PPE (gloves, ear plugs, etc.) is
     already managed for quantity in the ERP, so the portal does NOT
     duplicate a general-PPE stock count — it only logs issuance
     events, matching the dropped 'inventory redundancy' Issam
     specifically ruled out. Safety Shoes are the one exception: the
     ERP store count is carried in here as a BASELINE the portal then
     works forward from (baseline qty + baseline date, remaining =
     baseline minus every issuance dated after it), the same
     baseline-and-deduct pattern as 'chemical_stock_monthly' above,
     because shoes need a running remaining balance the way general
     PPE does not. */
  'ppe_issuance_dept':   '54b – PPE Issuance (Dept)',
  'ppe_issuance_indiv':  '54c – PPE Issuance (Individual)',
  'ppe_shoes_stock':     '54d – Safety Shoes Stock',
  /* Rev.19 (Issam, 2026-11-07) — Safety Shoes material reception log,
     the fourth tab on ppe-issuance.html. Descriptive name with NO sheet
     number, per the convention adopted after the Scaffold Inspection
     sheet-number collision (see CP-107). Columns: Record ID, Date,
     Item Code, Qty Received, Delivery Ref, Received By, Record Status. */
  'ppe_shoes_received':  'Safety Shoes Received',
  /* Rev.19 (Issam, 2026-10-20) — Shift Area Safety Inspection
     (HSE-FRM-06). Tab name deliberately has NO sheet number, per the
     convention adopted after the Scaffold Inspection sheet-number
     collision (see CP-107): descriptive tab names only for any new
     register going forward, to avoid a repeat collision with an
     existing numbered sheet. One flat table, one row per inspection
     event (3 checklist sections + accident/PPE-violation/other-
     observation free text) — see area-inspection.html for the full
     29-column schema and the printable Area Inspection Slip / Summary
     Report built on top of this same data, no extra tab needed. */
  'area_inspection':   'Area Inspection',
  /* Rev.21 (Issam, 2026-10-20) — Waste Management Register
     (HSE-FRM-07 General Waste + Food Waste contractor invoices). Same
     no-number tab-name convention as Area Inspection above. One flat
     table across both live streams (General Waste, Food Waste) plus 6
     proposed-but-not-yet-tracked streams listed on the page for
     Issam's review (Cullet/Glass Scrap, Hazardous/Chemical, Scrap
     Metal, Wood/Packaging, Used Oil, E-Waste). FLAGGED: this register
     sits under OC-01 here per direct instruction, but the project's
     own IMS taxonomy places "Waste Management Register" under OC-02
     Environment & Energy (Sheet 45b) — see waste-management.html's
     on-page flag text for the doc-code discrepancy this needs
     resolving (L4-ENV-PR-03-RC-01 vs the L3-ENV-PR-05 family). */
  'waste_management':  '45b – Waste Management', // Rev.23 (Issam, 2026-10-29): corrected to match the REAL existing live-sheet tab name (confirmed by screenshot) — was wrongly assumed to be the no-number "Waste Management" per the Area Inspection/Scrap Sales convention. The tab also confirms doc code L4-ENV-PR-03-RC-01, resolving the earlier two-code ambiguity.
  /* Rev.22 (Issam, 2026-10-20) — Scrap Sales Register
     (SCRAP_SALES-2026.xlsx). Same no-number tab-name convention. One
     flat table, one row per (gate-pass, material) line — a single
     gate-pass can carry more than one material, so 626 migrated
     lines cover fewer actual gate-passes. Same OC-01/OC-02
     classification flag as Waste Management above — see
     scrap-sales.html's on-page flag text. */
  'scrap_sales':       'Scrap Sales',
  /* Rev.29 (Issam, 2026-11-01, voice) — Customer and Material master
     lists for scrap-sales.html's Monthly Entry Form, replacing the old
     per-browser localStorage custom-column list. ⚠ Neither tab exists
     yet in the live Google Sheet — create both (header rows matching
     scrap-sales.html's CUSTOMERS_TAB/MATERIALS_TAB field names exactly)
     before "👥 Customers" / "📦 Materials" or the monthly form's
     dropdowns will have anything to show. See SAGCO_Scrap_Sales_Reference.xlsx
     for the pre-filled starting lists (from the same 626 historical lines). */
  'scrap_customers':   'Scrap Customers',
  'scrap_materials':   'Scrap Materials',
  /* Rev.24 (Issam, 2026-10-29) — Fuel Delivery (Diesel/HFO) Spill
     Prevention Checklist (HSE-FRM-XX, proposed L4-ENV-PR-05-CL-02),
     OC-02 Environment & Energy — a web version of the paper checklist
     drafted this session. ⚠ This tab does NOT exist yet in the live
     Google Sheet — create a tab named exactly as below, with a header
     row matching the fields the page writes (see
     fuel-delivery-spill.html), before this tabKey will work. */
  'fuel_delivery_spill': 'Fuel Delivery Spill Prevention',
  /* OC-02 Chemical Storage & Spills — added as two new sections on the
     existing chemical-inventory.html page (not a standalone page).
     ⚠ Neither tab exists yet in the live Google Sheet — create both
     (header rows matching the fields each section writes — see
     chemical-inventory.html) before these two tabKeys will work. */
  'chemical_storage_conditions': 'Chemical Storage Conditions',
  'chemical_spill_records':      'Chemical Spill Records',
  /* OC-01 HSE Violation Register (HSE-FRM-05, L3-HSE-PR-16-F-03) —
     ⚠ tab does not exist yet in the live Google Sheet — create it
     (header row matching the fields violation-register.html writes)
     before this tabKey will work. Contains named-employee disciplinary
     data — restrict sheet sharing accordingly. */
  'hse_violations': 'HSE Violations',
  'wah_register':      '55 – WAH Register',
  /* 'hot_work' below is the OLD generic placeholder tab (no real
     checklist fields) — left untouched so nothing else that may still
     reference it breaks, same reasoning as 'confined_space' /
     'scaffold' / 'fire_pump' above. hot-work.html's real single-day
     Pre/Execution/Post/Closure checklist (SAGCO Hot Work Checklist,
     Rev.00, 24-Nov-2025) reads 'hot_work_checklist' instead, pointed
     at its own tab, dropping numbered-sheet naming for the same
     reason as 'scaffold_inspection' / 'fire_pump_log' / 'crane_checklist'.
     Rev.20 (Issam, 2026-11-10) — links to the PTW Register by Permit
     ID, same pattern as Confined Space / LOTO / crane_checklist. */
  'hot_work':          '56 – Hot Work Log',
  'hot_work_checklist': 'Hot Work Checklist',
  // Rev.27 (Issam, voice, 2026-11-12) — three new short checklists,
  // each linked to the PTW Register by Permit ID, same pattern as
  // crane_checklist / hot_work_checklist / scaffold_inspection above.
  // No numbered-sheet naming, for the same reason those three already
  // dropped it. Add each tab with this exact name on the live sheet.
  'painting_checklist':   'Painting Checklist',
  'civil_work_checklist': 'Civil Work Checklist',
  'pipeline_checklist':   'Pipeline Checklist',
  'electrical_safety': '57 – Electrical Safety Log',
  'furnace_leakage':   '58 – Furnace Leakage Log',
  'first_aid':         '59 – First Aid Records',
  'forklift_log':      '60 – Forklift Log',
  'visitor_register':  '61 – Visitor Register',
  'speak_up':          '62 – Speak-Up Register',
  'obs_escalations':   '63 – Observation Escalations', /* NEW — must be created as a real tab on the live sheet; row 3 headers: Case ID, Outcome, Incident Reference, Action Reference, Close Reason, Decided By, Decided Date. Durable record of what happened to each Observation Register case (Forwarded to Incident Register / Forwarded to Action Tracker / Closed - No Escalation) — on the MAIN IMS sheet (read/write via the standard readSheet/writeRows/updateRowById), NOT the separate read-only AppSheet Observations spreadsheet. Observation Register, Incident Register, and the CAPA wizard all read/write this tab by Case ID. */
  /* Rev.30 (Issam, 2026-11-01, voice) — Furnace Energy Consumption
     (OC-02 Environment & Energy), separate from 'furnace_monitor'
     (Sh.47, temperatures/process readings) — this tab is fuel-to-
     output only: monthly HFO consumption vs. melted glass per
     furnace. Same no-number tab-name convention as Area Inspection /
     Scrap Sales / Waste Management. One flat table, one row per
     FURNACE-MONTH (not per day) — daily figures, when the furnace
     team chooses to enter them, are kept inside that one row as a
     JSON array in the "Daily Entries (JSON)" column, so a month can
     be filled in day-by-day or in one bulk entry without changing
     the record structure. See furnace-energy.html for the full
     column schema. ⚠ This tab does NOT exist yet in the live Google
     Sheet — create it (header row matching the fields
     furnace-energy.html writes) before this tabKey will work. */
  'furnace_energy':    'Furnace Energy Consumption',
  /* Rev.31 (Issam, 2026-11-01, voice; Water section added 2026-11-02)
     — Energy Invoices (OC-02 Environment & Energy). Collects every
     energy AND water invoice — Electricity, LPG, Diesel, Fuel Oil
     (HFO), and Water — entered by Finance. Same one-record-per-MONTH
     pattern as 'furnace_energy', but with FIVE sections inside one
     monthly row (one per type) instead of one. Each of the first four
     sections independently holds either typed totals (quantity +
     amount) or a JSON array of individual invoice lines (invoice no.,
     date, supplier, account/feeder for Electricity and LPG, quantity,
     amount) that the page sums automatically — Finance can use
     whichever level of detail they have for a given month. The Water
     section is deliberately simpler, at Issam's explicit request: just
     a typed total quantity (m³) and total amount (SAR) per month, no
     source/tanker/network field and no invoice-line breakdown beyond
     that (it still gets the same Lines/Attachments JSON columns as
     the other four for schema consistency, but Lines stays an empty
     array in normal use). Scanned invoice files go through the SAME
     'uploadFilePicker' Drive endpoint already used by violation-
     register.html / loto-register.html / chemical-inventory.html (no
     script changes needed) — multiple files per type per month, filed
     under a subfolder per Record-ID+type; their Drive links are kept
     in a JSON array per section, e.g. "Water Attachments (JSON)". See
     energy-invoices.html for the full column schema. ⚠ This tab does
     NOT exist yet in the live Google Sheet — create it (header row
     matching the fields energy-invoices.html writes, now including
     the Water Lines/Total Quantity/Total Amount/Attachments columns)
     before this tabKey will work. */
  'energy_invoices':   'Energy Invoices',
  /* Rev.33 (Issam, 2026-11-02, voice) — Visitor & Contractor Induction
     / Gate Clearance (OC-01 Safety & Emergency). SIMPLIFIED from the
     original Rev.32 four-tab design down to TWO tables, per Issam:
     - vc_persons: ONE ROW PER PERSON — now holds their own details
       AND their latest gate visit in the same row (no separate visit-
       history table: "once he got the induction and got his PPE,
       what's the use to see historical data"). A returning visitor's
       row is updated in place, not re-created. Induction state (Not
       Inducted / Inducted, date, method, by whom) uses the same
       1-year computed-client-side validity as before. PPE is now a
       plain "PPE Confirmed" Yes/No plus "PPE Confirmed Date" — no
       department PPE-items list in the system at all; the security
       guard judges what's needed from a PRINTED guide kept in the
       security room. A PPE Confirmed Date other than today is treated
       as not-yet-confirmed, so it can never silently carry over from
       a past visit.
     - vc_spotchecks: ONE ROW PER IN-PLANT SPOT CHECK — kept as its
       own table (the only place visit-by-visit history now lives),
       because this is where PPE trends and violation escalation
       actually need it. A failed spot check can be escalated with one
       click to the existing HSE Violation Register
       (violation-register.html) — opened with the essentials in the
       URL query string; Issam already has that page and its own form
       for the violation record itself, so no new violation-handling
       logic was added here, and nothing in violation-register.html
       reads these params yet (small separate follow-up if wanted).
     The 'vc_visits' and 'vc_ppe_config' tabs from Rev.32 are NO
     LONGER USED — do not create them (or ignore/delete if already
     created). QR codes are generated client-side (cdnjs qrcodejs)
     encoding the Person ID only; scanning uses cdnjs jsQR against the
     device camera. See visitor-induction.html for the full column
     schema of both tabs. ⚠ Neither tab exists yet in the live Google
     Sheet — create both (header rows matching the fields
     visitor-induction.html writes) before this feature will work. */
  'vc_persons':        'VC Persons',
  'vc_spotchecks':     'VC Spot Checks',
  /* Rev.34 (Issam, 2026-11-02, voice) — Water Quality Lab Register
     (OC-02 Environment & Energy). Built as the WATER half of the
     planned "Water & Waste Data" scope item (Sh.30); Air Emissions is
     still a separate, unbuilt part of that same item. ONE ROW PER LAB
     TEST (Issam: "for each lab test, we should have only one
     record"), entered by the Environmental team (exact members TBD).
     Specification limits (pH, conductivity, TDS, turbidity, residual
     chlorine, total hardness, total iron, nitrate, nitrite, and the
     three microbiological results) are Kindasa Laboratory's own
     min/max, taken directly off their Potable Water Analysis Customer
     report. The in/out-of-spec status is NEVER stored as a column —
     it is computed live in the browser from whatever is currently in
     the sheet (Issam: "it should be live based on the data entry...
     based on the value existing on the Google data sheet"), so
     correcting a value updates the flag automatically on next load.
     See water-quality.html for the full column schema. ⚠ This tab
     does not exist yet in the live Google Sheet — create it (header
     row matching the fields water-quality.html writes) before this
     feature will work. */
  'water_quality':     'Water Quality Lab Register',
  /* Rev.35 (Issam, 2026-11-02) — Forklift Inspection Register (OC-01
     Safety & Emergency). Built from scaffold-inspection.html's own
     template — same one-table, one-record-per-inspection design and
     Escalate-to-Action mechanism — digitising the source Monthly
     Forklift Inspection Checklist (HSE Department): one record per
     forklift per month, entered and reviewed entirely by HSE, with a
     flat 13-item Ok/No checklist (Fork, Tire, Propane Cylinder,
     Controller & Brake, Mirror & Alarm, Hydraulic Device, Lamp,
     Counter Weight, Lift System, 3rd-Party Certification, Operator
     Competency, Fire Extinguisher, Others). GREEN tag = all items Ok;
     RED tag = one or more No. A flagged inspection escalates to the
     Action Register exactly like Scaffold Inspection does (Rev.16 in
     capa-wizard.js, the 13th escalation source). ⚠ The source
     checklist is bilingual (EN/AR); no Arabic OCR was available to
     verify the scanned original's Arabic wording, so the printable
     checklist this page generates is English-only — see the note on
     the print form itself. See forklift-inspection.html for the full
     column schema. ⚠ This tab does NOT exist yet in the live Google
     Sheet — create it (header row matching the fields
     forklift-inspection.html writes) before this feature will work. */
  'forklift_inspection': 'Forklift Inspection',
  /* Rev.36 (Issam, 2026-11-02) — Air Emissions Monitoring (OC-02
     Environment & Energy), the Air half of Sh.30's originally-planned
     "Water & Waste Data" item (the Water half is Water Quality Lab
     Register, above). Three separate annual-campaign tabs, one page
     (air-emissions.html):
       - stack_emissions: one record per stack per campaign. Only
         Particulate Matter (PM) is ever reported at the chimney (US
         EPA Method 3A/5) — confirmed against two real EMCO campaigns
         covering all 5 furnace stacks (Dec-2024 and Apr-2026).
       - boundary_air_quality: one record per campaign per location
         (Unit 1,2,3,4 / Furnace 5 / ACL) — the 6 NCEC ambient
         parameters (NO2, CO, SO2, O3, PM2.5, PM10), checked against
         the same national limits regardless of where the station
         sits.
       - noise_monitoring: one record per boundary measurement point
         per campaign — Day/Night LAeq against NCEC's 70/65 dB(A).
     All three are live-computed exactly like Water Quality (status
     never stored, only the entered numbers are), with a reading at
     80% of its limit or higher flagged as a Warning even though it
     still technically passes. No CAPA/Action Register escalation on
     any of the three, matching Water Quality's own design — these are
     monitoring records, not an inspection-finding workflow. ⚠ None of
     these three tabs exist yet in the live Google Sheet — create all
     three (headers matching air-emissions.html's field lists) before
     this feature will work. */
  'stack_emissions':      'Stack Emissions',
  'boundary_air_quality': 'Boundary Air Quality',
  'noise_monitoring':     'Noise Monitoring',
};

/* ══════════════════════════════════════════════════════════════
   MAIN ROUTER — doGet
══════════════════════════════════════════════════════════════ */
function doGet(e) {

  var action = e.parameter.action || 'read';

  /* ── File picker HTML ─────────────────────────────────────── */
  if (action === 'picker') {
    var docId    = e.parameter.docId    || '';
    var username = e.parameter.username || 'unknown';
    var html     = buildPickerHtml(docId, username);
    return HtmlService.createHtmlOutput(html)
      .setTitle('SAGCO IMS — Upload File')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  }

  /* ── Standard JSON API ────────────────────────────────────── */
  var output = ContentService.createTextOutput();
  output.setMimeType(ContentService.MimeType.JSON);

  try {
    var result;

    switch (action) {

      /* ── Rev.20 new routes ──────────────────────────────── */
      case 'scanAlerts':
        result = scanAlerts();
        break;

      case 'search':
        result = searchRows(e.parameter.tab, e.parameter.q || '');
        break;

      /* ── Existing routes ────────────────────────────────── */
      case 'read':
        if (e.parameter.tab === 'dms_docs' || e.parameter.tab === 'all') {
          result = readAllDocumentsForWidget();
        } else {
          result = readSheet(e.parameter.tab);
        }
        break;

      /* Observations (AppSheet) — separate spreadsheet, read-only.
         e.g. ?action=readObs&tab=obs_main */
      case 'readObs':
        result = readExternalSheet(e.parameter.tab);
        break;

      /* Observations photo — fetches the worker-submitted photo(s) for
         one case_id from the shared AppSheet images folder, inline as
         a base64 data URI (see getObsPhotos() for why).
         e.g. ?action=getObsPhotos&caseId=CASE-20251124-9bf10002 */
      case 'getObsPhotos':
        result = getObsPhotos(e.parameter.caseId);
        break;

      case 'readDoc':          result = readDocument(e.parameter.docId);          break;
      case 'listFiles':        result = listDocumentFiles(e.parameter.docId);     break;
      case 'listVersions':     result = listVersions(e.parameter.docId);          break;
      case 'listAllVersions':  result = listAllVersions();                        break;
      case 'saveVersion':      result = saveVersion(e.parameter);                 break;
      case 'saveDocumentRecord': result = saveDocumentRecord(e.parameter);        break;
      case 'writeDoc':         result = writeDocument(e.parameter);               break;

      case 'deleteAttachment':
        result = deleteAttachmentFromSheet(e.parameter.fileId, e.parameter.docId);
        break;

      case 'uploadFilePicker':
        result = uploadFileFromPicker(
          e.parameter.docId, e.parameter.fileName,
          e.parameter.mimeType, e.parameter.b64, e.parameter.username
        );
        break;

      case 'logAudit':
        result = appendAuditLog(e.parameter.action2, e.parameter.detail,
                                e.parameter.userId, e.parameter.username);
        break;

      default:
        result = { error: 'Unknown action: ' + action };
    }

    output.setContent(JSON.stringify(result));

  } catch (err) {
    output.setContent(JSON.stringify({ error: err.message }));
  }

  return output;
}

/* ══════════════════════════════════════════════════════════════
   doPost — handles write, file upload, and Claude proxy
══════════════════════════════════════════════════════════════ */
function doPost(e) {

  /* ── Rev.20: Claude proxy ───────────────────────────────── */
  try {
    var pAction = e && e.parameter ? (e.parameter.action || '') : '';

    if (pAction === 'claude') {
      var claudeBody = JSON.parse(e.postData ? e.postData.contents : '{}');
      return ContentService
        .createTextOutput(callClaude(claudeBody.system, claudeBody.messages, claudeBody.max_tokens))
        .setMimeType(ContentService.MimeType.JSON);
    }

    /* ── Rev.21: write / create (both accepted) ──────────────── */
    if (pAction === 'write' || pAction === 'create') {
      var wTab  = e.parameter.tab || '';
      var wRows = JSON.parse(e.postData ? e.postData.contents : '[]');
      // Accept both a single object and an array of objects
      if (!Array.isArray(wRows)) wRows = [wRows];
      return ContentService
        .createTextOutput(writeRows(wTab, wRows))
        .setMimeType(ContentService.MimeType.JSON);
    }

    if (pAction === 'update') {
      var uTab     = e.parameter.tab   || '';
      var uIdCol   = e.parameter.idCol || 'Person ID';  // default changed for VC; CAPA still works when idCol is passed
      var uId      = e.parameter.id    || '';
      var uUpsert  = e.parameter.upsert === '1' || e.parameter.upsert === 'true';
      var uUpdates = JSON.parse(e.postData ? e.postData.contents : '{}');
      return ContentService
        .createTextOutput(updateRowById(uTab, uIdCol, uId, uUpdates, uUpsert))
        .setMimeType(ContentService.MimeType.JSON);
    }

    /* ── Rev.21: Visitor / Contractor workflow ─────────────── */
    if (pAction === 'submitVisitorRegistration') {
      var bodySub = JSON.parse(e.postData ? e.postData.contents : '{}');
      return ContentService
        .createTextOutput(JSON.stringify(submitVisitorRegistration(bodySub)))
        .setMimeType(ContentService.MimeType.JSON);
    }

    if (pAction === 'approveVisitorAndSendCard') {
      var bodyAppr = JSON.parse(e.postData ? e.postData.contents : '{}');
      return ContentService
        .createTextOutput(JSON.stringify(approveVisitorAndSendCard(bodyAppr)))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // Rev.30 (Issam, voice, 2026-11-12) — HSE Violation approval
    // chain: Safety Controller raises → Supervisor confirms (picks
    // the Manager) → Manager gives final approval, each step
    // notifying the next person by email. violation-register.html
    // calls this once per step, right after it saves that step's
    // own fields with the ordinary 'update' action — this call only
    // sends the email, it never changes the sheet itself.
    if (pAction === 'sendViolationStageEmail') {
      var bodyViol = JSON.parse(e.postData ? e.postData.contents : '{}');
      return ContentService
        .createTextOutput(JSON.stringify(sendViolationStageEmail(bodyViol)))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // Rev.29 (Issam, voice, 2026-11-15) — PTW two-step approval chain:
    // once every required checklist is complete, the Area Manager is
    // emailed first; once they approve, the Controller is emailed
    // next. ptw-register.html calls this right after it saves that
    // step's own Status change with the ordinary 'update' action —
    // this call only sends the email.
    if (pAction === 'sendPtwStageEmail') {
      var bodyPtw = JSON.parse(e.postData ? e.postData.contents : '{}');
      return ContentService
        .createTextOutput(JSON.stringify(sendPtwStageEmail(bodyPtw)))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // Rev.31 (Issam, voice, 2026-11-24) — Security Operations Hub: a
    // patrol more than 2 hours overdue. security-hub.html calls this
    // once it has already computed the overdue state client-side —
    // this call only sends the email.
    if (pAction === 'sendOverduePatrolAlert') {
      var bodyPatrol = JSON.parse(e.postData ? e.postData.contents : '{}');
      return ContentService
        .createTextOutput(JSON.stringify(sendOverduePatrolAlert(bodyPatrol)))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // Rev.30 (Issam, voice, 2026-11-15) — called by each individual
    // checklist page (confined-space.html, loto-register.html,
    // crane-inspection.html, hot-work.html, scaffold-inspection.html,
    // painting/civil-work/pipeline-checklist.html) right after IT
    // saves a passing/Closed result, so a Waiting permit can move on
    // to Awaiting Area Manager the moment its LAST outstanding
    // checklist clears — not only the next time someone happens to
    // open the PTW Register (ptw-register.html's own
    // promoteReadyPermits() still runs on every load, as a backstop).
    if (pAction === 'checkAndPromotePtwPermit') {
      var bodyPromote = JSON.parse(e.postData ? e.postData.contents : '{}');
      return ContentService
        .createTextOutput(JSON.stringify(checkAndPromotePtwPermit(bodyPromote.permitId)))
        .setMimeType(ContentService.MimeType.JSON);
    }
  } catch(routeErr) {
    // Rev.22 (Issam, voice, 2026-11-12) — this used to swallow routeErr
    // completely and fall through, so a failure here (e.g. malformed
    // JSON in the request body, before submitVisitorRegistration's own
    // try/catch is even reached) left no trace anywhere. Now logged,
    // so Executions shows it even though the request still falls
    // through to the existing doPost below, same as before.
    Logger.log('doPost: new-route handling threw before reaching its own try/catch — ' + routeErr);
  }

  /* ── Existing doPost ────────────────────────────────────── */
  var output = ContentService.createTextOutput();
  output.setMimeType(ContentService.MimeType.JSON);

  try {
    var body   = e.postData ? e.postData.contents : '{}';
    var params = {};
    try { params = JSON.parse(body); } catch(pe) { params = { error: 'parse failed' }; }

    var action = params.action || '';
    var result;

    if (action === 'uploadFilePicker') {
      result = uploadFileFromPicker(
        params.docId, params.fileName, params.mimeType, params.b64, params.username);
    } else if (action === 'login') {
      result = serverLogin(params.username, params.password);
    } else if (action === 'setUser') {
      result = serverSetUser(params);
    } else if (action === 'notifyNewCapa') {
      result = notifyNewCapaOwner(params);
    } else if (action === 'deleteFile') {
      result = deleteFileFromDrive(params.fileId);
    } else if (action === 'saveDocumentRecord' || action === 'saveDocument') {
      result = saveDocumentRecord(params);
    } else if (action === 'saveVersion') {
      result = saveVersion(params);
    } else {
      result = { error: 'Unknown POST action: ' + action };
    }

    output.setContent(JSON.stringify(result));
  } catch(err) {
    output.setContent(JSON.stringify({ error: err.message }));
  }

  return output;
}

/* ══════════════════════════════════════════════════════════════
   Rev.20 NEW FUNCTIONS
══════════════════════════════════════════════════════════════ */

/* -- callClaude -----------------------------------------------
   Proxies Anthropic API — key stored in Script Properties.
   Setup: Project Settings → Script Properties
          ANTHROPIC_API_KEY = sk-ant-api03-...
   ------------------------------------------------------------- */
function callClaude(system, messages, maxTokens) {
  /* Uses Google Gemini 1.5 Flash — free tier, no billing required */
  try {
    var GEMINI_KEY = 'AIzaSyAQ.Ab8RN6ID_qkJ7Wgldhoyb9dEzFn4zqkqM3ng1hKaQLoqxLqRuQ';
    var url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=' + GEMINI_KEY;

    /* Convert message history to Gemini format */
    var contents = [];

    /* Add system prompt as first user turn */
    if (system) {
      contents.push({ role: 'user', parts: [{ text: 'SYSTEM INSTRUCTIONS:\n' + system }] });
      contents.push({ role: 'model', parts: [{ text: 'Understood. I will follow these instructions.' }] });
    }

    /* Add conversation history */
    (messages || []).forEach(function(msg) {
      contents.push({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content || '' }]
      });
    });

    var payload = {
      contents: contents,
      generationConfig: {
        maxOutputTokens: maxTokens || 800,
        temperature: 0.7,
      }
    };

    var options = {
      method:             'post',
      contentType:        'application/json',
      payload:            JSON.stringify(payload),
      muteHttpExceptions: true,
    };

    var response     = UrlFetchApp.fetch(url, options);
    var responseData = JSON.parse(response.getContentText());

    /* Convert Gemini response format to Claude-compatible format */
    if (responseData.candidates && responseData.candidates[0]) {
      var text = responseData.candidates[0].content.parts[0].text;
      return JSON.stringify({
        content: [{ type: 'text', text: text }],
        model: 'gemini-1.5-flash',
        stop_reason: 'end_turn'
      });
    } else if (responseData.error) {
      return JSON.stringify({ error: responseData.error.message || 'Gemini API error' });
    } else {
      return JSON.stringify({ error: 'Unexpected Gemini response format' });
    }

  } catch (err) {
    return JSON.stringify({ error: err.toString() });
  }
}

/* -- writeRows ------------------------------------------------
   Writes rows from the Excel import pipeline into any register.
   Called by copilot_v2.html applyUpdate() via POST action=write.
   ------------------------------------------------------------- */
function writeRows(tabKey, rows) {
  try {
    var sheetName = TABS[tabKey];
    if (!sheetName) return JSON.stringify({ status: 'error', message: 'Unknown tabKey: ' + tabKey });

    var sheet = findSheet(sheetName);
    if (!sheet) return JSON.stringify({ status: 'error', message: 'Sheet not found: ' + sheetName });

    var headerRow = sheet.getRange(3, 1, 1, sheet.getLastColumn()).getValues()[0];
    var written   = 0;

    rows.forEach(function(rowObj) {
      var newRow = headerRow.map(function(header) {
        return rowObj[header] !== undefined ? rowObj[header] : '';
      });
      sheet.appendRow(newRow);
      written++;
    });

    appendAuditLog(
      'MASSI_WRITE',
      'writeRows: ' + written + ' rows written to ' + sheetName + ' (' + tabKey + ')',
      'massi',
      'MASSI AI Copilot'
    );

    return JSON.stringify({ status: 'ok', written: written, sheet: sheetName });
  } catch (err) {
    return JSON.stringify({ status: 'error', message: err.toString() });
  }
}

/* -- updateRowById ----------------------------------------------
   Finds one row in a tab by matching idColumnHeader's value, and
   overwrites only the fields present in `updates` (partial patch —
   fields not included are left as they were). Added so the CAPA
   wizard can save partial progress (e.g. NC raised, containment
   and corrective action still pending) and resume later without
   writeRows()'s append-only behaviour creating a duplicate row for
   the same CAPA ID.
   Called via POST action=update.
   ------------------------------------------------------------- */
/* upsert (Issam, 2026-10-08) — opt-in, defaults to false so every
   EXISTING caller keeps today's strict "must already exist, error
   otherwise" behavior (right for editing a known incident/CAPA/etc.,
   where silently creating a row on a typo'd ID would be dangerous).
   obs_escalations is the one tab where the row genuinely does NOT
   exist yet the very first time a case is escalated — this function
   was silently failing with notFound on every first-time escalation,
   which meant the durable "this case has already been escalated"
   record was NEVER actually written, letting a second Incident or
   Action get raised for the very same Observation case. With
   upsert=true, a missing row is appended instead of erroring, built
   from `updates` for the columns given and blank for the rest, with
   the ID column itself set from idValue. */
function updateRowById(tabKey, idColumnHeader, idValue, updates, upsert) {
  try {
    var sheetName = TABS[tabKey];
    if (!sheetName) return JSON.stringify({ status: 'error', message: 'Unknown tabKey: ' + tabKey });

    var sheet = findSheet(sheetName);
    if (!sheet) return JSON.stringify({ status: 'error', message: 'Sheet not found: ' + sheetName });

    var headerRow = sheet.getRange(3, 1, 1, sheet.getLastColumn()).getValues()[0];
    var idColIdx  = headerRow.indexOf(idColumnHeader);
    if (idColIdx < 0) return JSON.stringify({ status: 'error', message: 'ID column not found: ' + idColumnHeader });

    var lastRow = sheet.getLastRow();
    var targetRow = -1;

    if (lastRow >= 4) {
      var idValues = sheet.getRange(4, idColIdx + 1, lastRow - 3, 1).getValues();
      for (var i = 0; i < idValues.length; i++) {
        if (String(idValues[i][0]) === String(idValue)) { targetRow = i + 4; break; }
      }
    }

    if (targetRow < 0) {
      if (!upsert) {
        return JSON.stringify({ status: 'error', message: 'No row found with ' + idColumnHeader + ' = ' + idValue, notFound: true });
      }
      /* Append a brand-new row: every column defaults to '', the ID
         column gets idValue, and anything present in `updates`
         overrides that default — same column-by-header mapping the
         existing-row branch below uses, just with no prior row to
         carry forward values from. */
      var insertRow = headerRow.map(function(header, idx){
        if (idx === idColIdx) return idValue;
        return updates[header] !== undefined ? updates[header] : '';
      });
      var newRowIdx = Math.max(lastRow, 3) + 1;
      sheet.getRange(newRowIdx, 1, 1, headerRow.length).setValues([insertRow]);

      appendAuditLog(
        'CAPA_UPDATE',
        'updateRowById: row ' + newRowIdx + ' in ' + sheetName + ' created via upsert (' + idColumnHeader + '=' + idValue + ')',
        'wizard', 'CAPA Wizard'
      );

      return JSON.stringify({ status: 'ok', row: newRowIdx, sheet: sheetName, created: true });
    }

    var existingRow = sheet.getRange(targetRow, 1, 1, headerRow.length).getValues()[0];
    var newRow = headerRow.map(function(header, idx) {
      return updates[header] !== undefined ? updates[header] : existingRow[idx];
    });
    sheet.getRange(targetRow, 1, 1, headerRow.length).setValues([newRow]);

    appendAuditLog(
      'CAPA_UPDATE',
      'updateRowById: row ' + targetRow + ' in ' + sheetName + ' updated (' + idColumnHeader + '=' + idValue + ')',
      'wizard', 'CAPA Wizard'
    );

    return JSON.stringify({ status: 'ok', row: targetRow, sheet: sheetName });
  } catch (err) {
    return JSON.stringify({ status: 'error', message: err.toString() });
  }
}

/* ── Server-side login (full version) ─────────────────────────
   Person's requirement: a user added anywhere should be able to log
   in from ANY computer immediately, not just the one that created
   them. Passwords are never stored in plaintext on the sheet — only
   a SHA-256 hash, so anyone with view access to the spreadsheet
   still can't read actual passwords directly.

   REQUIRES a new column on the 'User Register' sheet, row 3 header:
   "Password Hash". This is separate from, and in addition to, the
   existing directory columns (User ID, Full Name, Username, Role,
   Job Title, Department, Email, Account Status) already in use. ── */

function hashPassword_(pw) {
  var bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, String(pw), Utilities.Charset.UTF_8);
  return bytes.map(function (b) {
    var v = (b < 0 ? b + 256 : b);
    return (v < 16 ? '0' : '') + v.toString(16);
  }).join('');
}

function serverLogin(username, password) {
  var sheet = findSheet(TABS['users']);
  if (!sheet) return { status: 'error', message: 'User Register sheet not found on the server.' };

  var lastRow = sheet.getLastRow();
  if (lastRow < 4) return { status: 'error', message: 'No users found in the sheet.' };

  var headers = sheet.getRange(3, 1, 1, sheet.getLastColumn()).getValues()[0];
  var unIdx = headers.indexOf('Username'), pwIdx = headers.indexOf('Password Hash');
  var statusIdx = headers.indexOf('Account Status'), idIdx = headers.indexOf('User ID');
  var nameIdx = headers.indexOf('Full Name'), roleIdx = headers.indexOf('Role');
  var titleIdx = headers.indexOf('Job Title'), deptIdx = headers.indexOf('Department'), emailIdx = headers.indexOf('Email');

  if (unIdx < 0 || pwIdx < 0) {
    return { status: 'error', message: 'Sheet is missing the Username or Password Hash column — add "Password Hash" to row 3 first.' };
  }

  var data = sheet.getRange(4, 1, lastRow - 3, headers.length).getValues();
  var hash = hashPassword_(password);

  for (var i = 0; i < data.length; i++) {
    if (String(data[i][unIdx]).toLowerCase() === String(username).toLowerCase()) {
      if (statusIdx >= 0 && String(data[i][statusIdx]) !== 'Active') {
        return { status: 'error', message: 'This account is inactive. Contact the IMS Administrator.' };
      }
      if (String(data[i][pwIdx]) !== hash) {
        return { status: 'error', message: 'Incorrect password. Please try again.' };
      }
      return {
        status: 'ok',
        user: {
          id: data[i][idIdx], name: data[i][nameIdx], username: data[i][unIdx], role: data[i][roleIdx],
          title: titleIdx >= 0 ? data[i][titleIdx] : '', department: deptIdx >= 0 ? data[i][deptIdx] : '',
          email: emailIdx >= 0 ? data[i][emailIdx] : '',
        },
      };
    }
  }
  return { status: 'error', message: 'Username not found. Check spelling and try again.' };
}

/* Creates a new row or updates an existing one (matched by User ID)
   in one atomic step — payload.password is optional; when present
   it's hashed and written, when absent the existing hash (if any) is
   left untouched so an edit that doesn't touch the password doesn't
   accidentally wipe it. */
function serverSetUser(payload) {
  var sheet = findSheet(TABS['users']);
  if (!sheet) return { status: 'error', message: 'User Register sheet not found on the server.' };

  var headers = sheet.getRange(3, 1, 1, sheet.getLastColumn()).getValues()[0];
  var idIdx = headers.indexOf('User ID');
  if (idIdx < 0) return { status: 'error', message: 'Sheet is missing the User ID column.' };

  var lastRow = sheet.getLastRow();
  var targetRow = -1;
  if (lastRow >= 4) {
    var ids = sheet.getRange(4, idIdx + 1, lastRow - 3, 1).getValues();
    for (var i = 0; i < ids.length; i++) {
      if (String(ids[i][0]) === String(payload.id)) { targetRow = i + 4; break; }
    }
  }

  var rowObj = {
    'User ID': payload.id, 'Full Name': payload.name, 'Username': payload.username, 'Role': payload.role,
    'Job Title': payload.title || '', 'Department': payload.department || '', 'Email': payload.email || '',
    'Account Status': payload.status || 'Active',
  };
  if (payload.password) rowObj['Password Hash'] = hashPassword_(payload.password);

  if (targetRow > 0) {
    var existingRow = sheet.getRange(targetRow, 1, 1, headers.length).getValues()[0];
    var newRow = headers.map(function (h, idx) { return rowObj[h] !== undefined ? rowObj[h] : existingRow[idx]; });
    sheet.getRange(targetRow, 1, 1, headers.length).setValues([newRow]);
  } else {
    if (!payload.password) return { status: 'error', message: 'A password is required when creating a brand-new user.' };
    var newRow2 = headers.map(function (h) { return rowObj[h] !== undefined ? rowObj[h] : ''; });
    sheet.appendRow(newRow2);
  }
  return { status: 'ok' };
}

/* ── Overdue CAPA notifications ───────────────────────────────
   Person's requirement: the NCR owner gets email + in-portal system
   notifications + reminders every day the CAPA stays overdue, until
   Status reaches Closed — reaching Completed alone does NOT stop the
   reminders, since a Completed-but-not-yet-verified CAPA past its due
   date is still considered overdue. The IMS Manager(s) get one weekly
   digest email of everything currently overdue, for monitoring.

   Two time-driven triggers call the two entry points below —
   scanAndNotifyOwners() daily, sendWeeklyOverdueReport() weekly.
   Neither runs on its own; call installTriggers() ONCE from the
   Apps Script editor (select it in the function dropdown, then Run)
   to actually schedule them. Re-running installTriggers() safely
   clears and recreates them rather than stacking duplicates.
   ------------------------------------------------------------- */

function getOverdueCapaRows_() {
  var sheetName = TABS['capa'];
  var sheet = findSheet(sheetName);
  if (!sheet) return { headers: [], rows: [] };

  var lastRow = sheet.getLastRow();
  if (lastRow < 4) return { headers: [], rows: [] };

  var headers = sheet.getRange(3, 1, 1, sheet.getLastColumn()).getValues()[0];
  var data = sheet.getRange(4, 1, lastRow - 3, headers.length).getValues();

  var idIdx     = headers.indexOf('CAPA ID');
  var statusIdx = headers.indexOf('Status');
  var dueIdx    = headers.indexOf('Due Date');
  var descIdx   = headers.indexOf('Description');
  var ownerIdx  = headers.indexOf('Owner');
  var emailIdx  = headers.indexOf('Owner Email');
  var sevIdx    = headers.indexOf('Severity');

  var overdue = [];

  data.forEach(function(row) {
    var status = String(row[statusIdx] || '').trim().toLowerCase();
    if (status === 'closed') return; /* reminders continue even once Completed — only stop at Closed, per the requirement */
    var dueCell = row[dueIdx];
    if (!dueCell) return;
    var due = new Date(dueCell);
    if (isNaN(due.getTime())) return;
    var daysOverdue = Math.floor((new Date() - due) / 86400000);
    if (daysOverdue < 0) return;

    overdue.push({
      id: row[idIdx], status: row[statusIdx], due: due, daysOverdue: daysOverdue,
      description: descIdx >= 0 ? row[descIdx] : '', owner: ownerIdx >= 0 ? row[ownerIdx] : '',
      ownerEmail: emailIdx >= 0 ? row[emailIdx] : '', severity: sevIdx >= 0 ? row[sevIdx] : '',
    });
  });

  return { headers: headers, rows: overdue };
}

/* Dedupe key so the same CAPA doesn't get double-notified if this
   function is accidentally run twice in one day. */
function alreadyNotifiedToday_(capaId, dateStr) {
  var sheetName = TABS['notifications'];
  var sheet = findSheet(sheetName);
  if (!sheet) return false; /* Notifications tab not created yet — don't block email sending on that */
  var lastRow = sheet.getLastRow();
  if (lastRow < 4) return false;
  var headers = sheet.getRange(3, 1, 1, sheet.getLastColumn()).getValues()[0];
  var capaIdx = headers.indexOf('CAPA ID');
  var dateIdx = headers.indexOf('Date Created');
  if (capaIdx < 0 || dateIdx < 0) return false;
  var data = sheet.getRange(4, 1, lastRow - 3, headers.length).getValues();
  for (var i = 0; i < data.length; i++) {
    if (String(data[i][capaIdx]) === String(capaId) && String(data[i][dateIdx]) === dateStr) return true;
  }
  return false;
}

/* Fires ONCE, right when a CAPA is first raised — tells the owner
   they're now responsible for it, rather than them finding out only
   once it's overdue. Separate from scanAndNotifyOwners() (which is
   the recurring daily overdue reminder) — this is a single, immediate
   heads-up at creation time. */
function notifyNewCapaOwner(p) {
  var capaId = p.capaId, ownerEmail = p.ownerEmail, ownerName = p.ownerName || '';
  if (!ownerEmail) return { status: 'error', message: 'No owner email provided.' };

  var capaLink = 'https://sagcodrv-ux.github.io/sagco-im/capa-register.html?capa=' + encodeURIComponent(capaId);
  var evidenceUrls = p.evidenceUrls || [];

  var message = 'You have been assigned as the owner of a new CAPA: ' + capaId
    + ' (' + (p.severity || 'severity not set') + ')'
    + (p.dueDate ? ' — due ' + p.dueDate : '')
    + '. "' + (p.description || '') + '"';

  writeNotification_(ownerEmail, capaId, message);

  /* Plain-text fallback, for mail clients that don't render HTML. */
  var evidenceLinesPlain = evidenceUrls.length
    ? '\n\nEvidence attached:\n' + evidenceUrls.map(function (u, i) { return (i + 1) + '. ' + u; }).join('\n')
    : '';
  var plainBody = 'Hi ' + ownerName + ',\n\nA new CAPA has been raised in the SAGCO IMS Portal, and you have been assigned as its owner.\n\n'
    + message + evidenceLinesPlain + '\n\nOpen it directly here: ' + capaLink + '\n\n— SAGCO IMS Portal';

  /* HTML version — a real clickable button for the CAPA link, and
     compact icon buttons for evidence, matching the same visual style
     already used in the wizard itself. Kept to inline styles only,
     since email clients don't reliably support external/embedded CSS. */
  var evidenceHtml = evidenceUrls.length
    ? '<p style="margin:16px 0 6px;font-size:13px;color:#1B2A4A"><strong>Evidence attached:</strong></p><p style="margin:0 0 16px">'
      + evidenceUrls.map(function (u, i) {
          return '<a href="' + u + '" title="Evidence ' + (i + 1) + '" style="display:inline-flex;align-items:center;justify-content:center;width:32px;height:32px;background:#EBF3FB;color:#1565C0;border:1px solid #B5D4F4;border-radius:5px;text-decoration:none;font-size:16px;margin:0 6px 6px 0">📎</a>';
        }).join('')
      + '</p>'
    : '';

  var htmlBody = '<div style="font-family:Arial,sans-serif;font-size:14px;color:#1B2A4A;max-width:520px">'
    + '<p>Hi ' + ownerName + ',</p>'
    + '<p>A new CAPA has been raised in the SAGCO IMS Portal, and you have been assigned as its owner.</p>'
    + '<p style="background:#f9fafb;border-left:3px solid #C9A84C;padding:10px 14px;margin:16px 0">' + message + '</p>'
    + evidenceHtml
    + '<p><a href="' + capaLink + '" style="display:inline-block;background:#1B2A4A;color:#fff;text-decoration:none;font-weight:700;padding:10px 20px;border-radius:6px;font-size:13px">📂 Open CAPA in Portal</a></p>'
    + '<p style="font-size:11px;color:#7a869a;margin-top:24px">— SAGCO IMS Portal</p>'
    + '</div>';

  try {
    MailApp.sendEmail({
      to: ownerEmail,
      subject: 'New CAPA Assigned to You: ' + capaId,
      body: plainBody,
      htmlBody: htmlBody,
    });
  } catch (err) {
    Logger.log('Failed to email new-CAPA notification to ' + ownerEmail + ' for ' + capaId + ': ' + err);
    return { status: 'error', message: 'Notification written but email failed: ' + err };
  }

  return { status: 'ok' };
}

function writeNotification_(recipientEmail, capaId, message) {
  var sheetName = TABS['notifications'];
  var sheet = findSheet(sheetName);
  if (!sheet) return; /* silently skip in-portal notification if the tab doesn't exist yet; email still sends independently */
  sheet.appendRow([
    'NOTIF-' + capaId + '-' + Date.now(),
    recipientEmail || '',
    capaId,
    message,
    new Date().toISOString().split('T')[0],
    'No',
  ]);
}

/* Daily entry point: email + in-portal notification to each overdue
   CAPA's owner, once per CAPA per day. */
function scanAndNotifyOwners() {
  var result = getOverdueCapaRows_();
  var today = new Date().toISOString().split('T')[0];

  result.rows.forEach(function(item) {
    if (alreadyNotifiedToday_(item.id, today)) return;

    var message = 'CAPA ' + item.id + ' (' + (item.severity || 'severity not set') + ') is ' + item.daysOverdue
      + ' day' + (item.daysOverdue === 1 ? '' : 's') + ' overdue. Due date was ' + item.due.toISOString().split('T')[0]
      + '. "' + (item.description || '') + '"';

    writeNotification_(item.ownerEmail, item.id, message);

    if (item.ownerEmail) {
      try {
        MailApp.sendEmail({
          to: item.ownerEmail,
          subject: 'OVERDUE — CAPA ' + item.id + ' (' + item.daysOverdue + ' day' + (item.daysOverdue === 1 ? '' : 's') + ' overdue)',
          body: 'This is an automatic reminder from the SAGCO IMS Portal.\n\n' + message
            + '\n\nThis reminder will repeat daily until the CAPA is marked Closed.\n\n— SAGCO IMS Portal',
        });
      } catch (err) {
        Logger.log('Failed to email ' + item.ownerEmail + ' for ' + item.id + ': ' + err);
      }
    } else {
      Logger.log('CAPA ' + item.id + ' is overdue but has no Owner Email on file — email skipped, in-portal notification still written.');
    }
  });

  scanAndNotifyMissingContainment(); /* separate, faster-cadence check — containment deadlines are days, not weeks */
  scanAndNotifyCreatorsPendingVerification(); /* once the owner marks Completed, the CREATOR gets chased daily to follow up until Closed or reverted */

  return { status: 'ok', overdueCount: result.rows.length };
}

/* ── Creator reminder: pending verification ────────────────────
   Person's requirement: once the Owner marks a CAPA Completed, the
   CREATOR (not the Owner — different person, usually) gets a daily
   nudge to chase the verifier, until the CAPA is either Closed or
   bounced back to In Progress. Neither of those states matches
   'completed' below, so the reminder naturally stops either way. */
function scanAndNotifyCreatorsPendingVerification() {
  var sheet = findSheet(TABS['capa']);
  if (!sheet) return;
  var lastRow = sheet.getLastRow();
  if (lastRow < 4) return;

  var headers = sheet.getRange(3, 1, 1, sheet.getLastColumn()).getValues()[0];
  var data = sheet.getRange(4, 1, lastRow - 3, headers.length).getValues();

  var idIdx = headers.indexOf('CAPA ID'), statusIdx = headers.indexOf('Status');
  var creatorEmailIdx = headers.indexOf('Created By Email'), creatorNameIdx = headers.indexOf('Created By Name');
  var descIdx = headers.indexOf('Description'), sevIdx = headers.indexOf('Severity');

  var today = new Date().toISOString().split('T')[0];

  data.forEach(function(row) {
    var status = String(row[statusIdx] || '').trim().toLowerCase();
    if (status !== 'completed') return; /* only while sitting in Completed — moves out once Closed or reverted to In Progress */

    var capaId = row[idIdx];
    var creatorEmail = creatorEmailIdx >= 0 ? row[creatorEmailIdx] : '';
    if (!creatorEmail) {
      Logger.log('CAPA ' + capaId + ' is Completed and awaiting verification, but has no Created By Email on file — reminder skipped.');
      return;
    }

    var dedupeKey = capaId + '-pendingverify'; /* distinct from the other two reminder types' dedupe keys */
    if (alreadyNotifiedToday_(dedupeKey, today)) return;

    var creatorName = creatorNameIdx >= 0 ? row[creatorNameIdx] : '';
    var message = 'CAPA ' + capaId + ' (' + (sevIdx >= 0 ? row[sevIdx] : '') + ') was marked Completed by its owner and is still awaiting'
      + ' Effectiveness Verification before it can be Closed. "' + (descIdx >= 0 ? row[descIdx] : '') + '"';

    writeNotification_(creatorEmail, dedupeKey, message);

    try {
      MailApp.sendEmail({
        to: creatorEmail,
        subject: 'AWAITING VERIFICATION — CAPA ' + capaId,
        body: 'Hi ' + creatorName + ',\n\nThis is an automatic reminder from the SAGCO IMS Portal.\n\n' + message
          + '\n\nAs the person who raised this CAPA, please follow up with the verifier (Admin/IMS Manager) to get it closed.'
          + '\n\nThis reminder will repeat daily until it\'s Closed, or sent back to In Progress.\n\n— SAGCO IMS Portal',
      });
    } catch (err) {
      Logger.log('Failed to email pending-verification reminder to ' + creatorEmail + ' for ' + capaId + ': ' + err);
    }
  });
}

/* ── Containment-overdue reminders ─────────────────────────────
   Separate from the main overdue-CAPA reminder above: containment
   has its own, much tighter deadline (proc-c10.html §5 — Critical:
   same shift, Major: 5 working days, Minor: 14 working days) measured
   from Date Raised, not from the CAPA's overall Due Date. Without
   this, a CAPA with no containment logged at all would go unnoticed
   until the much later overall due date, weeks or months out.

   "Working days" here means Sunday–Thursday (Saudi's actual work
   week), not the Western Monday–Friday — worth confirming this
   assumption is correct for SAGCO specifically. */

function addWorkingDays_(startDate, days) {
  var d = new Date(startDate);
  var added = 0;
  while (added < days) {
    d.setDate(d.getDate() + 1);
    var dow = d.getDay(); /* 0=Sun ... 6=Sat; Saudi weekend is Fri(5)/Sat(6) */
    if (dow !== 5 && dow !== 6) added++;
  }
  return d;
}

function getMissingContainmentRows_() {
  var sheet = findSheet(TABS['capa']);
  if (!sheet) return [];
  var lastRow = sheet.getLastRow();
  if (lastRow < 4) return [];

  var headers = sheet.getRange(3, 1, 1, sheet.getLastColumn()).getValues()[0];
  var data = sheet.getRange(4, 1, lastRow - 3, headers.length).getValues();

  var idIdx = headers.indexOf('CAPA ID'), statusIdx = headers.indexOf('Status');
  var dateRaisedIdx = headers.indexOf('Date Raised'), sevIdx = headers.indexOf('Severity');
  var containIdx = headers.indexOf('Immediate Action'), emailIdx = headers.indexOf('Owner Email');
  var descIdx = headers.indexOf('Description');

  var today = new Date();
  var results = [];

  data.forEach(function(row) {
    var status = String(row[statusIdx] || '').trim().toLowerCase();
    if (status === 'completed' || status === 'closed') return; /* containment is moot once work is done or closed */

    var containment = String(row[containIdx] || '').trim();
    if (containment) return; /* already filled in — nothing to remind about */

    var raisedCell = row[dateRaisedIdx];
    if (!raisedCell) return;
    var raised = new Date(raisedCell);
    if (isNaN(raised.getTime())) return;

    var severity = String(row[sevIdx] || '');
    var deadline;
    if (severity === 'Critical') deadline = raised; /* same shift — effectively same day */
    else if (severity === 'Major') deadline = addWorkingDays_(raised, 5);
    else if (severity === 'Minor') deadline = addWorkingDays_(raised, 14);
    else return; /* severity not set — can't compute a deadline */

    if (today <= deadline) return; /* not overdue yet */

    var daysLate = Math.floor((today - deadline) / 86400000);
    results.push({
      id: row[idIdx], severity: severity, daysLate: daysLate,
      ownerEmail: emailIdx >= 0 ? row[emailIdx] : '', description: descIdx >= 0 ? row[descIdx] : '',
    });
  });

  return results;
}

function scanAndNotifyMissingContainment() {
  var rows = getMissingContainmentRows_();
  var today = new Date().toISOString().split('T')[0];

  rows.forEach(function(item) {
    var dedupeKey = item.id + '-containment'; /* distinct from the general overdue dedupe key, so both can fire the same day without colliding */
    if (alreadyNotifiedToday_(dedupeKey, today)) return;

    var message = 'CAPA ' + item.id + ' (' + item.severity + ') has NO containment action logged, and its containment deadline passed '
      + item.daysLate + ' day' + (item.daysLate === 1 ? '' : 's') + ' ago. "' + (item.description || '') + '"';

    writeNotification_(item.ownerEmail, dedupeKey, message);

    if (item.ownerEmail) {
      try {
        MailApp.sendEmail({
          to: item.ownerEmail,
          subject: 'CONTAINMENT OVERDUE — CAPA ' + item.id,
          body: 'This is an automatic reminder from the SAGCO IMS Portal.\n\n' + message
            + '\n\nContainment is the fastest-required step in the CAPA process — please log it as soon as possible.'
            + '\n\nThis reminder will repeat daily until containment is recorded.\n\n— SAGCO IMS Portal',
        });
      } catch (err) {
        Logger.log('Failed to email containment reminder to ' + item.ownerEmail + ' for ' + item.id + ': ' + err);
      }
    } else {
      Logger.log('CAPA ' + item.id + ' is missing containment past deadline but has no Owner Email on file.');
    }
  });
}

/* Weekly entry point: one digest email to IMS_MANAGER_EMAILS listing
   everything currently overdue. */
function sendWeeklyOverdueReport() {
  var result = getOverdueCapaRows_();
  if (!IMS_MANAGER_EMAILS.length) { Logger.log('IMS_MANAGER_EMAILS is empty — no weekly report sent.'); return; }

  var lines = result.rows.length
    ? result.rows.map(function(item) {
        return '• ' + item.id + ' — ' + (item.severity || '—') + ' — ' + item.daysOverdue + ' day(s) overdue — Owner: '
          + (item.owner || '(no owner recorded)') + ' — "' + (item.description || '') + '"';
      }).join('\n')
    : 'No overdue CAPAs this week.';

  var body = 'Weekly Overdue CAPA Report — SAGCO IMS Portal\n' + new Date().toISOString().split('T')[0]
    + '\n\n' + result.rows.length + ' CAPA(s) currently overdue:\n\n' + lines
    + '\n\nThis is generated automatically every week for monitoring and follow-up.';

  IMS_MANAGER_EMAILS.forEach(function(email) {
    try {
      MailApp.sendEmail({ to: email, subject: 'Weekly Overdue CAPA Report — ' + result.rows.length + ' overdue', body: body });
    } catch (err) {
      Logger.log('Failed to email weekly report to ' + email + ': ' + err);
    }
  });

  return { status: 'ok', overdueCount: result.rows.length, sentTo: IMS_MANAGER_EMAILS };
}

/* Run this ONCE from the Apps Script editor (function dropdown →
   installTriggers → Run) to schedule the two functions above. Safe
   to re-run — it clears any triggers on these two functions first,
   so it never creates duplicates. */
function installTriggers() {
  var triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(function(t) {
    var fn = t.getHandlerFunction();
    if (fn === 'scanAndNotifyOwners' || fn === 'sendWeeklyOverdueReport') ScriptApp.deleteTrigger(t);
  });

  ScriptApp.newTrigger('scanAndNotifyOwners').timeBased().everyDays(1).atHour(8).create();
  ScriptApp.newTrigger('sendWeeklyOverdueReport').timeBased().onWeekDay(ScriptApp.WeekDay.MONDAY).atHour(8).create();

  Logger.log('Triggers installed: scanAndNotifyOwners daily at ~08:00, sendWeeklyOverdueReport every Monday at ~08:00.');
  return { status: 'ok' };
}

/* -- scanAlerts -----------------------------------------------
   Scans date-bearing registers for overdue / upcoming items.
   Called by massi.html and copilot_v2.html on session open.
   ------------------------------------------------------------- */
function scanAlerts() {
  var today  = new Date();
  var alerts = [];


  var DATE_RULES = [
    { tab: 'calibration',    dateField: 'Next Due',            warnDays: 30, label: 'Calibration',     page: 'calibration-register.html'  },
    { tab: 'training',       dateField: 'Next Due',            warnDays: 30, label: 'Training',         page: 'training.html'              },
    { tab: 'ppe_register',   dateField: 'Next Inspection Due', warnDays: 30, label: 'PPE Inspection',   page: 'ppe-register.html'          },
    { tab: 'fe_service_log', dateField: 'Expire Date',         warnDays: 14, label: 'Fire Extinguisher',page: 'fire-extinguisher-log.html' },
    { tab: 'capa',           dateField: 'Due Date',            warnDays:  7, label: 'CAPA',             page: 'capa-register.html'         },
    { tab: 'ptw_register',   dateField: 'Expiry Date',         warnDays:  3, label: 'PTW',              page: 'ptw-register.html'          },
    { tab: 'oh_surveillance',dateField: 'Next Due',            warnDays: 30, label: 'OH Surveillance',  page: 'oh-surveillance.html'       },
    { tab: 'scaffold',       dateField: 'Next Inspection Date',warnDays:  7, label: 'Scaffold',         page: 'scaffold-inspection.html'   },
    { tab: 'crane_lifting',  dateField: 'Next Inspection Due', warnDays: 14, label: 'Crane & Lifting',  page: 'crane-lifting.html'         },
    { tab: 'fak_register',   dateField: 'Next Inspection Due', warnDays:  7, label: 'First Aid Kit',    page: 'first-aid-kit.html'         },
    { tab: 'loto_register',  dateField: 'Last Verified',       warnDays: 90, label: 'LOTO',             page: 'loto-register.html'         },
    { tab: 'cs_entry',       dateField: 'Instrument Calibration Due Date', warnDays: 14, label: 'Confined Space Gas Detector Calib', page: 'confined-space.html' },
    /* Rev.12 (Issam, 2026-10-15) — Contractor Compliance Log: four
       independent entries on the same tab, one per document type,
       each with its own warning window as Issam specified (CR and
       License both 30 days, Insurance 30 days, Induction 7 days) —
       not one shared threshold for all four. Column names are chosen
       so no two headers on this tab share a keyword substring (see
       contractor-register.html's own comments on this), since the
       matcher below finds the first header containing the rule's
       first word. */
    { tab: 'contractor_compliance', dateField: 'CR Expiry Date',        warnDays: 30, label: 'Contractor CR',         page: 'contractor-register.html' },
    { tab: 'contractor_compliance', dateField: 'License Expiry Date',   warnDays: 30, label: 'Contractor License',    page: 'contractor-register.html' },
    { tab: 'contractor_compliance', dateField: 'Insurance Expiry Date', warnDays: 30, label: 'Contractor Insurance',  page: 'contractor-register.html' },
    { tab: 'contractor_compliance', dateField: 'Induction Valid Until', warnDays:  7, label: 'Contractor Induction',  page: 'contractor-register.html' },
  ];

  DATE_RULES.forEach(function(rule) {
    try {
      var sheetName = TABS[rule.tab];
      if (!sheetName) return;
      var sheet = findSheet(sheetName);
      if (!sheet) return;

      var lastRow = sheet.getLastRow();
      if (lastRow < 4) {
        alerts.push({ sev: 'med', text: rule.label + ' register — no data entered yet', page: rule.page, id: 'empty-' + rule.tab });
        return;
      }

      var headers = sheet.getRange(3, 1, 1, sheet.getLastColumn()).getValues()[0];
      var dateIdx = -1;
      var dfLower = rule.dateField.toLowerCase().split(' ')[0];
      for (var j = 0; j < headers.length; j++) {
        if (String(headers[j]).toLowerCase().indexOf(dfLower) >= 0) { dateIdx = j; break; }
      }
      if (dateIdx < 0) return;

      var data = sheet.getRange(4, 1, lastRow - 3, sheet.getLastColumn()).getValues();
      var overdueCount = 0; var warnCount = 0;

      /* CAPA-specific: a Completed/Closed CAPA past its old due date is
         not actually overdue anymore — without this check every closed
         CAPA would permanently and incorrectly count as overdue here. */
      var statusIdx = -1;
      if (rule.tab === 'capa') {
        for (var k = 0; k < headers.length; k++) {
          if (String(headers[k]).toLowerCase().indexOf('status') >= 0) { statusIdx = k; break; }
        }
      }

      data.forEach(function(row) {
        if (statusIdx >= 0) {
          var st = String(row[statusIdx] || '').trim().toLowerCase();
          if (st === 'closed') return; /* only Closed stops counting as overdue now, matching the reminder cutoff */
        }
        var cell = row[dateIdx];
        if (!cell) return;
        var d = new Date(cell);
        if (isNaN(d.getTime())) return;
        var daysLeft = Math.floor((d - today) / 86400000);
        if (daysLeft < 0) overdueCount++;
        else if (daysLeft < rule.warnDays) warnCount++;
      });

      if (overdueCount > 0) {
        alerts.push({ sev: overdueCount > 3 ? 'crit' : 'high',
          text: rule.label + ': ' + overdueCount + ' item' + (overdueCount > 1 ? 's' : '') + ' OVERDUE',
          page: rule.page, id: 'overdue-' + rule.tab, count: overdueCount });
      } else if (warnCount > 0) {
        alerts.push({ sev: 'high',
          text: rule.label + ': ' + warnCount + ' due within ' + rule.warnDays + ' days',
          page: rule.page, id: 'warn-' + rule.tab, count: warnCount });
      }
    } catch(e) { /* silent — skip failed sheets */ }
  });

  /* KPI below target */
  try {
    var kpiSheets = SpreadsheetApp.getActiveSpreadsheet().getSheets().filter(function(s) {
      return s.getName().toLowerCase().indexOf('kpi') >= 0;
    });
    if (kpiSheets.length) {
      var kpiSheet = kpiSheets[0];
      if (kpiSheet.getLastRow() >= 4) {
        var kpiHeaders = kpiSheet.getRange(3, 1, 1, kpiSheet.getLastColumn()).getValues()[0];
        var statusIdx  = kpiHeaders.indexOf('Status');
        var nameIdx    = kpiHeaders.indexOf('KPI Name');
        if (statusIdx >= 0 && nameIdx >= 0) {
          var kpiData = kpiSheet.getRange(4, 1, kpiSheet.getLastRow() - 3, kpiSheet.getLastColumn()).getValues();
          var atRisk  = kpiData.filter(function(r) {
            return /at.risk|behind/i.test(String(r[statusIdx] || ''));
          }).map(function(r) { return r[nameIdx]; });
          if (atRisk.length > 0) {
            alerts.push({ sev: 'high',
              text: atRisk.length + ' KPI' + (atRisk.length > 1 ? 's' : '') + ' AT RISK: ' + atRisk.slice(0, 3).join(', '),
              page: 'kpi-dashboard.html', id: 'kpi-at-risk' });
          }
        }
      }
    }
  } catch(e) { /* silent */ }

  var order = { crit: 0, high: 1, med: 2 };
  alerts.sort(function(a, b) { return (order[a.sev] || 9) - (order[b.sev] || 9); });

  return JSON.stringify({ status: 'ok', alerts: alerts, scanned: today.toISOString() });
}

/* -- searchRows -----------------------------------------------
   Row-level text search across any register.
   GET ?action=search&tab=calibration&q=temperature
   ------------------------------------------------------------- */
function searchRows(tabKey, query) {
  try {
    var sheetName = TABS[tabKey];
    if (!sheetName) return JSON.stringify({ status: 'error', message: 'Unknown tabKey' });

    var sheet = findSheet(sheetName);
    if (!sheet || sheet.getLastRow() < 4) {
      return JSON.stringify({ status: 'ok', headers: [], rows: [], rowCount: 0 });
    }

    var headers = sheet.getRange(3, 1, 1, sheet.getLastColumn()).getValues()[0];
    var data    = sheet.getRange(4, 1, sheet.getLastRow() - 3, sheet.getLastColumn()).getValues();
    var qLower  = String(query).toLowerCase();

    var matches = data.filter(function(row) {
      return row.map(function(c) { return String(c || ''); }).join(' ').toLowerCase().indexOf(qLower) >= 0;
    });

    return JSON.stringify({
      status: 'ok', headers: headers, rows: matches.slice(0, 20),
      rowCount: matches.length, query: query, sheet: sheetName, tab: tabKey
    });
  } catch(err) {
    return JSON.stringify({ status: 'error', message: err.toString() });
  }
}

/* -- findSheet ------------------------------------------------
   Fuzzy sheet lookup — strips emojis, case-insensitive.
   ------------------------------------------------------------- */
function findSheet(sheetName) {
  return findSheetIn(SpreadsheetApp.getActiveSpreadsheet(), sheetName);
}

/* Same fuzzy lookup as findSheet(), but against any spreadsheet object
   passed in — not just the active one. Lets readExternalSheet() reuse
   the identical matching logic against the Observations spreadsheet. */
function findSheetIn(ss, sheetName) {
  var sheet = ss.getSheetByName(sheetName);
  if (sheet) return sheet;

  function normalize(s) {
    /* Collapse every dash-like character (en dash –, em dash —, minus
       sign −) down to a plain ASCII hyphen FIRST, before the character
       filter below. Without this, a TABS entry written with an en dash
       (e.g. '70 – LOTO Authorised Persons', copy-pasted from a template)
       would silently fail to match a live sheet tab typed by hand with
       an ordinary hyphen ('70 - LOTO Authorised Persons') — the filter
       keeps a plain '-' but strips '–' entirely, so the two normalized
       strings came out different and findSheet() returned null even
       though the sheet clearly existed with matching text otherwise. */
    return String(s)
      .replace(/[\u2010-\u2015\u2212]/g, '-')
      .replace(/[^\w\s\-&\.]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase();
  }
  var target = normalize(sheetName);
  var all    = ss.getSheets();
  for (var i = 0; i < all.length; i++) {
    if (normalize(all[i].getName()) === target) return all[i];
  }
  return null;
}

/* -- testNewFunctions -----------------------------------------
   Run from Apps Script editor to verify Rev.20 additions.
   ------------------------------------------------------------- */
function testNewFunctions() {
  Logger.log('=== Testing Rev.20 new functions ===');

  /* Test scanAlerts */
  var alertResult = JSON.parse(scanAlerts());
  Logger.log('scanAlerts: ' + alertResult.alerts.length + ' alerts found');
  alertResult.alerts.slice(0, 3).forEach(function(a) {
    Logger.log('  [' + a.sev + '] ' + a.text);
  });

  /* Test searchRows */
  var searchResult = JSON.parse(searchRows('calibration', 'meter'));
  Logger.log('searchRows calibration "meter": ' + searchResult.rowCount + ' matches');

  /* Test callClaude (requires ANTHROPIC_API_KEY in Script Properties) */
  Logger.log('callClaude (Gemini): testing...');
  var testResult = JSON.parse(callClaude('You are a test assistant.', [{role:'user',content:'Say OK in one word'}], 50));
  if (testResult.content) Logger.log('Gemini OK: ' + testResult.content[0].text);
  else Logger.log('Gemini error: ' + JSON.stringify(testResult));

  /* Test writeRows (logs only — does NOT write) */
  Logger.log('writeRows: function defined — OK');
  Logger.log('=== Rev.20 test complete ===');
}

/* ══════════════════════════════════════════════════════════════
   FILE PICKER HTML (unchanged from Rev.19)
══════════════════════════════════════════════════════════════ */
function buildPickerHtml(docId, username) {
  var scriptUrl = ScriptApp.getService().getUrl();
  return '<!DOCTYPE html><html><head>'
    + '<meta charset="UTF-8">'
    + '<meta name="viewport" content="width=device-width,initial-scale=1">'
    + '<title>SAGCO IMS — Upload File</title>'
    + '<style>'
    + '*{box-sizing:border-box;margin:0;padding:0}'
    + 'body{font-family:Arial,sans-serif;background:#f0f3f9;display:flex;align-items:center;justify-content:center;min-height:100vh;padding:20px}'
    + '.box{background:#fff;border-radius:12px;box-shadow:0 8px 32px rgba(0,0,0,.18);width:100%;max-width:500px;overflow:hidden}'
    + '.hdr{background:#1B2A4A;color:#fff;padding:16px 22px}'
    + '.hdr h2{font-size:14px;font-weight:700;margin-bottom:3px;display:flex;align-items:center;gap:8px}'
    + '.hdr p{font-size:10px;opacity:.65}'
    + '.body{padding:22px}'
    + '.zone{border:2px dashed #c8d4e8;border-radius:8px;padding:28px 20px;text-align:center;cursor:pointer;transition:all .15s;background:#f8fafc}'
    + '.zone:hover,.zone.over{border-color:#C9A84C;background:#fef9ed}'
    + '.zone .ico{font-size:32px;margin-bottom:8px}'
    + '.zone strong{display:block;color:#1B2A4A;font-size:13px;margin-bottom:4px}'
    + '.zone small{font-size:10px;color:#5A6478}'
    + 'input[type=file]{display:none}'
    + '.prog{margin-top:16px;display:none}'
    + '.prog-label{font-size:11px;color:#5A6478;margin-bottom:6px;display:flex;justify-content:space-between}'
    + '.prog-track{height:8px;background:#e8ecf3;border-radius:4px;overflow:hidden}'
    + '.prog-fill{height:100%;background:#C9A84C;border-radius:4px;width:0;transition:width .4s ease}'
    + '.prog-fill.done{background:#2E7D32}'
    + '.prog-fill.fail{background:#B71C1C}'
    + '.result{margin-top:14px;padding:11px 14px;border-radius:6px;font-size:12px;line-height:1.5;display:none}'
    + '.result.ok{background:#e8f5e9;border-left:4px solid #2E7D32;color:#1b5e20}'
    + '.result.err{background:#fdecea;border-left:4px solid #B71C1C;color:#7f1111}'
    + '.finfo{margin-top:12px;padding:10px 12px;background:#f0f3f9;border-radius:6px;font-size:11px;color:#1B2A4A;display:none}'
    + '.finfo strong{display:block;margin-bottom:2px}'
    + '.note{font-size:10px;color:#8899aa;text-align:center;margin-top:14px;line-height:1.5}'
    + '.btn-close{display:none;width:100%;margin-top:12px;background:#1B2A4A;color:#fff;border:none;border-radius:6px;padding:10px;font-size:12px;font-weight:700;cursor:pointer}'
    + '</style></head><body>'
    + '<div class="box">'
    +   '<div class="hdr"><h2>Upload Supporting Document</h2>'
    +     '<p>SAGCO IMS · Doc: ' + docId + ' · User: ' + username + '</p></div>'
    +   '<div class="body">'
    +     '<div class="zone" id="zone">'
    +       '<input type="file" id="fi">'
    +       '<div class="ico"></div>'
    +       '<strong>Click to select a file or drag &amp; drop</strong>'
    +       '<small>PDF · DOCX · XLSX · JPG · PNG · any format · max 25 MB</small>'
    +     '</div>'
    +     '<div class="finfo" id="finfo"><strong id="fname"></strong><span id="fsize"></span></div>'
    +     '<div class="prog" id="prog">'
    +       '<div class="prog-label"><span id="prog-txt">Uploading…</span><span id="prog-pct">0%</span></div>'
    +       '<div class="prog-track"><div class="prog-fill" id="prog-fill"></div></div>'
    +     '</div>'
    +     '<div class="result" id="result"></div>'
    +     '<button class="btn-close" id="btn-close" onclick="window.close()">Close this window</button>'
    +     '<p class="note">Files are saved to the SAGCO IMS Google Drive folder<br>and accessible to all users on all devices.</p>'
    +   '</div>'
    + '</div>'
    + '<script>'
    + 'var SCRIPT_URL=' + JSON.stringify(scriptUrl) + ';\n'
    + 'var DOC_ID='     + JSON.stringify(docId)     + ';\n'
    + 'var USERNAME='   + JSON.stringify(username)  + ';\n'
    + 'var uploading=false;\n'
    + 'var simTimer=null;\n'
    + 'var zone=document.getElementById("zone");\n'
    + 'var fi=document.getElementById("fi");\n'
    + 'var prog=document.getElementById("prog");\n'
    + 'var progFill=document.getElementById("prog-fill");\n'
    + 'var progTxt=document.getElementById("prog-txt");\n'
    + 'var progPct=document.getElementById("prog-pct");\n'
    + 'var result=document.getElementById("result");\n'
    + 'var finfo=document.getElementById("finfo");\n'
    + 'var btnClose=document.getElementById("btn-close");\n'
    + 'zone.addEventListener("click",function(e){if(!uploading&&e.target!==fi)fi.click();});\n'
    + 'zone.addEventListener("dragover",function(e){e.preventDefault();zone.classList.add("over");});\n'
    + 'zone.addEventListener("dragleave",function(){zone.classList.remove("over");});\n'
    + 'zone.addEventListener("drop",function(e){e.preventDefault();zone.classList.remove("over");if(!uploading&&e.dataTransfer.files[0])go(e.dataTransfer.files[0]);});\n'
    + 'fi.addEventListener("change",function(){if(!uploading&&fi.files[0])go(fi.files[0]);});\n'
    + 'window.addEventListener("beforeunload",function(e){if(uploading){e.preventDefault();e.returnValue="";}});\n'
    + 'function startSim(from,to,label,ms){clearInterval(simTimer);var cur=from,step=(to-from)/(ms/80);setP(cur,label);simTimer=setInterval(function(){cur=Math.min(cur+step,to);setP(Math.round(cur),label);if(cur>=to)clearInterval(simTimer);},80);}\n'
    + 'function setP(pct,label,cls){progFill.style.width=pct+"%";if(cls)progFill.className="prog-fill "+cls;if(label){progTxt.textContent=label;}progPct.textContent=pct+"%";}\n'
    + 'function go(file){'
    + 'if(file.size>26214400){showErr("File too large — max 25 MB.");return;}'
    + 'uploading=true;zone.style.opacity="0.3";zone.style.pointerEvents="none";'
    + 'finfo.style.display="block";document.getElementById("fname").textContent=file.name;'
    + 'document.getElementById("fsize").textContent=file.size>1048576?(file.size/1048576).toFixed(1)+" MB":Math.round(file.size/1024)+" KB";'
    + 'prog.style.display="block";result.style.display="none";setP(2,"Reading file…");'
    + 'var reader=new FileReader();reader.onerror=function(){showErr("Could not read the file.");};'
    + 'reader.onload=function(ev){startSim(25,75,"☁ Uploading to Google Drive…",4000);var b64=ev.target.result.split(",")[1];'
    + 'google.script.run.withSuccessHandler(function(res){clearInterval(simTimer);if(res&&res.ok){setP(100,"✅ Done!","done");showOk(res);}else{showErr((res&&res.error)||"Upload failed.");}}).withFailureHandler(function(err){clearInterval(simTimer);showErr(err.message||"Server error.");}).uploadFileFromPicker(DOC_ID,file.name,file.type||"application/octet-stream",b64,USERNAME);};'
    + 'startSim(2,25,"Reading file…",600);reader.readAsDataURL(file);}\n'
    + 'function showOk(res){result.style.display="block";result.className="result ok";result.innerHTML="✅ <strong>"+res.fileName+"</strong> saved to Google Drive.<br><small>You can now close this window.</small>";btnClose.style.display="block";uploading=false;if(window.opener){try{window.opener.postMessage({type:"IMS_FILE_UPLOADED",file:res},"*");}catch(e){}}setTimeout(function(){try{window.close();}catch(e){}try{window.location.replace("about:blank");}catch(e){}},3000);}\n'
    + 'function showErr(msg){clearInterval(simTimer);setP(100,"❌ Failed","fail");result.style.display="block";result.className="result err";result.innerHTML="❌ "+msg+"<br><small>Please try again.</small>";btnClose.style.display="block";zone.style.opacity="";zone.style.pointerEvents="";uploading=false;}\n'
    + 'btnClose.addEventListener("click",function(){try{window.close();}catch(e){}try{window.location.replace("about:blank");}catch(e){}});\n'
    + '</script></body></html>';
}

/* ══════════════════════════════════════════════════════════════
   FILE UPLOAD TO GOOGLE DRIVE
══════════════════════════════════════════════════════════════ */
function uploadFileFromPicker(docId, fileName, mimeType, base64Data, uploadedBy) {
  try {
    var folder        = getImsFolder();
    var subFolderName = docId || 'general';
    var subFolder;
    var subFolders = folder.getFoldersByName(subFolderName);
    if (subFolders.hasNext()) { subFolder = subFolders.next(); }
    else { subFolder = folder.createFolder(subFolderName); }

    var decoded  = Utilities.base64Decode(base64Data);
    var blob     = Utilities.newBlob(decoded, mimeType || 'application/octet-stream', fileName);
    var file     = subFolder.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

    var fileId       = file.getId();
    var webViewLink  = 'https://drive.google.com/file/d/' + fileId + '/view';
    var downloadLink = 'https://drive.google.com/uc?export=download&id=' + fileId;

    recordAttachmentInSheet(docId, fileId, fileName, mimeType,
                            webViewLink, downloadLink, uploadedBy || 'unknown', '', 'attachment');

    return { ok: true, fileId: fileId, fileName: fileName, docId: docId,
             webViewLink: webViewLink, downloadLink: downloadLink,
             previewLink: 'https://drive.google.com/file/d/' + fileId + '/preview',
             source: 'drive', date: new Date().toISOString().split('T')[0] };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

function uploadFileToDrive(params) {
  var folder = getImsFolder();
  var subFolderName = 'DOC-' + (params.docId || 'general');
  var subFolder;
  var subFolders = folder.getFoldersByName(subFolderName);
  if (subFolders.hasNext()) { subFolder = subFolders.next(); }
  else { subFolder = folder.createFolder(subFolderName); }

  var base64   = params.base64Data;
  var commaIdx = base64.indexOf(',');
  if (commaIdx >= 0) base64 = base64.substring(commaIdx + 1);

  var decoded  = Utilities.base64Decode(base64);
  var blob     = Utilities.newBlob(decoded, params.mimeType || 'application/octet-stream', params.fileName);
  var file     = subFolder.createFile(blob);
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

  var fileId       = file.getId();
  var webViewLink  = 'https://drive.google.com/file/d/' + fileId + '/view';
  var downloadLink = 'https://drive.google.com/uc?export=download&id=' + fileId;
  var previewLink  = 'https://drive.google.com/file/d/' + fileId + '/preview';

  recordAttachmentInSheet(params.docId, fileId, params.fileName, params.mimeType || '',
    webViewLink, downloadLink, params.uploadedBy || 'unknown',
    params.revisionNote || '', params.attachmentType || 'attachment');

  return { ok: true, fileId: fileId, fileName: params.fileName,
           webViewLink: webViewLink, downloadLink: downloadLink,
           previewLink: previewLink, folderId: subFolder.getId() };
}

function deleteAttachmentFromSheet(fileId, docId) {
  try {
    var ss    = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(' Attachments');
    if (!sheet) return { ok: false, error: 'Attachments sheet not found' };
    var data = sheet.getDataRange().getValues();
    for (var i = data.length - 1; i >= 3; i--) {
      if (String(data[i][1]) === fileId) {
        sheet.deleteRow(i + 1);
        updateAttachmentCount(docId);
        return { ok: true, fileId: fileId, rowDeleted: i + 1 };
      }
    }
    return { ok: false, error: 'File not found: ' + fileId };
  } catch(err) { return { ok: false, error: err.message }; }
}

function saveDocumentRecord(params) {
  try {
    var ss    = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName('Document Register');
    if (!sheet) {
      var sheets = ss.getSheets();
      for (var i = 0; i < sheets.length; i++) {
        if (sheets[i].getName().toLowerCase().replace(/[^\w]/g,'').indexOf('documentregister') >= 0) {
          sheet = sheets[i]; break;
        }
      }
    }
    if (!sheet) return { ok: false, error: 'Document Register sheet not found' };

    var data    = sheet.getDataRange().getValues();
    var headers = data[2] || [];

    function findCol(names) {
      for (var n = 0; n < names.length; n++) {
        for (var c = 0; c < headers.length; c++)
          if (String(headers[c]) === names[n]) return c;
        for (var c2 = 0; c2 < headers.length; c2++)
          if (String(headers[c2]).toLowerCase().replace(/[\s\._]/g,'') ===
              names[n].toLowerCase().replace(/[\s\._]/g,'')) return c2;
      }
      return -1;
    }

    var cols = {
      id: findCol(['Doc ID']), number: findCol(['Document Number']),
      title: findCol(['Document Title']), rev: findCol(['Current Rev.']),
      type: findCol(['Document Type']), status: findCol(['Status']),
      issued: findCol(['Date of Issue']), reviewDue: findCol(['Review Due Date']),
      owner: findCol(['Document Owner']), deleted: findCol(['Deleted']),
      deletedAt: findCol(['Deleted At']), approvalStatus: findCol(['Approval Status']),
      pages: findCol(['Pages','Linked Pages']),
    };

    var existingRow = -1;
    for (var r = 3; r < data.length; r++) {
      if (cols.id >= 0 && String(data[r][cols.id]) === String(params.docId)) {
        existingRow = r + 1; break;
      }
    }

    var rowData = headers.map(function(h, c) {
      var key = Object.keys(cols).find(function(k){ return cols[k] === c; });
      if (!key) return existingRow > 0 ? (data[existingRow - 1][c] || '') : '';
      var map = { id:'docId', number:'docNumber', title:'title', rev:'rev',
                  type:'type', status:'status', issued:'issued',
                  reviewDue:'reviewDue', owner:'owner', deleted:'deleted',
                  deletedAt:'deletedAt', approvalStatus:'approvalStatus', pages:'pages' };
      return params[map[key]] || '';
    });

    if (existingRow > 0) {
      sheet.getRange(existingRow, 1, 1, rowData.length).setValues([rowData]);
    } else {
      sheet.getRange(sheet.getLastRow() + 1, 1, 1, rowData.length).setValues([rowData]);
    }
    return { ok: true, docId: params.docId, action: existingRow > 0 ? 'updated' : 'added' };
  } catch(err) { return { ok: false, error: err.message }; }
}

function listAllVersions() {
  var ss    = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(' Versions');
  if (!sheet) return { versions: [] };
  var data = sheet.getDataRange().getValues();
  var versions = [];
  for (var i = 3; i < data.length; i++) {
    if (data[i][0] && data[i][1]) versions.push({ docId: String(data[i][0]), rev: String(data[i][1]) });
  }
  return { versions: versions };
}

function listVersions(docId) {
  var ss    = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(' Versions');
  if (!sheet) return { versions: [] };
  var data = sheet.getDataRange().getValues();
  var versions = [];
  for (var i = 3; i < data.length; i++) {
    var row = data[i];
    if (String(row[0]) === docId && row[1]) {
      versions.push({ docId: String(row[0]), rev: String(row[1]), ts: String(row[2]),
                      note: String(row[3]), user: String(row[4]), fileName: String(row[5] || ''),
                      webViewLink: String(row[6] || ''), downloadLink: String(row[7] || '') });
    }
  }
  versions.sort(function(a, b) {
    return String(b.rev).localeCompare(String(a.rev), undefined, {numeric: true});
  });
  return { versions: versions, docId: docId };
}

function saveVersion(params) {
  var ss    = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(' Versions');
  if (!sheet) {
    sheet = ss.insertSheet(' Versions');
    sheet.getRange('A1').setValue('SAGCO IMS — Document Version History');
    sheet.getRange('A2').setValue('Auto-maintained by Apps Script — do not edit manually');
    sheet.getRange('A3:H3').setValues([['Doc ID','Revision','Date','Change Description',
      'Updated By','File Name','View Link','Download Link']]);
  }
  sheet.getRange(sheet.getLastRow() + 1, 1, 1, 8).setValues([[
    params.docId || '', params.rev || '',
    params.ts    || new Date().toISOString().split('T')[0],
    params.note  || '', params.user || '',
    params.fileName || '', params.webViewLink || '', params.downloadLink || '',
  ]]);
  updateDocumentRev(params.docId, params.rev);
  return { ok: true, docId: params.docId, rev: params.rev };
}

function updateDocumentRev(docId, rev) {
  try {
    var ss    = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName('Document Register') || ss.getSheetByName(' Document Register');
    if (!sheet) return;
    var data    = sheet.getDataRange().getValues();
    var headers = data[2] || [];
    var idCol = -1; var revCol = -1;
    for (var c = 0; c < headers.length; c++) {
      if (String(headers[c]) === 'Doc ID') idCol = c;
      if (String(headers[c]) === 'Current Rev.') revCol = c;
    }
    if (idCol < 0 || revCol < 0) return;
    for (var r = 3; r < data.length; r++) {
      if (String(data[r][idCol]) === String(docId)) {
        sheet.getRange(r + 1, revCol + 1).setValue(rev); return;
      }
    }
  } catch(e) { Logger.log('updateDocumentRev error: ' + e.message); }
}

function deleteFileFromDrive(fileId) {
  try { DriveApp.getFileById(fileId).setTrashed(true); return { ok: true, fileId: fileId }; }
  catch (err) { return { ok: false, error: err.message }; }
}

/* ══════════════════════════════════════════════════════════════
   DOCUMENT REGISTER — READ
══════════════════════════════════════════════════════════════ */
function readAllDocuments() {
  var ss    = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(' Document Register');
  if (!sheet) return { error: 'Document Register sheet not found', docs: [] };
  var data    = sheet.getDataRange().getValues();
  if (data.length < 4) return { docs: [] };
  var headers = data[2];
  var docs    = [];
  for (var i = 3; i < data.length; i++) {
    var row = data[i];
    if (!row[0]) continue;
    var doc = {};
    headers.forEach(function(h, idx) { doc[h] = String(row[idx] || ''); });
    doc._attachments = getAttachmentsForDoc(doc['Doc ID'] || doc[headers[0]]);
    docs.push(doc);
  }
  return { docs: docs, count: docs.length };
}

function readDocument(docId) {
  var all = readAllDocuments();
  if (all.error) return all;
  var doc = all.docs.find(function(d) { return d['Doc ID'] === docId; });
  if (!doc) return { error: 'Document not found: ' + docId };
  doc._attachments = getAttachmentsForDoc(docId);
  return { doc: doc };
}

function listDocumentFiles(docId) {
  return { files: getAttachmentsForDoc(docId), docId: docId };
}

function getAttachmentsForDoc(docId) {
  var ss    = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(' Attachments');
  if (!sheet) return [];
  var data = sheet.getDataRange().getValues();
  if (data.length < 4) return [];
  var files = [];
  for (var i = 3; i < data.length; i++) {
    var row = data[i];
    if (String(row[0]) === docId && row[1]) {
      files.push({ docId: String(row[0]), fileId: String(row[1]), fileName: String(row[2]),
                   mimeType: String(row[3]), uploadedDate: String(row[4]), uploadedBy: String(row[5]),
                   webViewLink: String(row[6]), downloadLink: String(row[7]),
                   attachType: String(row[8] || 'attachment'), revNote: String(row[9] || ''),
                   size: String(row[10] || '') });
    }
  }
  return files;
}

function recordAttachmentInSheet(docId, fileId, fileName, mimeType,
                                  webViewLink, downloadLink, uploadedBy, revNote, attachType) {
  var ss    = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(' Attachments');
  if (!sheet) {
    sheet = ss.insertSheet(' Attachments');
    sheet.getRange('A1').setValue('SAGCO IMS — Attachments Register');
    sheet.getRange('A2').setValue('Auto-maintained by Apps Script — do not edit manually');
    sheet.getRange('A3:K3').setValues([['Doc ID','File ID','File Name','MIME Type','Upload Date',
      'Uploaded By','View Link','Download Link','Type','Revision Note','Size']]);
  }
  sheet.getRange(sheet.getLastRow() + 1, 1, 1, 11).setValues([[
    docId, fileId, fileName, mimeType,
    new Date().toISOString().split('T')[0],
    uploadedBy, webViewLink, downloadLink, attachType, revNote, ''
  ]]);
  updateAttachmentCount(docId);
}

function updateAttachmentCount(docId) {
  var files    = getAttachmentsForDoc(docId);
  var attCount = files.filter(function(f){ return f.attachType === 'attachment'; }).length;
  var verCount = files.filter(function(f){ return f.attachType === 'version'; }).length;
  var ss    = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(' Document Register');
  if (!sheet) return;
  var data = sheet.getDataRange().getValues();
  for (var i = 3; i < data.length; i++) {
    if (String(data[i][0]) === docId) {
      sheet.getRange(i + 1, 12).setValue(attCount + ' file' + (attCount !== 1 ? 's' : ''));
      sheet.getRange(i + 1, 13).setValue(verCount + ' version' + (verCount !== 1 ? 's' : ''));
      break;
    }
  }
}

/* ══════════════════════════════════════════════════════════════
   AUDIT LOG
══════════════════════════════════════════════════════════════ */
function appendAuditLog(action, detail, userId, username) {
  var ss    = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(' Access & Audit Log');
  if (!sheet) return { error: 'Audit log sheet not found' };
  sheet.getRange(sheet.getLastRow() + 1, 1, 1, 8).setValues([[
    new Date().toISOString(), action || '', username || '',
    userId || '', detail || '', '', 'OK', 'System'
  ]]);
  return { ok: true };
}

/* ══════════════════════════════════════════════════════════════
   STANDARD READ
══════════════════════════════════════════════════════════════ */
function readSheet(tabKey) {
  var sheetName = TABS[tabKey];
  if (!sheetName) return { error: 'Unknown tab: ' + tabKey, headers: [], rows: [], rowCount: 0 };

  var sheet = findSheet(sheetName);
  if (!sheet) return { error: 'Sheet not found: ' + sheetName, headers: [], rows: [], rowCount: 0 };

  var data     = sheet.getDataRange().getValues();
  var headers  = data[2] || [];
  var rows     = data.slice(3);
  var nonEmpty = rows.filter(function(r){ return r.some(function(c){ return c !== ''; }); });

  return {
    headers:  headers.map(String),
    rows:     nonEmpty.map(function(r){
      return r.map(function(c){
        if (c === '' || c === null || c === undefined) return '';
        if (c instanceof Date) {
          if (isNaN(c.getTime())) return '';
          var y = c.getFullYear();
          var m = String(c.getMonth()+1).padStart(2,'0');
          var d = String(c.getDate()).padStart(2,'0');
          return y+'-'+m+'-'+d;
        }
        return String(c);
      });
    }),
    rowCount: nonEmpty.length,
    sheet:    sheet.getName(),
    tab:      tabKey,
  };
}

/* -- readExternalSheet ------------------------------------------
   Same job as readSheet(), but for a tab living in the separate
   Observations (AppSheet) spreadsheet rather than this IMS sheet —
   opened with SpreadsheetApp.openById(OBS_SPREADSHEET_ID), read-only.

   Row layout differs from the IMS sheets: this is a plain AppSheet
   export, so headers are ROW 1 and data starts ROW 2 (not row 3/4
   like the IMS tabs), and column names are the AppSheet field names
   (e.g. case_id, qr_code_id) rather than IMS's "Title Case" headers.
   GET ?action=readObs&tab=obs_main
   ------------------------------------------------------------- */
function readExternalSheet(tabKey) {
  var sheetName = OBS_TABS[tabKey];
  if (!sheetName) return { error: 'Unknown Observations tab: ' + tabKey, headers: [], rows: [], rowCount: 0 };

  var ss;
  try {
    ss = SpreadsheetApp.openById(OBS_SPREADSHEET_ID);
  } catch (err) {
    return { error: 'Could not open Observations spreadsheet (check OBS_SPREADSHEET_ID and sharing): ' + err.message, headers: [], rows: [], rowCount: 0 };
  }

  var sheet = findSheetIn(ss, sheetName);
  if (!sheet) return { error: 'Sheet not found in Observations spreadsheet: ' + sheetName, headers: [], rows: [], rowCount: 0 };

  var data     = sheet.getDataRange().getValues();
  var headers  = data[0] || [];
  var rows     = data.slice(1);
  var nonEmpty = rows.filter(function(r){ return r.some(function(c){ return c !== ''; }); });

  return {
    headers:  headers.map(String),
    rows:     nonEmpty.map(function(r){
      return r.map(function(c){
        if (c === '' || c === null || c === undefined) return '';
        if (c instanceof Date) {
          if (isNaN(c.getTime())) return '';
          var y = c.getFullYear();
          var m = String(c.getMonth()+1).padStart(2,'0');
          var d = String(c.getDate()).padStart(2,'0');
          var hh = String(c.getHours()).padStart(2,'0');
          var mm = String(c.getMinutes()).padStart(2,'0');
          /* Main sheet's datetime_of_case carries a time-of-day that
             matters for sorting/display — unlike the IMS date-only
             fields, so this keeps HH:MM rather than truncating it. */
          return y+'-'+m+'-'+d+' '+hh+':'+mm;
        }
        return String(c);
      });
    }),
    rowCount: nonEmpty.length,
    sheet:    sheet.getName(),
    tab:      tabKey,
  };
}

/* -- getObsPhotos -------------------------------------------------
   Looks up every photo attached to one Observations case_id. The
   "photo" tab in the external AppSheet spreadsheet stores a Drive
   PATH, not a file ID — something like "Shared drives/SAGCO_IMS/
   AppSheet Images/photo_Images/PID-....jpg" — and that folder is
   owned by the separate business-account AppSheet app, now shared
   Viewer-only with this script's account.

   Because this account only has Viewer rights there (not edit/owner),
   it can't call setSharing() to mint a public link the way
   uploadFileFromPicker() does for the IMS's own attachments. Instead
   this fetches the file's bytes server-side — which Viewer access is
   enough for — and returns them inline as a base64 data URI, so the
   page can drop the result straight into <img src="..."> with no
   Drive permissions needed in the browser at all.

   Matches by file NAME (DriveApp.getFilesByName), not the full path,
   since Apps Script's DriveApp doesn't walk Shared-Drive folder paths
   the way a normal filesystem does; getFilesByName searches every
   Drive the account can see (My Drive + any shared folders/drives
   it's a member of), which is sufficient as long as these generated
   filenames stay unique.
   GET ?action=getObsPhotos&caseId=CASE-20251124-9bf10002
   ------------------------------------------------------------- */
function getObsPhotos(caseId) {
  if (!caseId) return { error: 'Missing caseId', caseId: caseId, photos: [] };

  var photoSheetData;
  try {
    photoSheetData = readExternalSheet('obs_photo');
  } catch (err) {
    return { error: 'Could not read photo tab: ' + err.message, caseId: caseId, photos: [] };
  }
  if (photoSheetData.error) {
    return { error: photoSheetData.error, caseId: caseId, photos: [] };
  }

  var headers   = photoSheetData.headers;
  var caseIdCol = headers.indexOf('case_id');
  var pathCol   = headers.indexOf('photo');
  if (caseIdCol === -1 || pathCol === -1) {
    return { error: 'photo tab is missing a case_id or photo column', caseId: caseId, photos: [] };
  }

  var matches = photoSheetData.rows.filter(function(r){ return r[caseIdCol] === caseId; });
  if (!matches.length) return { caseId: caseId, photos: [] };

  var photos = matches.map(function(r){
    var path     = r[pathCol] || '';
    var fileName = path.split('/').pop();
    if (!fileName) return { fileName: '', error: 'Empty photo path on this row', dataUrl: null };

    try {
      var files = DriveApp.getFilesByName(fileName);
      if (!files.hasNext()) {
        return { fileName: fileName, error: 'File not found — check the AppSheet images folder is shared with this script\'s account', dataUrl: null };
      }
      var file = files.next();
      var blob = file.getBlob();
      var b64  = Utilities.base64Encode(blob.getBytes());
      var mime = blob.getContentType() || 'image/jpeg';
      return { fileName: fileName, dataUrl: 'data:' + mime + ';base64,' + b64 };
    } catch (err) {
      return { fileName: fileName, error: err.message, dataUrl: null };
    }
  });

  return { caseId: caseId, photos: photos };
}

/* ══════════════════════════════════════════════════════════════
   DRIVE FOLDER HELPERS
══════════════════════════════════════════════════════════════ */
function getImsFolder() {
  if (DRIVE_FOLDER_ID && DRIVE_FOLDER_ID !== 'PASTE_FOLDER_ID_HERE_AFTER_RUNNING_initDriveFolder') {
    try { return DriveApp.getFolderById(DRIVE_FOLDER_ID); } catch(e) {}
  }
  var folders = DriveApp.getFoldersByName('SAGCO IMS Attachments');
  if (folders.hasNext()) return folders.next();
  var f = DriveApp.createFolder('SAGCO IMS Attachments');
  Logger.log('Created folder. Copy this ID into DRIVE_FOLDER_ID: ' + f.getId());
  return f;
}

function initDriveFolder() {
  var folders = DriveApp.getFoldersByName('SAGCO IMS Attachments');
  var folder;
  if (folders.hasNext()) { folder = folders.next(); Logger.log('Folder already exists.'); }
  else { folder = DriveApp.createFolder('SAGCO IMS Attachments'); Logger.log('Folder created.'); }
  Logger.log('FOLDER ID: ' + folder.getId());
  Logger.log('Paste this into DRIVE_FOLDER_ID at the top of this script.');
  var ss    = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(' Attachments');
  if (!sheet) {
    sheet = ss.insertSheet(' Attachments');
    sheet.getRange('A1').setValue('SAGCO IMS — Attachments Register');
    sheet.getRange('A2').setValue('Auto-maintained by Apps Script — do not edit manually');
    sheet.getRange('A3:K3').setValues([['Doc ID','File ID','File Name','MIME Type','Upload Date',
      'Uploaded By','View Link','Download Link','Type','Revision Note','Size']]);
    Logger.log('Created  Attachments sheet.');
  } else { Logger.log(' Attachments sheet already exists.'); }
  return { folderId: folder.getId(), folderName: folder.getName() };
}

function testAllTabs() {
  var ss      = SpreadsheetApp.getActiveSpreadsheet();
  var results = [];
  Object.keys(TABS).forEach(function(key) {
    var name  = TABS[key];
    var sheet = ss.getSheetByName(name);
    results.push(key + ' → ' + name + ' : ' + (sheet ? '✅ FOUND' : '❌ NOT FOUND'));
  });
  [' Attachments'].forEach(function(n){
    var s = ss.getSheetByName(n);
    results.push(n + ' : ' + (s ? '✅ FOUND' : '❌ NOT FOUND (run initDriveFolder)'));
  });
  Logger.log(results.join('\n'));
  return results;
}

/* ══════════════════════════════════════════════════════════════
   APPROVAL WORKFLOW FUNCTIONS (unchanged from Rev.19)
══════════════════════════════════════════════════════════════ */
function getOrCreateApprovalsSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName('Approvals');
  if (!sh) {
    sh = ss.insertSheet('Approvals');
    var hdr = ['Approval ID','Doc ID','Rev','Approver','Approver Role',
               'Status','Comments','Submitted By','Submitted At','Timestamp'];
    sh.getRange(1, 1, 1, hdr.length).setValues([hdr]);
    sh.getRange(1, 1, 1, hdr.length).setBackground('#1a2340').setFontColor('#ffffff').setFontWeight('bold');
    sh.setFrozenRows(1);
  }
  return sh;
}

function saveApprovalRecord(p) {
  try {
    var sh   = getOrCreateApprovalsSheet();
    var data = sh.getDataRange().getValues();
    var hdr  = data[0];
    function col(name) { var i = hdr.indexOf(name); return i >= 0 ? i : -1; }
    var existingRow = -1;
    for (var r = 1; r < data.length; r++) {
      if (String(data[r][col('Approval ID')]) === String(p.approvalId || '')) { existingRow = r + 1; break; }
    }
    var rowData = new Array(hdr.length).fill('');
    rowData[col('Approval ID')]   = p.approvalId   || '';
    rowData[col('Doc ID')]        = p.docId        || '';
    rowData[col('Rev')]           = p.rev          || '';
    rowData[col('Approver')]      = p.approver     || '';
    rowData[col('Approver Role')] = p.approverRole || '';
    rowData[col('Status')]        = p.status       || 'Pending';
    rowData[col('Comments')]      = p.comments     || '';
    rowData[col('Submitted By')]  = p.submittedBy  || '';
    rowData[col('Submitted At')]  = p.submittedAt  || '';
    rowData[col('Timestamp')]     = p.timestamp    || new Date().toISOString().split('T')[0];
    if (existingRow > 0) { sh.getRange(existingRow, 1, 1, hdr.length).setValues([rowData]); }
    else { sh.appendRow(rowData); }
    updateDocApprovalStatus(p.docId, p.rev, 'Pending');
    return ContentService.createTextOutput(JSON.stringify({ ok: true })).setMimeType(ContentService.MimeType.JSON);
  } catch (e) {
    return ContentService.createTextOutput(JSON.stringify({ ok: false, error: e.message })).setMimeType(ContentService.MimeType.JSON);
  }
}

function updateApprovalRecord(p) {
  try {
    var sh   = getOrCreateApprovalsSheet();
    var data = sh.getDataRange().getValues();
    var hdr  = data[0];
    function col(name) { return hdr.indexOf(name); }
    var found = false;
    for (var r = 1; r < data.length; r++) {
      if (String(data[r][col('Approval ID')]) === String(p.approvalId || '')) {
        sh.getRange(r+1, col('Status')+1).setValue(p.status || '');
        sh.getRange(r+1, col('Comments')+1).setValue(p.comments || '');
        sh.getRange(r+1, col('Timestamp')+1).setValue(p.timestamp || new Date().toISOString().split('T')[0]);
        found = true; break;
      }
    }
    if (found) {
      var allRecords = sh.getDataRange().getValues();
      var allHdr = allRecords[0];
      function c(n) { return allHdr.indexOf(n); }
      var docRecs = allRecords.slice(1).filter(function(row) {
        return String(row[c('Doc ID')]) === String(p.docId) && String(row[c('Rev')]) === String(p.rev);
      });
      var statuses   = docRecs.map(function(row) { return String(row[c('Status')]); });
      var hasReject  = statuses.some(function(s) { return s === 'Rejected'; });
      var hasPend    = statuses.some(function(s) { return s === 'Pending'; });
      var allApprove = statuses.length > 0 && statuses.every(function(s) { return s === 'Approved'; });
      var overall    = hasReject ? 'Rejected' : hasPend ? 'Pending' : allApprove ? 'Approved' : 'Pending';
      updateDocApprovalStatus(p.docId, p.rev, overall);
      if (allApprove) setDocumentStatusActive(p.docId);
      if (hasReject)  setDocumentStatusDraft(p.docId);
    }
    return ContentService.createTextOutput(JSON.stringify({ ok: true, found: found })).setMimeType(ContentService.MimeType.JSON);
  } catch (e) {
    return ContentService.createTextOutput(JSON.stringify({ ok: false, error: e.message })).setMimeType(ContentService.MimeType.JSON);
  }
}

function updateDocApprovalStatus(docId, rev, approvalStatus) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sh = ss.getSheetByName('Document Register');
    if (!sh) return;
    var data = sh.getDataRange().getValues();
    var hdr  = data[2];
    var idCol = hdr.indexOf('Doc ID'); var apCol = hdr.indexOf('Approval Status');
    if (idCol < 0 || apCol < 0) return;
    for (var r = 3; r < data.length; r++) {
      if (String(data[r][idCol]) === String(docId)) { sh.getRange(r+1, apCol+1).setValue(approvalStatus); break; }
    }
  } catch (e) { /* silent */ }
}

function setDocumentStatusActive(docId) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sh = ss.getSheetByName('Document Register');
    if (!sh) return;
    var data = sh.getDataRange().getValues(); var hdr = data[2];
    var idCol = hdr.indexOf('Doc ID'); var stCol = hdr.indexOf('Status');
    if (idCol < 0 || stCol < 0) return;
    for (var r = 3; r < data.length; r++) {
      if (String(data[r][idCol]) === String(docId)) { sh.getRange(r+1, stCol+1).setValue('Active'); break; }
    }
  } catch (e) { /* silent */ }
}

function setDocumentStatusDraft(docId) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sh = ss.getSheetByName('Document Register');
    if (!sh) return;
    var data = sh.getDataRange().getValues(); var hdr = data[2];
    var idCol = hdr.indexOf('Doc ID'); var stCol = hdr.indexOf('Status');
    if (idCol < 0 || stCol < 0) return;
    for (var r = 3; r < data.length; r++) {
      if (String(data[r][idCol]) === String(docId)) { sh.getRange(r+1, stCol+1).setValue('Draft'); break; }
    }
  } catch (e) { /* silent */ }
}

/* ══════════════════════════════════════════════════════════════
   VISITOR & CONTRACTOR – EMAIL + WORKFLOW (Rev.21)
   Added 2026-11-11
══════════════════════════════════════════════════════════════ */

/* Configurable addresses – CHANGE THESE to your real emails */
// SAFETY_CONTROLLER_EMAIL removed – selection is now compulsory on the invitation form
// var SAFETY_CONTROLLER_EMAIL = 'safety@sagco.com.sa';
var IMS_FROM_NAME           = 'SAGCO IMS – Visitor Gate';
// Rev.33 (Issam, voice, 2026-11-12) — the real GitHub Pages address of
// visitor-induction.html, confirmed by Issam, used to build the
// direct "Review and Approve" link in the submission-notification
// email below.
var VC_PORTAL_URL = 'https://sagcodrv-ux.github.io/sagco-im/visitor-induction.html';

/**
 * Called by the public registration page after the visitor submits the form.
 * 1. Updates the vc_persons row (status → Submitted + personal data)
 * 2. Sends email notification to the person who created the invitation
 */
// Rev.22 (Issam, voice, 2026-11-12) — step-by-step logging added, so
// the Executions screen shows exactly where this stopped instead of
// just "Completed" (which Apps Script shows even when this function
// returned an error internally — it only means the script didn't
// crash, not that the email actually sent). Every meaningful step now
// has its own Logger.log line, and sendVisitorSubmittedEmail's own
// MailApp call is now wrapped so a send failure is LOGGED and
// reported back in the response, instead of throwing silently or
// being swallowed by doPost's outer catch.
// Rev.24 (Issam, voice, 2026-11-12) — GROUP SUBMISSIONS. One
// invitation link can now carry more than one person: the external
// person who opens the public link (the requester) may be coming
// alone or bringing a group from the same company, and fills in one
// row per person plus their OWN email once (new 'Requester Email'
// column — distinct from 'Registered By Email', which is the SAGCO
// colleague who created the invitation link itself). The Invitation
// Token is the group key: every person submitted together shares it,
// the same way they already shared it as a single row before this.
//
// Backward compatible: if the request body has no `people` array
// (an older cached copy of visitor-register.html, or a direct API
// call), this still works exactly as before — data.firstName etc. at
// the top level is treated as a single-person group of one, and
// data.email (not data.requesterEmail) is used for both that
// person's own Email and, since there is no separate requester in
// that case, is also treated as the requester's email for the group
// email at approval time.
function submitVisitorRegistration(data) {
  try {
    Logger.log('submitVisitorRegistration: started, token=' + (data && data.token));

    if (!data || !data.token) {
      Logger.log('submitVisitorRegistration: FAILED — missing token in request body');
      return { status: 'error', message: 'Missing invitation token' };
    }

    var token = String(data.token).trim();
    var sheetName = TABS['vc_persons'];
    var sheet = findSheet(sheetName);
    if (!sheet) {
      Logger.log('submitVisitorRegistration: FAILED — VC Persons sheet not found (looked for "' + sheetName + '")');
      return { status: 'error', message: 'VC Persons sheet not found' };
    }

    var headerRow = sheet.getRange(3, 1, 1, sheet.getLastColumn()).getValues()[0];
    var tokenCol  = headerRow.indexOf('Invitation Token');
    if (tokenCol < 0) {
      Logger.log('submitVisitorRegistration: FAILED — Invitation Token column missing from row 3');
      return { status: 'error', message: 'Invitation Token column missing' };
    }

    var lastRow = sheet.getLastRow();
    var targetRow = -1;
    if (lastRow >= 4) {
      var tokens = sheet.getRange(4, tokenCol + 1, lastRow - 3, 1).getValues();
      for (var i = 0; i < tokens.length; i++) {
        if (String(tokens[i][0]) === token) { targetRow = i + 4; break; }
      }
    }
    if (targetRow < 0) {
      Logger.log('submitVisitorRegistration: FAILED — no row found with Invitation Token = ' + token);
      return { status: 'error', message: 'Invalid or expired invitation token' };
    }
    Logger.log('submitVisitorRegistration: matched invitation at row ' + targetRow);

    // Normalize to an array of people, old-flat-fields style falls
    // back to a single-person array of one.
    var people = Array.isArray(data.people) && data.people.length ? data.people : [{
      firstName: data.firstName || '', familyName: data.familyName || '',
      idNumber: data.idNumber || '', phone: data.phone || '',
      email: data.email || '', company: data.company || ''
    }];
    var requesterEmail = String(data.requesterEmail || data.email || '').trim();
    Logger.log('submitVisitorRegistration: ' + people.length + ' person(s) in this submission, requesterEmail=' + requesterEmail);

    var submittedDate = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd');
    var requesterEmailColIdx = headerRow.indexOf('Requester Email');

    // First person updates the EXISTING invitation row (same as
    // before this change) — this keeps every other part of the sheet
    // (the row created at invitation time, its Person ID) working
    // exactly as it always has for a single-person submission.
    var firstUpdates = {
      'First Name':          people[0].firstName || '',
      'Family Name':         people[0].familyName || '',
      'ID Number':           people[0].idNumber || '',
      'Phone':               people[0].phone || '',
      'Email':               people[0].email || '',
      'Company':             people[0].company || '',
      'Registration Status': 'Submitted',
      'Submitted Date':      submittedDate
    };
    if (requesterEmailColIdx >= 0) firstUpdates['Requester Email'] = requesterEmail;

    var existingRow = sheet.getRange(targetRow, 1, 1, headerRow.length).getValues()[0];
    var newRow = headerRow.map(function(header, idx) {
      return firstUpdates[header] !== undefined ? firstUpdates[header] : existingRow[idx];
    });
    sheet.getRange(targetRow, 1, 1, headerRow.length).setValues([newRow]);
    Logger.log('submitVisitorRegistration: row ' + targetRow + ' (person 1 of ' + people.length + ') updated to Registration Status = Submitted');

    var primaryPerson = {};
    headerRow.forEach(function(h, idx) { primaryPerson[h] = newRow[idx]; });
    var personIds = [primaryPerson['Person ID']];

    // Any ADDITIONAL people in the group get brand-new rows, sharing
    // the same Invitation Token, Destination/Host/Type (copied from
    // the primary row), and Requester Email, so every member of the
    // group is still a real, individually-trackable row for Induction
    // and PPE — this is a group SUBMISSION, not a group PERSON.
    if (people.length > 1){
      var personIdColIdx = headerRow.indexOf('Person ID');
      var carryFields = ['Invitation Token','Type','Destination Department','Host Name','Host Department',
        'Registered By','Registered By Email','Registered Date','Record Status','Safety Controllers','Notes'];
      for (var p = 1; p < people.length; p++){
        var personRow = headerRow.map(function(header){
          if (header === 'First Name') return people[p].firstName || '';
          if (header === 'Family Name') return people[p].familyName || '';
          if (header === 'ID Number') return people[p].idNumber || '';
          if (header === 'Phone') return people[p].phone || '';
          if (header === 'Email') return people[p].email || '';
          if (header === 'Company') return people[p].company || '';
          if (header === 'Registration Status') return 'Submitted';
          if (header === 'Submitted Date') return submittedDate;
          if (header === 'Requester Email') return requesterEmail;
          if (header === 'Induction Status') return 'Not Inducted';
          if (header === 'PPE Status') return 'Not Issued';
          if (header === 'Person ID') return nextVcPersonId_(sheet, headerRow, personIdColIdx);
          if (carryFields.indexOf(header) >= 0) return primaryPerson[header] || '';
          return '';
        });
        sheet.appendRow(personRow);
        var addedId = personIdColIdx >= 0 ? personRow[personIdColIdx] : '';
        personIds.push(addedId);
        Logger.log('submitVisitorRegistration: appended row for person ' + (p+1) + ' of ' + people.length + ', Person ID=' + addedId);
      }
    }

    // Send notification to invitation owner (the SAGCO colleague who
    // created the link) — unchanged from before, still one email,
    // now mentioning the group size.
    var ownerEmail = primaryPerson['Registered By Email'] || primaryPerson['Creator Email'] || '';
    var emailSource = ownerEmail ? 'Registered By Email / Creator Email column' : '';
    if (!ownerEmail && primaryPerson['Registered By']) {
      ownerEmail = lookupUserEmailByName(primaryPerson['Registered By']);
      if (ownerEmail) emailSource = 'name lookup in User Register for "' + primaryPerson['Registered By'] + '"';
    }
    Logger.log('submitVisitorRegistration: owner email resolved to "' + ownerEmail + '" (source: ' + (emailSource || 'none found') + ')');

    var mailStatus = 'not attempted — no owner email found';
    if (ownerEmail) {
      try {
        sendVisitorSubmittedEmail(primaryPerson, ownerEmail, people.length, personIds);
        mailStatus = 'sent';
        Logger.log('submitVisitorRegistration: MailApp.sendEmail succeeded, to=' + ownerEmail);
      } catch (mailErr) {
        mailStatus = 'FAILED: ' + mailErr;
        Logger.log('submitVisitorRegistration: MailApp.sendEmail THREW — ' + mailErr);
      }
    }

    // Rev.23 (Issam, voice, 2026-11-12) — writes the mail outcome onto
    // the PRIMARY row, in two columns: 'Notification Status' and
    // 'Notification Time'. One write per submission (not per person
    // in the group) — it's the submission-to-creator email, not a
    // per-person thing.
    var notifyColIdx = headerRow.indexOf('Notification Status');
    var notifyTimeColIdx = headerRow.indexOf('Notification Time');
    if (notifyColIdx >= 0) sheet.getRange(targetRow, notifyColIdx + 1).setValue(mailStatus);
    if (notifyTimeColIdx >= 0) sheet.getRange(targetRow, notifyTimeColIdx + 1).setValue(
      Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm')
    );
    if (notifyColIdx < 0 && notifyTimeColIdx < 0) {
      Logger.log('submitVisitorRegistration: "Notification Status"/"Notification Time" columns not found on VC Persons — mail status not written to sheet (log only).');
    }

    appendAuditLog('VC_SUBMIT', 'Group of ' + people.length + ' submitted via token ' + token + ' — notification email: ' + mailStatus, 'public', 'Public Registration');
    Logger.log('submitVisitorRegistration: finished, mailStatus=' + mailStatus);

    return {
      status: 'ok',
      message: people.length > 1
        ? 'Registration submitted for ' + people.length + ' people. The invitation owner has been notified.'
        : 'Registration submitted successfully. The invitation owner has been notified.',
      personId: primaryPerson['Person ID'],
      personIds: personIds,
      mailStatus: mailStatus,
      ownerEmail: ownerEmail
    };

  } catch (err) {
    Logger.log('submitVisitorRegistration: THREW — ' + err);
    return { status: 'error', message: err.toString() };
  }
}

// Rev.31 (Issam, voice, 2026-11-12) — one email to the single Safety
// approver the Safety Controller picked when raising the violation
// (replaces the earlier Supervisor-then-Manager chain — Issam's own
// reasoning was that an area/line manager reviewing a violation
// involving their own people isn't independent, where a Safety
// person is). Links straight back to violation-register.html with
// ?ref=<Violation Ref>, which the page's own init reads to auto-open
// that exact record — the approver doesn't need to search for it.
function sendViolationStageEmail(data) {
  try {
    if (!data || !data.toEmail || !data.ref) {
      return { status: 'error', message: 'Missing toEmail or ref' };
    }
    var subject = 'SAGCO IMS – HSE Violation ' + vEscPlain_(data.ref) + ' Awaiting Your Approval';
    var link = (data.pageUrl || 'violation-register.html') + '?ref=' + encodeURIComponent(data.ref);
    var body = ''
      + 'Dear ' + (data.toName || 'Colleague') + ',\n\n'
      + 'An HSE violation has been raised and needs your review.\n\n'
      + 'Violation Ref   : ' + (data.ref || '') + '\n'
      + 'Employee        : ' + (data.employeeName || '') + '\n'
      + 'Department      : ' + (data.department || '') + '\n'
      + 'Category        : ' + (data.category || '') + '\n'
      + 'Date            : ' + (data.date || '') + '\n'
      + '\nOpen the Violation Register and review this record:\n' + link + '\n\n'
      + 'SAGCO IMS – HSE Violation Register';

    MailApp.sendEmail({ to: data.toEmail, subject: subject, body: body, name: IMS_FROM_NAME });
    return { status: 'ok', message: 'Notification sent to ' + data.toEmail };
  } catch (err) {
    Logger.log('sendViolationStageEmail: THREW — ' + err);
    return { status: 'error', message: err.toString() };
  }
}
function vEscPlain_(v){ return String(v==null?'':v); }

// Rev.31 (Issam, voice, 2026-11-24) — Security Operations Hub patrol
// tour: once a round is more than PATROL_INTERVAL_HOURS overdue,
// security-hub.html calls this to alert every Safety Controller it
// found on the Users roster (isSafety() there — role/department/title
// matching "safety", "hse" or "controller", same test ptw-mobile.html
// already uses). One email, every controller in the "to" line, same
// shape as sendViolationStageEmail/sendPtwStageEmail above — this only
// sends the email, it changes nothing on the sheet.
function sendOverduePatrolAlert(data) {
  try {
    var toList = (data && data.toEmails) || [];
    if (typeof toList === 'string') toList = toList.split(',').map(function(s){ return s.trim(); }).filter(Boolean);
    if (!data || !toList.length) {
      return { status: 'error', message: 'Missing toEmails' };
    }
    var subject = 'SAGCO IMS – Security Patrol Overdue';
    var link = data.pageUrl || 'security-hub.html';
    var body = ''
      + 'Dear Safety Controller,\n\n'
      + 'The next security patrol tour is overdue.\n\n'
      + 'Last round         : ' + (data.lastPatrolTime || '—') + ' on ' + (data.lastPatrolDate || '—') + '\n'
      + 'Overdue by         : ' + (data.overdueHours || '—') + ' hour(s)\n'
      + 'Area / Route (last): ' + (data.area || '') + '\n'
      + '\nOpen the Security Operations Hub:\n' + link + '\n\n'
      + 'SAGCO IMS – Security Operations Hub';

    MailApp.sendEmail({ to: toList.join(','), subject: subject, body: body, name: IMS_FROM_NAME });
    return { status: 'ok', message: 'Alert sent to ' + toList.join(', ') };
  } catch (err) {
    Logger.log('sendOverduePatrolAlert: THREW — ' + err);
    return { status: 'error', message: err.toString() };
  }
}

// Rev.29 (Issam, voice, 2026-11-15) — PTW two-step approval chain.
// Mirrors sendViolationStageEmail's shape: ptw-register.html has
// already written the Status change itself via the ordinary 'update'
// action before calling this — this only sends the email to whichever
// person is next in line (data.stage: 'areaManager' or 'controller').
function sendPtwStageEmail(data) {
  try {
    if (!data || !data.toEmail || !data.permitId) {
      return { status: 'error', message: 'Missing toEmail or permitId' };
    }
    // Rev.37 (Issam, voice, 2026-11-15) — closing a permit is now the
    // Safety Controller's call alone, not a second approval step for
    // the Area Manager — he's only kept aware it happened. 'closed'
    // gets its own wording (no "awaiting approval", nothing to
    // approve) rather than reusing the approval-stage subject/body.
    var isClosedNotice = data.stage === 'closed';
    var stageLabel = data.stage === 'controller' ? 'Controller Approval' : 'Area Manager Approval';
    var subject = isClosedNotice
      ? 'SAGCO IMS – Permit ' + vEscPlain_(data.permitId) + ' Closed'
      : 'SAGCO IMS – Permit ' + vEscPlain_(data.permitId) + ' Awaiting Your Approval';
    var link = (data.pageUrl || 'ptw-register.html') + '?permitId=' + encodeURIComponent(data.permitId);
    // Rev.33 (Issam, voice, 2026-11-15) — a second link straight to the
    // read-only Permit Pack (the permit plus every linked checklist,
    // real filled data, not just a "Completed" badge), so the approver
    // can actually review what they're signing off on before even
    // opening Edit.
    var packLink = link + '&pack=1';
    var body = isClosedNotice
      ? ''
        + 'Dear ' + (data.toName || 'Colleague') + ',\n\n'
        + 'This Permit to Work has been closed by the Safety Controller. No action is needed from you — this is for your awareness only.\n\n'
        + 'Permit ID       : ' + (data.permitId || '') + '\n'
        + 'Area            : ' + (data.area || '') + '\n'
        + 'Location        : ' + (data.location || '') + '\n'
        + 'Work Involved   : ' + (data.workInvolved || '') + '\n'
        + 'Date            : ' + (data.date || '') + '\n'
        + '\nView the closed permit:\n' + link + '\n\n'
        + 'SAGCO IMS – Permit to Work Register'
      : ''
        + 'Dear ' + (data.toName || 'Colleague') + ',\n\n'
        + 'A Permit to Work needs your ' + stageLabel + '.\n\n'
        + 'Permit ID       : ' + (data.permitId || '') + '\n'
        + 'Area            : ' + (data.area || '') + '\n'
        + 'Location        : ' + (data.location || '') + '\n'
        + 'Work Involved   : ' + (data.workInvolved || '') + '\n'
        + 'Date            : ' + (data.date || '') + '\n'
        + '\nOpen the PTW Register and review this permit:\n' + link + '\n'
        + '\nOr view the full Permit Pack — the permit plus every linked checklist already filled in:\n' + packLink + '\n\n'
        + 'SAGCO IMS – Permit to Work Register';

    MailApp.sendEmail({ to: data.toEmail, subject: subject, body: body, name: IMS_FROM_NAME });
    return { status: 'ok', message: 'Notification sent to ' + data.toEmail };
  } catch (err) {
    Logger.log('sendPtwStageEmail: THREW — ' + err);
    return { status: 'error', message: err.toString() };
  }
}

// Rev.30 (Issam, voice, 2026-11-15) — mirrors ptw-register.html's own
// getChecklistNeeds()/permitNeeds*() rules, server-side, since a
// single checklist page only has ITS OWN sheet loaded, not every
// linked tab the register itself caches. Only acts on a permit
// that's still "Waiting" — if it's already past that stage (or was
// promoted a moment ago by a different checklist finishing first),
// this is a no-op, so two checklists finishing close together can't
// double-promote or double-email.
function checkAndPromotePtwPermit(permitId) {
  try {
    if (!permitId) return { status: 'error', message: 'Missing permitId' };
    var regSheet = findSheet(TABS['ptw_register']);
    if (!regSheet) return { status: 'error', message: 'PTW Register sheet not found' };
    var regHeaders = regSheet.getRange(3, 1, 1, regSheet.getLastColumn()).getValues()[0];
    var idIdx = regHeaders.indexOf('Permit ID');
    var statusIdx = regHeaders.indexOf('Status');
    var workIdx = regHeaders.indexOf('Work Involved');
    var hamIdx = regHeaders.indexOf('Height Access Method');
    var siIdx = regHeaders.indexOf('Service Isolation');
    var umIdx = regHeaders.indexOf('Unit Manager');
    var umEmailIdx = regHeaders.indexOf('Unit Manager Email');
    var areaIdx = regHeaders.indexOf('Area');
    var locIdx = regHeaders.indexOf('Location');
    var dateIdx = regHeaders.indexOf('Date');
    if (idIdx < 0 || statusIdx < 0) return { status: 'error', message: 'PTW Register missing Permit ID / Status column' };

    var lastRow = regSheet.getLastRow();
    if (lastRow < 4) return { status: 'ok', promoted: false };
    var allRows = regSheet.getRange(4, 1, lastRow - 3, regHeaders.length).getValues();
    var rowOffset = -1, rowVals = null;
    for (var i = 0; i < allRows.length; i++) {
      if (String(allRows[i][idIdx]) === String(permitId)) { rowOffset = i; rowVals = allRows[i]; break; }
    }
    if (rowOffset < 0) return { status: 'ok', promoted: false, message: 'Permit not found' };
    if (String(rowVals[statusIdx]||'').trim().toLowerCase() !== 'waiting') {
      return { status: 'ok', promoted: false, message: 'Permit is not Waiting' };
    }

    var work = (workIdx >= 0 ? String(rowVals[workIdx]||'') : '');
    var height = (hamIdx >= 0 ? String(rowVals[hamIdx]||'').trim() : '');
    var serviceIso = (siIdx >= 0 ? String(rowVals[siIdx]||'').trim() : '');
    var wl = work.toLowerCase();

    // Same families/rules as permitNeeds*() in ptw-register.html.
    var needed = [];
    // Rev.32 (Issam, voice, 2026-11-15) — "safe to enter" counts, not
    // just Closed — see ptwChecklistIsReady_'s 'confinedSpace' mode.
    if (/confined/.test(wl)) needed.push({ tab: 'cs_entry', idCol: 'PTW Number', mode: 'confinedSpace' });
    // Rev.31 (Issam, voice, 2026-11-15) — an Open LOTO job (with its
    // pre-task isolation checks confirmed) is enough, not just a
    // Closed one — see ptwChecklistIsReady_'s 'loto' mode below.
    if (serviceIso || /electrical/.test(wl)) needed.push({ tab: 'loto_register', idCol: 'PTW Number', mode: 'loto' });
    if (/lifting/.test(wl) || (/height/.test(wl) && height === 'Crane')) needed.push({ tab: 'crane_checklist', idCol: 'PTW Number', mode: 'result', resultCol: 'Inspection Result', passVal: 'Accept Crane' });
    // Rev.36 (Issam, voice, 2026-11-15) — the permit only needs Pre
    // Hot Work confirmed, not the whole job Closed — see
    // ptwChecklistIsReady_'s 'hotWorkPre' mode.
    if (/hot work/.test(wl)) needed.push({ tab: 'hot_work_checklist', idCol: 'PTW Number', mode: 'hotWorkPre' });
    // Rev.32 (Issam, voice, 2026-11-15) — a green tag counts, not
    // just Closed — see ptwChecklistIsReady_'s 'scaffold' mode.
    if (/height/.test(wl) && height === 'Scaffolding') needed.push({ tab: 'scaffold_inspection', idCol: 'Permit Number', mode: 'scaffold' });
    // Rev.46, simplified Rev.57 (Issam, voice, 2026-11-17) — needed
    // for ANY height permit regardless of Height Access Method (unlike
    // Crane/Scaffold just above, which split on it) — fall protection
    // applies whether the crew gets up by crane basket or by scaffold.
    // The crew-count comparison (Rev.46/Rev.53) is gone: one
    // Satisfactory checklist now covers the whole crew, same generic
    // 'result' mode as Painting/Civil Work/Pipeline below.
    if (/height/.test(wl)) needed.push({ tab: 'harness_fall_protection', idCol: 'PTW Number', mode: 'result', resultCol: 'Overall Result', passVal: 'Satisfactory' });
    if (/paint/.test(wl)) needed.push({ tab: 'painting_checklist', idCol: 'PTW Number', mode: 'result', resultCol: 'Result', passVal: 'Cleared' });
    if (/civil/.test(wl)) needed.push({ tab: 'civil_work_checklist', idCol: 'PTW Number', mode: 'result', resultCol: 'Result', passVal: 'Cleared' });
    if (/pipeline/.test(wl)) needed.push({ tab: 'pipeline_checklist', idCol: 'PTW Number', mode: 'result', resultCol: 'Result', passVal: 'Cleared' });

    if (!needed.length) return { status: 'ok', promoted: false, message: 'Permit needs no checklist' };

    var allReady = needed.every(function(n){ return ptwChecklistIsReady_(n, permitId); });
    if (!allReady) return { status: 'ok', promoted: false, message: 'Still waiting on other checklists' };

    // Every required checklist is complete — promote and notify.
    regSheet.getRange(4 + rowOffset, statusIdx + 1).setValue('Awaiting Area Manager');

    var toEmail = umEmailIdx >= 0 ? String(rowVals[umEmailIdx]||'') : '';
    var toName  = umIdx >= 0 ? String(rowVals[umIdx]||'') : '';
    if (toEmail) {
      sendPtwStageEmail({
        permitId: permitId, stage: 'areaManager', toEmail: toEmail, toName: toName,
        area: areaIdx >= 0 ? rowVals[areaIdx] : '', location: locIdx >= 0 ? rowVals[locIdx] : '',
        workInvolved: work, date: dateIdx >= 0 ? rowVals[dateIdx] : ''
      });
    }
    return { status: 'ok', promoted: true, emailed: !!toEmail };
  } catch (err) {
    Logger.log('checkAndPromotePtwPermit: THREW — ' + err);
    return { status: 'error', message: err.toString() };
  }
}

// Checks whether ONE required checklist already has a passing/Closed
// record for this permit — most-recent matching non-removed row wins,
// same convention as ptw-register.html's own findLinkedRecord() /
// findCraneOrHotWorkRecord().
function ptwChecklistIsReady_(need, permitId) {
  // Rev.57 (Issam, voice, 2026-11-17) — the harnessCount mode (Rev.46,
  // revised Rev.53) is removed: harness/fall-protection is now a
  // single-record check like every other mode below, one Satisfactory
  // checklist tied to the permit covers the whole crew. It falls
  // through to the generic resultCol/passVal check at the bottom of
  // this function, same as Painting/Civil Work/Pipeline.
  var sheet = findSheet(TABS[need.tab]);
  if (!sheet) return false;
  var lastRow = sheet.getLastRow();
  if (lastRow < 4) return false;
  var headers = sheet.getRange(3, 1, 1, sheet.getLastColumn()).getValues()[0];
  var idIdx = headers.indexOf(need.idCol);
  var recStatusIdx = headers.indexOf('Record Status');
  if (idIdx < 0) return false;
  var rows = sheet.getRange(4, 1, lastRow - 3, headers.length).getValues();
  var found = null;
  for (var i = 0; i < rows.length; i++) {
    if (recStatusIdx >= 0 && String(rows[i][recStatusIdx]||'').trim().toLowerCase() === 'removed') continue;
    if (String(rows[i][idIdx]) === String(permitId)) found = rows[i];
  }
  if (!found) return false;
  // Rev.31 (Issam, voice, 2026-11-15) — LOTO's own rule: Open or
  // Closed both count, but only once every pre-task isolation check
  // is actually Yes — a job that merely exists isn't isolation.
  // Mirrors lotoJobIsReady_ in ptw-register.html; keep both in step.
  if (need.mode === 'loto') {
    var lotoStatusIdx = headers.indexOf('Status');
    var lotoStatus = lotoStatusIdx >= 0 ? String(found[lotoStatusIdx]||'').trim().toLowerCase() : '';
    if (lotoStatus !== 'open' && lotoStatus !== 'closed') return false;
    var preTaskChecks = ['Equipment Shutdown Safely','All Energy Sources Isolated','Locks and Tags Applied',
      'Stored Energy Released or Restrained','Zero-Energy Condition Verified',
      'Absence-of-Voltage Test Completed','Work Area Confirmed Safe and PTW Conditions Satisfied'];
    return preTaskChecks.every(function(f){
      var ci = headers.indexOf(f);
      return ci >= 0 && String(found[ci]||'').trim() === 'Yes';
    });
  }
  // Rev.32 (Issam, voice, 2026-11-15) — Scaffold counts once its Tag
  // Status reads green, Open or Closed. Mirrors scaffoldIsReady_ in
  // ptw-register.html; keep both in step.
  if (need.mode === 'scaffold') {
    var tagIdx = headers.indexOf('Tag Status');
    var tagVal = tagIdx >= 0 ? String(found[tagIdx]||'').trim() : '';
    return /green/i.test(tagVal);
  }
  // Confined Space counts once its own atmospheric test says safe,
  // Open or Closed. Mirrors confinedSpaceIsReady_ in
  // ptw-register.html; keep both in step.
  if (need.mode === 'confinedSpace') {
    var safeIdx = headers.indexOf('All Safe to Enter (Y/N)');
    return safeIdx >= 0 && String(found[safeIdx]||'').trim() === 'Yes';
  }
  // Rev.36 (Issam, voice, 2026-11-15) — Hot Work counts once Pre Hot
  // Work is confirmed (every item Yes or N/A), not once the whole job
  // is Closed with a Cleared result — Execution and Post Hot Work
  // only matter later, when the PERMIT is being closed (see
  // checkAndPromotePtwPermit's caller for that separate gate).
  // Mirrors hotWorkPreTaskIsReady_ in ptw-register.html and
  // PRE_HOT_WORK_ITEMS in hot-work.html; keep all three in step.
  if (need.mode === 'hotWorkPre') {
    var preItems = ['Job Site Inspected For Flammables (Y/N/NA)','Work Area Free Of Explosive Atmospheres (Y/N/NA)','Hazardous Gas Assessment Conducted (Y/N/NA)',
      'Fire Extinguishers Available (Y/N/NA)','Firewatch Assigned And Equipped (Y/N/NA)','Sprinkler Systems Operational (Y/N/NA)','Fixed Fire Suppression Not Impaired (Y/N/NA)',
      'Combustibles Removed Or Shielded (Y/N/NA)','Fire-Resistant Blankets Or Shields Used (Y/N/NA)','Floor And Wall Openings Covered (Y/N/NA)','Work Area Within 35ft Cleared (Y/N/NA)','Flammable Containers Moved To Safe Distance (Y/N/NA)','Area Adequately Ventilated (Y/N/NA)',
      'Workers Trained In Hot Work Procedures (Y/N/NA)','Workers Provided Proper PPE (Y/N/NA)','Hearing Protection Available (Y/N/NA)','Respirators Provided If Needed (Y/N/NA)'];
    return preItems.every(function(f){
      var fi = headers.indexOf(f);
      var v = fi >= 0 ? String(found[fi]||'').trim() : '';
      return v === 'Yes' || v === 'N/A';
    });
  }
  if (need.mode === 'status') {
    var statusIdx = headers.indexOf('Status');
    return statusIdx >= 0 && String(found[statusIdx]||'').trim() === 'Closed';
  }
  var resIdx = headers.indexOf(need.resultCol);
  return resIdx >= 0 && String(found[resIdx]||'').trim() === need.passVal;
}

// Shared Person ID generator for additional group members appended
// within submitVisitorRegistration — same VC-NNNNN sequence the page
// uses for the primary row, scanning headerRow + this sheet's actual
// current rows (including any already appended earlier in the same
// loop, via getLastRow() re-read each call) so two people in one
// group never collide.
function nextVcPersonId_(sheet, headerRow, personIdColIdx){
  if (personIdColIdx < 0) return '';
  var lastRow = sheet.getLastRow();
  var maxN = 0;
  if (lastRow >= 4){
    var ids = sheet.getRange(4, personIdColIdx + 1, lastRow - 3, 1).getValues();
    ids.forEach(function(r){
      var m = /^VC-(\d+)$/.exec(String(r[0]||'').trim());
      if (m) { var n = parseInt(m[1], 10); if (n > maxN) maxN = n; }
    });
  }
  var numStr = String(maxN + 1);
  while (numStr.length < 5) numStr = '0' + numStr;
  return 'VC-' + numStr;
}

/**
 * Called from the main management page when the invitation owner clicks Approve.
 * 1. Sets Registration Status = Approved
 * 2. Sends confirmation email to the visitor (CC Host + Safety Controller)
 *    containing the QR access information
 */
// Rev.24 (Issam, voice, 2026-11-12) — GROUP APPROVAL. Approving now
// covers every row in the same Invitation Token group that is still
// Registration Status = Submitted (a person already individually
// Rejected is left alone — rejectPerson() already marks that row
// Rejected, and this skips it rather than silently re-approving it).
// Called with data.token (preferred) or the older data.personId
// (looked up to find its own token) — both still work, so an older
// cached page calling this with just a personId keeps functioning
// exactly as before for a lone registration.
//
// Email design agreed with Issam: the REQUESTER (whoever filled the
// public page — 'Requester Email' on the group's rows) always
// receives one email with the full table, every person in the group,
// every QR code — whether the group is one person or several. Any
// individual guest who also gave their OWN email additionally gets a
// personal copy of just their own QR. A guest with no email gets
// nothing directly; their QR still appears in the requester's table.
function approveVisitorAndSendCard(data) {
  try {
    if (!data || (!data.token && !data.personId)) {
      return { status: 'error', message: 'Missing token or Person ID' };
    }
    var approvedBy = data.approvedBy || 'Safety';

    var sheetName = TABS['vc_persons'];
    var sheet = findSheet(sheetName);
    if (!sheet) return { status: 'error', message: 'VC Persons sheet not found' };
    var headerRow = sheet.getRange(3, 1, 1, sheet.getLastColumn()).getValues()[0];
    var tokenColIdx = headerRow.indexOf('Invitation Token');
    var idColIdx = headerRow.indexOf('Person ID');
    var statusColIdx = headerRow.indexOf('Registration Status');
    if (tokenColIdx < 0 || idColIdx < 0 || statusColIdx < 0) {
      return { status: 'error', message: 'VC Persons sheet is missing Invitation Token, Person ID or Registration Status' };
    }

    var lastRow = sheet.getLastRow();
    if (lastRow < 4) return { status: 'error', message: 'No registrations found' };
    var allRows = sheet.getRange(4, 1, lastRow - 3, headerRow.length).getValues();

    // Resolve the group's token: either given directly, or looked up
    // from the one personId's own row (backward-compat path).
    var token = data.token ? String(data.token).trim() : '';
    if (!token && data.personId) {
      var pid = String(data.personId).trim();
      for (var i = 0; i < allRows.length; i++) {
        if (String(allRows[i][idColIdx]) === pid) { token = String(allRows[i][tokenColIdx]); break; }
      }
      if (!token) return { status: 'error', message: 'Person not found: ' + pid };
    }

    var approvedDate = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd');
    var approvedPersons = [];
    for (var r = 0; r < allRows.length; r++) {
      if (String(allRows[r][tokenColIdx]) !== token) continue;
      if (String(allRows[r][statusColIdx]).trim() !== 'Submitted') continue; // leave Rejected / already-Approved rows untouched
      var rowNum = r + 4;
      var updates = { 'Registration Status': 'Approved', 'Approved By': approvedBy, 'Approved Date': approvedDate, 'Record Status': 'Active' };
      var newRow = headerRow.map(function(header, idx){ return updates[header] !== undefined ? updates[header] : allRows[r][idx]; });
      sheet.getRange(rowNum, 1, 1, headerRow.length).setValues([newRow]);
      var personObj = {};
      headerRow.forEach(function(h, idx){ personObj[h] = newRow[idx]; });
      approvedPersons.push(personObj);
    }

    if (!approvedPersons.length) {
      return { status: 'error', message: 'No pending (Submitted) registrations found for this invitation' };
    }
    Logger.log('approveVisitorAndSendCard: approved ' + approvedPersons.length + ' person(s) for token ' + token);

    var requesterEmail = String(approvedPersons[0]['Requester Email'] || approvedPersons[0]['Email'] || '').trim();
    var hostEmail = lookupUserEmailByName(approvedPersons[0]['Host Name']) || '';
    var ccList = [];
    if (hostEmail) ccList.push(hostEmail);
    var safetyRaw = String(approvedPersons[0]['Safety Controllers'] || '').trim();
    if (safetyRaw) {
      safetyRaw.split(';').forEach(function(part) {
        var m = part.match(/<([^>]+)>/);
        var em = m && m[1] ? m[1].trim() : (part.trim().indexOf('@') > 0 ? part.trim() : '');
        if (em && ccList.indexOf(em) < 0) ccList.push(em);
      });
    }

    var groupMailStatus = 'not attempted — no requester email found';
    if (requesterEmail) {
      try {
        sendVisitorGroupApprovedEmail_(approvedPersons, requesterEmail, hostEmail, ccList);
        groupMailStatus = 'sent';
      } catch (mailErr) {
        groupMailStatus = 'FAILED: ' + mailErr;
        Logger.log('approveVisitorAndSendCard: group email THREW — ' + mailErr);
      }
    }

    // Personal copy to each guest who gave their OWN email, distinct
    // from the requester's email (no point double-sending if a solo
    // visitor's own email and requester email are the same address).
    approvedPersons.forEach(function(p){
      var guestEmail = String(p['Email'] || '').trim();
      if (guestEmail && guestEmail.toLowerCase() !== requesterEmail.toLowerCase()) {
        try { sendVisitorGuestOwnCopyEmail_(p); }
        catch (guestMailErr) { Logger.log('approveVisitorAndSendCard: guest copy to ' + guestEmail + ' THREW — ' + guestMailErr); }
      }
    });

    appendAuditLog('VC_APPROVE', 'Group of ' + approvedPersons.length + ' approved for token ' + token + ' — requester email: ' + groupMailStatus, approvedBy, approvedBy);

    return {
      status: 'ok',
      message: approvedPersons.length > 1
        ? approvedPersons.length + ' people approved and the requester has been emailed the full group.'
        : 'Visitor approved and confirmation email sent.',
      personIds: approvedPersons.map(function(p){ return p['Person ID']; }),
      mailStatus: groupMailStatus,
      requesterEmail: requesterEmail
    };

  } catch (err) {
    Logger.log('approveVisitorAndSendCard: THREW — ' + err);
    return { status: 'error', message: err.toString() };
  }
}

/* ── Helper: get full person record by Person ID ─────────────── */
function getPersonById(personId) {
  var data = readSheet('vc_persons');
  if (!data || !data.headers || !data.rows) return null;
  var idIdx = data.headers.indexOf('Person ID');
  if (idIdx < 0) return null;
  for (var i = 0; i < data.rows.length; i++) {
    if (String(data.rows[i][idIdx]) === String(personId)) {
      var p = {};
      data.headers.forEach(function(h, idx) { p[h] = data.rows[i][idx]; });
      return p;
    }
  }
  return null;
}

/* ── Helper: lookup email from User Register by name ─────────── */
function lookupUserEmailByName(name) {
  if (!name) return '';
  try {
    var data = readSheet('users');
    if (!data || !data.headers) return '';
    var nameIdx  = data.headers.indexOf('Full Name');
    var emailIdx = data.headers.indexOf('Email');
    if (nameIdx < 0 || emailIdx < 0) return '';
    var target = String(name).trim().toLowerCase();
    for (var i = 0; i < data.rows.length; i++) {
      if (String(data.rows[i][nameIdx] || '').trim().toLowerCase() === target) {
        return String(data.rows[i][emailIdx] || '').trim();
      }
    }
  } catch (e) {}
  return '';
}

/* ── Email: Visitor has submitted the registration form ──────── */
// Rev.24 — groupSize mentioned when more than one person was
// submitted together, so the creator knows at a glance this isn't
// a single visitor.
// Rev.33 (Issam, voice, 2026-11-12) — the notification to the host now
// carries a direct "Review and Approve" button, linking straight to
// Pending Approvals on visitor-induction.html, already open on this
// exact group (?tab=approvals&token=...) — not just a general
// instruction to go find the tab and the row themselves. The button
// only opens that screen; approving still takes a real click there,
// and the host still needs to be logged in to the portal first.
// Rev.35 (Issam, voice, 2026-11-12) — the VC code is now highlighted,
// bold and gold, not just a plain line among the other details, and
// for a group every person's code is listed up front (not just the
// first person's) — personIds is the full list submitVisitorRegistration
// already builds while creating each row.
function sendVisitorSubmittedEmail(person, ownerEmail, groupSize, personIds) {
  var isGroup = groupSize && groupSize > 1;
  var codes = (personIds && personIds.length ? personIds : [person['Person ID']]).filter(function(x){ return x; });
  var codesStr = codes.join(', ');
  var subject = isGroup
    ? 'SAGCO IMS – New Visitor Group Registration (' + groupSize + ' people, ' + codesStr + ') Submitted for Review'
    : 'SAGCO IMS – New Visitor Registration ' + codesStr + ' Submitted for Review';
  var reviewLink = VC_PORTAL_URL + '?tab=approvals&token=' + encodeURIComponent(person['Invitation Token'] || '');
  var intro = isGroup
    ? 'A group of ' + groupSize + ' visitors/contractors has completed the online registration form. First person in the group:'
    : 'A visitor/contractor has completed the online registration form.';
  var detailsText = ''
    + 'Person ID      : ' + (person['Person ID'] || '') + '\n'
    + 'Name           : ' + (person['First Name'] || '') + ' ' + (person['Family Name'] || '') + '\n'
    + 'Company        : ' + (person['Company'] || '') + '\n'
    + 'Type           : ' + (person['Type'] || '') + '\n'
    + 'Destination    : ' + (person['Destination Department'] || '') + '\n'
    + 'Host           : ' + (person['Host Name'] || '') + '\n'
    + 'ID Number      : ' + (person['ID Number'] || '') + '\n'
    + 'Phone          : ' + (person['Phone'] || '') + '\n'
    + 'Email          : ' + (person['Email'] || '') + '\n';
  var body = 'Dear Colleague,\n\n' + intro + '\n\n'
    + '*** VC CODE' + (codes.length>1?'S':'') + ': ' + codesStr + ' ***\n\n'
    + detailsText
    + '\nReview and approve here: ' + reviewLink + '\n\n'
    + 'SAGCO IMS – Visitor Gate System';
  var htmlBody = '<div style="font-family:Arial,sans-serif;font-size:14px;color:#1B2A4A;max-width:560px">'
    + '<p>Dear Colleague,</p>'
    + '<p>' + intro + '</p>'
    + '<p style="font-size:20px;font-weight:800;color:#C9A84C;background:#1B2A4A;display:inline-block;padding:8px 18px;border-radius:8px;letter-spacing:.5px">' + vEscPlain_(codesStr) + '</p>'
    + '<pre style="font-family:Arial,sans-serif;font-size:13px;white-space:pre-wrap;background:#F4F6F9;padding:10px 14px;border-radius:8px">' + detailsText.replace(/</g,'&lt;') + '</pre>'
    + '<p style="margin-top:16px"><a href="' + reviewLink + '" style="background:#1B2A4A;color:#C9A84C;padding:10px 20px;border-radius:6px;text-decoration:none;font-weight:bold;display:inline-block">Review and Approve</a></p>'
    + '<p style="font-size:11px;color:#7a869a;margin-top:20px">— SAGCO IMS Visitor Gate System</p>'
    + '</div>';

  MailApp.sendEmail({
    to: ownerEmail,
    subject: subject,
    body: body,
    htmlBody: htmlBody,
    name: IMS_FROM_NAME
  });
}

// Rev.24 (Issam, voice, 2026-11-12) — generates a real, scannable QR
// image for one person, fetched server-side from a public QR image
// API (no key needed) and returned as a Blob so MailApp can embed it
// inline in an HTML email via inlineImages — a plain cid: reference
// in an <img> tag, which is the only reliable way to show an image
// inside an email body (most mail clients block remote images loaded
// from a URL, which is why the old text-only "QR Code content: ..."
// line was never actually usable at the gate).
function buildVisitorQrBlob_(personId) {
  var text = 'SAGCO-VC:' + personId;
  var url = 'https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=' + encodeURIComponent(text);
  var response = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
  return response.getBlob().setName('qr_' + personId + '.png');
}

// Builds the HTML table of guests (name, ID number, company, QR
// image) shared by both the requester's full-group email and reused
// as a single-row table for one guest's own copy — same markup
// either way, just a different subset of rows.
// Rev.35 (Issam, voice, 2026-11-12) — added a VC Code column, bold
// and gold like the rest of the portal, so this table doubles as the
// quick reference for matching a QR back to a sheet row or a Gate
// scan result — the name and ID number alone didn't give that.
function buildVisitorQrTableHtml_(persons, cidPrefix) {
  var rows = persons.map(function(p, i){
    var cid = cidPrefix + i;
    return '<tr>'
      + '<td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;font-size:13px;font-weight:800;color:#C9A84C">' + (p['Person ID']||'') + '</td>'
      + '<td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;font-size:13px">' + (p['First Name']||'') + ' ' + (p['Family Name']||'') + '</td>'
      + '<td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;font-size:13px">' + (p['ID Number']||'') + '</td>'
      + '<td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;font-size:13px">' + (p['Company']||'') + '</td>'
      + '<td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;text-align:center"><img src="cid:' + cid + '" width="110" height="110" alt="QR code"></td>'
      + '</tr>';
  }).join('');
  return '<table style="border-collapse:collapse;width:100%;max-width:560px;margin:14px 0">'
    + '<thead><tr>'
      + '<th style="text-align:left;padding:8px 12px;font-size:11px;text-transform:uppercase;color:#7a869a;border-bottom:2px solid #1B2A4A">VC Code</th>'
      + '<th style="text-align:left;padding:8px 12px;font-size:11px;text-transform:uppercase;color:#7a869a;border-bottom:2px solid #1B2A4A">Name</th>'
      + '<th style="text-align:left;padding:8px 12px;font-size:11px;text-transform:uppercase;color:#7a869a;border-bottom:2px solid #1B2A4A">ID Number</th>'
      + '<th style="text-align:left;padding:8px 12px;font-size:11px;text-transform:uppercase;color:#7a869a;border-bottom:2px solid #1B2A4A">Company</th>'
      + '<th style="text-align:center;padding:8px 12px;font-size:11px;text-transform:uppercase;color:#7a869a;border-bottom:2px solid #1B2A4A">QR Code</th>'
    + '</tr></thead><tbody>' + rows + '</tbody></table>';
}

/* ── Email: group approved — full table to the requester, plus a
   personal copy to each guest who gave their own email ─────────
   Rev.24 (Issam, voice, 2026-11-12) — replaces the old single-person
   sendVisitorApprovedEmail with the agreed design: the person who
   filled the public page ALWAYS gets one email with the full table
   (every guest, every QR), whether they registered alone or brought
   a group. Any guest who also gave their own email additionally gets
   a personal copy with just their own QR. A guest with no email gets
   nothing directly — their QR is still in the requester's table. */
function sendVisitorGroupApprovedEmail_(persons, requesterEmail, hostEmail, ccList) {
  var isGroup = persons.length > 1;
  var subject = isGroup
    ? 'SAGCO IMS – Your Group Visit Access Cards (' + persons.length + ' QR Codes)'
    : 'SAGCO IMS – Your Visit Access Card (QR Code)';

  var inlineImages = {};
  persons.forEach(function(p, i){ inlineImages['grp' + i] = buildVisitorQrBlob_(p['Person ID']); });
  var tableHtml = buildVisitorQrTableHtml_(persons, 'grp');

  var first = persons[0];
  var htmlBody = '<div style="font-family:Arial,sans-serif;font-size:14px;color:#1B2A4A;max-width:600px">'
    + '<p>Dear ' + (first['First Name'] || 'Visitor') + ',</p>'
    + '<p>Your registration has been approved by SAGCO Safety / Management.'
    + (isGroup ? ' Below is the access card for each person in your group.' : '') + '</p>'
    + '<p><strong>Destination:</strong> ' + (first['Destination Department']||'') + ' &nbsp; <strong>Host:</strong> ' + (first['Host Name']||'') + '</p>'
    + tableHtml
    + '<p style="margin-top:16px"><strong>Important:</strong></p>'
    + '<ul style="margin:4px 0 0;padding-left:18px">'
      + '<li>Present each person\'s own QR code at the main gate.</li>'
      + '<li>Each person must complete Safety Induction and receive PPE before entering operational areas.</li>'
      + '<li>Keep this email with you during the visit.</li>'
    + '</ul>'
    + '<p style="margin-top:18px">Welcome to SAGCO.</p>'
    + '<p style="font-size:11px;color:#7a869a;margin-top:24px">— SAGCO IMS Visitor Gate System</p>'
    + '</div>';

  var plainLines = persons.map(function(p){ return '• ' + (p['First Name']||'') + ' ' + (p['Family Name']||'') + ' (' + (p['ID Number']||'') + ') — QR Code content: SAGCO-VC:' + (p['Person ID']||''); });
  var plainBody = 'Dear ' + (first['First Name'] || 'Visitor') + ',\n\nYour registration has been approved.\n\n'
    + plainLines.join('\n') + '\n\nPresent each QR code at the main gate. Safety Induction and PPE are required before entering operational areas.\n\nSAGCO IMS – Visitor Gate System';

  var options = { to: requesterEmail, subject: subject, htmlBody: htmlBody, body: plainBody, inlineImages: inlineImages, name: IMS_FROM_NAME };
  if (ccList && ccList.length) options.cc = ccList.join(',');
  MailApp.sendEmail(options);
}

/* Personal copy to one guest who gave their own email — one-row
   version of the same table, their own QR only. */
function sendVisitorGuestOwnCopyEmail_(person) {
  var guestEmail = String(person['Email'] || '').trim();
  if (!guestEmail) return;
  var inlineImages = { own0: buildVisitorQrBlob_(person['Person ID']) };
  var tableHtml = buildVisitorQrTableHtml_([person], 'own');
  var htmlBody = '<div style="font-family:Arial,sans-serif;font-size:14px;color:#1B2A4A;max-width:600px">'
    + '<p>Dear ' + (person['First Name'] || 'Visitor') + ',</p>'
    + '<p>Your registration has been approved by SAGCO Safety / Management.</p>'
    + '<p><strong>Destination:</strong> ' + (person['Destination Department']||'') + ' &nbsp; <strong>Host:</strong> ' + (person['Host Name']||'') + '</p>'
    + tableHtml
    + '<p style="margin-top:16px"><strong>Important:</strong></p>'
    + '<ul style="margin:4px 0 0;padding-left:18px">'
      + '<li>Present this QR code at the main gate.</li>'
      + '<li>You must complete Safety Induction and receive PPE before entering operational areas.</li>'
      + '<li>Keep this email with you during the visit.</li>'
    + '</ul>'
    + '<p style="margin-top:18px">Welcome to SAGCO.</p>'
    + '<p style="font-size:11px;color:#7a869a;margin-top:24px">— SAGCO IMS Visitor Gate System</p>'
    + '</div>';
  MailApp.sendEmail({
    to: guestEmail,
    subject: 'SAGCO IMS – Your Visit Access Card (QR Code)',
    htmlBody: htmlBody,
    body: 'Dear ' + (person['First Name']||'Visitor') + ',\n\nYour registration has been approved. QR Code content: SAGCO-VC:' + (person['Person ID']||'') + '\n\nSAGCO IMS – Visitor Gate System',
    inlineImages: inlineImages,
    name: IMS_FROM_NAME
  });
}
