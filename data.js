/* ═══════════════════════════════════════════════════════════════
   SAGCO IMS — Data Layer
   data.js  |  Rev.18  |  June 2026
   Provides: autoLoadPageData(), renderTable(), formatCell()
═══════════════════════════════════════════════════════════════ */

var SHEETS_URL = 'https://script.google.com/macros/s/AKfycby3V5Ap307LJ2eszIt-uFMRCMvwPPudpQJFZgtlb_75B4pB2Yo9UGWRon7vnidg-LTN5Q/exec';

/* ── Page → Tab key map ────────────────────────────────────── */
var TAB_KEYS = {
  'context.html':               'context',
  'pestle-swot.html':           'pestle',
  'policies.html':              'policies',
  'worker-participation.html':  'worker_part',
  'policy-acknowledgement.html':'policy_ack',
  'gemba-walk-log.html':        'gemba_walks',
  'steering-team-minutes.html': 'steering_team',
  'enms-champion.html':         'enms_champion',
  'ceo-signed-records.html':    'ceo_records',
  'communication-matrix.html':  'comms_matrix',
  'checklist.html':             'context',
  'risk-register.html':         'risks',
  'compliance.html':            'compliance',
  'methodology.html':           'methodology',
  'objectives.html':            'objectives',
  'moc.html':                   'moc',
  'energy.html':                'energy',
  'hira.html':                  'hira',
  'sea-register.html':          'sea',
  'bribery-risk-register.html': 'bribery_risk',
  'ghg-inventory.html':         'ghg_inventory',
  'scope3-emissions.html':      'scope3',
  'competency.html':            'competency',
  'training.html':              'training',
  'training-attendance.html':   'training_attend',
  'induction-records.html':     'induction',
  'documentation.html':         'documentation',
  'calibration-register.html':  'calibration',
  'ptw-register.html':          'ptw_register',
  'emergency-response.html':    'emergency',
  'contractor-register.html':   'contractor',
  'loto-register.html':         'loto_register',
  'loto-auth-persons.html':     'loto_auth',
  'confined-space-log.html':    'confined_space',
  'heat-stress-log.html':       'heat_stress',
  'fire-extinguisher-log.html': 'fire_ext',
  'fire-pump-log.html':         'fire_pump',
  'oh-surveillance.html':       'oh_surveillance',
  'scaffold-inspection.html':   'scaffold',
  'ndt-permit-log.html':        'ndt_permits',
  'chemical-inventory.html':    'chemical_inv',
  'crane-lifting.html':         'crane_lifting',
  'waste-management.html':      'waste_mgmt',
  'chemical-storage.html':      'chemical_store',
  'furnace-monitoring.html':    'furnace_monitor',
  'meps-register.html':         'meps',
  'water-waste.html':           'water_waste',
  'product-release.html':       'product_release',
  'nonconforming.html':         'nonconforming',
  'incoming-inspection.html':   'incoming_insp',
  'customer-register.html':     'customer_reg',
  'inprocess-inspection.html':  'inprocess_insp',
  'kpi-dashboard.html':         'kpi_dashboard',
  'compliance-eval.html':       'compliance_eval',
  'audit-programme.html':       'audit_programme',
  'management-review.html':     'mgmt_review',
  'capa-register.html':         'capa',
  'incident-register.html':     'incidents',
  'supplier-esg.html':          'supplier_esg',
  'coi-register.html':          'coi',
  'gifts-hospitality.html':     'gifts',
  'workforce-diversity.html':   'diversity',
  'tpdd.html':                  'tpdd',
  'supplier-conduct.html':      'supplier_scoc',
  'document-management.html':   'documents',
  'user-management.html':       'users',
};

/* ── Status badge rules ─────────────────────────────────────── */
var STATUS_RED = ['OPEN','URGENT','CRITICAL','NOT DONE','NON-COMPLIANT',
                  'PENDING CEO SIGNATURE','FAILED','OVERDUE'];
var STATUS_ORG = ['AT RISK','AMBER','MONITOR','DUE'];
var STATUS_AMB = ['IN PROGRESS','PENDING','PLANNED'];
var STATUS_GRN = ['ACTIVE','COMPLIANT','ON TRACK','COMPLETE',
                  'CLOSED','APPROVED','PASS','DONE'];

function formatCell(val) {
  if (!val && val !== 0) return '<span class="muted">—</span>';
  var s  = String(val).trim();
  var up = s.toUpperCase();
  var cls = '';
  if (STATUS_RED.some(function(x){ return up === x || up.startsWith(x); })) cls = 'nb-red';
  else if (STATUS_ORG.some(function(x){ return up === x || up.startsWith(x); })) cls = 'nb-org';
  else if (STATUS_AMB.some(function(x){ return up === x || up.startsWith(x); })) cls = 'nb-amb';
  else if (STATUS_GRN.some(function(x){ return up === x || up.startsWith(x); })) cls = 'nb-grn';
  if (cls) return '<span class="nb ' + cls + '">' + s + '</span>';
  return s;
}

