/**
 * SAGCO IMS — Google Apps Script Web App  (google-apps-script.js)
 * ═══════════════════════════════════════════════════════════════
 * DEPLOYMENT STEPS
 * ────────────────
 * 1. Open your Google Sheet → Extensions → Apps Script
 * 2. Paste this entire file (replace the default code)
 * 3. Save  (Ctrl + S)
 * 4. Click Deploy → New deployment
 *    Type: Web app
 *    Execute as: Me
 *    Who has access: Anyone
 * 5. Click Deploy → COPY the Web App URL
 * 6. Paste the URL into data.js  →  IMS_CONFIG.APPS_SCRIPT_URL
 *
 * GOOGLE SHEET TAB NAMES (create exactly these tabs, row 1 = headers):
 * ──────────────────────────────────────────────────────────────────────
 *  Tab name              │ Column headers (row 1)
 * ──────────────────────────────────────────────────────────────────────
 *  Risk Register         │ ref,type,cat,std,desc,L_inh,S_inh,score_inh,rating_inh,
 *                        │ controls,action,owner,due,L_res,S_res,score_res,rating_res,
 *                        │ monitor,ctx_ref,legal,obj_ref
 * ──────────────────────────────────────────────────────────────────────
 *  Objectives KPI        │ id,cat,std,desc,clause,baseline,kpi,target,action,
 *                        │ owner,due,freq,status,risk_ref,mr
 * ──────────────────────────────────────────────────────────────────────
 *  Legal Compliance      │ ref,auth,instrument,req,cat,std,clause,status,
 *                        │ evidence,owner,review,risk_ref
 * ──────────────────────────────────────────────────────────────────────
 *  MOC Register          │ id,cat,type,desc,trigger,std,safety,env,energy,quality,
 *                        │ controls,owner,approval,impl,risk_ref
 * ──────────────────────────────────────────────────────────────────────
 *  Energy Planning       │ id,source,seu,enpi,enb,q1_actual,trend,
 *                        │ action,owner,risk_ref,obj_ref
 * ──────────────────────────────────────────────────────────────────────
 *  Context Register      │ ref,ctx_type,ims_cat,pestle_cat,issue,effect,
 *                        │ std,clause,trend,risk_ref,obj_ref,legal_ref,
 *                        │ influence,interest,owner,review
 * ──────────────────────────────────────────────────────────────────────
 *  PESTLE SWOT           │ ref,type,category,description,implication,
 *                        │ swot_output,clause,risk_ref,ctx_ref,trend,priority
 * ──────────────────────────────────────────────────────────────────────
 *  Annual Checklist      │ no,item,criterion,source,clause,std,evidence,
 *                        │ status,findings,action_req,owner,target_date,
 *                        │ last_reviewed,next_review,mr_input,rr_link
 * ──────────────────────────────────────────────────────────────────────
 */

const SS = SpreadsheetApp.getActive();

function doGet(e) {
  const params = e ? (e.parameter || {}) : {};
  const tab    = params.tab    || '';
  const action = params.action || 'getData';

  let result;
  try {
    if (action === 'getData')    result = getTabData(tab);
    else if (action === 'summary') result = buildSummary();
    else if (action === 'ping')  result = { ok: true, ts: new Date().toISOString() };
    else result = { error: 'Unknown action: ' + action };
  } catch (err) {
    result = { error: err.message, stack: err.stack };
  }

  return ContentService
    .createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

/** Return all data rows from a tab as array-of-objects (row 1 = headers). */
function getTabData(tabName) {
  const sheet = SS.getSheetByName(tabName);
  if (!sheet) return { error: `Tab not found: "${tabName}"` };
  const values = sheet.getDataRange().getValues();
  if (values.length < 2) return [];
  const headers = values[0].map(h => String(h).trim());
  return values.slice(1)
    .filter(row => row.some(cell => cell !== '' && cell !== null))
    .map(row => {
      const obj = {};
      headers.forEach((h, i) => { obj[h] = row[i] !== undefined ? String(row[i]).trim() : ''; });
      return obj;
    });
}

/** Aggregate summary statistics for the dashboard. */
function buildSummary() {
  const out = { lastUpdated: new Date().toISOString() };
  const countCol = (tabName, colName) => {
    try {
      const rows = getTabData(tabName);
      if (!Array.isArray(rows)) return {};
      const c = {};
      rows.forEach(r => { const v = String(r[colName] || '').trim(); if (v) c[v] = (c[v] || 0) + 1; });
      return c;
    } catch(e) { return {}; }
  };
  out.risks       = countCol('Risk Register',   'rating_inh');
  out.objectives  = countCol('Objectives KPI',  'status');
  out.compliance  = countCol('Legal Compliance','status');
  out.moc         = countCol('MOC Register',    'approval');
  return out;
}
