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
var DRIVE_FOLDER_ID = '1PZQ2VLPg8548BIgbrfqg4mcojKE7J7lU';

/* ── Sheet name map ─────────────────────────────────────────── */
var TABS = {
  /* Document Management + Admin (NEW Rev.18) */
  'documents':       'Document Register',
  'users':           'User Register',
  'audit_log':       'Access & Audit Log',

  /* Clause 4 */
  'context':         'Context',
  'pestle':          'PESTLE-SWOT',

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
  var action = e.parameter.action || 'read';

  /* ── Serve the file picker HTML page ─────────────────────── */
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
      case 'read':       result = readSheet(e.parameter.tab);               break;
      case 'readDoc':    result = readDocument(e.parameter.docId);          break;
      case 'listFiles':  result = listDocumentFiles(e.parameter.docId);     break;
      case 'listVersions':       result = listVersions(e.parameter.docId);        break;
      case 'listAllVersions':    result = listAllVersions();                       break;
      case 'saveVersion':        result = saveVersion(e.parameter);               break;
      case 'saveDocumentRecord': result = saveDocumentRecord(e.parameter);        break;
      case 'writeDoc':   result = writeDocument(e.parameter);               break;
      case 'deleteAttachment': result = deleteAttachmentFromSheet(e.parameter.fileId, e.parameter.docId); break;
      case 'uploadFilePicker':
        /* Called via GET from the picker popup — handles the actual Drive upload */
        result = uploadFileFromPicker(
          e.parameter.docId,
          e.parameter.fileName,
          e.parameter.mimeType,
          e.parameter.b64,
          e.parameter.username
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
   FILE PICKER HTML
   Served as a popup from the IMS website.
   Uses multipart POST to send file to Apps Script.
   Progress bar + success/error feedback shown in popup.
   postMessage sends link back to parent website on success.
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
    /* Progress */
    + '.prog{margin-top:16px;display:none}'
    + '.prog-label{font-size:11px;color:#5A6478;margin-bottom:6px;display:flex;justify-content:space-between}'
    + '.prog-track{height:8px;background:#e8ecf3;border-radius:4px;overflow:hidden}'
    + '.prog-fill{height:100%;background:#C9A84C;border-radius:4px;width:0;transition:width .4s ease}'
    + '.prog-fill.done{background:#2E7D32}'
    + '.prog-fill.fail{background:#B71C1C}'
    /* Result */
    + '.result{margin-top:14px;padding:11px 14px;border-radius:6px;font-size:12px;line-height:1.5;display:none}'
    + '.result.ok{background:#e8f5e9;border-left:4px solid #2E7D32;color:#1b5e20}'
    + '.result.err{background:#fdecea;border-left:4px solid #B71C1C;color:#7f1111}'
    /* File info */
    + '.finfo{margin-top:12px;padding:10px 12px;background:#f0f3f9;border-radius:6px;font-size:11px;color:#1B2A4A;display:none}'
    + '.finfo strong{display:block;margin-bottom:2px}'
    + '.note{font-size:10px;color:#8899aa;text-align:center;margin-top:14px;line-height:1.5}'
    + '.btn-close{display:none;width:100%;margin-top:12px;background:#1B2A4A;color:#fff;border:none;border-radius:6px;padding:10px;font-size:12px;font-weight:700;cursor:pointer}'
    + '</style></head><body>'
    + '<div class="box">'
    +   '<div class="hdr"><h2>📎 Upload Supporting Document</h2>'
    +     '<p>SAGCO IMS · Doc: ' + docId + ' · User: ' + username + '</p></div>'
    +   '<div class="body">'
    +     '<div class="zone" id="zone">'
    +       '<input type="file" id="fi">'
    +       '<div class="ico">📂</div>'
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

    + 'function startSim(from,to,label,ms){\n'
    + '  clearInterval(simTimer);\n'
    + '  var cur=from,step=(to-from)/(ms/80);\n'
    + '  setP(cur,label);\n'
    + '  simTimer=setInterval(function(){cur=Math.min(cur+step,to);setP(Math.round(cur),label);if(cur>=to)clearInterval(simTimer);},80);\n'
    + '}\n'

    + 'function setP(pct,label,cls){\n'
    + '  progFill.style.width=pct+"%";\n'
    + '  if(cls)progFill.className="prog-fill "+cls;\n'
    + '  if(label){progTxt.textContent=label;}\n'
    + '  progPct.textContent=pct+"%";\n'
    + '}\n'

    + 'function go(file){\n'
    + '  if(file.size>26214400){showErr("File too large — max 25 MB.");return;}\n'
    + '  uploading=true;\n'

    /* Immediately show everything — do NOT rely on async for UI visibility */
    + '  zone.style.opacity="0.3";\n'
    + '  zone.style.pointerEvents="none";\n'

    /* Show file info */
    + '  finfo.style.display="block";\n'
    + '  document.getElementById("fname").textContent=file.name;\n'
    + '  document.getElementById("fsize").textContent=file.size>1048576?(file.size/1048576).toFixed(1)+" MB":Math.round(file.size/1024)+" KB";\n'

    /* Show progress bar immediately */
    + '  prog.style.display="block";\n'
    + '  result.style.display="none";\n'
    + '  setP(2,"📖 Reading file…");\n'

    /* Read file */
    + '  var reader=new FileReader();\n'
    + '  reader.onerror=function(){showErr("Could not read the file.");};\n'
    + '  reader.onload=function(ev){\n'
    + '    startSim(25,75,"☁ Uploading to Google Drive…",4000);\n'
    + '    var b64=ev.target.result.split(",")[1];\n'
    /* Use google.script.run — works correctly when page is served by Apps Script */
    + '    google.script.run\n'
    + '      .withSuccessHandler(function(res){\n'
    + '        clearInterval(simTimer);\n'
    + '        if(res&&res.ok){\n'
    + '          setP(100,"✅ Done!","done");\n'
    + '          showOk(res);\n'
    + '          if(window.opener){\n'
    + '            try{window.opener.postMessage({type:"IMS_FILE_UPLOADED",file:res},"*");}catch(e){}\n'
    + '          }\n'
    + '          setTimeout(function(){\n'
    + '            try{window.close();}catch(e){}\n'
    + '            try{window.location.replace("about:blank");}catch(e){}\n'
    + '          },3000);\n'
    + '        } else {\n'
    + '          showErr((res&&res.error)||"Upload failed on server.");\n'
    + '        }\n'
    + '      })\n'
    + '      .withFailureHandler(function(err){\n'
    + '        clearInterval(simTimer);\n'
    + '        showErr(err.message||"Server error — check Apps Script logs.");\n'
    + '      })\n'
    + '      .uploadFileFromPicker(DOC_ID,file.name,file.type||"application/octet-stream",b64,USERNAME);\n'
    + '  };\n'
    /* Simulate reading progress */
    + '  startSim(2,25,"📖 Reading file…",600);\n'
    + '  reader.readAsDataURL(file);\n'
    + '}\n'

    + 'function showOk(res){\n'
    + '  result.style.display="block";\n'
    + '  result.className="result ok";\n'
    + '  result.innerHTML="✅ <strong>"+res.fileName+"</strong> saved to Google Drive.<br><small style=\'opacity:.7\'>You can now close this window.</small>";\n'
    + '  btnClose.style.display="block";\n'
    + '  uploading=false;\n'
    /* postMessage to parent */
    + '  if(window.opener){try{window.opener.postMessage({type:"IMS_FILE_UPLOADED",file:res},"*");}catch(e){}}\n'
    /* Auto-close: navigate to blank page — works even when window.close() is blocked */
    + '  setTimeout(function(){\n'
    + '    try{window.close();}catch(e){}\n'
    + '    try{window.location.replace("about:blank");}catch(e){}\n'
    + '  },3000);\n'
    + '}\n'

    + 'function showErr(msg){\n'
    + '  clearInterval(simTimer);\n'
    + '  setP(100,"❌ Failed","fail");\n'
    + '  result.style.display="block";\n'
    + '  result.className="result err";\n'
    + '  result.innerHTML="❌ "+msg+"<br><small>Please try again.</small>";\n'
    + '  btnClose.style.display="block";\n'
    + '  zone.style.opacity="";\n'
    + '  zone.style.pointerEvents="";\n'
    + '  uploading=false;\n'
    + '}\n'
    /* Close button: try all methods */
    + 'btnClose.addEventListener("click",function(){\n'
    + '  try{window.close();}catch(e){}\n'
    + '  try{window.location.replace("about:blank");}catch(e){}\n'
    + '});\n'
    + '</script></body></html>';
}

/* ── Server-side upload function called from picker HTML ──────── */
function uploadFileFromPicker(docId, fileName, mimeType, base64Data, uploadedBy) {
  try {
    var folder = getImsFolder();

    /* Sub-folder per document */
    var subFolderName = docId || 'general';
    var subFolder;
    var subFolders = folder.getFoldersByName(subFolderName);
    if (subFolders.hasNext()) {
      subFolder = subFolders.next();
    } else {
      subFolder = folder.createFolder(subFolderName);
    }

    /* Decode base64 and create file */
    var decoded  = Utilities.base64Decode(base64Data);
    var blob     = Utilities.newBlob(decoded, mimeType || 'application/octet-stream', fileName);
    var file     = subFolder.createFile(blob);

    /* Make accessible to anyone with the link */
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

    var fileId       = file.getId();
    var webViewLink  = 'https://drive.google.com/file/d/' + fileId + '/view';
    var downloadLink = 'https://drive.google.com/uc?export=download&id=' + fileId;

    /* Record in Attachments sheet */
    recordAttachmentInSheet(docId, fileId, fileName, mimeType,
                            webViewLink, downloadLink, uploadedBy || 'unknown',
                            '', 'attachment');

    return {
      ok:          true,
      fileId:      fileId,
      fileName:    fileName,
      docId:       docId,
      webViewLink: webViewLink,
      downloadLink:downloadLink,
      previewLink: 'https://drive.google.com/file/d/' + fileId + '/preview',
      source:      'drive',
      date:        new Date().toISOString().split('T')[0],
    };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

/* ── POST handler ───────────────────────────────────────────── */
function doPost(e) {
  var output = ContentService.createTextOutput();
  output.setMimeType(ContentService.MimeType.JSON);
  try {
    var body = e.postData ? e.postData.contents : '{}';
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

/* ── Delete attachment record from Attachments sheet ────────── */
function deleteAttachmentFromSheet(fileId, docId) {
  try {
    var ss    = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName('📎 Attachments');
    if (!sheet) return { ok: false, error: 'Attachments sheet not found' };

    var data = sheet.getDataRange().getValues();
    for (var i = data.length - 1; i >= 3; i--) {
      /* fileId is in column B (index 1) */
      if (String(data[i][1]) === fileId) {
        sheet.deleteRow(i + 1);
        updateAttachmentCount(docId);
        return { ok: true, fileId: fileId, rowDeleted: i + 1 };
      }
    }
    return { ok: false, error: 'File not found in register: ' + fileId };
  } catch(err) {
    return { ok: false, error: err.message };
  }
}

/* ── Save / update a document record in Document Register ────── */
function saveDocumentRecord(params) {
  try {
    var ss    = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName('Document Register');
    if (!sheet) {
      /* Try fuzzy match */
      var sheets = ss.getSheets();
      for (var i = 0; i < sheets.length; i++) {
        if (sheets[i].getName().toLowerCase().replace(/[^\w]/g,'').indexOf('documentregister') >= 0) {
          sheet = sheets[i]; break;
        }
      }
    }
    if (!sheet) return { ok: false, error: 'Document Register sheet not found' };

    var data    = sheet.getDataRange().getValues();
    var headers = data[2] || []; /* Row 3 = headers */

    /* Find column indices */
    function findCol(names) {
      for (var n = 0; n < names.length; n++) {
        for (var c = 0; c < headers.length; c++) {
          if (String(headers[c]).toLowerCase().replace(/[\s\._]/g,'') ===
              names[n].toLowerCase().replace(/[\s\._]/g,'')) return c;
        }
      }
      return -1;
    }

    var cols = {
      id:        findCol(['docid','id','Doc ID']),
      number:    findCol(['documentnumber','docnumber','number']),
      title:     findCol(['documenttitle','title']),
      rev:       findCol(['currentrev','rev','revision','versions']),
      type:      findCol(['documenttype','type']),
      status:    findCol(['status']),
      issued:    findCol(['dateofissue','issued','issuedate']),
      reviewDue: findCol(['reviewduedate','reviewdue','nextreview']),
      owner:     findCol(['documentowner','owner']),
    };

    /* Find existing row by Doc ID */
    var existingRow = -1;
    for (var r = 3; r < data.length; r++) {
      if (cols.id >= 0 && String(data[r][cols.id]) === String(params.docId)) {
        existingRow = r + 1; /* 1-indexed */
        break;
      }
    }

    /* Build row values in header order */
    var rowData = headers.map(function(h, c) {
      var key = Object.keys(cols).find(function(k){ return cols[k] === c; });
      if (!key) return data[existingRow > 0 ? existingRow - 1 : 3] ? data[existingRow > 0 ? existingRow - 1 : 3][c] || '' : '';
      var map = { id:'docId', number:'docNumber', title:'title', rev:'rev',
                  type:'type', status:'status', issued:'issued',
                  reviewDue:'reviewDue', owner:'owner' };
      return params[map[key]] || '';
    });

    if (existingRow > 0) {
      /* Update existing row */
      sheet.getRange(existingRow, 1, 1, rowData.length).setValues([rowData]);
    } else {
      /* Append new row */
      var lastRow = sheet.getLastRow();
      sheet.getRange(lastRow + 1, 1, 1, rowData.length).setValues([rowData]);
    }

    return { ok: true, docId: params.docId, action: existingRow > 0 ? 'updated' : 'added' };
  } catch(err) {
    return { ok: false, error: err.message };
  }
}

/* ── List all versions (for rev number sync) ────────────────── */
function listAllVersions() {
  var ss    = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('📋 Versions');
  if (!sheet) return { versions: [] };
  var data = sheet.getDataRange().getValues();
  var versions = [];
  for (var i = 3; i < data.length; i++) {
    var row = data[i];
    if (row[0] && row[1]) {
      versions.push({ docId: String(row[0]), rev: String(row[1]) });
    }
  }
  return { versions: versions };
}

/* ── List versions for a document ───────────────────────────── */
function listVersions(docId) {
  var ss    = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('📋 Versions');
  if (!sheet) return { versions: [] };
  var data = sheet.getDataRange().getValues();
  var versions = [];
  for (var i = 3; i < data.length; i++) {
    var row = data[i];
    if (String(row[0]) === docId && row[1]) {
      versions.push({
        docId:        String(row[0]),
        rev:          String(row[1]),
        ts:           String(row[2]),
        note:         String(row[3]),
        user:         String(row[4]),
        fileName:     String(row[5] || ''),
        webViewLink:  String(row[6] || ''),
        downloadLink: String(row[7] || ''),
      });
    }
  }
  /* Sort newest first (rev descending) */
  versions.sort(function(a, b) {
    return String(b.rev).localeCompare(String(a.rev), undefined, {numeric: true});
  });
  return { versions: versions, docId: docId };
}

/* ── Save a new version record ──────────────────────────────── */
function saveVersion(params) {
  var ss    = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('📋 Versions');

  /* Create sheet if it does not exist */
  if (!sheet) {
    sheet = ss.insertSheet('📋 Versions');
    sheet.getRange('A1').setValue('SAGCO IMS — Document Version History');
    sheet.getRange('A2').setValue('Auto-maintained by Apps Script — do not edit manually');
    sheet.getRange('A3:H3').setValues([[
      'Doc ID','Revision','Date','Change Description',
      'Updated By','File Name','View Link','Download Link'
    ]]);
    Logger.log('Created 📋 Versions sheet.');
  }

  var lastRow = sheet.getLastRow();
  sheet.getRange(lastRow + 1, 1, 1, 8).setValues([[
    params.docId    || '',
    params.rev      || '',
    params.ts       || new Date().toISOString().split('T')[0],
    params.note     || '',
    params.user     || '',
    params.fileName || '',
    params.webViewLink  || '',
    params.downloadLink || '',
  ]]);

  /* Also update the Current Rev column in Document Register sheet */
  updateDocumentRev(params.docId, params.rev);

  return { ok: true, docId: params.docId, rev: params.rev };
}

/* ── Update revision number in Document Register sheet ─────── */
function updateDocumentRev(docId, rev) {
  try {
    var ss    = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName('📄 Document Register');
    if (!sheet) return;
    var data    = sheet.getDataRange().getValues();
    var headers = data[2] || []; /* row 3 = headers (0-indexed row 2) */
    /* Find Doc ID column and Rev column */
    var idCol  = -1;
    var revCol = -1;
    for (var c = 0; c < headers.length; c++) {
      var h = String(headers[c]).toLowerCase().replace(/[\s\.]/g,'');
      if (h === 'docid' || h === 'id') idCol = c;
      if (h === 'currentrev' || h === 'rev' || h === 'revision' || h === 'versions' || h === 'version') revCol = c;
    }
    if (idCol < 0 || revCol < 0) return;
    /* Find the row for this docId and update rev */
    for (var r = 3; r < data.length; r++) {
      if (String(data[r][idCol]) === String(docId)) {
        sheet.getRange(r + 1, revCol + 1).setValue(rev);
        return;
      }
    }
  } catch(e) {
    Logger.log('updateDocumentRev error: ' + e.message);
  }
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

  /* ── Fuzzy match if exact name not found ───────────────────
     Strips emojis and special chars, does case-insensitive
     comparison. Handles sheets named without emoji prefixes.  */
  if (!sheet) {
    function normalize(s) {
      return String(s).replace(/[^\w\s\-&\.]/g, '').replace(/\s+/g,' ').trim().toLowerCase();
    }
    var targetNorm = normalize(sheetName);
    var allSheets  = ss.getSheets();
    for (var i = 0; i < allSheets.length; i++) {
      if (normalize(allSheets[i].getName()) === targetNorm) {
        sheet = allSheets[i];
        break;
      }
    }
  }

  if (!sheet) return { error: 'Sheet not found: ' + sheetName, headers: [], rows: [], rowCount: 0 };

  var data     = sheet.getDataRange().getValues();
  var headers  = data[2] || [];
  var rows     = data.slice(3);
  var nonEmpty = rows.filter(function(r){ return r.some(function(c){ return c !== ''; }); });

  return {
    headers:  headers.map(String),
    rows:     nonEmpty.map(function(r){ return r.map(function(c){ return c === '' ? '' : String(c); }); }),
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
