/* ══════════════════════════════════════════════════════════════
   SAGCO IMS — Document Approval Workflow
   ISO 9001/14001/45001/50001 §7.5.2 Compliance

   WORKFLOW:
     Draft → Pending Approval → Approved (Active) | Rejected (Draft)

   ROLES:
     editor/admin  → can submit for approval
     approver/admin → can approve or reject
     CEO role      → designated final approver

   SHEETS TAB: Approvals
   Columns: Doc ID | Rev | Approver | Role | Status |
            Comments | Submitted By | Submitted At | Timestamp
══════════════════════════════════════════════════════════════ */

var DMS_APPROVAL = (function () {

  /* ── Config ────────────────────────────────────────────────── */
  var APPROVER_ROLES = ['approver', 'admin', 'superadmin'];
  var SUBMIT_ROLES   = ['editor', 'admin', 'superadmin', 'contributor'];
  var CACHE_KEY      = 'sagco_approvals_v1';
  var url            = null;

  /* ── Init ─────────────────────────────────────────────────── */
  function init(sheetsUrl) { url = sheetsUrl || null; }

  /* ── Cache ────────────────────────────────────────────────── */
  function cacheGet() {
    try { return JSON.parse(localStorage.getItem(CACHE_KEY) || '[]'); }
    catch (e) { return []; }
  }
  function cacheSet(records) {
    try { localStorage.setItem(CACHE_KEY, JSON.stringify(records)); }
    catch (e) { /* quota */ }
  }

  /* ── Load all approval records from Sheets ─────────────────── */
  function loadAll(cb) {
    if (!url) { cb(cacheGet()); return; }
    fetch(url + '?action=read&tab=approvals')
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (!data || !data.rows) { cb(cacheGet()); return; }
        var hdr = data.headers || [];
        function col(row, name) {
          var i = hdr.indexOf(name);
          return i >= 0 ? String(row[i] || '') : '';
        }
        var records = data.rows.map(function (row) {
          return {
            approvalId:   col(row, 'Approval ID'),
            docId:        col(row, 'Doc ID'),
            rev:          col(row, 'Rev'),
            approver:     col(row, 'Approver'),
            approverRole: col(row, 'Approver Role'),
            status:       col(row, 'Status'),       /* Pending | Approved | Rejected */
            comments:     col(row, 'Comments'),
            submittedBy:  col(row, 'Submitted By'),
            submittedAt:  col(row, 'Submitted At'),
            timestamp:    col(row, 'Timestamp'),
          };
        }).filter(function (r) { return r.docId; });
        cacheSet(records);
        cb(records);
      })
      .catch(function () { cb(cacheGet()); });
  }

  /* ── Get approvals for a specific document + rev ───────────── */
  function getForDoc(docId, rev, cb) {
    loadAll(function (all) {
      cb(all.filter(function (r) {
        return r.docId === docId && r.rev === String(rev);
      }));
    });
  }

  /* ── Submit document for approval ─────────────────────────── */
  function submitForApproval(doc, submittedBy, approvers, cb) {
    /* approvers = array of {name, role} */
    if (!url) { if (cb) cb({ ok: false, error: 'No URL' }); return; }
    var now = new Date().toISOString().split('T')[0];
    var records = approvers.map(function (a, i) {
      return {
        approvalId:   'APR-' + doc.id + '-' + doc.rev + '-' + (i + 1),
        docId:        doc.id,
        rev:          doc.rev,
        approver:     a.name,
        approverRole: a.role || 'approver',
        status:       'Pending',
        comments:     '',
        submittedBy:  submittedBy,
        submittedAt:  now,
        timestamp:    now,
      };
    });

    /* Save each approval record */
    var saved = 0;
    records.forEach(function (rec) {
      fetch(url
        + '?action=saveApproval'
        + '&approvalId='   + encodeURIComponent(rec.approvalId)
        + '&docId='        + encodeURIComponent(rec.docId)
        + '&rev='          + encodeURIComponent(rec.rev)
        + '&approver='     + encodeURIComponent(rec.approver)
        + '&approverRole=' + encodeURIComponent(rec.approverRole)
        + '&status=Pending'
        + '&comments='
        + '&submittedBy='  + encodeURIComponent(rec.submittedBy)
        + '&submittedAt='  + encodeURIComponent(rec.submittedAt)
        + '&timestamp='    + encodeURIComponent(rec.timestamp)
      )
      .then(function (r) { return r.json(); })
      .then(function () {
        saved++;
        if (saved === records.length && cb) cb({ ok: true });
      })
      .catch(function () {
        saved++;
        if (saved === records.length && cb) cb({ ok: false });
      });
    });

    /* Update local cache */
    var existing = cacheGet().filter(function (r) {
      return !(r.docId === doc.id && r.rev === doc.rev);
    });
    cacheSet(existing.concat(records));
  }

  /* ── Record an approval decision ──────────────────────────── */
  function recordDecision(approvalId, docId, rev, approver, status, comments, cb) {
    /* status = 'Approved' | 'Rejected' */
    var now = new Date().toISOString().split('T')[0];
    if (!url) { if (cb) cb({ ok: false }); return; }
    fetch(url
      + '?action=updateApproval'
      + '&approvalId=' + encodeURIComponent(approvalId)
      + '&docId='      + encodeURIComponent(docId)
      + '&rev='        + encodeURIComponent(rev)
      + '&approver='   + encodeURIComponent(approver)
      + '&status='     + encodeURIComponent(status)
      + '&comments='   + encodeURIComponent(comments || '')
      + '&timestamp='  + encodeURIComponent(now)
    )
    .then(function (r) { return r.json(); })
    .then(function (res) { if (cb) cb(res); })
    .catch(function () { if (cb) cb({ ok: false }); });

    /* Update local cache */
    var cached = cacheGet();
    var rec = cached.find(function (r) { return r.approvalId === approvalId; });
    if (rec) { rec.status = status; rec.comments = comments; rec.timestamp = now; }
    cacheSet(cached);
  }

  /* ── Check if current user can approve ─────────────────────── */
  function canApprove(userRole) {
    return APPROVER_ROLES.indexOf((userRole || '').toLowerCase()) >= 0;
  }

  /* ── Check if current user can submit ──────────────────────── */
  function canSubmit(userRole) {
    return SUBMIT_ROLES.indexOf((userRole || '').toLowerCase()) >= 0;
  }

  /* ── Get overall approval status for a doc+rev ─────────────── */
  function getOverallStatus(records) {
    if (!records || !records.length) return 'No Approvers';
    var pending  = records.filter(function (r) { return r.status === 'Pending'; });
    var rejected = records.filter(function (r) { return r.status === 'Rejected'; });
    var approved = records.filter(function (r) { return r.status === 'Approved'; });
    if (rejected.length) return 'Rejected';
    if (pending.length)  return 'Pending';
    if (approved.length === records.length) return 'Approved';
    return 'Pending';
  }

  /* ── Approval status badge HTML ─────────────────────────────── */
  function approvalBadge(status) {
    var map = {
      'Approved':     'nb nb-grn',
      'Pending':      'nb nb-amb',
      'Rejected':     'nb nb-red',
      'No Approvers': 'nb nb-grey',
      'Draft':        'nb nb-grey',
    };
    return '<span class="' + (map[status] || 'nb nb-grey') + '">' + (status || 'Draft') + '</span>';
  }

  /* ── Clear cache ─────────────────────────────────────────────── */
  function clearCache() { localStorage.removeItem(CACHE_KEY); }

  /* ── Public API ──────────────────────────────────────────────── */
  return {
    init:             init,
    loadAll:          loadAll,
    getForDoc:        getForDoc,
    submitForApproval: submitForApproval,
    recordDecision:   recordDecision,
    canApprove:       canApprove,
    canSubmit:        canSubmit,
    getOverallStatus: getOverallStatus,
    approvalBadge:    approvalBadge,
    clearCache:       clearCache,
    cache:            cacheGet,
    APPROVER_ROLES:   APPROVER_ROLES,
  };

})();
