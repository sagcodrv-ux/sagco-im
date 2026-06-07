/**
 * SAGCO IMS — Google Apps Script  Rev.16
 * ─────────────────────────────────────────────────────────────────────────────
 * Deploy as: Web App | Execute as: Me | Access: Anyone
 *
 * HOW IT WORKS
 * ─────────────────────────────────────────────────────────────────────────────
 * 1. Each website page requests data by passing ?tab=KEY in the URL
 * 2. This script reads the corresponding Google Sheet tab
 * 3. Returns JSON: { headers:[], rows:[[...],[...]] }
 * 4. The website page renders the data into its table
 *
 * TABS MAP — all 48 tabs in the Rev.16 Google Sheets database
 * ─────────────────────────────────────────────────────────────────────────────
 */

const SS = SpreadsheetApp.getActive();

const TABS = {
  // ── Governance ──────────────────────────────────────────────────────────
  cover:            '🏠 Cover',

  // ── Clause 4 — Context ──────────────────────────────────────────────────
  context:          '📋 Context',
  pestle:           '📊 PESTLE-SWOT',

  // ── Clause 6 — Planning ─────────────────────────────────────────────────
  risks:            '⚠ Risk Register',
  compliance:       '⚖ Compliance',
  objectives:       '🎯 Objectives',
  moc:              '🔄 MOC',
  energy:           '⚡ Energy',
  methodology:      '📐 Methodology',

  // ── Clause 9 ────────────────────────────────────────────────────────────
  checklist:        '✅ Checklist',

  // ── Lookups ─────────────────────────────────────────────────────────────
  lookups:          '🔗 Lookups',

  // ── Clause 5 — Leadership ────────────────────────────────────────────────
  policies:         '📋 Policies',
  worker_part:      '👷 Worker Part.',
  policy_ack:       '✍ Policy Ack',
  gemba_walks:      '🚶 Gemba Walks',
  steering_team:    '📝 ST Minutes',
  enms_champion:    '⚡ EnMS Champion',
  ceo_records:      '📌 CEO Records',
  comms_matrix:     '📡 Comms Matrix',

  // ── Clause 6 — Planning (extended) ──────────────────────────────────────
  hira:             '⚠ HIRA',
  sea:              '🌍 SEA Register',
  bribery_risk:     '🔍 Bribery Risk',
  ghg_inventory:    '🌡 GHG Inventory',
  scope3:           '🌱 Scope 3',

  // ── Clause 7 — Support ───────────────────────────────────────────────────
  competency:       '🎓 Competency',
  training:         '📚 Training',
  training_attend:  '✅ Train Attend',
  induction:        '🆕 Induction',
  documentation:    '📄 Documentation',
  calibration:      '🔬 Calibration',

  // ── Clause 8 — Operations ────────────────────────────────────────────────
  ptw_register:     '36 – PTW Register',
  emergency:        '34b – Emergency Response',
  contractor:       '35 – Contractor Register',
  loto_register:    '37 – LOTO Register',
  loto_auth:        '👤 LOTO Auth',
  confined_space:   '38 – Confined Space Log',
  heat_stress:      '39 – Heat Stress WBGT Log',
  fire_ext:         '40 – Fire Extinguisher Log',
  fire_pump:        '41 – Fire Pump Test Log',
  oh_surveillance:  '42 – OH Surveillance Register',
  scaffold:         '🏗 Scaffold',
  ndt_permits:      '☢ NDT Permits',
  chemical_inv:     '⚗ Chemical Inv',
  crane_lifting:    '🏗 Crane Lifting',
  waste_mgmt:       '45b – Waste Management',
  chemical_store:   '46 – Chemical Storage',
  furnace_monitor:  '47 – Furnace Monitoring Logs',
  meps:             '48 – MEPS Compliance Register',
  product_release:  '49 – Product Release Records',
  nonconforming:    '50 – Nonconforming Products',
  incoming_insp:    '51 – Incoming Inspection',
  customer_reg:     '52 – Customer Register',
  inprocess_insp:   '53 – In-Process Inspection Log',

  // ── Clause 9 — Performance ───────────────────────────────────────────────
  kpi_dashboard:    '📊 KPI Dashboard',
  compliance_eval:  '⚖ Comp. Eval.',
  audit_programme:  '🔍 Audit Prog.',
  mgmt_review:      '📋 Mgmt Review',

  // ── Clause 10 — Improvement ──────────────────────────────────────────────
  capa:             '🔧 CAPA Register',
  incidents:        '🚨 Incidents',

  // ── ESG / Sustainability / Ethics ────────────────────────────────────────
  supplier_esg:     '🏭 Supplier ESG',
  coi:              '📝 CoI Register',
  gifts:            '🎁 Gifts',
  scope3_emit:      '🌱 Scope 3',
  diversity:        '👥 Diversity',
  tpdd:             '🔎 TPDD',
  water_waste:      '💧 Water & Waste',
  supplier_scoc:    '📜 Supplier SCoC',
};

