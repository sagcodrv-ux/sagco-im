/* ═══════════════════════════════════════════════════════════════
   SAGCO IMS — Google Apps Script
   google-apps-script.js  |  Rev.18  |  June 2026

   DEPLOYMENT INSTRUCTIONS:
   1. Open Google Sheet → Extensions → Apps Script
   2. Delete all existing code → paste this entire file
   3. Click Save
   4. Run testAllTabs() to verify all sheet names match
   5. Run initDriveFolder() ONCE to create the IMS Attachments folder
      → copy the logged Folder ID into DRIVE_FOLDER_ID below
   6. Deploy → New deployment → Web App
      - Execute as: Me
      - Who has access: Anyone
   7. Copy Web App URL → paste into SHEETS_URL in data.js
   8. Upload updated data.js to GitHub

   CRITICAL: Never run doGet() from the editor Run button.
   Always use testAllTabs() or initDriveFolder() for testing.
   doGet() only works when called via the deployed Web App URL.

   After ANY change to this file → create a NEW deployment version.
═══════════════════════════════════════════════════════════════ */

/* ── Google Drive folder for IMS attachments ────────────────── */
/* Run initDriveFolder() once, copy the logged ID here */
var DRIVE_FOLDER_ID = 'PASTE_FOLDER_ID_HERE_AFTER_RUNNING_initDriveFolder';

