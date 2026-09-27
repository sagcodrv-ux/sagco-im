/* ═══════════════════════════════════════════════════════════════
   SAGCO IMS — CAPA Raise Wizard (Steps 1–4)
   capa-wizard.js  |  Rev.02  |  September 2026

   Implements Steps 1–4 of the CAPA workflow directly inside
   capa-register.html, matching proc-c10.html §5:

     Step 1  Raise NCR & Assign Owner   (intake + severity classification)
     Step 2  Containment                (immediate action)
     Step 3  Root Cause Analysis        (5-Why / Ishikawa, by severity)
     Step 4  Corrective Action Plan     (action, owner, due date,
                                          IMS Manager approval gate for
                                          Critical/Major)

   Rev.02 change: a CAPA does not need to be raised through all four
   steps in one sitting. "Save & Continue Later" is available at
   every step — the NC can be raised alone, with containment and the
   corrective action plan added days or weeks later by whoever picks
   it up. "Continue an Existing CAPA" reopens any not-yet-complete
   CAPA at whichever step it was left at.

   Steps 5–6 (ML-01 implementation log, F-04 effectiveness/closure)
   are a separate follow-on build.

   WRITES TO: the live CAPA Register Google Sheet tab, via SHEETS_URL
   action=write (first save, creates the row) and action=update
   (every subsequent save, patches the same row by CAPA ID — see the
   updateRowById() addition in google-apps-script.js; this action did
   not exist before this build and MUST be redeployed to Apps Script
   or every "Save & Continue Later" after the first will fail).

   REQUIRES these columns added to row 3 of the real CAPA Register
   sheet tab (writeRows/updateRowById map strictly by header name —
   anything not already a column header is silently dropped):
     Severity, Risk Score, Date Raised, Containment Date, RCA Method,
     Immediate Cause, System Contributor, CA Plan Approved, Process Stage
   Existing columns (Root Cause, Immediate Action, Corrective Action,
   Due Date, etc.) are reused for their existing meaning, unrenamed.
   ═══════════════════════════════════════════════════════════════ */

