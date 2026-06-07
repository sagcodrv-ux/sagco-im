/**
 * SAGCO IMS — data.js  Rev.16
 * ─────────────────────────────────────────────────────────────────────────────
 * Connects the website to the Google Sheets database via the Apps Script
 * Web App URL below. Each page calls getData('tab_key') to load its data.
 *
 * SETUP: Replace the SHEETS_URL value with your deployed Web App URL.
 * ─────────────────────────────────────────────────────────────────────────────
 */

const SHEETS_URL = 'https://script.google.com/macros/s/AKfycbyIm3hxXlp_4gnX434YiSDCRcFljyBZbUwWlweeuE51JIHVPy0NSiHHZ0DukjouUpD5/exec';

// ─────────────────────────────────────────────────────────────────────────────
// TAB KEY → SHEET NAME MAP  (mirrors google-apps-script.js TABS constant)
// Website pages use these keys to request their data.
// ─────────────────────────────────────────────────────────────────────────────
const TAB_KEYS = {
  // Clause 4
  'context.html':             'context',
  'pestle-swot.html':         'pestle',
  'scope.html':               'context',
  'checklist.html':           'checklist',
  // Clause 5
  'policies.html':            'policies',
  'worker-participation.html':'worker_part',
  'policy-acknowledgement.html':'policy_ack',
  'gemba-walk-log.html':      'gemba_walks',
  'steering-team-minutes.html':'steering_team',
  'enms-champion.html':       'enms_champion',
  'ceo-signed-records.html':  'ceo_records',
  'communication-matrix.html':'comms_matrix',
  // Clause 6
  'risk-register.html':       'risks',
  'compliance.html':          'compliance',
  'methodology.html':         'methodology',
  'objectives.html':          'objectives',
  'moc.html':                 'moc',
  'energy.html':              'energy',
  'hira.html':                'hira',
  'sea-register.html':        'sea',
  'bribery-risk-register.html':'bribery_risk',
  'ghg-inventory.html':       'ghg_inventory',
  'scope3-emissions.html':    'scope3',
  // Clause 7
  'competency.html':          'competency',
  'training.html':            'training',
  'training-attendance.html': 'training_attend',
  'induction-records.html':   'induction',
  'documentation.html':       'documentation',
  'calibration-register.html':'calibration',
  // Clause 8
  'ptw-register.html':        'ptw_register',
  'emergency-response.html':  'emergency',
  'contractor-register.html': 'contractor',
  'loto-register.html':       'loto_register',
  'loto-auth-persons.html':   'loto_auth',
  'confined-space-log.html':  'confined_space',
  'heat-stress-log.html':     'heat_stress',
  'fire-extinguisher-log.html':'fire_ext',
  'fire-pump-log.html':       'fire_pump',
  'oh-surveillance.html':     'oh_surveillance',
  'scaffold-inspection.html': 'scaffold',
  'ndt-permit-log.html':      'ndt_permits',
  'chemical-inventory.html':  'chemical_inv',
  'crane-lifting.html':       'crane_lifting',
  'waste-management.html':    'waste_mgmt',
  'chemical-storage.html':    'chemical_store',
  'furnace-monitoring.html':  'furnace_monitor',
  'meps-register.html':       'meps',
  'product-release.html':     'product_release',
  'nonconforming.html':       'nonconforming',
  'incoming-inspection.html': 'incoming_insp',
  'customer-register.html':   'customer_reg',
  'inprocess-inspection.html':'inprocess_insp',
  // Clause 9
  'kpi-dashboard.html':       'kpi_dashboard',
  'compliance-eval.html':     'compliance_eval',
  'audit-programme.html':     'audit_programme',
  'management-review.html':   'mgmt_review',
  // Clause 10
  'capa-register.html':       'capa',
  'incident-register.html':   'incidents',
  // ESG
  'supplier-esg.html':        'supplier_esg',
  'coi-register.html':        'coi',
  'gifts-hospitality.html':   'gifts',
  'workforce-diversity.html': 'diversity',
  'tpdd.html':                'tpdd',
  'water-waste.html':         'water_waste',
  'supplier-conduct.html':    'supplier_scoc',
};

// ─────────────────────────────────────────────────────────────────────────────
// CORE FETCH FUNCTION
// Usage: getData('capa').then(data => { /* data.headers, data.rows */ })
// ─────────────────────────────────────────────────────────────────────────────
function getData(tabKey) {
  if (!SHEETS_URL || SHEETS_URL.includes('YOUR_URL')) {
    console.warn('SAGCO IMS: SHEETS_URL not configured in data.js');
    return Promise.resolve({ headers: [], rows: [], error: 'SHEETS_URL not configured' });
  }
  const url = `${SHEETS_URL}?tab=${encodeURIComponent(tabKey)}`;
  return fetch(url)
    .then(r => r.json())
    .catch(err => ({ headers: [], rows: [], error: err.toString() }));
}

