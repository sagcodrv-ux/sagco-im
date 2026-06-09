/* ═══════════════════════════════════════════════════════════════
   SAGCO IMS — Google Apps Script
   google-apps-script.js  |  Rev.17  |  June 2026

   DEPLOYMENT INSTRUCTIONS:
   1. Open Google Sheet → Extensions → Apps Script
   2. Delete all existing code → paste this entire file
   3. Click Save → run testAllTabs() to verify sheet names
   4. Deploy → New deployment → Web App
      - Execute as: Me
      - Who has access: Anyone
   5. Copy the Web App URL → paste into SHEETS_URL in data.js
   6. NEVER run doGet() from the editor Run button — use testAllTabs() only

   IMPORTANT: After any change to the TABS map, create a NEW deployment
   version (not "manage existing deployments") to push the change live.
═══════════════════════════════════════════════════════════════ */

var TABS = {
  /* Clause 4 */
  'context':         '📋 Context',
  'pestle':          '📊 PESTLE-SWOT',

  /* Clause 5 */
  'policies':        '📋 Policies',
  'worker_part':     '👷 Worker Part.',
  'policy_ack':      '✍ Policy Ack',
  'gemba_walks':     '🚶 Gemba Walks',
  'steering_team':   '📝 ST Minutes',
  'enms_champion':   '⚡ EnMS Champion',
  'ceo_records':     '📌 CEO Records',
  'comms_matrix':    '📡 Comms Matrix',

  /* Clause 6 */
  'risks':           '⚠ Risk Register',
  'compliance':      '⚖ Compliance',
  'methodology':     '📐 Methodology',
  'objectives':      '🎯 Objectives',
  'moc':             '🔄 MOC',
  'energy':          '⚡ Energy',
  'hira':            '⚠ HIRA',
  'sea':             '🌍 SEA Register',
  'bribery_risk':    '🔍 Bribery Risk',
  'ghg_inventory':   '🌡 GHG Inventory',
  'scope3':          '🌱 Scope 3',

  /* Clause 7 */
  'competency':      '🎓 Competency',
  'training':        '📚 Training',
  'training_attend': '✅ Train Attend',
  'induction':       '🆕 Induction',
  'documentation':   '📄 Documentation',
  'calibration':     '🔬 Calibration',

  /* Clause 8 */
  'ptw_register':    '36 – PTW Register',
  'emergency':       '34b – Emergency Response',
  'contractor':      '35 – Contractor Register',
  'loto_register':   '37 – LOTO Register',
  'loto_auth':       '👤 LOTO Auth',
  'confined_space':  '38 – Confined Space Log',
  'heat_stress':     '39 – Heat Stress WBGT Log',
  'fire_ext':        '40 – Fire Extinguisher Log',
  'fire_pump':       '41 – Fire Pump Test Log',
  'oh_surveillance': '42 – OH Surveillance Register',
  'scaffold':        '🏗 Scaffold',
  'ndt_permits':     '☢ NDT Permits',
  'chemical_inv':    '⚗ Chemical Inv',
  'crane_lifting':   '🏗 Crane Lifting',
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
  'kpi_dashboard':   '📊 KPI Dashboard',
  'compliance_eval': '⚖ Comp. Eval.',
  'audit_programme': '🔍 Audit Prog.',
  'mgmt_review':     '📋 Mgmt Review',

  /* Clause 10 */
  'capa':            '🔧 CAPA Register',
  'incidents':       '🚨 Incidents',

  /* ESG */
  'supplier_esg':    '🏭 Supplier ESG',
  'coi':             '📝 CoI Register',
  'gifts':           '🎁 Gifts',
  'diversity':       '👥 Diversity',
  'tpdd':            '🔎 TPDD',
  'water_waste':     '💧 Water & Waste',
  'supplier_scoc':   '📜 Supplier SCoC',
};

/* ── Main handler ───────────────────────────────────────────── */
function doGet(e) {
  var tab    = e.parameter.tab;
  var action = e.parameter.action || 'read';
  var output = ContentService.createTextOutput();
  output.setMimeType(ContentService.MimeType.JSON);

  try {
    if (action === 'read') {
      output.setContent(JSON.stringify(readSheet(tab)));
    } else {
      output.setContent(JSON.stringify({ error: 'Unknown action: ' + action }));
    }
  } catch (err) {
    output.setContent(JSON.stringify({ error: err.message }));
  }

  // CORS
  return output;
}

/* ── Read sheet rows 3+ ─────────────────────────────────────── */
function readSheet(tabKey) {
  var sheetName = TABS[tabKey];
  if (!sheetName) return { error: 'Unknown tab key: ' + tabKey, headers: [], rows: [], rowCount: 0 };

  var ss    = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) return { error: 'Sheet not found: ' + sheetName, headers: [], rows: [], rowCount: 0 };

  var data     = sheet.getDataRange().getValues();
  var headers  = data[2] || [];           // Row 3 = field headers (0-indexed: row index 2)
  var rows     = data.slice(3);           // Rows 4+ = data
  var nonEmpty = rows.filter(function(r) { return r.some(function(c){ return c !== ''; }); });

  return {
    headers:  headers.map(String),
    rows:     nonEmpty.map(function(r){ return r.map(function(c){ return c === '' ? '' : String(c); }); }),
    rowCount: nonEmpty.length,
    sheet:    sheetName,
    tab:      tabKey,
  };
}

/* ── Test all tabs (run this from the editor to verify) ──────── */
function testAllTabs() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var results = [];
  Object.keys(TABS).forEach(function(key) {
    var name  = TABS[key];
    var sheet = ss.getSheetByName(name);
    results.push(key + ' → ' + name + ' : ' + (sheet ? '✅ FOUND' : '❌ NOT FOUND'));
  });
  Logger.log(results.join('\n'));
  return results;
}
