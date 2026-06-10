/* ═══════════════════════════════════════════════════════════════
   SAGCO IMS — DMS Drive Bridge (Rev.03)
   dms-drive.js  |  June 2026

   File upload via Apps Script popup — no Google Cloud needed.

   How it works:
   1. User clicks Upload on the website
   2. A popup window opens — served by your Apps Script
   3. User selects or drops a file in the popup
   4. Apps Script uploads it to Google Drive (server-side)
   5. Popup sends the file link back to the website via postMessage
   6. Website shows ↗ Open and ⬇ Download immediately ✅
   7. All users on all devices see it ✅

   No CORS. No Google Cloud Console. No API keys.
   Uses your existing Apps Script deployment only.

   Load order on every page that needs file upload:
     <script src="data.js"></script>
     <script src="dms-drive.js"></script>
     <script src="nav.js"></script>
═══════════════════════════════════════════════════════════════ */

(function (global) {
'use strict';

/* ── Local storage keys ──────────────────────────────────────── */
var LS_PREFIX = 'sagco_dms_files_';

/* ── Get Apps Script URL ─────────────────────────────────────── */
function getUrl() {
  return (typeof SHEETS_URL !== 'undefined' &&
          SHEETS_URL && !SHEETS_URL.includes('REPLACE_WITH'))
    ? SHEETS_URL : null;
}

function isConfigured() { return !!getUrl(); }

/* ── Format file size ────────────────────────────────────────── */
function formatSize(b) {
  if (!b) return '';
  return b > 1048576 ? (b/1048576).toFixed(1)+' MB' : Math.round(b/1024)+' KB';
}

function today() { return new Date().toISOString().split('T')[0]; }

/* ══════════════════════════════════════════════════════════════
   UPLOAD FILE — opens Apps Script popup
   The popup handles the actual upload to Google Drive.
   postMessage returns the file link to the website.
══════════════════════════════════════════════════════════════ */
function uploadFile(file, docId, attachType, revNote, username) {
  attachType = attachType || 'attachment';
  revNote    = revNote    || '';
  username   = username   || 'unknown';

  var url = getUrl();

  /* ── No Apps Script configured — use localStorage fallback ── */
  if (!url) {
    return readAsBase64(file).then(function(dataUrl) {
      return localStorageFallbackSave(file, dataUrl, docId, attachType, revNote, username);
    });
  }

  /* ── Open Apps Script picker popup ──────────────────────── */
  return new Promise(function(resolve, reject) {

    /* Build popup URL */
    var popupUrl = url
      + '?action=picker'
      + '&docId='    + encodeURIComponent(docId)
      + '&username=' + encodeURIComponent(username);

    /* Open popup window */
    var popup = window.open(
      popupUrl,
      'SAGCO_IMS_File_Upload',
      'width=540,height=480,top=100,left=200,resizable=yes,scrollbars=yes'
    );

    if (!popup) {
      /* Popup blocked — show instructions */
      reject(new Error(
        'Popup blocked by your browser. Please allow popups for this site:\n' +
        'Click the popup-blocked icon in your browser address bar → Always allow.'
      ));
      return;
    }

    /* Listen for postMessage from the popup */
    function onMessage(event) {
      if (!event.data || event.data.type !== 'IMS_FILE_UPLOADED') return;
      window.removeEventListener('message', onMessage);

      var f = event.data.file;
      if (!f || !f.ok) {
        reject(new Error(f ? (f.error || 'Upload failed') : 'No response'));
        return;
      }

      /* Build file metadata object */
      var fileData = {
        fileId:       f.fileId,
        fileName:     f.fileName,
        mimeType:     f.mimeType || '',
        size:         f.size     || '',
        date:         f.date     || today(),
        user:         username,
        webViewLink:  f.webViewLink,
        downloadLink: f.downloadLink,
        previewLink:  f.previewLink || null,
        attachType:   attachType,
        revNote:      revNote,
        source:       'drive',
      };

      /* Cache locally for instant UI update */
      localStorageCacheFile(docId, fileData);
      resolve(fileData);
    }

    window.addEventListener('message', onMessage);

    /* Clean up if popup is closed without uploading */
    var checkClosed = setInterval(function() {
      if (popup.closed) {
        clearInterval(checkClosed);
        window.removeEventListener('message', onMessage);
        reject(new Error('Upload cancelled — popup was closed.'));
      }
    }, 500);
  });
}

/* ══════════════════════════════════════════════════════════════
   LIST FILES — reads from Apps Script + local cache
══════════════════════════════════════════════════════════════ */
function listFiles(docId) {
  var url = getUrl();

  /* Try Apps Script first for server-side file list */
  if (url) {
    return fetch(url + '?action=listFiles&docId=' + encodeURIComponent(docId))
      .then(function(r) { return r.json(); })
      .then(function(data) {
        var driveFiles = (data.files || []).map(function(f) {
          return {
            fileId:       f.fileId,
            fileName:     f.fileName,
            mimeType:     f.mimeType || '',
            size:         f.size     || '',
            date:         f.uploadedDate || today(),
            user:         f.uploadedBy  || '',
            webViewLink:  f.webViewLink,
            downloadLink: f.downloadLink,
            previewLink:  f.previewLink || ('https://drive.google.com/file/d/'+f.fileId+'/preview'),
            attachType:   f.attachType  || 'attachment',
            revNote:      f.revNote     || '',
            source:       'drive',
          };
        });
        /* Update local cache with Drive truth */
        if (driveFiles.length > 0) localStorageSetFiles(docId, driveFiles);
        /* Merge — Drive files take priority, add any local-only entries */
        var local = localStorageGetFiles(docId);
        var merged = driveFiles.slice();
        local.forEach(function(lf) {
          if (!merged.some(function(df){ return df.fileId===lf.fileId; })) {
            merged.push(lf);
          }
        });
        return { files: merged, source: 'drive' };
      })
      .catch(function() {
        /* Network error — return local cache */
        return { files: localStorageGetFiles(docId), source: 'local-fallback' };
      });
  }

  return Promise.resolve({ files: localStorageGetFiles(docId), source: 'local' });
}

/* ── Delete a file ───────────────────────────────────────────── */
function deleteFile(fileId, docId) {
  /* Remove from local cache */
  if (docId) localStorageRemoveFile(docId, fileId);
  /* Note: Drive deletion requires server-side — user can delete directly in Drive */
  return Promise.resolve({ ok: true });
}

/* ── Log audit event ─────────────────────────────────────────── */
function logAudit(action, detail, userId, username) {
  var url = getUrl();
  if (!url) return;
  fetch(url + '?action=logAudit'
    + '&action2='  + encodeURIComponent(action)
    + '&detail='   + encodeURIComponent(detail)
    + '&userId='   + encodeURIComponent(userId||'')
    + '&username=' + encodeURIComponent(username||''))
  .catch(function(){});
}

/* ══════════════════════════════════════════════════════════════
   LOCAL STORAGE HELPERS
══════════════════════════════════════════════════════════════ */
function localStorageGetFiles(docId) {
  try { return JSON.parse(localStorage.getItem(LS_PREFIX+docId)||'[]'); }
  catch(e) { return []; }
}
function localStorageSetFiles(docId, files) {
  try { localStorage.setItem(LS_PREFIX+docId, JSON.stringify(files)); } catch(e) {}
}
function localStorageCacheFile(docId, fileObj) {
  var files = localStorageGetFiles(docId);
  if (!files.some(function(f){ return f.fileId===fileObj.fileId; })) {
    files.push(fileObj);
    localStorageSetFiles(docId, files);
  }
}
function localStorageRemoveFile(docId, fileId) {
  var files = localStorageGetFiles(docId)
    .filter(function(f){ return f.fileId!==fileId; });
  localStorageSetFiles(docId, files);
}

/* ── Fallback: read as base64 for localStorage ───────────────── */
function readAsBase64(file) {
  return new Promise(function(resolve, reject) {
    var MAX = 4 * 1024 * 1024;
    if (file.size > MAX) {
      reject(new Error('"'+file.name+'" exceeds 4 MB local storage limit.'));
      return;
    }
    var r = new FileReader();
    r.onload  = function(e) { resolve(e.target.result); };
    r.onerror = function()  { reject(new Error('Could not read: '+file.name)); };
    r.readAsDataURL(file);
  });
}

function localStorageFallbackSave(file, dataUrl, docId, attachType, revNote, username) {
  var obj = {
    fileId:       'local-'+Date.now(),
    fileName:     file ? file.name : 'unknown',
    mimeType:     file ? file.type : '',
    size:         file ? formatSize(file.size) : '',
    date:         today(),
    user:         username || 'unknown',
    webViewLink:  null,
    downloadLink: dataUrl || null,
    previewLink:  null,
    attachType:   attachType || 'attachment',
    revNote:      revNote || '',
    source:       'local',
    warning:      'Stored locally only — configure SHEETS_URL in data.js for shared Drive storage.',
  };
  localStorageCacheFile(docId, obj);
  return Promise.resolve(obj);
}

/* ══════════════════════════════════════════════════════════════
   PUBLIC API
══════════════════════════════════════════════════════════════ */
global.DMS_DRIVE = {
  uploadFile:   uploadFile,
  listFiles:    listFiles,
  deleteFile:   deleteFile,
  logAudit:     logAudit,
  isConfigured: isConfigured,
  formatSize:   formatSize,
  localGet:     localStorageGetFiles,
  localSet:     localStorageSetFiles,
};

})(window);
