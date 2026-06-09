/* ═══════════════════════════════════════════════════════════════
   SAGCO IMS — DMS Drive Bridge
   dms-drive.js  |  Rev.01  |  June 2026

   Replaces localStorage-based file storage with Google Drive
   via the Apps Script Web App, so files persist across all
   sessions, browsers, and users.

   Load this AFTER data.js on document-management.html and
   any page that uses dms-widget.js:

     <script src="data.js"></script>
     <script src="dms-drive.js"></script>
     <script src="nav.js"></script>

   Provides the global object:  DMS_DRIVE
   Methods:
     DMS_DRIVE.uploadFile(file, docId, attachType, revNote, username)
       → Promise<{ ok, fileId, fileName, webViewLink, downloadLink }>

     DMS_DRIVE.listFiles(docId)
       → Promise<{ files:[] }>

     DMS_DRIVE.deleteFile(fileId)
       → Promise<{ ok }>

     DMS_DRIVE.isConfigured()
       → true if SHEETS_URL is set in data.js

   When SHEETS_URL is not configured, DMS_DRIVE falls back to
   localStorage so the site continues to work locally.
═══════════════════════════════════════════════════════════════ */

(function (global) {
  'use strict';

  /* ── Max file size for base64 POST ──────────────────────── */
  /* Apps Script URL Fetch has a 50 MB payload limit.
     We cap at 20 MB to leave headroom for base64 encoding overhead (+33%). */
  var MAX_BYTES = 20 * 1024 * 1024;

  /* ── Detect Apps Script URL from data.js ────────────────── */
  function getUrl() {
    return (typeof SHEETS_URL !== 'undefined' && SHEETS_URL &&
            !SHEETS_URL.includes('REPLACE_WITH')) ? SHEETS_URL : null;
  }

  function isConfigured() { return !!getUrl(); }

  /* ── Read a file as base64 data URL ─────────────────────── */
  function readAsBase64(file) {
    return new Promise(function (resolve, reject) {
      if (file.size > MAX_BYTES) {
        reject(new Error('"' + file.name + '" is ' +
          (file.size / 1048576).toFixed(1) + ' MB. Maximum is 20 MB.'));
        return;
      }
      var reader = new FileReader();
      reader.onload  = function (e) { resolve(e.target.result); };
      reader.onerror = function ()  { reject(new Error('Could not read: ' + file.name)); };
      reader.readAsDataURL(file);
    });
  }

  /* ── Upload a file to Google Drive via Apps Script ──────── */
  function uploadFile(file, docId, attachType, revNote, username) {
    attachType = attachType || 'attachment';
    revNote    = revNote    || '';
    username   = username   || 'unknown';

    return readAsBase64(file).then(function (dataUrl) {
      var url = getUrl();
      if (!url) {
        /* ── FALLBACK: store in localStorage ─────────────── */
        return localStorageFallbackSave(file, dataUrl, docId, attachType, revNote, username);
      }

      /* ── POST to Apps Script ─────────────────────────── */
      var payload = JSON.stringify({
        action:         'uploadFile',
        fileName:       file.name,
        mimeType:       file.type || 'application/octet-stream',
        base64Data:     dataUrl,
        docId:          docId,
        uploadedBy:     username,
        revisionNote:   revNote,
        attachmentType: attachType,
      });

      return fetch(url, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    payload,
      })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (data.error) throw new Error(data.error);
        /* Also cache metadata locally so the UI updates immediately */
        localStorageCacheFile(docId, {
          fileId:       data.fileId,
          fileName:     file.name,
          mimeType:     file.type,
          size:         formatSize(file.size),
          date:         today(),
          user:         username,
          webViewLink:  data.webViewLink,
          downloadLink: data.downloadLink,
          previewLink:  data.previewLink,
          attachType:   attachType,
          revNote:      revNote,
          source:       'drive',
        });
        return data;
      });
    });
  }

  /* ── List files for a document ──────────────────────────── */
  function listFiles(docId) {
    var url = getUrl();
    if (!url) {
      return Promise.resolve({ files: localStorageGetFiles(docId), source: 'local' });
    }
    return fetch(url + '?action=listFiles&docId=' + encodeURIComponent(docId))
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (data.error) {
          /* Fall back to local cache on network error */
          return { files: localStorageGetFiles(docId), source: 'local-fallback' };
        }
        /* Merge Drive files with any local-only files not yet synced */
        var driveFiles = (data.files || []).map(function (f) {
          return {
            fileId:       f.fileId,
            fileName:     f.fileName,
            mimeType:     f.mimeType,
            size:         f.size || '',
            date:         f.uploadedDate,
            user:         f.uploadedBy,
            webViewLink:  f.webViewLink,
            downloadLink: f.downloadLink,
            previewLink:  'https://drive.google.com/file/d/' + f.fileId + '/preview',
            attachType:   f.attachType || 'attachment',
            revNote:      f.revNote || '',
            source:       'drive',
          };
        });
        /* Overwrite local cache with Drive truth */
        localStorageSetFiles(docId, driveFiles);
        return { files: driveFiles, source: 'drive' };
      })
      .catch(function () {
        return { files: localStorageGetFiles(docId), source: 'local-fallback' };
      });
  }

  /* ── Delete a file ───────────────────────────────────────── */
  function deleteFile(fileId, docId) {
    /* Remove from local cache immediately */
    if (docId) localStorageRemoveFile(docId, fileId);

    var url = getUrl();
    if (!url) return Promise.resolve({ ok: true, source: 'local' });

    return fetch(url, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ action: 'deleteFile', fileId: fileId }),
    })
    .then(function (r) { return r.json(); })
    .catch(function () { return { ok: false, error: 'Network error' }; });
  }

  /* ── Log an audit event to Apps Script ──────────────────── */
  function logAudit(action, detail, userId, username) {
    var url = getUrl();
    if (!url) return;
    fetch(url + '?action=logAudit'
      + '&action2='   + encodeURIComponent(action)
      + '&detail='    + encodeURIComponent(detail)
      + '&userId='    + encodeURIComponent(userId || '')
      + '&username='  + encodeURIComponent(username || ''))
    .catch(function () {}); /* fire-and-forget */
  }

  /* ══════════════════════════════════════════════════════════
     LOCAL STORAGE HELPERS
     Used as fallback when Apps Script URL is not configured,
     AND as a local cache when it is configured (for instant UI).
  ══════════════════════════════════════════════════════════ */
  var LS_PREFIX = 'sagco_dms_files_';

  function localStorageGetFiles(docId) {
    try {
      return JSON.parse(localStorage.getItem(LS_PREFIX + docId) || '[]');
    } catch (e) { return []; }
  }
  function localStorageSetFiles(docId, files) {
    try { localStorage.setItem(LS_PREFIX + docId, JSON.stringify(files)); } catch (e) {}
  }
  function localStorageCacheFile(docId, fileObj) {
    var files = localStorageGetFiles(docId);
    files.push(fileObj);
    localStorageSetFiles(docId, files);
  }
  function localStorageRemoveFile(docId, fileId) {
    var files = localStorageGetFiles(docId).filter(function (f) {
      return f.fileId !== fileId;
    });
    localStorageSetFiles(docId, files);
  }
  function localStorageFallbackSave(file, dataUrl, docId, attachType, revNote, username) {
    var obj = {
      fileId:       'local-' + Date.now(),
      fileName:     file.name,
      mimeType:     file.type,
      size:         formatSize(file.size),
      date:         today(),
      user:         username,
      webViewLink:  null,
      downloadLink: dataUrl,   /* data: URL for local download */
      previewLink:  null,
      attachType:   attachType,
      revNote:      revNote,
      source:       'local',
    };
    localStorageCacheFile(docId, obj);
    return Promise.resolve({
      ok:           true,
      fileId:       obj.fileId,
      fileName:     file.name,
      webViewLink:  null,
      downloadLink: dataUrl,
      source:       'local',
      warning:      'File saved locally only. Configure SHEETS_URL in data.js to enable shared Google Drive storage.',
    });
  }

  /* ── Utility ─────────────────────────────────────────────── */
  function formatSize(bytes) {
    if (!bytes) return '';
    if (bytes > 1048576) return (bytes / 1048576).toFixed(1) + ' MB';
    return Math.round(bytes / 1024) + ' KB';
  }
  function today() { return new Date().toISOString().split('T')[0]; }

  /* ── Public API ──────────────────────────────────────────── */
  global.DMS_DRIVE = {
    uploadFile:   uploadFile,
    listFiles:    listFiles,
    deleteFile:   deleteFile,
    logAudit:     logAudit,
    isConfigured: isConfigured,
    formatSize:   formatSize,
    /* Expose local cache helpers for the DMS modals */
    localGet:     localStorageGetFiles,
    localSet:     localStorageSetFiles,
  };

})(window);