// ─────────────────────────────────────────────────────────────────────────────
// MAIN HANDLER — responds to GET requests from the website
// ─────────────────────────────────────────────────────────────────────────────
function doGet(e) {
  const params = e.parameter;
  const tab    = params.tab    || '';
  const action = params.action || 'read';

  // CORS headers for cross-origin requests from GitHub Pages
  const output = ContentService.createTextOutput();
  output.setMimeType(ContentService.MimeType.JSON);

  try {
    if (action === 'list') {
      // Return list of all available tab keys and their sheet names
      output.setContent(JSON.stringify({ tabs: TABS }));
      return output;
    }

    if (action === 'read') {
      if (!tab) {
        output.setContent(JSON.stringify({ error: 'No tab specified', available: Object.keys(TABS) }));
        return output;
      }
      const sheetName = TABS[tab];
      if (!sheetName) {
        output.setContent(JSON.stringify({ error: `Unknown tab key: "${tab}"`, available: Object.keys(TABS) }));
        return output;
      }
      const data = readSheet(sheetName);
      output.setContent(JSON.stringify(data));
      return output;
    }

    if (action === 'write') {
      // Write a single cell update: ?action=write&tab=capa&row=5&col=13&value=CLOSED
      const sheetName = TABS[tab];
      if (!sheetName) {
        output.setContent(JSON.stringify({ error: `Unknown tab key: "${tab}"` }));
        return output;
      }
      const row   = parseInt(params.row,  10);
      const col   = parseInt(params.col,  10);
      const value = params.value || '';
      if (!row || !col) {
        output.setContent(JSON.stringify({ error: 'row and col parameters required for write action' }));
        return output;
      }
      writeCell(sheetName, row, col, value);
      output.setContent(JSON.stringify({ success: true, tab: tab, row: row, col: col, value: value }));
      return output;
    }

    output.setContent(JSON.stringify({ error: `Unknown action: "${action}"` }));
    return output;

  } catch (err) {
    output.setContent(JSON.stringify({ error: err.toString(), stack: err.stack }));
    return output;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// READ SHEET — returns headers (row 3) and all data rows (row 4+)
// Skips rows 1 (title) and 2 (subtitle) which are formatting-only
// ─────────────────────────────────────────────────────────────────────────────
function readSheet(sheetName) {
  const sheet = SS.getSheetByName(sheetName);
  if (!sheet) return { error: 'Sheet not found: ' + sheetName, sheetName: sheetName };

  const lastRow = sheet.getLastRow();
  const lastCol = sheet.getLastColumn();

  if (lastRow < 3 || lastCol < 1) {
    return { headers: [], rows: [], sheetName: sheetName, rowCount: 0 };
  }

  // Row 3 = field headers
  const headers = sheet.getRange(3, 1, 1, lastCol).getValues()[0]
    .map(h => h ? h.toString().trim() : '');

  // Rows 4+ = data (skip empty trailing rows)
  let dataRows = [];
  if (lastRow >= 4) {
    dataRows = sheet.getRange(4, 1, lastRow - 3, lastCol).getValues()
      .filter(row => row.some(cell => cell !== '' && cell !== null));
  }

  // Convert all values to strings (handles dates, numbers, booleans)
  const rows = dataRows.map(row =>
    row.map(cell => {
      if (cell instanceof Date) {
        return Utilities.formatDate(cell, Session.getScriptTimeZone(), 'dd MMM yyyy');
      }
      return cell !== null && cell !== undefined ? cell.toString() : '';
    })
  );

  return {
    sheetName: sheetName,
    headers:   headers,
    rows:      rows,
    rowCount:  rows.length,
    colCount:  headers.length,
    lastUpdated: new Date().toISOString(),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// WRITE CELL — updates a single cell (for future use)
// ─────────────────────────────────────────────────────────────────────────────
function writeCell(sheetName, row, col, value) {
  const sheet = SS.getSheetByName(sheetName);
  if (!sheet) throw new Error('Sheet not found: ' + sheetName);
  // Offset: data starts at row 4, so user row 1 = sheet row 4
  sheet.getRange(row + 3, col).setValue(value);
}

// ─────────────────────────────────────────────────────────────────────────────
// TEST FUNCTION — run this manually in the Apps Script editor to verify
// all tabs are accessible. Check the Execution Log for any missing sheets.
// ─────────────────────────────────────────────────────────────────────────────
function testAllTabs() {
  Logger.log('=== SAGCO IMS Google Sheets Connection Test ===');
  Logger.log('Spreadsheet: ' + SS.getName());
  Logger.log('');

  let ok = 0;
  let missing = [];

  for (const [key, sheetName] of Object.entries(TABS)) {
    const sheet = SS.getSheetByName(sheetName);
    if (sheet) {
      const rows = sheet.getLastRow() - 3; // subtract 3 header rows
      Logger.log(`✅  ${key.padEnd(20)} → "${sheetName}" (${Math.max(0, rows)} data rows)`);
      ok++;
    } else {
      Logger.log(`❌  ${key.padEnd(20)} → "${sheetName}" — SHEET NOT FOUND`);
      missing.push(sheetName);
    }
  }

  Logger.log('');
  Logger.log(`Result: ${ok} tabs found, ${missing.length} missing`);
  if (missing.length > 0) {
    Logger.log('Missing sheets: ' + missing.join(', '));
    Logger.log('Action: Rename the sheet tabs in Google Sheets to match exactly.');
  } else {
    Logger.log('All tabs connected successfully. Deploy as Web App and copy the URL to data.js.');
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// SETUP GUIDE — run this to get your deployment URL after deploying
// ─────────────────────────────────────────────────────────────────────────────
function showSetupGuide() {
  const ui = SpreadsheetApp.getUi();
  ui.alert(
    'SAGCO IMS Setup Guide',
    '1. Run testAllTabs() to verify all sheet names match\n' +
    '2. Click Deploy → New deployment → Web app\n' +
    '3. Set "Execute as: Me" and "Who has access: Anyone"\n' +
    '4. Copy the Web App URL\n' +
    '5. Open data.js in the website folder\n' +
    '6. Replace the SHEETS_URL value with your Web App URL\n' +
    '7. Upload the updated data.js to GitHub\n\n' +
    'Tab keys for data.js:\n' +
    Object.keys(TABS).map(k => `?tab=${k}`).join('  '),
    ui.ButtonSet.OK
  );
}