/* ── Sheet name map ─────────────────────────────────────────── */
var TABS = {
  /* Document Management + Admin (NEW Rev.18) */
  'documents':       '📄 Document Register',
  'users':           '👥 User Register',
  'audit_log':       '🔐 Access & Audit Log',

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

/* ══════════════════════════════════════════════════════════════
   MAIN ROUTER
   Routes GET requests by action parameter.
   POST requests handled by doPost() for file uploads.
══════════════════════════════════════════════════════════════ */
function doGet(e) {
  var output = ContentService.createTextOutput();
  output.setMimeType(ContentService.MimeType.JSON);

  try {
    var action = e.parameter.action || 'read';
    var result;

    switch (action) {
      case 'read':
        result = readSheet(e.parameter.tab);
        break;

      case 'readDoc':
        /* Read a single document record by ID */
        result = readDocument(e.parameter.docId);
        break;

      case 'listFiles':
        /* List all files attached to a document */
        result = listDocumentFiles(e.parameter.docId);
        break;

      case 'writeDoc':
        /* Write / update a document record */
        result = writeDocument(e.parameter);
        break;

      case 'logAudit':
        /* Append an audit log entry */
        result = appendAuditLog(e.parameter.action2, e.parameter.detail,
                                e.parameter.userId, e.parameter.username);
        break;

      default:
        result = { error: 'Unknown action: ' + action };
    }

    output.setContent(JSON.stringify(result));
  } catch (err) {
    output.setContent(JSON.stringify({ error: err.message, stack: err.stack }));
  }
  return output;
}

/* ── POST handler: file upload to Google Drive ──────────────── */
function doPost(e) {
  var output = ContentService.createTextOutput();
  output.setMimeType(ContentService.MimeType.JSON);

  try {
    var params  = JSON.parse(e.postData.contents);
    var action  = params.action || 'uploadFile';

    if (action === 'uploadFile') {
      output.setContent(JSON.stringify(uploadFileToDrive(params)));
    } else if (action === 'deleteFile') {
      output.setContent(JSON.stringify(deleteFileFromDrive(params.fileId)));
    } else if (action === 'saveDocument') {
      output.setContent(JSON.stringify(saveDocumentRecord(params)));
    } else {
      output.setContent(JSON.stringify({ error: 'Unknown POST action: ' + action }));
    }
  } catch (err) {
    output.setContent(JSON.stringify({ error: err.message }));
  }
  return output;
}

/* ══════════════════════════════════════════════════════════════
   FILE UPLOAD TO GOOGLE DRIVE
══════════════════════════════════════════════════════════════ */
function uploadFileToDrive(params) {
  /* params: { fileName, mimeType, base64Data, docId, uploadedBy, revisionNote } */
  var folder = getImsFolder();

  /* Create a subfolder per document for organisation */
  var subFolderName = 'DOC-' + (params.docId || 'general');
  var subFolder;
  var subFolders = folder.getFoldersByName(subFolderName);
  if (subFolders.hasNext()) {
    subFolder = subFolders.next();
  } else {
    subFolder = folder.createFolder(subFolderName);
  }

  /* Decode base64 → Blob */
  var base64 = params.base64Data;
  /* Strip data URL prefix if present: "data:application/pdf;base64,..." */
  var commaIdx = base64.indexOf(',');
  if (commaIdx >= 0) base64 = base64.substring(commaIdx + 1);

  var decoded  = Utilities.base64Decode(base64);
  var blob     = Utilities.newBlob(decoded, params.mimeType || 'application/octet-stream', params.fileName);

  var file     = subFolder.createFile(blob);

  /* Make file accessible to anyone with the link */
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

  var fileId       = file.getId();
  var webViewLink  = 'https://drive.google.com/file/d/' + fileId + '/view';
  var downloadLink = 'https://drive.google.com/uc?export=download&id=' + fileId;
  var previewLink  = 'https://drive.google.com/file/d/' + fileId + '/preview';

  /* Record attachment in the Document Register sheet */
  recordAttachmentInSheet(
    params.docId,
    fileId,
    params.fileName,
    params.mimeType || '',
    webViewLink,
    downloadLink,
    params.uploadedBy || 'unknown',
    params.revisionNote || '',
    params.attachmentType || 'attachment' /* 'attachment' or 'version' */
  );

  return {
    ok:           true,
    fileId:       fileId,
    fileName:     params.fileName,
    webViewLink:  webViewLink,
    downloadLink: downloadLink,
    previewLink:  previewLink,
    folderId:     subFolder.getId(),
  };
}

/* ── Delete a file from Drive ───────────────────────────────── */
function deleteFileFromDrive(fileId) {
  try {
    var file = DriveApp.getFileById(fileId);
    file.setTrashed(true);
    return { ok: true, fileId: fileId };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

/* ══════════════════════════════════════════════════════════════
   DOCUMENT REGISTER — READ / WRITE
   The Document Register sheet stores document metadata.
   A separate "Attachments" sheet stores per-file records.
══════════════════════════════════════════════════════════════ */

/* ── Read all documents ─────────────────────────────────────── */
function readAllDocuments() {
  var ss    = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('📄 Document Register');
  if (!sheet) return { error: 'Document Register sheet not found', docs: [] };

  var data    = sheet.getDataRange().getValues();
  if (data.length < 4) return { docs: [] };

  var headers = data[2]; /* Row 3 */
  var docs    = [];
  for (var i = 3; i < data.length; i++) {
    var row = data[i];
    if (!row[0]) continue; /* skip empty rows */
    var doc = {};
    headers.forEach(function(h, idx) { doc[h] = String(row[idx] || ''); });
    /* Also load attachments for this doc */
    doc._attachments = getAttachmentsForDoc(doc['Doc ID'] || doc[headers[0]]);
    docs.push(doc);
  }
  return { docs: docs, count: docs.length };
}

/* ── Read a single document by ID ───────────────────────────── */
function readDocument(docId) {
  var all = readAllDocuments();
  if (all.error) return all;
  var doc = all.docs.find(function(d) { return d['Doc ID'] === docId; });
  if (!doc) return { error: 'Document not found: ' + docId };
  doc._attachments = getAttachmentsForDoc(docId);
  return { doc: doc };
}

/* ── Save / update a document record ───────────────────────── */
function saveDocumentRecord(params) {
  /* params: full document object with all metadata fields */
  var ss    = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('📄 Document Register');
  if (!sheet) return { error: 'Document Register sheet not found' };

  var data    = sheet.getDataRange().getValues();
  var headers = data[2];

  /* Find existing row */
  var docId = params['Doc ID'] || params.docId;
  var rowIdx = -1;
  for (var i = 3; i < data.length; i++) {
    if (String(data[i][0]) === docId) { rowIdx = i; break; }
  }

  /* Build row array from params in header order */
  var newRow = headers.map(function(h) { return params[h] || ''; });
  newRow[15] = new Date().toISOString().split('T')[0]; /* Last Updated */

  if (rowIdx >= 0) {
    /* Update existing */
    sheet.getRange(rowIdx + 1, 1, 1, newRow.length).setValues([newRow]);
  } else {
    /* Append new */
    var lastRow = sheet.getLastRow();
    sheet.getRange(lastRow + 1, 1, 1, newRow.length).setValues([newRow]);
  }

  return { ok: true, docId: docId, action: rowIdx >= 0 ? 'updated' : 'inserted' };
}

/* ── List files for a document ──────────────────────────────── */
function listDocumentFiles(docId) {
  return { files: getAttachmentsForDoc(docId), docId: docId };
}

/* ── Get attachments from Attachments sheet ─────────────────── */
function getAttachmentsForDoc(docId) {
  var ss    = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('📎 Attachments');
  if (!sheet) return [];

  var data = sheet.getDataRange().getValues();
  if (data.length < 4) return [];

  var files = [];
  for (var i = 3; i < data.length; i++) {
    var row = data[i];
    if (String(row[0]) === docId && row[1]) {
      files.push({
        docId:        String(row[0]),
        fileId:       String(row[1]),
        fileName:     String(row[2]),
        mimeType:     String(row[3]),
        uploadedDate: String(row[4]),
        uploadedBy:   String(row[5]),
        webViewLink:  String(row[6]),
        downloadLink: String(row[7]),
        attachType:   String(row[8] || 'attachment'),
        revNote:      String(row[9] || ''),
        size:         String(row[10] || ''),
      });
    }
  }
  return files;
}

/* ── Record attachment in Attachments sheet ─────────────────── */
function recordAttachmentInSheet(docId, fileId, fileName, mimeType,
                                  webViewLink, downloadLink, uploadedBy,
                                  revNote, attachType) {
  var ss    = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('📎 Attachments');

  /* Create the sheet if it doesn't exist */
  if (!sheet) {
    sheet = ss.insertSheet('📎 Attachments');
    /* Title rows */
    sheet.getRange('A1').setValue('SAGCO IMS — Attachments Register');
    sheet.getRange('A2').setValue('Auto-maintained by Apps Script — do not edit manually');
    sheet.getRange('A3:K3').setValues([[
      'Doc ID','File ID','File Name','MIME Type','Upload Date',
      'Uploaded By','View Link','Download Link','Type','Revision Note','Size'
    ]]);
  }

  var lastRow = sheet.getLastRow();
  sheet.getRange(lastRow + 1, 1, 1, 11).setValues([[
    docId, fileId, fileName, mimeType,
    new Date().toISOString().split('T')[0],
    uploadedBy, webViewLink, downloadLink,
    attachType, revNote, ''
  ]]);

  /* Also update the attachment count in Document Register */
  updateAttachmentCount(docId);
}

/* ── Update attachment count in Document Register ───────────── */
function updateAttachmentCount(docId) {
  var files   = getAttachmentsForDoc(docId);
  var attCount = files.filter(function(f){ return f.attachType === 'attachment'; }).length;
  var verCount = files.filter(function(f){ return f.attachType === 'version'; }).length;

  var ss    = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('📄 Document Register');
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
  var sheet = ss.getSheetByName('🔐 Access & Audit Log');
  if (!sheet) return { error: 'Audit log sheet not found' };

  var lastRow = sheet.getLastRow();
  sheet.getRange(lastRow + 1, 1, 1, 8).setValues([[
    new Date().toISOString(),
    action || '',
    username || '',
    userId   || '',
    detail   || '',
    '',
    'OK',
    'System'
  ]]);
  return { ok: true };
}

/* ══════════════════════════════════════════════════════════════
   STANDARD READ (existing tabs)
══════════════════════════════════════════════════════════════ */
function readSheet(tabKey) {
  var sheetName = TABS[tabKey];
  if (!sheetName) return { error: 'Unknown tab: ' + tabKey, headers: [], rows: [], rowCount: 0 };

  var ss    = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) return { error: 'Sheet not found: ' + sheetName, headers: [], rows: [], rowCount: 0 };

  var data     = sheet.getDataRange().getValues();
  var headers  = data[2] || [];
  var rows     = data.slice(3);
  var nonEmpty = rows.filter(function(r){ return r.some(function(c){ return c !== ''; }); });

  return {
    headers:  headers.map(String),
    rows:     nonEmpty.map(function(r){ return r.map(function(c){ return c === '' ? '' : String(c); }); }),
    rowCount: nonEmpty.length,
    sheet:    sheetName,
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
  /* Fallback: find or create by name */
  var folders = DriveApp.getFoldersByName('SAGCO IMS Attachments');
  if (folders.hasNext()) return folders.next();
  var f = DriveApp.createFolder('SAGCO IMS Attachments');
  Logger.log('Created folder. Copy this ID into DRIVE_FOLDER_ID: ' + f.getId());
  return f;
}

/* ── One-time setup: create Drive folder & log its ID ───────── */
function initDriveFolder() {
  var folders = DriveApp.getFoldersByName('SAGCO IMS Attachments');
  var folder;
  if (folders.hasNext()) {
    folder = folders.next();
    Logger.log('Folder already exists.');
  } else {
    folder = DriveApp.createFolder('SAGCO IMS Attachments');
    Logger.log('Folder created.');
  }
  Logger.log('═══════════════════════════════════════════════');
  Logger.log('FOLDER ID: ' + folder.getId());
  Logger.log('Paste this into DRIVE_FOLDER_ID at the top of this script.');
  Logger.log('═══════════════════════════════════════════════');

  /* Also ensure the Attachments sheet exists */
  var ss    = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('📎 Attachments');
  if (!sheet) {
    sheet = ss.insertSheet('📎 Attachments');
    sheet.getRange('A1').setValue('SAGCO IMS — Attachments Register');
    sheet.getRange('A2').setValue('Auto-maintained by Apps Script — do not edit manually');
    sheet.getRange('A3:K3').setValues([[
      'Doc ID','File ID','File Name','MIME Type','Upload Date',
      'Uploaded By','View Link','Download Link','Type','Revision Note','Size'
    ]]);
    Logger.log('Created 📎 Attachments sheet.');
  } else {
    Logger.log('📎 Attachments sheet already exists.');
  }

  return { folderId: folder.getId(), folderName: folder.getName() };
}

/* ── Verify all tabs exist ───────────────────────────────────── */
function testAllTabs() {
  var ss      = SpreadsheetApp.getActiveSpreadsheet();
  var results = [];
  Object.keys(TABS).forEach(function(key) {
    var name  = TABS[key];
    var sheet = ss.getSheetByName(name);
    results.push(key + ' → ' + name + ' : ' + (sheet ? '✅ FOUND' : '❌ NOT FOUND'));
  });
  /* Also check new sheets */
  ['📎 Attachments'].forEach(function(n){
    var s = ss.getSheetByName(n);
    results.push(n + ' : ' + (s ? '✅ FOUND' : '❌ NOT FOUND (run initDriveFolder)'));
  });
  Logger.log(results.join('\n'));
  return results;
}
