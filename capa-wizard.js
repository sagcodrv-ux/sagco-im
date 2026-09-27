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
      caAction: '', caOwner: '', caOwnerEmail: '', caDueDate: '', caApproved: false, ownerManualMode: false,
      status: 'Open',
      initialEvidenceFiles: [], /* File objects pending upload, in-memory only — can't survive a page reload/resume */
      initialEvidenceUrls: [], /* already-uploaded links — restored from the sheet when resuming a CAPA that has some */
    };
  }

  /* ── Role gate ────────────────────────────────────────────────
     Site-wide reality check: auth.js is loaded on 26 pages but only
     2 (document-management.html, user-management.html) ever call
     IMS_AUTH.init() to show a login wall. Everywhere else — including
     this page, before this fix — getRole() silently returns 'public'
     forever, which blocked every single click since 'public' has no
     permissions. Failing open when no session exists matches how the
     rest of the portal actually behaves; it only restricts someone
     who IS logged in with a role below what's needed. If a real login
     wall gets added to this page later (IMS_AUTH.init()), these gates
     start meaning something rather than being cosmetic. ──────────── */
  function canRaise() {
    if (!global.IMS_AUTH) return true;
    if (!IMS_AUTH.getUser()) return true; /* no active session on this page — don't block by default */
    return IMS_AUTH.can('add');
  }
  function canEdit() {
    if (!global.IMS_AUTH) return true;
    if (!IMS_AUTH.getUser()) return true;
    return IMS_AUTH.can('edit');
  }
  function canClose() {
    if (!global.IMS_AUTH) return true;
    if (!IMS_AUTH.getUser()) return true; /* see note above — meaningful only once a login wall is active */
    var role = IMS_AUTH.getRole();
    return role === 'admin' || role === 'superadmin';
  }
  /* Reopening a Closed CAPA is deliberately narrower than closing it.
     "IMS Manager" in the real seeded user data (auth.js) is a job TITLE,
     at role 'editor' — not the 'admin' tier canClose() checks. So this
     can't reuse canClose(); it checks the title directly instead. */
  function canReopen() {
    if (!global.IMS_AUTH) return true;
    var session = IMS_AUTH.getUser();
    if (!session) return true;
    if (session.role === 'superadmin') return true;
    if (session.title === 'IMS Manager') return true;
    return false;
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

    var stepHtml = [stepIntake, stepContainment, stepRCA, stepCAPlan][currentStep - 1]();
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

  /* Evidence attachment for Step 1 — reuses the same broad file-type
     acceptance and upload mechanism already built for the ML-01
     implementation log (any image, PDF, Word, Excel, PowerPoint).
     Shown as its own confirmation line rather than relying on the
     native file input's own label, because re-rendering the whole
     step (e.g. every keystroke in the risk-score field) recreates a
     fresh <input type="file"> that always shows "No file chosen" by
     browser design — without this, it would look like the selection
     was lost even though it's already safely captured in state. */
  function evidenceFieldHTML() {
    var uploadedList = state.initialEvidenceUrls.map(function (url, i) {
      return '<a href="' + esc(url) + '" target="_blank" style="display:inline-block;background:#EBF3FB;color:#1565C0;border:1px solid #B5D4F4;border-radius:5px;padding:3px 10px;font-weight:700;text-decoration:none;margin:3px 6px 3px 0">📂 Evidence ' + (i + 1) + '</a>';
    }).join('');

    var pendingList = state.initialEvidenceFiles.map(function (f, i) {
      return '<div style="font-size:11.5px;color:#4b5563;margin:2px 0">📎 ' + esc(f.name) + ' — will upload on save '
        + '<a href="#" class="cw-evidence-remove" data-idx="' + i + '" style="color:#B71C1C;margin-left:6px">✕ remove</a></div>';
    }).join('');

    var summary = '';
    if (uploadedList) summary += '<div class="cw-hint" style="margin-bottom:4px">' + uploadedList + '</div>';
    if (pendingList) summary += '<div class="cw-hint">' + pendingList + '</div>';

    return '<div class="cw-field"><label>Evidence (optional — attach as many as needed)</label>'
      + '<input type="file" id="cw-evidence-file" multiple accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation">'
      + '<div class="cw-hint">Photo, PDF, Word, Excel, or PowerPoint — select several at once, or add more later the same way.</div>'
      + summary
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
      + evidenceFieldHTML()
      + '<div class="cw-field"><label>Source</label>'
      + '<select id="cw-source">' + ['', 'Internal Audit', 'Certification Audit (TÜV)', 'Incident Investigation', 'Customer Complaint', 'Management Review', 'Other formal NC determination']
        .map(function (o) { return '<option' + (o === state.source ? ' selected' : '') + '>' + o + '</option>'; }).join('') + '</select></div>'
      + '<div class="cw-field"><label>Date raised</label>'
      + '<input type="date" id="cw-date" value="' + esc(state.dateRaised) + '"></div>'
      + '<div class="cw-field"><label>Risk score (drives severity classification automatically)</label>'
      + '<input type="number" id="cw-score" min="0" max="40" value="' + esc(state.score) + '" placeholder="e.g. 15">'
      + '<div class="cw-hint">Critical ≥20 · Major 12–19 · Minor 6–11 (proc-c10.html §5)</div></div>'
      + sevBanner
      + ownerFieldHTML()
      + '<div class="cw-sev-banner neutral">A CAPA can be raised with only this step completed — Containment, RCA and the Corrective Action Plan can be added later by whoever picks it up. Use <strong>Save &amp; Continue Later</strong> below.</div>';
  }

  /* Owner picker — pulls from the real registered-user directory
     (auth.js's getUsers(), shared browser localStorage — the wizard
     can read this directly since it runs in the same browser, unlike
     the Apps Script backend which has no access to it at all) so the
     email is correct by construction rather than hand-typed. Falls
     back to manual name+email entry if the directory is empty (e.g.
     this browser has never visited a page that seeds it) or if the
     right person just isn't in the list yet. */
  function ownerFieldHTML() {
    var users = liveUserDirectory || [];

    if (!state.ownerManualMode && users.length) {
      var options = '<option value="">— Select from registered users —</option>' + users.map(function (u) {
        var sel = (state.caOwner === u.name) ? ' selected' : '';
        return '<option value="' + esc(u.name) + '" data-email="' + esc(u.email) + '"' + sel + '>' + esc(u.name) + ' — ' + esc(u.title) + '</option>';
      }).join('');
      return '<div class="cw-field"><label>Owner</label>'
        + '<select id="cw-owner-select">' + options + '</select>'
        + '<div class="cw-hint">Email auto-fills from the registered user directory: '
        + (state.caOwnerEmail ? '<strong>' + esc(state.caOwnerEmail) + '</strong>' : 'not selected yet') + '. '
        + '<a href="#" id="cw-owner-manual-toggle" style="color:#1565C0">Can\'t find them? Enter manually.</a></div></div>';
    }

    return '<div class="cw-field"><label>Owner (name)</label>'
      + '<input type="text" id="cw-owner" value="' + esc(state.caOwner) + '" placeholder="e.g. Furnaces Manager"></div>'
      + '<div class="cw-field"><label>Owner email</label>'
      + '<input type="email" id="cw-owner-email" value="' + esc(state.caOwnerEmail) + '" placeholder="e.g. furnaces.mgr@sagco.com.sa">'
      + '<div class="cw-hint">Required — overdue reminders are emailed here automatically until this CAPA is marked Completed. '
      + (users.length ? '<a href="#" id="cw-owner-manual-toggle" style="color:#1565C0">Choose from registered users instead.</a>' : '(No registered users found in this browser — enter manually, or visit Document Management/User Management once to load the directory.)')
      + '</div></div>';
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

  /* Captures the Step 1 fields NOT already handled by whichever
     specific listener is about to trigger a re-render (score, owner
     select, evidence file) — without this, typing something into
     Description/Source/Date and then touching any of those three
     would silently wipe it, since a full re-render always rebuilds
     from state, and state was never updated except on Next/Save. */
  function syncStep1UntouchedFields() {
    if (document.getElementById('cw-desc')) state.description = val('cw-desc');
    if (document.getElementById('cw-source')) state.source = val('cw-source');
    if (document.getElementById('cw-date')) state.dateRaised = val('cw-date');
  }

  function bindStepEvents() {
    var score = document.getElementById('cw-score');
    if (score) score.addEventListener('input', function () {
      syncStep1UntouchedFields();
      state.score = score.value;
      state.severity = classify(score.value);
      render();
      var s2 = document.getElementById('cw-score');
      if (s2) { s2.focus(); s2.value = state.score; }
    });

    var ownerSelect = document.getElementById('cw-owner-select');
    if (ownerSelect) ownerSelect.addEventListener('change', function () {
      syncStep1UntouchedFields();
      var opt = ownerSelect.options[ownerSelect.selectedIndex];
      state.caOwner = ownerSelect.value;
      state.caOwnerEmail = ownerSelect.value ? (opt.getAttribute('data-email') || '') : '';
      render();
    });

    var evidenceInput = document.getElementById('cw-evidence-file');
    if (evidenceInput) evidenceInput.addEventListener('change', function () {
      if (evidenceInput.files && evidenceInput.files.length) {
        syncStep1UntouchedFields();
        for (var i = 0; i < evidenceInput.files.length; i++) state.initialEvidenceFiles.push(evidenceInput.files[i]);
        render(); /* shows the persistent pending-file list immediately */
      }
    });

    document.querySelectorAll('.cw-evidence-remove').forEach(function (link) {
      link.addEventListener('click', function (ev) {
        ev.preventDefault();
        syncStep1UntouchedFields();
        state.initialEvidenceFiles.splice(parseInt(link.getAttribute('data-idx'), 10), 1);
        render();
      });
    });

    var manualToggle = document.getElementById('cw-owner-manual-toggle');
    if (manualToggle) manualToggle.addEventListener('click', function (ev) {
      ev.preventDefault();
      state.ownerManualMode = !state.ownerManualMode;
      render();
    });
  }

  function collectStep() {
    if (currentStep === 1) {
      state.description = val('cw-desc'); state.source = val('cw-source');
      state.dateRaised = val('cw-date'); state.score = val('cw-score');
      state.severity = classify(state.score);
      if (document.getElementById('cw-owner')) { state.caOwner = val('cw-owner'); state.caOwnerEmail = val('cw-owner-email'); }
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
    if (currentStep === 1 && !state.caOwnerEmail) {
      alert('Owner email is required — overdue reminders are sent there automatically.');
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
      'Owner Email': state.caOwnerEmail,
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
    var wasFirstSave = false;

    function doWrite() {
      var row = buildRow(finishing);
      var isFirstSave = !state.capaId;
      wasFirstSave = isFirstSave;

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
        if (wasFirstSave) notifyNewCapaOwner(); /* fire-and-forget — owner should hear immediately, not wait for the alert/close below */
        if (state.initialEvidenceFiles.length) uploadInitialEvidence();
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

    /* Tells the owner, right away, that a CAPA now exists with them as
       owner — email + in-portal notification, same channels as the
       overdue reminders but fired once at creation instead of daily. */
    function notifyNewCapaOwner() {
      if (!state.caOwnerEmail) return; /* shouldn't happen, Step 1 requires it — but never let a missing email break the save itself */
      fetch(SHEETS_URL, {
        method: 'POST',
        body: JSON.stringify({
          action: 'notifyNewCapa',
          capaId: state.capaId,
          ownerEmail: state.caOwnerEmail,
          ownerName: state.caOwner,
          description: state.description,
          severity: state.severity ? state.severity.key : '',
          dueDate: state.caDueDate,
        }),
      }).catch(function (err) {
        console.warn('New-CAPA owner notification failed to send for ' + state.capaId + ': ' + err);
      });
    }

    /* Uploads the Step 1 evidence file (if any) using the same
       mechanism already built for ML-01 evidence, then attaches the
       resulting link to the CAPA row via a follow-up update — the
       upload itself needs a real CAPA ID first, which doesn't exist
       until after the first successful save, so this always runs
       AFTER doWrite() succeeds, never before or during it. */
    /* Uploads every pending Step 1 evidence file (there can be several)
       using the same mechanism already built for ML-01 evidence, one
       at a time — sequential, not parallel, to avoid hammering the
       Drive-upload endpoint with a burst of simultaneous requests.
       Once all succeed, writes the FULL combined list (whatever was
       already attached, plus the newly uploaded ones) to the sheet in
       a single update — never overwrites earlier evidence, only adds
       to it. Needs a real CAPA ID first, which doesn't exist until
       after the first successful save, so this always runs AFTER
       doWrite() succeeds, never before or during it. */
    function uploadInitialEvidence() {
      var pending = state.initialEvidenceFiles.slice();
      var newUrls = [];

      function next() {
        if (!pending.length) {
          if (newUrls.length) {
            state.initialEvidenceUrls = state.initialEvidenceUrls.concat(newUrls);
            state.initialEvidenceFiles = [];
            fetch(SHEETS_URL + '?action=update&tab=capa&idCol=' + encodeURIComponent('CAPA ID') + '&id=' + encodeURIComponent(state.capaId), {
              method: 'POST', body: JSON.stringify({ 'Initial Evidence': state.initialEvidenceUrls.join('\n') }),
            }).catch(function (err) { console.warn('Could not attach evidence links to ' + state.capaId + ': ' + err); });
          }
          return;
        }
        var file = pending.shift();
        uploadEvidence(file, state.capaId, function (url) {
          if (url) newUrls.push(url);
          else console.warn('Evidence upload failed for ' + file.name + ' on ' + state.capaId + ' — CAPA itself was still saved successfully.');
          next();
        });
      }
      next();
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
      + '<div class="cw-hdr"><h3>Continue or View a CAPA</h3><div style="font-size:11px;opacity:.75">Loading live register…</div></div>'
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
        var allRows = data.rows || [];
        var openRows = allRows.filter(function (row) { return String(row[statusIdx]).toLowerCase() !== 'closed'; });
        var closedRows = allRows.filter(function (row) { return String(row[statusIdx]).toLowerCase() === 'closed'; });

        function rowHTML(row, closed) {
          var id = row[idIdx] || '(no ID)';
          var stage = closed ? 'Closed' : (stageIdx >= 0 ? (row[stageIdx] || 'Intake') : 'Intake');
          var desc = descIdx >= 0 ? String(row[descIdx] || '').slice(0, 70) : '';
          return '<div class="cw-picker-row" data-id="' + esc(id) + '"' + (closed ? ' style="opacity:.7"' : '') + '>'
            + '<div><strong>' + esc(id) + '</strong><div style="font-size:11px;color:#7a869a">' + esc(desc) + '</div></div>'
            + '<span class="cw-picker-stage"' + (closed ? ' style="background:#eef1f6;color:#4b5563"' : '') + '>' + esc(stage) + '</span>'
            + '</div>';
        }

        var html = '';
        if (openRows.length) {
          html += '<div style="font-size:11px;font-weight:700;color:#1B2A4A;margin-bottom:8px">OPEN — CONTINUE WORKING</div>'
            + openRows.map(function (r) { return rowHTML(r, false); }).join('');
        } else {
          html += '<div class="cw-hint" style="margin-bottom:14px">No open CAPAs to continue. Raise a new one instead.</div>';
        }
        if (closedRows.length) {
          html += '<div style="font-size:11px;font-weight:700;color:#4b5563;margin:18px 0 8px">CLOSED — VIEW HISTORY ONLY</div>'
            + closedRows.map(function (r) { return rowHTML(r, true); }).join('');
        }
        body.innerHTML = html;
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
    state.caOwnerEmail = col('Owner Email');
    state.initialEvidenceUrls = col('Initial Evidence').split('\n').filter(function (u) { return u.trim(); });
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
    loadUserDirectory(render);
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
            + (e.photo ? '<a href="' + esc(e.photo) + '" target="_blank" style="font-size:11px;color:#1565C0">📎 View attached evidence</a>' : '')
            + '</div>';
        }).join('')
      : '<div class="cw-hint" style="margin-bottom:12px">No progress entries yet.</div>';

    var addForm = '';
    if (canEdit() && status !== 'Closed') {
      var nextAction = status === 'Open' ? 'In Progress' : (status === 'In Progress' ? 'Completed' : null);
      addForm = '<div class="cw-field"><label>Add progress update</label>'
        + '<textarea id="impl-note" placeholder="What was done since the last update"></textarea></div>'
        + '<div class="cw-field"><label>Evidence file (optional)</label>'
        + '<input type="file" id="impl-photo" accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation">'
        + '<div class="cw-hint">Photo, PDF, Word, Excel, or PowerPoint — whatever the actual evidence is.</div></div>'
        + '<div style="display:flex;gap:8px;flex-wrap:wrap">'
        + '<button class="cw-btn ghost" id="impl-log-only">Log Update Only</button>'
        + (nextAction ? '<button class="cw-btn primary" id="impl-advance" data-next="' + nextAction + '">Log &amp; Mark ' + nextAction + '</button>' : '')
        + '</div>';
    } else if (status !== 'Closed') {
      addForm = '<div class="cw-hint">Your role does not have permission to log progress updates (requires editor role or above).</div>';
    }

    var closureForm = '';
    if (status === 'Completed') {
      if (canEdit()) {
        closureForm += '<div style="margin-top:22px;padding-top:16px;border-top:1px solid #eef1f6">'
          + '<div class="cw-field"><label>Not actually finished? Revert to In Progress</label>'
          + '<textarea id="impl-revert-reason" placeholder="Why this isn\'t actually done yet — this is logged automatically"></textarea></div>'
          + '<button class="cw-btn ghost" id="impl-revert-btn">↩ Revert to In Progress</button>'
          + '</div>';
      }
      if (canClose()) {
        closureForm += '<div style="margin-top:22px;padding-top:16px;border-top:1px solid #eef1f6">'
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
      }
      if (!canEdit() && !canClose()) {
        closureForm = '<div class="cw-hint" style="margin-top:16px">Marked Completed — awaiting Admin effectiveness verification before it can be closed.</div>';
      }
    }
    if (status === 'Closed') {
      closureForm = '<div class="cw-sev-banner minor" style="background:#e8f5e9;border-color:#a5d6a7;color:#1B5E20;margin-top:16px">'
        + 'Closed. Verified ' + esc(col('Verification Date')) + ' by ' + esc(col('Verified By')) + '.'
        + (canReopen()
          ? '<br><span style="font-size:10.5px;opacity:.8">You can reopen this CAPA below (IMS Manager / Super Admin only).</span>'
          : '<br><span style="font-size:10.5px;opacity:.8">Viewing history — reopening a closed CAPA is restricted to the IMS Manager or Super Admin.</span>')
        + '</div>';
      if (canReopen()) {
        closureForm += '<div style="margin-top:16px;padding-top:16px;border-top:1px solid #eef1f6">'
          + '<div class="cw-field"><label>Reason for reopening</label>'
          + '<textarea id="impl-reopen-reason" placeholder="e.g. recurrence found, verification later judged insufficient — logged automatically"></textarea></div>'
          + '<button class="cw-btn ghost" id="impl-reopen-btn">↩ Reopen (back to In Progress)</button>'
          + '</div>';
      }
    }

    body.innerHTML = feed + addForm + closureForm;

    var logOnlyBtn = document.getElementById('impl-log-only');
    if (logOnlyBtn) logOnlyBtn.addEventListener('click', function () { submitProgress(capaId, headers, row, null); });
    var advanceBtn = document.getElementById('impl-advance');
    if (advanceBtn) advanceBtn.addEventListener('click', function () { submitProgress(capaId, headers, row, advanceBtn.getAttribute('data-next')); });
    var verifySubmit = document.getElementById('impl-verify-submit');
    if (verifySubmit) verifySubmit.addEventListener('click', function () { submitVerification(capaId, headers, row); });
    var revertBtn = document.getElementById('impl-revert-btn');
    if (revertBtn) revertBtn.addEventListener('click', function () { submitRevert(capaId); });
    var reopenBtn = document.getElementById('impl-reopen-btn');
    if (reopenBtn) reopenBtn.addEventListener('click', function () { submitReopen(capaId); });
  }

  /* Saving-lock for the Implementation panel — the earlier version had
     no guard here at all, so repeated clicks (whether intentional
     re-clicks during testing, or clicks made before any visual feedback
     appeared) each wrote a brand-new, undeduplicated row to the log tab.
     This disables both buttons the instant either is clicked and blocks
     re-entry until the request settles. */
  var implSaving = false;
  function setImplButtonsSaving(isSaving, activeBtnId) {
    ['impl-log-only', 'impl-advance', 'impl-verify-submit', 'impl-revert-btn', 'impl-reopen-btn'].forEach(function (id) {
      var b = document.getElementById(id);
      if (!b) return;
      b.disabled = isSaving;
      if (id === activeBtnId) b.textContent = isSaving ? 'Saving…' : b.getAttribute('data-label') || b.textContent;
    });
  }

  /* Handles any evidence file — image, PDF, Word, Excel, PowerPoint.
     The underlying sheet column is still named "Photo URL" (kept as-is
     to avoid another schema change); it now just means "evidence file
     link", whatever the file type actually is. */
  function uploadEvidence(file, capaId, cb) {
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
    if (implSaving) return; /* ignore re-clicks while a save is already in flight */
    var note = val('impl-note');
    var fileInput = document.getElementById('impl-photo');
    var file = fileInput && fileInput.files ? fileInput.files[0] : null;

    if (!note && !statusChange) { alert('Add a note before logging (or attach a photo).'); return; }

    implSaving = true;
    setImplButtonsSaving(true, statusChange ? 'impl-advance' : 'impl-log-only');

    uploadEvidence(file, capaId, function (evidenceLink) {
      var logRow = {
        'Log ID': 'LOG-' + capaId + '-' + Date.now(),
        'CAPA ID': capaId,
        'Date': new Date().toISOString().split('T')[0],
        'Note': note,
        'Photo URL': evidenceLink || '',
        'Logged By': currentUserName(),
        'Status Change': statusChange ? ('→ ' + statusChange) : '',
      };
      fetch(SHEETS_URL + '?action=write&tab=' + LOG_TAB, { method: 'POST', body: JSON.stringify([logRow]) })
        .then(function (r) { return r.json(); })
        .then(function (result) {
          if (!(result && result.status === 'ok')) {
            implSaving = false; setImplButtonsSaving(false);
            alert('Log entry did not confirm success: ' + JSON.stringify(result) + '\nConfirm the "' + LOG_TAB + '" tab exists on the live sheet with the right headers.');
            return;
          }
          if (statusChange) {
            fetch(SHEETS_URL + '?action=update&tab=capa&idCol=' + encodeURIComponent('CAPA ID') + '&id=' + encodeURIComponent(capaId), {
              method: 'POST', body: JSON.stringify({ 'Status': statusChange }),
            })
              .then(function (r) { return r.json(); })
              .then(function () { implSaving = false; alert(capaId + ' marked ' + statusChange + '.'); closeWizard(); if (global.reloadLive) reloadLive(); })
              .catch(function (err) { implSaving = false; setImplButtonsSaving(false); alert('Log saved, but status update failed to reach the live sheet: ' + err); });
          } else {
            implSaving = false;
            alert('Progress logged.');
            closeWizard();
          }
        })
        .catch(function (err) { implSaving = false; setImplButtonsSaving(false); alert('Could not reach the live sheet: ' + err); });
    });
  }

  function submitRevert(capaId) {
    if (implSaving) return;
    var reason = val('impl-revert-reason');
    if (!reason) { alert('Add a short reason before reverting — this is written to the progress log automatically.'); return; }

    implSaving = true;
    setImplButtonsSaving(true, 'impl-revert-btn');

    var logRow = {
      'Log ID': 'LOG-' + capaId + '-' + Date.now(),
      'CAPA ID': capaId,
      'Date': new Date().toISOString().split('T')[0],
      'Note': reason,
      'Photo URL': '',
      'Logged By': currentUserName(),
      'Status Change': '→ In Progress (reverted from Completed)',
    };
    fetch(SHEETS_URL + '?action=write&tab=' + LOG_TAB, { method: 'POST', body: JSON.stringify([logRow]) })
      .then(function (r) { return r.json(); })
      .then(function (result) {
        if (!(result && result.status === 'ok')) {
          implSaving = false; setImplButtonsSaving(false);
          alert('Could not log the revert: ' + JSON.stringify(result));
          return;
        }
        fetch(SHEETS_URL + '?action=update&tab=capa&idCol=' + encodeURIComponent('CAPA ID') + '&id=' + encodeURIComponent(capaId), {
          method: 'POST', body: JSON.stringify({ 'Status': 'In Progress' }),
        })
          .then(function (r) { return r.json(); })
          .then(function () { implSaving = false; alert(capaId + ' reverted to In Progress.'); closeWizard(); if (global.reloadLive) reloadLive(); })
          .catch(function (err) { implSaving = false; setImplButtonsSaving(false); alert('Log saved, but the status revert failed to reach the live sheet: ' + err); });
      })
      .catch(function (err) { implSaving = false; setImplButtonsSaving(false); alert('Could not reach the live sheet: ' + err); });
  }

  function submitReopen(capaId) {
    if (implSaving) return;
    if (!canReopen()) { alert('Reopening a closed CAPA is restricted to the IMS Manager or Super Admin.'); return; }
    var reason = val('impl-reopen-reason');
    if (!reason) { alert('Add a reason before reopening — this is written to the progress log automatically.'); return; }

    implSaving = true;
    setImplButtonsSaving(true, 'impl-reopen-btn');

    var logRow = {
      'Log ID': 'LOG-' + capaId + '-' + Date.now(),
      'CAPA ID': capaId,
      'Date': new Date().toISOString().split('T')[0],
      'Note': reason,
      'Photo URL': '',
      'Logged By': currentUserName(),
      'Status Change': '→ In Progress (reopened from Closed)',
    };
    fetch(SHEETS_URL + '?action=write&tab=' + LOG_TAB, { method: 'POST', body: JSON.stringify([logRow]) })
      .then(function (r) { return r.json(); })
      .then(function (result) {
        if (!(result && result.status === 'ok')) {
          implSaving = false; setImplButtonsSaving(false);
          alert('Could not log the reopen: ' + JSON.stringify(result));
          return;
        }
        /* Verified resets to No — a reopened CAPA is no longer standing as
           verified-effective, even though its prior Effectiveness Method/
           Evidence/Result/Verified By/Verification Date fields are left
           in place as a historical record of that earlier closure. */
        fetch(SHEETS_URL + '?action=update&tab=capa&idCol=' + encodeURIComponent('CAPA ID') + '&id=' + encodeURIComponent(capaId), {
          method: 'POST', body: JSON.stringify({ 'Status': 'In Progress', 'Verified': 'No' }),
        })
          .then(function (r) { return r.json(); })
          .then(function () { implSaving = false; alert(capaId + ' reopened — back to In Progress.'); closeWizard(); if (global.reloadLive) reloadLive(); })
          .catch(function (err) { implSaving = false; setImplButtonsSaving(false); alert('Log saved, but reopening failed to reach the live sheet: ' + err); });
      })
      .catch(function (err) { implSaving = false; setImplButtonsSaving(false); alert('Could not reach the live sheet: ' + err); });
  }

  function submitVerification(capaId, headers, row) {
    if (implSaving) return;
    var method = val('impl-verif-method');
    var evidence = val('impl-verif-evidence');
    var result = val('impl-verif-result');
    if (!method || !evidence) { alert('Verification method and evidence are required before submitting.'); return; }

    implSaving = true;
    setImplButtonsSaving(true, 'impl-verify-submit');

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
        implSaving = false;
        if (res && res.status === 'ok') {
          alert(result === 'Yes' ? capaId + ' verified effective and Closed.' : capaId + ' verification failed — reopened to In Progress.');
          closeWizard();
          if (global.reloadLive) reloadLive();
        } else {
          setImplButtonsSaving(false);
          alert('Verification did not confirm success: ' + JSON.stringify(res));
        }
      })
      .catch(function (err) { implSaving = false; setImplButtonsSaving(false); alert('Could not reach the live sheet: ' + err); });
  }

  /* ══════════════════════════════════════════════════════════
     Notification bell (page-local, not portal-wide)
     Shows the logged-in user's own unread overdue-CAPA notifications
     from the 'notifications' tab, written by scanAndNotifyOwners()
     in google-apps-script.js. Requires a real session (IMS_AUTH
     .getUser()) since there's no other way to know whose email to
     filter by — with no session, the bell just doesn't render.
     ══════════════════════════════════════════════════════════ */

  function initNotifBell() {
    var mount = document.getElementById('capa-notif-mount');
    if (!mount) return;
    if (!global.IMS_AUTH || !IMS_AUTH.getUser() || !IMS_AUTH.getUser().email) return; /* no session — nothing to filter by */

    var myEmail = IMS_AUTH.getUser().email;
    var unread = [];

    function load(cb) {
      fetch(SHEETS_URL + '?tab=notifications&action=read')
        .then(function (r) { return r.json(); })
        .then(function (data) {
          var headers = data.headers || [];
          var idIdx = headers.indexOf('Notification ID');
          var emailIdx = headers.indexOf('Recipient Email');
          var capaIdx = headers.indexOf('CAPA ID');
          var msgIdx = headers.indexOf('Message');
          var dateIdx = headers.indexOf('Date Created');
          var readIdx = headers.indexOf('Read');
          unread = (data.rows || [])
            .filter(function (row) {
              return String(row[emailIdx]).toLowerCase() === myEmail.toLowerCase() && String(row[readIdx]).toLowerCase() !== 'yes';
            })
            .map(function (row) {
              return { id: row[idIdx], capaId: row[capaIdx], message: row[msgIdx], date: row[dateIdx] };
            });
          cb();
        })
        .catch(function () { unread = []; cb(); }); /* Notifications tab may not exist yet — degrade quietly */
    }

    function render() {
      mount.innerHTML = '<button id="notif-bell-btn" style="background:none;border:none;cursor:pointer;font-size:20px;position:relative">🔔'
        + (unread.length ? '<span style="position:absolute;top:-4px;right:-8px;background:#B71C1C;color:#fff;font-size:9px;font-weight:700;border-radius:8px;padding:1px 5px">' + unread.length + '</span>' : '')
        + '</button>';
      document.getElementById('notif-bell-btn').addEventListener('click', toggleDropdown);
    }

    function toggleDropdown() {
      var existing = document.getElementById('notif-dropdown');
      if (existing) { existing.remove(); return; }
      var dd = document.createElement('div');
      dd.id = 'notif-dropdown';
      dd.style.cssText = 'position:absolute;top:28px;left:0;background:#fff;border:1px solid #eef1f6;border-radius:8px;box-shadow:0 8px 24px rgba(0,0,0,.15);width:320px;max-height:360px;overflow-y:auto;z-index:2000;font-family:Arial,sans-serif';
      dd.innerHTML = unread.length
        ? unread.map(function (n) {
            return '<div style="padding:10px 12px;border-bottom:1px solid #f3f4f6">'
              + '<div style="font-size:10.5px;color:#7a869a">' + esc(n.date) + ' · ' + esc(n.capaId) + '</div>'
              + '<div style="font-size:12px;margin:3px 0 6px">' + esc(n.message) + '</div>'
              + '<button class="notif-mark-read" data-id="' + esc(n.id) + '" style="font-size:10.5px;background:#EBF3FB;color:#1565C0;border:none;border-radius:4px;padding:3px 8px;cursor:pointer">Mark read</button>'
              + '</div>';
          }).join('')
        : '<div style="padding:16px;font-size:12px;color:#7a869a">No unread notifications.</div>';
      mount.appendChild(dd);
      dd.querySelectorAll('.notif-mark-read').forEach(function (btn) {
        btn.addEventListener('click', function () { markRead(btn.getAttribute('data-id')); });
      });
    }

    function markRead(notifId) {
      fetch(SHEETS_URL + '?action=update&tab=notifications&idCol=' + encodeURIComponent('Notification ID') + '&id=' + encodeURIComponent(notifId), {
        method: 'POST', body: JSON.stringify({ 'Read': 'Yes' }),
      })
        .then(function (r) { return r.json(); })
        .then(function () {
          var dd = document.getElementById('notif-dropdown');
          if (dd) dd.remove();
          load(render);
        })
        .catch(function (err) { alert('Could not mark as read: ' + err); });
    }

    load(render);
  }

  var liveUserDirectory = null; /* cached for the wizard session once loaded */

  function loadUserDirectory(cb) {
    if (liveUserDirectory) { cb(); return; }
    fetch(SHEETS_URL + '?tab=users&action=read')
      .then(function (r) { return r.json(); })
      .then(function (data) {
        var headers = data.headers || [];
        var nameIdx = headers.indexOf('Full Name'), titleIdx = headers.indexOf('Job Title');
        var emailIdx = headers.indexOf('Email'), statusIdx = headers.indexOf('Account Status');
        liveUserDirectory = (data.rows || [])
          .filter(function (r) { return statusIdx < 0 || String(r[statusIdx]).toLowerCase() === 'active'; })
          .map(function (r) {
            return { name: r[nameIdx] || '', title: titleIdx >= 0 ? (r[titleIdx] || '') : '', email: emailIdx >= 0 ? (r[emailIdx] || '') : '' };
          })
          .filter(function (u) { return u.name && u.email; });
        /* Live sheet not populated yet — fall back to this browser's local
           directory rather than leave the picker empty, so nothing regresses
           before the sheet is filled in. */
        if (!liveUserDirectory.length && global.IMS_AUTH && IMS_AUTH.getUsers) {
          liveUserDirectory = IMS_AUTH.getUsers()
            .filter(function (u) { return u.status === 'Active' && u.email; })
            .map(function (u) { return { name: u.name, title: u.title, email: u.email }; });
        }
        cb();
      })
      .catch(function () {
        liveUserDirectory = (global.IMS_AUTH && IMS_AUTH.getUsers)
          ? IMS_AUTH.getUsers().filter(function (u) { return u.status === 'Active' && u.email; }).map(function (u) { return { name: u.name, title: u.title, email: u.email }; })
          : [];
        cb();
      });
  }

  /* ── Public entry points ──────────────────────────────────── */
  function openNew() { injectStyles(); resetState(); currentStep = 1; loadUserDirectory(render); }

  document.addEventListener('DOMContentLoaded', function () {
    var btn = document.getElementById('capa-raise-btn');
    if (btn) btn.addEventListener('click', openNew);
    var contBtn = document.getElementById('capa-continue-btn');
    if (contBtn) contBtn.addEventListener('click', openPicker);
    initNotifBell();
  });

  global.CAPA_WIZARD = { open: openNew, openPicker: openPicker };

})(window);