// ─────────────────────────────────────────────────────────────────────────────
// AUTO-LOAD — call this from any page to auto-load and render its data
// It detects the current page filename, finds the right tab key,
// fetches the data, and injects it into any element with id="live-table"
// ─────────────────────────────────────────────────────────────────────────────
function autoLoadPageData() {
  const pageName = window.location.pathname.split('/').pop() || 'index.html';
  const tabKey = TAB_KEYS[pageName];
  if (!tabKey) return; // page has no live data (dashboard, procedure pages, etc.)

  const container = document.getElementById('live-table');
  if (!container) return;

  container.innerHTML = '<div style="padding:20px;color:var(--g400);font-size:12px">⟳ Loading live data from Google Sheets…</div>';

  getData(tabKey).then(data => {
    if (data.error) {
      container.innerHTML = `<div style="padding:16px;background:#FFF8E1;border-radius:8px;font-size:11px;color:#7a5800">
        ⚠️ Could not load live data: ${data.error}<br>
        <small>Data shown is from the static workbook. Check Google Sheets connection.</small>
      </div>`;
      return;
    }
    if (!data.rows || data.rows.length === 0) {
      container.innerHTML = '<div style="padding:16px;color:var(--g400);font-size:11px">No records yet in Google Sheets. Add data directly in the spreadsheet — it will appear here on next refresh.</div>';
      updateSyncTime();
      return;
    }
    renderTable(container, data.headers, data.rows);
    updateSyncTime();
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// TABLE RENDERER — builds a styled table from headers + rows
// ─────────────────────────────────────────────────────────────────────────────
function renderTable(container, headers, rows) {
  const ths = headers.map(h => `<th>${h}</th>`).join('');
  const trs = rows.map(row =>
    `<tr>${row.map(cell => `<td>${formatCell(cell)}</td>`).join('')}</tr>`
  ).join('');

  container.innerHTML = `
    <div style="margin-bottom:8px;font-size:10px;color:var(--g400)">
      ${rows.length} record${rows.length!==1?'s':''} — live from Google Sheets
      <button onclick="autoLoadPageData()" style="margin-left:8px;font-size:10px;padding:1px 6px;cursor:pointer;border-radius:4px;border:1px solid #ddd;background:var(--g100)">↻ Refresh</button>
    </div>
    <div class="tbl-wrap">
      <table class="tbl-stripe">
        <thead><tr>${ths}</tr></thead>
        <tbody>${trs}</tbody>
      </table>
    </div>`;
}

// ─────────────────────────────────────────────────────────────────────────────
// CELL FORMATTER — applies colour badges to known status values
// ─────────────────────────────────────────────────────────────────────────────
function formatCell(val) {
  if (!val) return '';
  const v = val.toString();

  const statusMap = {
    'OPEN':'kc-red','URGENT':'kc-red','CRIT':'kc-red','CRITICAL':'kc-red',
    'NON-COMPLIANT':'kc-red','NOT DONE':'kc-red','PENDING CEO SIGNATURE':'kc-red',
    'NOT YET CONDUCTED':'kc-red','STAGE 2 BLOCKER':'kc-red','CAPA-2026-001':'kc-red',
    'CAPA-2026-002':'kc-red','CAPA-2026-004':'kc-red',
    'AT RISK':'kc-org','AMBER':'kc-org','MONITOR':'kc-org',
    'IN PROGRESS':'kc-amb','PENDING':'kc-amb','PLANNED':'kc-amb',
    'MONITORING':'kc-amb','DUE':'kc-amb',
    'ACTIVE':'kc-grn','COMPLIANT':'kc-grn','ON TRACK':'kc-grn','COMPLETE':'kc-grn',
    'CLOSED':'kc-grn','PASS':'kc-grn','GREEN':'kc-grn','APPROVED':'kc-grn',
    'VALIDATED':'kc-grn','YES':'kc-grn',
    'NO':'kc-red','FAIL':'kc-red','RED':'kc-red',
  };

  const cls = statusMap[v.toUpperCase()];
  if (cls) return `<span class="badge ${cls}">${v}</span>`;

  // Highlight CAPA references
  if (/^CAPA-\d{4}-\d{3}/.test(v)) return `<span class="badge kc-amb">${v}</span>`;

  return v;
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────
function updateSyncTime() {
  const now = new Date().toLocaleTimeString('en-GB', { hour:'2-digit', minute:'2-digit' });
  document.querySelectorAll('.js-last-sync').forEach(el => el.textContent = now);
}

function riskRating(score) {
  if (score >= 15) return '<span class="badge kc-red">CRITICAL</span>';
  if (score >= 10) return '<span class="badge kc-org">HIGH</span>';
  if (score >= 5)  return '<span class="badge kc-amb">MEDIUM</span>';
  return '<span class="badge kc-grn">LOW</span>';
}

function statusBadge(s) {
  return formatCell(s);
}

function scorePill(score, rating) {
  const cls = score >= 15 ? 'kc-red' : score >= 10 ? 'kc-org' : score >= 5 ? 'kc-amb' : 'kc-grn';
  return `<span class="badge ${cls}">${score} — ${rating}</span>`;
}

function showLoader(show) {
  const el = document.getElementById('loader');
  if (el) el.className = show ? 'loader' : 'loader hidden';
}

function startRefresh(fn, intervalMs) {
  fn();
  if (intervalMs) setInterval(fn, intervalMs);
}

// Auto-run when DOM is ready
document.addEventListener('DOMContentLoaded', autoLoadPageData);
