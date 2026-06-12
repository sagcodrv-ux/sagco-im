/* ══════════════════════════════════════════════════════════════
   SAGCO IMS — Document Management Data Layer
   
   ARCHITECTURE: Google Sheets is the ONLY source of truth.
   localStorage = lightweight display cache (metadata only).
   No base64, no file data, no versions in localStorage.
   
   All reads: Apps Script → Google Sheets
   All writes: Apps Script → Google Sheets + cache update
══════════════════════════════════════════════════════════════ */

var DMS_DATA = (function() {

  var CACHE_KEY = 'sagco_dms_v2';
  var url = null;

  /* ── Init ─────────────────────────────────────────────────── */
  function init(sheetsUrl) {
    url = sheetsUrl || null;
  }

  /* ── Cache helpers (metadata only — no file data) ─────────── */
  function cacheGet() {
    try { return JSON.parse(localStorage.getItem(CACHE_KEY) || '[]'); }
    catch(e) { return []; }
  }

  function cacheSet(docs) {
    try {
      /* Strip ALL file/version data before caching */
      var slim = docs.map(function(d) {
        return {
          id: d.id, number: d.number, title: d.title,
          rev: d.rev, type: d.type, status: d.status,
          issued: d.issued, reviewDue: d.reviewDue,
          owner: d.owner, pages: d.pages || [],
          deleted: d.deleted || false,
          attachCount: d.attachCount || 0,
          verCount: d.verCount || 0,
        };
      });
      localStorage.setItem(CACHE_KEY, JSON.stringify(slim));
    } catch(e) {
      /* Quota exceeded — clear and try minimal */
      try {
        localStorage.removeItem(CACHE_KEY);
        var minimal = docs.map(function(d) {
          return { id:d.id, number:d.number, title:d.title,
                   rev:d.rev, type:d.type, status:d.status,
                   deleted:d.deleted||false };
        });
        localStorage.setItem(CACHE_KEY, JSON.stringify(minimal));
      } catch(e2) { /* ignore */ }
    }
  }

  /* ── Format date ──────────────────────────────────────────── */
  function fmtDate(s) {
    if (!s || s === '—') return '';
    if (/^\d{4}-\d{2}-\d{2}$/.test(String(s))) return s;
    try {
      var d = new Date(s);
      if (!isNaN(d.getTime())) {
        return d.getFullYear() + '-' +
          String(d.getMonth()+1).padStart(2,'0') + '-' +
          String(d.getDate()).padStart(2,'0');
      }
    } catch(e) {}
    return String(s).substring(0, 10);
  }

  /* ── Pad revision number ──────────────────────────────────── */
  function fmtRev(r) {
    r = String(r || '01').trim();
    return r.length === 1 ? '0' + r : r;
  }

  /* ── Fetch documents from Google Sheets ───────────────────── */
  function loadAll(cb) {
    if (!url) { cb(cacheGet()); return; }
    fetch(url + '?action=read&tab=documents')
      .then(function(r) { return r.json(); })
      .then(function(data) {
        if (!data || !data.rows || !data.rows.length) {
          cb(cacheGet()); return;
        }
        var hdr = data.headers || [];
        function col(row, names) {
          for (var n = 0; n < names.length; n++) {
            /* Exact match first */
            for (var h = 0; h < hdr.length; h++)
              if (hdr[h] === names[n]) return String(row[h] || '');
            /* Fuzzy match fallback */
            for (var h2 = 0; h2 < hdr.length; h2++)
              if (hdr[h2].toLowerCase().replace(/[\s_\-\.]/g,'') ===
                  names[n].toLowerCase().replace(/[\s_\-\.]/g,''))
                return String(row[h2] || '');
          }
          return '';
        }
        var docs = data.rows.map(function(row) {
          var id = col(row, ['Doc ID']);
          if (!id) return null;
          return {
            id:         id,
            number:     col(row, ['Document Number']),
            title:      col(row, ['Document Title']),
            rev:        fmtRev(col(row, ['Current Rev.'])),
            type:       col(row, ['Document Type']) || 'Register',
            status:     col(row, ['Status']) || 'Active',
            issued:     fmtDate(col(row, ['Date of Issue'])),
            reviewDue:  fmtDate(col(row, ['Review Due Date'])),
            owner:      col(row, ['Document Owner']),
            dept:       col(row, ['Department']) || '',
            pages:      [],
            deleted:    col(row, ['Deleted']) === 'true',
            files:      [],
            versions:   [],
            attachCount: 0,
            verCount:   0,
          };
        }).filter(Boolean);
        cacheSet(docs);
        cb(docs);
      })
      .catch(function() { cb(cacheGet()); });
  }

  /* ── Save document to Google Sheets ──────────────────────── */
  function saveDoc(doc, cb) {
    /* Update cache immediately */
    var cache = cacheGet();
    var idx = cache.findIndex(function(d) { return d.id === doc.id; });
    if (idx >= 0) cache[idx] = Object.assign(cache[idx], doc);
    else cache.push(doc);
    cacheSet(cache);

    if (!url) { if(cb) cb({ok:true}); return; }

    /* Save to Sheets via GET */
    fetch(url
      + '?action=saveDocumentRecord'
      + '&docId='     + encodeURIComponent(doc.id)
      + '&docNumber=' + encodeURIComponent(doc.number || '')
      + '&title='     + encodeURIComponent(doc.title || '')
      + '&rev='       + encodeURIComponent(doc.rev || '01')
      + '&type='      + encodeURIComponent(doc.type || '')
      + '&status='    + encodeURIComponent(doc.status || '')
      + '&issued='    + encodeURIComponent(doc.issued || '')
      + '&reviewDue=' + encodeURIComponent(doc.reviewDue || '')
      + '&owner='     + encodeURIComponent(doc.owner || '')
      + '&deleted='    + encodeURIComponent(doc.deleted ? 'true' : 'false')
      + '&deletedAt='  + encodeURIComponent(doc.deletedAt || '')
    )
    .then(function(r) { return r.json(); })
    .then(function(res) { if(cb) cb(res); })
    .catch(function(e) { console.warn('Save failed:', e.message); if(cb) cb({ok:false}); });
  }

  /* ── Load versions from Sheets (always) ──────────────────── */
  function loadVersions(docId, localVersions, cb) {
    if (!url) { cb(localVersions || []); return; }
    fetch(url + '?action=listVersions&docId=' + encodeURIComponent(docId))
      .then(function(r) { return r.json(); })
      .then(function(data) {
        var sheetVers = data.versions || [];
        var local = localVersions || [];
        /* Merge — sheet wins, add local-only entries */
        var merged = sheetVers.slice();
        local.forEach(function(lv) {
          if (!merged.some(function(sv) {
            return String(sv.rev).trim() === String(lv.rev).trim();
          })) merged.push(lv);
        });
        merged.sort(function(a,b) {
          return String(b.rev).localeCompare(String(a.rev),undefined,{numeric:true});
        });
        cb(merged.length ? merged : local);
      })
      .catch(function() { cb(localVersions || []); });
  }

  /* Save version to Google Sheets via GET (avoids POST redirect) */
  function saveVersion(ver, cb) {
    if (!url) { if(cb) cb({ok:true}); return; }
    fetch(url
      + '?action=saveVersion'
      + '&docId='       + encodeURIComponent(ver.docId || '')
      + '&rev='         + encodeURIComponent(ver.rev || '')
      + '&ts='          + encodeURIComponent(ver.ts || '')
      + '&note='        + encodeURIComponent(ver.note || '')
      + '&user='        + encodeURIComponent(ver.user || '')
      + '&fileName='    + encodeURIComponent(ver.fileName || '')
      + '&webViewLink=' + encodeURIComponent(ver.webViewLink || '')
      + '&downloadLink='+ encodeURIComponent(ver.downloadLink || '')
    )
    .then(function(r) { return r.json(); })
    .then(function(res) { if(cb) cb(res); })
    .catch(function(e) { console.warn('Version save failed:', e.message); if(cb) cb({ok:false}); });
  }

  /* ── Load attachments from Sheets ────────────────────────── */
  function loadAttachments(docId, cb) {
    if (typeof DMS_DRIVE !== 'undefined') {
      DMS_DRIVE.listFiles(docId).then(function(result) {
        cb(result.files || []);
      }).catch(function() { cb([]); });
    } else { cb([]); }
  }

  /* ── Generate next ID ─────────────────────────────────────── */
  function nextId() {
    var docs = cacheGet();
    var nums = docs.map(function(d) {
      return parseInt((d.id || 'DOC-000').replace('DOC-','')) || 0;
    });
    return 'DOC-' + String(Math.max.apply(null, [0].concat(nums)) + 1).padStart(3, '0');
  }

  /* ── Public API ───────────────────────────────────────────── */
  return {
    init:            init,
    loadAll:         loadAll,
    saveDoc:         saveDoc,
    loadVersions:    loadVersions,
    saveVersion:     saveVersion,
    loadAttachments: loadAttachments,
    nextId:          nextId,
    cache:           cacheGet,
    fmtDate:         fmtDate,
    fmtRev:          fmtRev,
    clearCache:      function() { localStorage.removeItem(CACHE_KEY); },
  };

})();