(function (global) {
  'use strict';

  /* ── Severity classification (proc-c10.html §5) ─────────────── */
  var SEVERITY_RULES = [
    { key: 'Critical', min: 20, max: Infinity,
      trigger: 'Score ≥20 · Fatality · Regulatory non-compliance',
      initialAction: 'Immediate', closureDays: 30,
      signOff: 'CEO', ceoNotify: 'Within 24 hours' },
    { key: 'Major', min: 12, max: 19,
      trigger: 'Score 12–19 · Major NCR from audit',
      initialAction: 'Within 5 working days', closureDays: 60,
      signOff: 'IMS Manager', ceoNotify: 'Within 48 hours' },
    { key: 'Minor', min: 6, max: 11,
      trigger: 'Score 6–11 · Minor NCR from audit',
      initialAction: 'Within 14 working days', closureDays: 90,
      signOff: 'IMS Coordinator', ceoNotify: 'Weekly CAPA summary' },
  ];

  function classify(score) {
    score = Number(score) || 0;
    for (var i = 0; i < SEVERITY_RULES.length; i++) {
      var r = SEVERITY_RULES[i];
      if (score >= r.min && score <= r.max) return r;
    }
    return null;
  }
  function severityByKey(key) {
    for (var i = 0; i < SEVERITY_RULES.length; i++) if (SEVERITY_RULES[i].key === key) return SEVERITY_RULES[i];
    return null;
  }

  /* RCA method: Critical locked to Ishikawa, Minor locked to 5-Why,
     Major gets a choice (not automatically a fatality/major-incident case). */
  function rcaOptionsFor(sev) {
    if (!sev) return { locked: null };
    if (sev.key === 'Critical') return { locked: 'ishikawa' };
    if (sev.key === 'Minor')    return { locked: 'five_why' };
    return { locked: null };
  }

  var STEP_TITLES = ['1 · Raise NCR & Assign Owner', '2 · Containment', '3 · Root Cause Analysis', '4 · Corrective Action Plan'];
  var STAGE_NAMES = ['Intake', 'Containment', 'RCA', 'CA Plan'];

  /* ── State ────────────────────────────────────────────────── */
  var state = {};
  var currentStep = 1;
  var saving = false;

  function resetState() {
    state = {
      capaId: null, /* null until first save; real ID from the live sheet, not a guess */
      description: '', source: '', dateRaised: '',
      score: '', severity: null,
      containment: '', containmentDate: '',
      rcaMethod: '', rcaDetail: '', rcaImmediateCause: '', rcaSystemContributor: '',
      caAction: '', caOwner: '', caDueDate: '', caApproved: false,
      status: 'Open',
    };
  }

  /* ── Role gate ────────────────────────────────────────────── */
  function canRaise() {
    if (!global.IMS_AUTH) return true; /* auth.js not loaded: fail open, don't block the demo */
    return IMS_AUTH.can('add');
  }
  function canEdit() {
    if (!global.IMS_AUTH) return true;
    return IMS_AUTH.can('edit'); /* editor/admin/superadmin — HOD-level: log progress, move Open→In Progress→Completed */
  }
  function canClose() {
    if (!global.IMS_AUTH) return true;
    var role = IMS_AUTH.getRole();
    return role === 'admin' || role === 'superadmin'; /* effectiveness verification + Completed→Closed */
  }
  function currentUserName() {
    return (global.IMS_AUTH && IMS_AUTH.getUser()) ? IMS_AUTH.getUser().name : 'Unknown';
  }

  /* ── Next real CAPA ID — read the live sheet, don't guess ──── */
  function nextId(cb) {
    var year = new Date().getFullYear();
    fetch(SHEETS_URL + '?tab=capa&action=read')
      .then(function (r) { return r.json(); })
      .then(function (data) {
        var max = 0;
        (data && data.rows ? data.rows : []).forEach(function (row) {
          var idIdx = (data.headers || []).indexOf('CAPA ID');
          if (idIdx < 0) return;
          var m = String(row[idIdx] || '').match(new RegExp('CAPA-' + year + '-(\\d+)'));
          if (m) max = Math.max(max, parseInt(m[1], 10));
        });
        cb('CAPA-' + year + '-' + String(max + 1).padStart(3, '0'));
      })
      .catch(function () {
        /* Can't verify the live sheet from this environment — fall back to a
           timestamp-suffixed ID and flag it plainly rather than silently guess a
           sequential number that might collide. */
        cb('CAPA-' + year + '-PENDING' + Date.now().toString().slice(-4));
      });
  }

  /* ── Styles / shell (unchanged look, extra footer button) ──── */
  function injectStyles() {
    if (document.getElementById('capa-wiz-styles')) return;
    var s = document.createElement('style');
    s.id = 'capa-wiz-styles';
    s.textContent = [
      '#capa-wiz-wrap{position:fixed;inset:0;background:rgba(10,14,24,.55);z-index:9500;display:flex;align-items:center;justify-content:center;font-family:Arial,sans-serif}',
      '#capa-wiz-box{background:#fff;border-radius:10px;box-shadow:0 20px 60px rgba(0,0,0,.4);width:640px;max-width:94vw;max-height:90vh;overflow:auto}',
      '.cw-hdr{background:#1B2A4A;color:#fff;padding:16px 22px}',
      '.cw-hdr h3{margin:0 0 4px;font-size:15px}',
      '.cw-steps{display:flex;gap:6px;margin-top:10px;flex-wrap:wrap}',
      '.cw-step-pill{font-size:9.5px;padding:3px 9px;border-radius:10px;background:rgba(255,255,255,.12);color:rgba(255,255,255,.6)}',
      '.cw-step-pill.active{background:#C9A84C;color:#1B2A4A;font-weight:700}',
      '.cw-body{padding:20px 22px}',
      '.cw-field{margin-bottom:14px}',
      '.cw-field label{display:block;font-size:11px;font-weight:700;color:#1B2A4A;margin-bottom:5px}',
      '.cw-field .cw-hint{font-size:10.5px;color:#7a869a;margin-top:3px}',
      '.cw-field input,.cw-field select,.cw-field textarea{width:100%;border:1px solid #c8d4e8;border-radius:6px;padding:8px 10px;font-size:12.5px;font-family:Arial,sans-serif;box-sizing:border-box}',
      '.cw-field textarea{min-height:64px;resize:vertical}',
      '.cw-sev-banner{border-radius:8px;padding:12px 14px;margin-bottom:14px;font-size:11.5px;line-height:1.6}',
      '.cw-sev-banner.crit{background:#fff1f2;border:1px solid #fecdd3;color:#7a1a1a}',
      '.cw-sev-banner.major{background:#fff7ed;border:1px solid #fed7aa;color:#7a4a10}',
      '.cw-sev-banner.minor{background:#fffbeb;border:1px solid #fde68a;color:#7a5800}',
      '.cw-sev-banner.neutral{background:#f3f4f6;border:1px solid #d1d5db;color:#4b5563}',
      '.cw-footer{display:flex;justify-content:space-between;align-items:center;padding:14px 22px;border-top:1px solid #eef1f6;gap:10px;flex-wrap:wrap}',
      '.cw-btn{border:none;border-radius:6px;padding:9px 16px;font-size:11.5px;font-weight:700;cursor:pointer;font-family:Arial,sans-serif}',
      '.cw-btn.primary{background:#C9A84C;color:#1B2A4A}',
      '.cw-btn.ghost{background:#eef1f6;color:#1B2A4A}',
      '.cw-btn.save-later{background:#EBF3FB;color:#1565C0}',
      '.cw-btn:disabled{opacity:.45;cursor:not-allowed}',
      '.cw-blocked{padding:40px 22px;text-align:center;color:#5A6478;font-size:12.5px}',
      '.cw-picker-row{display:flex;justify-content:space-between;align-items:center;padding:10px 12px;border:1px solid #eef1f6;border-radius:6px;margin-bottom:8px;cursor:pointer}',
      '.cw-picker-row:hover{background:#f9fafb}',
      '.cw-picker-stage{font-size:9.5px;font-weight:700;padding:2px 8px;border-radius:8px;background:#EBF3FB;color:#1565C0}',
    ].join('\n');
    document.head.appendChild(s);
  }

  function render() {
    var mount = document.getElementById('capa-wizard-mount');
    if (!mount) return;

    if (!canRaise()) {
      mount.innerHTML = wrapShell('<div class="cw-blocked">Your current role does not have permission to raise or edit a CAPA.<br>Sign in as a contributor, editor or admin to continue.</div>'
        + '<div class="cw-footer"><span></span><button class="cw-btn ghost" id="cw-close">Close</button></div>');
      bindShellEvents();
      return;
    }

    var stepHtml = ['stepIntake', 'stepContainment', 'stepRCA', 'stepCAPlan'][currentStep - 1]();
    mount.innerHTML = wrapShell(stepsPillsHTML() + idBannerHTML() + stepHtml + footerHTML());
    bindShellEvents();
    bindStepEvents();
  }

  function wrapShell(inner) {
    return '<div id="capa-wiz-wrap"><div id="capa-wiz-box">'
      + '<div class="cw-hdr"><h3>' + (state.capaId ? 'Continue ' + state.capaId : 'Raise New CAPA') + '</h3>'
      + '<div style="font-size:11px;opacity:.75">L4-1000-R-01 · Steps follow proc-c10.html §5</div></div>'
      + '<div class="cw-body">' + inner + '</div>'
      + '</div></div>';
  }

  function idBannerHTML() {
    if (!state.capaId) {
      return '<div class="cw-sev-banner neutral">A real CAPA ID is assigned on first save (read from the live register to avoid collisions) — not shown yet.</div>';
    }
    return '<div class="cw-sev-banner neutral"><strong>' + state.capaId + '</strong> — resuming a previously saved CAPA.</div>';
  }

  function stepsPillsHTML() {
    return '<div class="cw-steps" style="margin:-6px 0 16px">' + STEP_TITLES.map(function (t, i) {
      return '<span class="cw-step-pill' + (i + 1 === currentStep ? ' active' : '') + '">' + t + '</span>';
    }).join('') + '</div>';
  }

  function footerHTML() {
    var backDisabled = currentStep === 1 ? 'disabled' : '';
    var nextLabel = currentStep === 4 ? 'Finish & Save' : 'Next →';
    return '<div class="cw-footer">'
      + '<div><button class="cw-btn ghost" id="cw-cancel">Cancel</button> '
      + '<button class="cw-btn ghost" id="cw-back" ' + backDisabled + '>← Back</button></div>'
      + '<div><button class="cw-btn save-later" id="cw-save-later">💾 Save &amp; Continue Later</button> '
      + '<button class="cw-btn primary" id="cw-next">' + nextLabel + '</button></div>'
      + '</div>';
  }

  /* ── Step 1: Intake + Severity ───────────────────────────── */
  function stepIntake() {
    var sevBanner = '';
    if (state.severity) {
      var cls = state.severity.key === 'Critical' ? 'crit' : (state.severity.key === 'Major' ? 'major' : 'minor');
      sevBanner = '<div class="cw-sev-banner ' + cls + '">'
        + '<strong>' + state.severity.key + '</strong> — ' + state.severity.trigger + '<br>'
        + 'Initial action: <strong>' + state.severity.initialAction + '</strong> · '
        + 'Closure target: <strong>' + state.severity.closureDays + ' days</strong> · '
        + 'CEO notification: ' + state.severity.ceoNotify + ' · Final sign-off: ' + state.severity.signOff
        + '</div>';
    } else if (state.score !== '') {
      sevBanner = '<div class="cw-sev-banner neutral">Score below 6 does not meet the threshold for a formal CAPA per proc-c10.html §5. Consider a near-miss / observation entry instead.</div>';
    }
    return ''
      + '<div class="cw-field"><label>Description of the nonconformity</label>'
      + '<textarea id="cw-desc" placeholder="What was observed, where, and when">' + esc(state.description) + '</textarea></div>'
      + '<div class="cw-field"><label>Source</label>'
      + '<select id="cw-source">' + ['', 'Internal Audit', 'Certification Audit (TÜV)', 'Incident Investigation', 'Customer Complaint', 'Management Review', 'Other formal NC determination']
        .map(function (o) { return '<option' + (o === state.source ? ' selected' : '') + '>' + o + '</option>'; }).join('') + '</select></div>'
      + '<div class="cw-field"><label>Date raised</label>'
      + '<input type="date" id="cw-date" value="' + esc(state.dateRaised) + '"></div>'
      + '<div class="cw-field"><label>Risk score (drives severity classification automatically)</label>'
      + '<input type="number" id="cw-score" min="0" max="40" value="' + esc(state.score) + '" placeholder="e.g. 15">'
      + '<div class="cw-hint">Critical ≥20 · Major 12–19 · Minor 6–11 (proc-c10.html §5)</div></div>'
      + sevBanner
      + '<div class="cw-field"><label>Owner (assigned HOD/department)</label>'
      + '<input type="text" id="cw-owner" value="' + esc(state.caOwner) + '" placeholder="e.g. Furnaces Manager"></div>'
      + '<div class="cw-sev-banner neutral">A CAPA can be raised with only this step completed — Containment, RCA and the Corrective Action Plan can be added later by whoever picks it up. Use <strong>Save &amp; Continue Later</strong> below.</div>';
  }

  /* ── Step 2: Containment ─────────────────────────────────── */
  function stepContainment() {
    var deadline = state.severity
      ? (state.severity.key === 'Critical' ? 'Same shift (Critical — immediate)' : state.severity.initialAction)
      : '—';
    return ''
      + '<div class="cw-sev-banner minor" style="background:#EBF3FB;border-color:#B5D4F4;color:#1565C0">'
      + 'Containment deadline for this severity: <strong>' + deadline + '</strong></div>'
      + '<div class="cw-field"><label>Immediate action taken to prevent harm, environmental release, or product escape</label>'
      + '<textarea id="cw-containment" placeholder="Leave blank if containment has not started yet">' + esc(state.containment) + '</textarea></div>'
      + '<div class="cw-field"><label>Date/time containment action completed</label>'
      + '<input type="date" id="cw-cont-date" value="' + esc(state.containmentDate) + '"></div>';
  }

  /* ── Step 3: RCA ──────────────────────────────────────────── */
  function stepRCA() {
    if (!state.severity) {
      return '<div class="cw-blocked">Set a risk score in Step 1 first — the RCA method is determined by severity.</div>';
    }
    var opts = rcaOptionsFor(state.severity);
    var method = opts.locked || state.rcaMethod || 'five_why';
    var methodPicker;
    if (opts.locked) {
      methodPicker = '<div class="cw-field"><label>Root cause analysis method</label>'
        + '<input type="text" disabled value="' + (opts.locked === 'ishikawa' ? 'Ishikawa (fishbone) — locked for ' + state.severity.key : '5-Why — locked for ' + state.severity.key) + '">'
        + '<div class="cw-hint">Fixed by severity per proc-c10.html §5; not user-editable.</div></div>';
    } else {
      methodPicker = '<div class="cw-field"><label>Root cause analysis method</label>'
        + '<select id="cw-rca-method">'
        + '<option value="five_why"' + (method === 'five_why' ? ' selected' : '') + '>5-Why</option>'
        + '<option value="ishikawa"' + (method === 'ishikawa' ? ' selected' : '') + '>Ishikawa (fishbone)</option>'
        + '</select><div class="cw-hint">Major is not automatically a fatality/major-incident case — choose Ishikawa only if this one is.</div></div>';
    }
    var detailField = method === 'ishikawa'
      ? '<div class="cw-field"><label>Ishikawa categories explored (People / Process / Equipment / Materials / Environment / Management)</label>'
        + '<textarea id="cw-rca-detail" placeholder="Leave blank if RCA has not started yet">' + esc(state.rcaDetail) + '</textarea></div>'
      : '<div class="cw-field"><label>5-Why chain</label>'
        + '<textarea id="cw-rca-detail" placeholder="Why 1 / Why 2 / ... — leave blank if RCA has not started yet">' + esc(state.rcaDetail) + '</textarea></div>';
    return methodPicker + detailField
      + '<div class="cw-field"><label>Immediate cause identified</label>'
      + '<input type="text" id="cw-rca-immediate" value="' + esc(state.rcaImmediateCause) + '"></div>'
      + '<div class="cw-field"><label>Underlying management-system contributor identified</label>'
      + '<input type="text" id="cw-rca-system" value="' + esc(state.rcaSystemContributor) + '">'
      + '<div class="cw-hint">Required per proc-c10.html — both immediate and systemic causes must be captured, not just the symptom.</div></div>';
  }

  /* ── Step 4: Corrective Action Plan ──────────────────────── */
  function stepCAPlan() {
    var needsApproval = state.severity && (state.severity.key === 'Critical' || state.severity.key === 'Major');
    return ''
      + '<div class="cw-field"><label>Corrective action</label>'
      + '<textarea id="cw-ca-action" placeholder="Leave blank if not yet defined — the CAPA to date via Save & Continue Later">' + esc(state.caAction) + '</textarea></div>'
      + '<div class="cw-field"><label>Due date</label>'
      + '<input type="date" id="cw-ca-due" value="' + esc(state.caDueDate) + '">'
      + (state.severity ? '<div class="cw-hint">Closure target for ' + state.severity.key + ': ' + state.severity.closureDays + ' days from raise date.</div>' : '') + '</div>'
      + (needsApproval
        ? '<div class="cw-field"><label style="display:flex;align-items:center;gap:8px">'
          + '<input type="checkbox" id="cw-ca-approved" style="width:auto"' + (state.caApproved ? ' checked' : '') + '> '
          + 'IMS Manager has reviewed and approved this plan before implementation'
          + '</label><div class="cw-hint">Required for Critical/Major before this can move to Implementation, per proc-c10.html step 4. You can still save without it via Save &amp; Continue Later.</div></div>'
        : '');
  }

  /* ── Event binding ────────────────────────────────────────── */
  function bindShellEvents() {
    var close = document.getElementById('cw-close'); if (close) close.addEventListener('click', closeWizard);
    var cancel = document.getElementById('cw-cancel'); if (cancel) cancel.addEventListener('click', closeWizard);
    var back = document.getElementById('cw-back');
    if (back) back.addEventListener('click', function () { collectStep(); if (currentStep > 1) { currentStep--; render(); } });
    var next = document.getElementById('cw-next'); if (next) next.addEventListener('click', onNext);
    var saveLater = document.getElementById('cw-save-later'); if (saveLater) saveLater.addEventListener('click', onSaveLater);
  }

  function bindStepEvents() {
    var score = document.getElementById('cw-score');
    if (score) score.addEventListener('input', function () {
      state.score = score.value;
      state.severity = classify(score.value);
      render();
      var s2 = document.getElementById('cw-score');
      if (s2) { s2.focus(); s2.value = state.score; }
    });
  }

  function collectStep() {
    if (currentStep === 1) {
      state.description = val('cw-desc'); state.source = val('cw-source');
      state.dateRaised = val('cw-date'); state.score = val('cw-score');
      state.severity = classify(state.score); state.caOwner = val('cw-owner');
    } else if (currentStep === 2) {
      state.containment = val('cw-containment'); state.containmentDate = val('cw-cont-date');
    } else if (currentStep === 3) {
      var lockedMethod = state.severity ? rcaOptionsFor(state.severity).locked : null;
      state.rcaMethod = lockedMethod || val('cw-rca-method') || 'five_why';
      state.rcaDetail = val('cw-rca-detail');
      state.rcaImmediateCause = val('cw-rca-immediate');
      state.rcaSystemContributor = val('cw-rca-system');
    } else if (currentStep === 4) {
      state.caAction = val('cw-ca-action'); state.caDueDate = val('cw-ca-due');
      var approvedBox = document.getElementById('cw-ca-approved');
      state.caApproved = approvedBox ? approvedBox.checked : state.caApproved;
    }
  }

  function val(id) { var el = document.getElementById(id); return el ? el.value : ''; }
  function esc(s) { return String(s || '').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }

  function onNext() {
    collectStep();
    if (currentStep === 1 && !state.severity) {
      alert('Enter a risk score of 6 or higher to classify severity before continuing (scores below 6 are not a formal CAPA per proc-c10.html §5).');
      return;
    }
    if (currentStep === 4) {
      var needsApproval = state.severity && (state.severity.key === 'Critical' || state.severity.key === 'Major');
      if (needsApproval && !state.caApproved) {
        alert('Critical/Major corrective action plans require IMS Manager approval before this can be marked finished. Use Save & Continue Later if approval is still pending.');
        return;
      }
      persist(true);
      return;
    }
    currentStep++;
    render();
  }

  function onSaveLater() {
    collectStep();
    persist(false);
  }

  function closeWizard() {
    var mount = document.getElementById('capa-wizard-mount');
    if (mount) mount.innerHTML = '';
  }

  /* ── Row construction — every field its own column, no
     concatenation, so a resumed CAPA reloads losslessly ───────── */
  function buildRow(finishing) {
    return {
      'CAPA ID': state.capaId || 'PENDING',
      'Type': 'Nonconformance',
      'Severity': state.severity ? state.severity.key : '',
      'Risk Score': state.score,
      'Source': state.source,
      'Description': state.description,
      'Date Raised': state.dateRaised,
      'Owner': state.caOwner,
      'Immediate Action': state.containment,
      'Containment Date': state.containmentDate,
      'RCA Method': state.rcaMethod === 'ishikawa' ? 'Ishikawa (fishbone)' : (state.rcaMethod === 'five_why' ? '5-Why' : ''),
      'Root Cause': state.rcaDetail,
      'Immediate Cause': state.rcaImmediateCause,
      'System Contributor': state.rcaSystemContributor,
      'Corrective Action': state.caAction,
      'Due Date': state.caDueDate,
      'CA Plan Approved': state.caApproved ? 'Yes' : 'No',
      'Evidence Required': 'Effectiveness verification pending',
      'Status': state.status || 'Open',
      'Verified': 'No',
      'Process Stage': STAGE_NAMES[currentStep - 1],
      'Definition Complete': finishing ? 'Yes' : 'No',
    };
  }

  /* ── Save: first save = write (append), every save after = update ── */
  function persist(finishing) {
    if (saving) return;
    saving = true;
    setButtonsSaving(true);

    function doWrite() {
      var row = buildRow(finishing);
      var isFirstSave = !state.capaId;

      function afterAssignId(id) {
        state.capaId = id;
        row['CAPA ID'] = id;
        fetch(SHEETS_URL + '?action=write&tab=capa', { method: 'POST', body: JSON.stringify([row]) })
          .then(function (r) { return r.json(); })
          .then(handleResult)
          .catch(handleError);
      }

      if (isFirstSave) {
        nextId(afterAssignId);
      } else {
        fetch(SHEETS_URL + '?action=update&tab=capa&idCol=' + encodeURIComponent('CAPA ID') + '&id=' + encodeURIComponent(state.capaId), {
          method: 'POST', body: JSON.stringify(row),
        })
          .then(function (r) { return r.json(); })
          .then(handleResult)
          .catch(handleError);
      }
    }

    function handleResult(result) {
      saving = false; setButtonsSaving(false);
      if (result && result.status === 'ok') {
        if (finishing) {
          alert(state.capaId + ' saved as finished (all 4 steps complete). Implementation tracking (ML-01) and Effectiveness Verification (F-04) are now available via "Continue an Existing CAPA".');
        } else {
          alert(state.capaId + ' saved — ' + STAGE_NAMES[currentStep - 1] + ' recorded. You (or whoever picks this up) can continue later via "Continue an Existing CAPA".');
        }
        closeWizard();
        if (global.reloadLive) reloadLive();
      } else {
        alert('Save did not confirm success: ' + JSON.stringify(result)
          + '\nIf this is an update (not the first save), confirm updateRowById()/action=update has been redeployed to Apps Script.'
          + '\nAlso confirm all required columns exist in row 3 of the live sheet.');
      }
    }
    function handleError(err) {
      saving = false; setButtonsSaving(false);
      alert('Could not reach the live sheet: ' + err + '\nThis environment cannot verify the write live — please confirm on the deployed site.');
    }

    doWrite();
  }

  function setButtonsSaving(isSaving) {
    ['cw-next', 'cw-save-later'].forEach(function (id) {
      var b = document.getElementById(id);
      if (b) b.disabled = isSaving;
    });
    var next = document.getElementById('cw-next');
    if (next) next.textContent = isSaving ? 'Saving…' : (currentStep === 4 ? 'Finish & Save' : 'Next →');
  }

  /* ── Resume: list existing not-yet-finished CAPAs ────────── */
  function openPicker() {
    injectStyles();
    var mount = document.getElementById('capa-wizard-mount');
    mount.innerHTML = '<div id="capa-wiz-wrap"><div id="capa-wiz-box">'
      + '<div class="cw-hdr"><h3>Continue an Existing CAPA</h3><div style="font-size:11px;opacity:.75">Loading live register…</div></div>'
      + '<div class="cw-body" id="cw-picker-body"><div class="cw-blocked">Loading…</div></div>'
      + '<div class="cw-footer"><span></span><button class="cw-btn ghost" id="cw-close">Close</button></div>'
      + '</div></div>';
    bindShellEvents();

    fetch(SHEETS_URL + '?tab=capa&action=read')
      .then(function (r) { return r.json(); })
      .then(function (data) {
        var body = document.getElementById('cw-picker-body');
        if (!body) return;
        var headers = data.headers || [];
        var idIdx = headers.indexOf('CAPA ID');
        var stageIdx = headers.indexOf('Process Stage');
        var statusIdx = headers.indexOf('Status');
        var descIdx = headers.indexOf('Description');
        var rows = (data.rows || []).filter(function (row) {
          return String(row[statusIdx]).toLowerCase() !== 'closed';
        });
        if (!rows.length) {
          body.innerHTML = '<div class="cw-blocked">No open CAPAs to continue. Raise a new one instead.</div>';
          return;
        }
        body.innerHTML = rows.map(function (row) {
          var id = row[idIdx] || '(no ID)';
          var stage = stageIdx >= 0 ? (row[stageIdx] || 'Intake') : 'Intake';
          var desc = descIdx >= 0 ? String(row[descIdx] || '').slice(0, 70) : '';
          return '<div class="cw-picker-row" data-id="' + esc(id) + '">'
            + '<div><strong>' + esc(id) + '</strong><div style="font-size:11px;color:#7a869a">' + esc(desc) + '</div></div>'
            + '<span class="cw-picker-stage">' + esc(stage) + '</span>'
            + '</div>';
        }).join('');
        body.querySelectorAll('.cw-picker-row').forEach(function (el) {
          el.addEventListener('click', function () { resumeById(el.getAttribute('data-id'), data); });
        });
      })
      .catch(function (err) {
        var body = document.getElementById('cw-picker-body');
        if (body) body.innerHTML = '<div class="cw-blocked">Could not reach the live sheet: ' + esc(String(err)) + '</div>';
      });
  }

  function resumeById(id, data) {
    var headers = data.headers || [];
    var idIdx = headers.indexOf('CAPA ID');
    var row = (data.rows || []).find(function (r) { return String(r[idIdx]) === String(id); });
    if (!row) { alert('Could not find that CAPA in the loaded data.'); return; }
    function col(name) { var i = headers.indexOf(name); return i >= 0 ? String(row[i] || '') : ''; }

    resetState();
    state.capaId = id;
    state.description = col('Description');
    state.source = col('Source');
    state.dateRaised = col('Date Raised');
    state.score = col('Risk Score');
    state.severity = col('Severity') ? severityByKey(col('Severity')) : classify(state.score);
    state.caOwner = col('Owner');
    state.containment = col('Immediate Action');
    state.containmentDate = col('Containment Date');
    var rcaMethodLabel = col('RCA Method');
    state.rcaMethod = rcaMethodLabel.indexOf('Ishikawa') >= 0 ? 'ishikawa' : (rcaMethodLabel ? 'five_why' : '');
    state.rcaDetail = col('Root Cause');
    state.rcaImmediateCause = col('Immediate Cause');
    state.rcaSystemContributor = col('System Contributor');
    state.caAction = col('Corrective Action');
    state.caDueDate = col('Due Date');
    state.caApproved = col('CA Plan Approved') === 'Yes';
    state.status = col('Status') || 'Open';

    var stage = col('Process Stage');
    var definitionComplete = col('Definition Complete') === 'Yes';

    if (definitionComplete) {
      openImplementationPanel(id, headers, row);
      return;
    }

    currentStep = Math.max(1, STAGE_NAMES.indexOf(stage) + 1) || 1;
    render();
  }

  /* ══════════════════════════════════════════════════════════
     Implementation & Closure panel (ML-01 log + F-04 gate)
     Reached via "Continue an Existing CAPA" once Definition
     Complete = Yes. Separate log tab (capa_log) so multiple dated
     entries per CAPA don't get crammed into one cell.
     ══════════════════════════════════════════════════════════ */

  var LOG_TAB = 'capa_log'; /* must map to a real tab in TABS in google-apps-script.js */

  function implShell(capaId, status, severity, bodyHtml) {
    var statusColor = { 'Open': '#B71C1C', 'In Progress': '#E65100', 'Completed': '#1565C0', 'Closed': '#1B5E20' }[status] || '#4b5563';
    return '<div id="capa-wiz-wrap"><div id="capa-wiz-box">'
      + '<div class="cw-hdr"><h3>Implementation &amp; Closure — ' + esc(capaId) + '</h3>'
      + '<div style="font-size:11px;opacity:.75">Severity: ' + esc(severity || '—') + ' &nbsp;·&nbsp; '
      + '<span style="background:' + statusColor + ';padding:2px 9px;border-radius:8px;font-weight:700">' + esc(status) + '</span></div></div>'
      + '<div class="cw-body" id="cw-impl-body">' + bodyHtml + '</div>'
      + '<div class="cw-footer"><span></span><button class="cw-btn ghost" id="cw-close">Close</button></div>'
      + '</div></div>';
  }

  function openImplementationPanel(capaId, headers, row) {
    injectStyles();
    function col(name) { var i = headers.indexOf(name); return i >= 0 ? String(row[i] || '') : ''; }
    var status = col('Status') || 'Open';
    var severity = col('Severity');

    var mount = document.getElementById('capa-wizard-mount');
    mount.innerHTML = implShell(capaId, status, severity, '<div class="cw-blocked">Loading progress log…</div>');
    var closeBtn = document.getElementById('cw-close');
    if (closeBtn) closeBtn.addEventListener('click', closeWizard);

    loadLog(capaId, function (entries) {
      renderImplBody(capaId, headers, row, entries);
    });
  }

  function loadLog(capaId, cb) {
    fetch(SHEETS_URL + '?tab=' + LOG_TAB + '&action=read')
      .then(function (r) { return r.json(); })
      .then(function (data) {
        var headers = data.headers || [];
        var idIdx = headers.indexOf('CAPA ID');
        var entries = (data.rows || []).filter(function (row) { return String(row[idIdx]) === String(capaId); })
          .map(function (row) {
            function c(name) { var i = headers.indexOf(name); return i >= 0 ? String(row[i] || '') : ''; }
            return { date: c('Date'), note: c('Note'), photo: c('Photo URL'), by: c('Logged By'), change: c('Status Change') };
          })
          .sort(function (a, b) { return (b.date || '').localeCompare(a.date || ''); });
        cb(entries);
      })
      .catch(function () { cb([]); }); /* log tab may not exist yet on the live sheet — degrade to empty, don't block the panel */
  }

  function renderImplBody(capaId, headers, row, entries) {
    function col(name) { var i = headers.indexOf(name); return i >= 0 ? String(row[i] || '') : ''; }
    var status = col('Status') || 'Open';
    var body = document.getElementById('cw-impl-body');
    if (!body) return;

    var feed = entries.length
      ? entries.map(function (e) {
          return '<div style="border-left:3px solid #C9A84C;padding:8px 12px;margin-bottom:8px;background:#f9fafb;border-radius:0 6px 6px 0">'
            + '<div style="font-size:10.5px;color:#7a869a">' + esc(e.date) + ' · ' + esc(e.by) + (e.change ? ' · <strong>' + esc(e.change) + '</strong>' : '') + '</div>'
            + '<div style="font-size:12px;margin-top:3px">' + esc(e.note) + '</div>'
            + (e.photo ? '<a href="' + esc(e.photo) + '" target="_blank" style="font-size:11px;color:#1565C0">📷 View photo</a>' : '')
            + '</div>';
        }).join('')
      : '<div class="cw-hint" style="margin-bottom:12px">No progress entries yet.</div>';

    var addForm = '';
    if (canEdit() && status !== 'Closed') {
      var nextAction = status === 'Open' ? 'In Progress' : (status === 'In Progress' ? 'Completed' : null);
      addForm = '<div class="cw-field"><label>Add progress update</label>'
        + '<textarea id="impl-note" placeholder="What was done since the last update"></textarea></div>'
        + '<div class="cw-field"><label>Photo (optional)</label><input type="file" id="impl-photo" accept="image/*"></div>'
        + '<div style="display:flex;gap:8px;flex-wrap:wrap">'
        + '<button class="cw-btn ghost" id="impl-log-only">Log Update Only</button>'
        + (nextAction ? '<button class="cw-btn primary" id="impl-advance" data-next="' + nextAction + '">Log &amp; Mark ' + nextAction + '</button>' : '')
        + '</div>';
    } else if (status !== 'Closed') {
      addForm = '<div class="cw-hint">Your role does not have permission to log progress updates (requires editor role or above).</div>';
    }

    var closureForm = '';
    if (status === 'Completed') {
      if (canClose()) {
        closureForm = '<div style="margin-top:22px;padding-top:16px;border-top:1px solid #eef1f6">'
          + '<div style="font-size:12px;font-weight:700;color:#1B2A4A;margin-bottom:10px">F-04 · Effectiveness Verification &amp; Closure</div>'
          + '<div class="cw-field"><label>Verification method</label>'
          + '<input type="text" id="impl-verif-method" placeholder="e.g. Follow-up inspection, re-audit, KPI check"></div>'
          + '<div class="cw-field"><label>Evidence reviewed</label>'
          + '<textarea id="impl-verif-evidence"></textarea></div>'
          + '<div class="cw-field"><label>Was the corrective action effective?</label>'
          + '<select id="impl-verif-result"><option value="Yes">Yes — close this CAPA</option><option value="No">No — reopen (back to In Progress)</option></select></div>'
          + '<button class="cw-btn primary" id="impl-verify-submit">Submit Verification</button>'
          + '<div class="cw-hint">A "No" reopens the CAPA rather than closing it — recurrence within 12 months per proc-c10.html also reopens a closed CAPA, though that check is not yet automated here.</div>'
          + '</div>';
      } else {
        closureForm = '<div class="cw-hint" style="margin-top:16px">Marked Completed — awaiting Admin effectiveness verification before it can be closed.</div>';
      }
    }
    if (status === 'Closed') {
      closureForm = '<div class="cw-sev-banner minor" style="background:#e8f5e9;border-color:#a5d6a7;color:#1B5E20;margin-top:16px">'
        + 'Closed. Verified ' + esc(col('Verification Date')) + ' by ' + esc(col('Verified By')) + '.</div>';
    }

    body.innerHTML = feed + addForm + closureForm;

    var logOnlyBtn = document.getElementById('impl-log-only');
    if (logOnlyBtn) logOnlyBtn.addEventListener('click', function () { submitProgress(capaId, headers, row, null); });
    var advanceBtn = document.getElementById('impl-advance');
    if (advanceBtn) advanceBtn.addEventListener('click', function () { submitProgress(capaId, headers, row, advanceBtn.getAttribute('data-next')); });
    var verifySubmit = document.getElementById('impl-verify-submit');
    if (verifySubmit) verifySubmit.addEventListener('click', function () { submitVerification(capaId, headers, row); });
  }

  function uploadPhoto(file, capaId, cb) {
    if (!file) { cb(null); return; }
    var reader = new FileReader();
    reader.onerror = function () { cb(null); };
    reader.onload = function (ev) {
      var b64 = ev.target.result.split(',')[1];
      fetch(SHEETS_URL, {
        method: 'POST',
        body: JSON.stringify({
          action: 'uploadFilePicker', docId: capaId, username: currentUserName(),
          fileName: file.name, mimeType: file.type || 'application/octet-stream', b64: b64,
        }),
      })
        .then(function (r) { return r.json(); })
        .then(function (res) { cb(res && res.ok ? res.webViewLink : null); })
        .catch(function () { cb(null); });
    };
    reader.readAsDataURL(file);
  }

  function submitProgress(capaId, headers, row, statusChange) {
    var note = val('impl-note');
    var fileInput = document.getElementById('impl-photo');
    var file = fileInput && fileInput.files ? fileInput.files[0] : null;

    if (!note && !statusChange) { alert('Add a note before logging (or attach a photo).'); return; }

    uploadPhoto(file, capaId, function (photoLink) {
      var logRow = {
        'Log ID': 'LOG-' + capaId + '-' + Date.now(),
        'CAPA ID': capaId,
        'Date': new Date().toISOString().split('T')[0],
        'Note': note,
        'Photo URL': photoLink || '',
        'Logged By': currentUserName(),
        'Status Change': statusChange ? ('→ ' + statusChange) : '',
      };
      fetch(SHEETS_URL + '?action=write&tab=' + LOG_TAB, { method: 'POST', body: JSON.stringify([logRow]) })
        .then(function (r) { return r.json(); })
        .then(function (result) {
          if (!(result && result.status === 'ok')) {
            alert('Log entry did not confirm success: ' + JSON.stringify(result) + '\nConfirm the "' + LOG_TAB + '" tab exists on the live sheet with the right headers.');
            return;
          }
          if (statusChange) {
            fetch(SHEETS_URL + '?action=update&tab=capa&idCol=' + encodeURIComponent('CAPA ID') + '&id=' + encodeURIComponent(capaId), {
              method: 'POST', body: JSON.stringify({ 'Status': statusChange }),
            })
              .then(function (r) { return r.json(); })
              .then(function () { alert(capaId + ' marked ' + statusChange + '.'); closeWizard(); if (global.reloadLive) reloadLive(); })
              .catch(function (err) { alert('Log saved, but status update failed to reach the live sheet: ' + err); });
          } else {
            alert('Progress logged.');
            closeWizard();
          }
        })
        .catch(function (err) { alert('Could not reach the live sheet: ' + err); });
    });
  }

  function submitVerification(capaId, headers, row) {
    var method = val('impl-verif-method');
    var evidence = val('impl-verif-evidence');
    var result = val('impl-verif-result');
    if (!method || !evidence) { alert('Verification method and evidence are required before submitting.'); return; }

    var updates = {
      'Effectiveness Method': method,
      'Effectiveness Evidence': evidence,
      'Effectiveness Result': result,
      'Verified By': currentUserName(),
      'Verification Date': new Date().toISOString().split('T')[0],
      'Status': result === 'Yes' ? 'Closed' : 'In Progress',
      'Verified': result === 'Yes' ? 'Yes' : 'No',
    };

    fetch(SHEETS_URL + '?action=update&tab=capa&idCol=' + encodeURIComponent('CAPA ID') + '&id=' + encodeURIComponent(capaId), {
      method: 'POST', body: JSON.stringify(updates),
    })
      .then(function (r) { return r.json(); })
      .then(function (res) {
        if (res && res.status === 'ok') {
          alert(result === 'Yes' ? capaId + ' verified effective and Closed.' : capaId + ' verification failed — reopened to In Progress.');
          closeWizard();
          if (global.reloadLive) reloadLive();
        } else {
          alert('Verification did not confirm success: ' + JSON.stringify(res));
        }
      })
      .catch(function (err) { alert('Could not reach the live sheet: ' + err); });
  }

  /* ── Public entry points ──────────────────────────────────── */
  function openNew() { injectStyles(); resetState(); currentStep = 1; render(); }

  document.addEventListener('DOMContentLoaded', function () {
    var btn = document.getElementById('capa-raise-btn');
    if (btn) btn.addEventListener('click', openNew);
    var contBtn = document.getElementById('capa-continue-btn');
    if (contBtn) contBtn.addEventListener('click', openPicker);
  });

  global.CAPA_WIZARD = { open: openNew, openPicker: openPicker };

})(window);