/* ── Render table from JSON ─────────────────────────────────── */
function renderTable(data, container) {
  if (!data || !data.headers || !data.rows) {
    container.innerHTML = '<div class="empty-state"><strong>No data</strong>'
      + 'Table is empty or not yet populated in Google Sheets.</div>';
    return;
  }
  var wide = data.headers.length > 8;
  var html = '<div class="tbl-wrap"><table class="tbl-stripe'
    + (wide ? ' tbl-compact' : '') + '">';
  html += '<thead><tr>';
  data.headers.forEach(function(h) { html += '<th>' + h + '</th>'; });
  html += '</tr></thead><tbody>';
  if (!data.rows.length) {
    html += '<tr><td colspan="' + data.headers.length + '">'
      + '<div class="empty-state"><strong>No records</strong>'
      + 'Add data in Google Sheets to populate this table.</div>'
      + '</td></tr>';
  } else {
    data.rows.forEach(function(row) {
      html += '<tr>';
      row.forEach(function(cell) { html += '<td>' + formatCell(cell) + '</td>'; });
      html += '</tr>';
    });
  }
  html += '</tbody></table></div>';
  container.innerHTML = html;
}

/* ── Auto-load page data from Google Sheets ─────────────────── */
function autoLoadPageData() {
  var liveDiv = document.getElementById('live-table');
  if (!liveDiv) return;
  var page = window.location.pathname.split('/').pop() || 'index.html';
  var key  = TAB_KEYS[page];

  if (!key) {
    liveDiv.innerHTML = '<div class="empty-state"><strong>No data connection</strong>'
      + 'This page has no Google Sheets tab mapped.</div>';
    return;
  }

  liveDiv.innerHTML = '<div style="padding:20px;text-align:center;'
    + 'color:var(--text-lt);font-size:11px">⏳ Loading live data…</div>';

  fetch(SHEETS_URL + '?tab=' + key + '&action=read')
    .then(function(r) { return r.json(); })
    .then(function(data) {
      renderTable(data, liveDiv);

      var ts = document.getElementById('live-ts');
      if (ts) ts.textContent = 'Updated: ' + new Date().toLocaleTimeString();

      /* ── Auto-hide static tables when live data loads successfully ──────
         If Google Sheets returns real rows, hide any static placeholder
         table on the same page to avoid showing duplicate data.
         Static tables are identified by .tbl-wrap inside .content but
         outside #live-table. The live-section header is also updated
         to remove the "LIVE DATA" label — replaced with a clean banner. */
      if (data && data.rows && data.rows.length > 0) {
        hideStaticTables();
        upgradeLiveBanner();
      }
    })
    .catch(function() {
      liveDiv.innerHTML = '<div class="empty-state"><strong>Connection unavailable</strong>'
        + 'Could not reach Google Sheets. Check your internet connection.</div>';
    });
}

/* ── Hide static placeholder tables ────────────────────────────
   Finds all .tbl-wrap elements on the page that are NOT inside
   #live-table or .live-section and hides them.                  */
function hideStaticTables() {
  var content = document.querySelector('.content');
  if (!content) return;

  /* Find the live section container */
  var liveSection = document.querySelector('.live-section')
    || document.getElementById('live-table').parentElement;

  /* Find all table wrappers in content */
  var allTblWraps = content.querySelectorAll('.tbl-wrap');
  allTblWraps.forEach(function(wrap) {
    /* Skip if it is inside the live section */
    if (liveSection && liveSection.contains(wrap)) return;
    /* Skip if it is inside #live-table itself */
    var liveDiv = document.getElementById('live-table');
    if (liveDiv && liveDiv.contains(wrap)) return;
    /* Hide the static table and its nearest section banner */
    wrap.style.display = 'none';
    /* Also hide the sec-banner immediately before this table if present */
    var prev = wrap.previousElementSibling;
    while (prev) {
      if (prev.classList && prev.classList.contains('sec-banner')) {
        prev.style.display = 'none';
        break;
      }
      /* Stop if we hit another major element */
      if (prev.classList && (prev.classList.contains('kpi-grid') ||
          prev.classList.contains('req-text') ||
          prev.classList.contains('alert-red') ||
          prev.classList.contains('alert-amb'))) break;
      prev = prev.previousElementSibling;
    }
  });
}

/* ── Upgrade live data banner ───────────────────────────────────
   Replaces the "▶ LIVE DATA — Google Sheets | Updates automatically
   when you edit the spreadsheet" banner with a cleaner label that
   matches the page's sec-banner style.                           */
function upgradeLiveBanner() {
  var banner = document.querySelector('.live-banner');
  if (!banner) return;
  /* Extract the page title from the topbar subtitle for context */
  var sub = document.querySelector('.topbar-sub');
  var docCode = sub ? (sub.textContent.split('·')[0] || '').trim() : '';
  banner.innerHTML = '📡 Live data — Google Sheets'
    + (docCode ? ' &nbsp;·&nbsp; ' + docCode : '')
    + ' &nbsp;<span id="live-ts" style="font-size:9px;opacity:.7"></span>';
}

window.reloadLive = autoLoadPageData;

document.addEventListener('DOMContentLoaded', function() {
  setTimeout(autoLoadPageData, 100);
});
