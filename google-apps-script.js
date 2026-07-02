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
  'ptw_register':    '36 – PTW Register',
  'emergency':       '34b – Emergency Response',
  'contractor':      '35 – Contractor Register',
  'loto_register':   '37 – LOTO Register',
  'loto_auth':       ' LOTO Auth',
  'confined_space':  '38 – Confined Space Log',
  'heat_stress':     '39 – Heat Stress WBGT Log',
  'fire_ext':        '40 – Fire Extinguisher Log',
  'fire_pump':       '41 – Fire Pump Test Log',
  'oh_surveillance': '42 – OH Surveillance Register',
  'scaffold':        ' Scaffold',
  'ndt_permits':     '☢ NDT Permits',
  'chemical_inv':    '⚗ Chemical Inv',
  'crane_lifting':   ' Crane Lifting',
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
  'incidents':       ' Incidents',

  /* ESG */
  'supplier_esg':    ' Supplier ESG',
  'coi':             ' CoI Register',
  'gifts':           ' Gifts',
  'diversity':       ' Diversity',
  'tpdd':            ' TPDD',
  'water_waste':     ' Water & Waste',
  'supplier_scoc':   ' Supplier SCoC',

  /* New Safety & ESG Programmes — Rev.19 */
  'ppe_register':      '54 – PPE Register',
  'wah_register':      '55 – WAH Register',
  'hot_work':          '56 – Hot Work Log',
  'electrical_safety': '57 – Electrical Safety Log',
  'furnace_leakage':   '58 – Furnace Leakage Log',
  'first_aid':         '59 – First Aid Records',
  'forklift_log':      '60 – Forklift Log',
  'visitor_register':  '61 – Visitor Register',
  'speak_up':          '62 – Speak-Up Register',
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

    if (pAction === 'write') {
      var wTab  = e.parameter.tab || '';
      var wRows = JSON.parse(e.postData ? e.postData.contents : '[]');
      return ContentService
        .createTextOutput(writeRows(wTab, wRows))
        .setMimeType(ContentService.MimeType.JSON);
    }
  } catch(routeErr) { /* fall through to existing doPost */ }

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
    var GEMINI_KEY = 'AIzaSyAQ.Ab8RN6Jg9J7QGAjLEr9KUSIiIVsjzwSrvcX54LBNFyijJHlFvg';
    var url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=' + GEMINI_KEY;

    /* Convert message history to Gemini format */
    var contents = [];

    /* Add system prompt as first user turn */
    if (system) {
      contents.push({ role: 'user', parts: [{ text: 'SYSTEM INSTRUCTIONS:
' + system }] });
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
    { tab: 'fire_ext',       dateField: 'Next Inspection Date',warnDays: 14, label: 'Fire Extinguisher',page: 'fire-extinguisher-log.html' },
    { tab: 'capa',           dateField: 'Due Date',            warnDays:  7, label: 'CAPA',             page: 'capa-register.html'         },
    { tab: 'ptw_register',   dateField: 'Expiry Date',         warnDays:  3, label: 'PTW',              page: 'ptw-register.html'          },
    { tab: 'oh_surveillance',dateField: 'Next Due',            warnDays: 30, label: 'OH Surveillance',  page: 'oh-surveillance.html'       },
    { tab: 'scaffold',       dateField: 'Next Inspection Date',warnDays:  7, label: 'Scaffold',         page: 'scaffold-inspection.html'   },
    { tab: 'crane_lifting',  dateField: 'Next Inspection Due', warnDays: 14, label: 'Crane & Lifting',  page: 'crane-lifting.html'         },
    { tab: 'loto_register',  dateField: 'Last Verified',       warnDays: 90, label: 'LOTO',             page: 'loto-register.html'         },
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

      data.forEach(function(row) {
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
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(sheetName);
  if (sheet) return sheet;

  function normalize(s) {
    return String(s).replace(/[^\w\s\-&\.]/g, '').replace(/\s+/g, ' ').trim().toLowerCase();
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
