/* ═══════════════════════════════════════════════════════════════
   SAGCO IMS — Edit Mode  |  Rev.02  |  June 2026
   Inline editor for all site pages — non-technical user friendly.
   Saves to localStorage (persists) + Google Sheets if available.
   Visible only to superadmin / admin / editor roles.
═══════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var STORE_KEY  = 'sagco_page_edits';
  var ALLOWED    = ['superadmin','admin','editor'];
  var editActive = false;
  var pendingEdits = {};   /* key = stable selector, val = {html,el} */
  var activeEl   = null;

  /* ── Role check ─────────────────────────────────────────── */
  function canEdit() {
    try {
      var s = JSON.parse(sessionStorage.getItem('sagco_ims_session')||'null');
      return s && ALLOWED.indexOf(s.role) >= 0;
    } catch(e){ return false; }
  }

  /* ── Stable selector — does NOT use timestamp ───────────── */
  function stableSelector(el) {
    var parts = [];
    var cur = el;
    for (var depth = 0; depth < 6 && cur && cur !== document.body; depth++) {
      var tag  = cur.tagName.toLowerCase();
      var id   = cur.id ? '#' + cur.id : '';
      if (id) { parts.unshift(tag + id); break; }
      var cls  = (typeof cur.className === 'string' && cur.className.trim())
                 ? '.' + cur.className.trim().split(/\s+/)[0] : '';
      /* nth-child within parent */
      var idx  = 0;
      if (cur.parentElement) {
        var sibs = Array.from(cur.parentElement.children);
        idx = sibs.indexOf(cur) + 1;
      }
      parts.unshift(tag + cls + ':nth-child(' + idx + ')');
      cur = cur.parentElement;
    }
    return parts.join('>');
  }

  /* ── Which elements should be editable ─────────────────── */
  var SKIP_TAGS = {
    script:1, style:1, meta:1, link:1, br:1, hr:1,
    input:1, textarea:1, button:1, select:1, option:1,
    iframe:1, svg:1, path:1, img:1, head:1, html:1
  };
  var SKIP_IDS = {
    'sidebar':1,'tb':1,'nav-tree':1,
    'sagco-edit-bar':1,'sagco-inline-toolbar':1,
    'sagco-edit-toggle':1,'sagco-save-toast':1,
    'login-modal':1,'login-box':1
  };

  function shouldMark(el) {
    var tag = el.tagName.toLowerCase();
    if (SKIP_TAGS[tag]) return false;
    if (el.id && SKIP_IDS[el.id]) return false;
    if (el.closest && el.closest(
      '#sidebar,#sagco-edit-bar,#sagco-inline-toolbar,#login-modal,script,style'
    )) return false;
    /* Must have direct text content ≥ 2 chars */
    var hasTxt = Array.from(el.childNodes).some(function(n){
      return n.nodeType === 3 && n.textContent.trim().length >= 2;
    });
    var isLeaf = el.children.length === 0 && el.textContent.trim().length >= 2;
    return hasTxt || isLeaf;
  }

  /* ── Mark all editable elements ─────────────────────────── */
  function markEditables() {
    document.querySelectorAll('*').forEach(function(el){
      if (!shouldMark(el)) return;
      if (el.hasAttribute('data-editable')) return;
      var sel = stableSelector(el);
      el.setAttribute('data-editable', sel);
      el.setAttribute('data-orig', el.innerHTML);
    });
    /* Images */
    document.querySelectorAll('img').forEach(function(img){
      if (img.closest('#sidebar,#sagco-edit-bar')) return;
      if (img.hasAttribute('data-eimg')) return;
      img.setAttribute('data-eimg', img.src);
      var wrap = img.parentElement;
      if (getComputedStyle(wrap).position === 'static') wrap.style.position = 'relative';
      var ov = document.createElement('div');
      ov.className = 'se-img-ov';
      ov.innerHTML = '<span>🖼 Change Image</span>';
      ov.onclick = function(){ editImage(img); };
      wrap.appendChild(ov);
    });
  }

  /* ── Apply persisted edits (run on every page load) ─────── */
  function applyPersistedEdits() {
    var page = currentPage();
    var all  = loadStore();
    var edits = all[page];
    if (!edits || !Object.keys(edits).length) return;
    /* Run after DOM settles */
    function apply() {
      Object.keys(edits).forEach(function(sel){
        var e = edits[sel];
        if (e.type === 'text') {
          try {
            var el = document.querySelector(sel);
            if (el) el.innerHTML = e.html;
          } catch(x){}
        }
      });
    }
    if (document.readyState === 'complete') { apply(); }
    else { window.addEventListener('load', apply); }
    /* Also try after 800ms for dynamic content */
    setTimeout(apply, 800);
  }

  /* ── CSS ─────────────────────────────────────────────────── */
  function injectCSS() {
    if (document.getElementById('se-css')) return;
    var s = document.createElement('style');
    s.id = 'se-css';
    s.textContent = `
      #se-bar {
        position:fixed;bottom:0;left:0;right:0;z-index:99999;
        background:#1a2340;color:#fff;
        display:flex;align-items:center;gap:10px;flex-wrap:wrap;
        padding:10px 20px;font-family:-apple-system,sans-serif;font-size:12px;
        box-shadow:0 -2px 16px rgba(0,0,0,.4);
        transform:translateY(100%);transition:transform .3s ease;
      }
      #se-bar.on { transform:translateY(0); }
      #se-bar .se-logo { font-weight:700;color:#c8a84b;font-size:13px;white-space:nowrap; }
      #se-bar .se-hint { font-size:11px;color:rgba(255,255,255,.6);border-left:1px solid rgba(255,255,255,.15);padding-left:10px; }
      #se-bar .se-sp { flex:1; }
      #se-bar .se-cnt {
        background:#c8a84b;color:#1a2340;border-radius:20px;
        padding:2px 10px;font-size:11px;font-weight:700;display:none;
      }
      #se-bar .se-cnt.on { display:inline-block; }
      #se-bar .se-btn {
        padding:6px 16px;border-radius:6px;font-size:12px;font-weight:600;
        cursor:pointer;border:none;font-family:inherit;transition:all .15s;
      }
      #se-bar .se-dis { background:rgba(192,57,43,.3);color:#ff6b6b; }
      #se-bar .se-dis:hover { background:rgba(192,57,43,.5); }
      #se-bar .se-sav { background:#1e8449;color:#fff; }
      #se-bar .se-sav:hover { background:#27ae60; }
      #se-bar .se-sav:disabled { background:#374151;color:#9ca3af;cursor:not-allowed; }

      #se-toggle {
        position:fixed;bottom:20px;right:80px;z-index:99998;
        background:#1a2340;color:#c8a84b;
        border:1px solid rgba(200,168,75,.4);border-radius:20px;
        padding:6px 14px;font-size:11px;font-weight:700;
        cursor:pointer;font-family:inherit;
        box-shadow:0 4px 12px rgba(0,0,0,.3);transition:all .2s;
      }
      #se-dismiss {
        position:fixed;bottom:24px;right:62px;z-index:99999;
        width:18px;height:18px;border-radius:50%;
        background:#374151;color:#9ca3af;
        border:1px solid rgba(255,255,255,.15);
        font-size:11px;line-height:1;cursor:pointer;
        display:flex;align-items:center;justify-content:center;
        font-family:inherit;font-weight:700;
        transition:all .15s;
      }
      #se-dismiss:hover { background:#dc2626;color:#fff;border-color:#dc2626; }
      #se-restore-btn {
        display:none;align-items:center;gap:5px;
        padding:5px 12px;border-radius:6px;font-size:11px;font-weight:600;
        cursor:pointer;font-family:inherit;transition:all .15s;
        background:rgba(255,255,255,.06);color:rgba(255,255,255,.7);
        border:1px solid rgba(255,255,255,.15);
      }
      #se-restore-btn:hover { background:rgba(200,168,75,.15);color:#c8a84b;border-color:rgba(200,168,75,.4); }
      @media print {
        #se-bar, #se-toggle, #se-dismiss, #se-fmt,
        #se-toast, #se-restore-btn, .se-img-ov {
          display: none !important;
          visibility: hidden !important;
          opacity: 0 !important;
        }
      }
      #se-toggle:hover,#se-toggle.on { background:#c8a84b;color:#1a2340; }

      body.se-on [data-editable]:hover {
        outline:2px dashed #c8a84b !important;outline-offset:2px !important;
        cursor:text !important;background:rgba(200,168,75,.04) !important;
      }
      body.se-on [data-editable].se-active {
        outline:2px solid #c8a84b !important;
        background:rgba(200,168,75,.07) !important;
      }
      body.se-on [data-editable].se-mod {
        outline:2px solid #1e8449 !important;
        background:rgba(30,132,73,.04) !important;
      }

      #se-fmt {
        position:fixed;z-index:100000;
        background:#1a2340;border-radius:8px;padding:6px 10px;
        display:none;gap:4px;align-items:center;
        box-shadow:0 4px 20px rgba(0,0,0,.4);font-family:-apple-system,sans-serif;
      }
      #se-fmt.on { display:flex; }
      #se-fmt button {
        background:none;border:none;color:rgba(255,255,255,.8);
        font-size:13px;padding:4px 8px;cursor:pointer;border-radius:4px;
        font-family:inherit;line-height:1;
      }
      #se-fmt button:hover { background:rgba(255,255,255,.15);color:#fff; }
      #se-fmt .sep { width:1px;height:16px;background:rgba(255,255,255,.15);margin:0 2px; }
      #se-fmt .se-done {
        background:#1e8449;color:#fff;font-size:11px;
        font-weight:700;padding:4px 10px;border-radius:4px;
      }

      #se-toast {
        position:fixed;top:20px;right:20px;z-index:100001;
        background:#1e8449;color:#fff;border-radius:8px;
        padding:12px 20px;font-family:-apple-system,sans-serif;
        font-size:13px;font-weight:600;
        box-shadow:0 4px 20px rgba(0,0,0,.3);
        transform:translateX(200%);transition:transform .3s ease;pointer-events:none;
      }
      #se-toast.on { transform:translateX(0); }
      #se-toast.err { background:#c0392b; }

      .se-img-ov {
        position:absolute;inset:0;z-index:10;
        background:rgba(200,168,75,.15);border:2px dashed #c8a84b;
        display:flex;align-items:center;justify-content:center;
        cursor:pointer;border-radius:4px;opacity:0;transition:opacity .2s;
      }
      body.se-on [data-eimg]:hover .se-img-ov { opacity:1; }
      .se-img-ov span {
        background:#c8a84b;color:#1a2340;font-weight:700;
        font-size:11px;padding:6px 14px;border-radius:20px;
        font-family:-apple-system,sans-serif;
      }
    `;
    document.head.appendChild(s);
  }

  /* ── Build UI ────────────────────────────────────────────── */
  function buildUI() {
    if (document.getElementById('se-bar')) return;

    /* Toggle button */
    var tb = document.createElement('button');
    tb.id = 'se-toggle';
    tb.textContent = '✏️ Edit';
    tb.onclick = toggle;
    document.body.appendChild(tb);

    /* Dismiss × button — hides the Edit button */
    var dm = document.createElement('button');
    dm.id = 'se-dismiss';
    dm.title = 'Hide Edit button';
    dm.textContent = '×';
    dm.onclick = function() {
      tb.style.display = 'none';
      dm.style.display = 'none';
      try { sessionStorage.setItem('sagco_edit_hidden','1'); } catch(e){}
      var rb = document.getElementById('se-restore-btn');
      if (rb) rb.style.display = 'flex';
    };
    document.body.appendChild(dm);

    /* Restore from sessionStorage */
    try {
      if (sessionStorage.getItem('sagco_edit_hidden') === '1') {
        tb.style.display = 'none';
        dm.style.display = 'none';
        var rb2 = document.getElementById('se-restore-btn');
        if (rb2) rb2.style.display = 'flex';
      }
    } catch(e){}

    /* Bottom bar */
    var bar = document.createElement('div');
    bar.id = 'se-bar';
    bar.innerHTML =
      '<span class="se-logo">✏️ Edit Mode</span>' +
      '<span class="se-hint">Click any text or image to edit it</span>' +
      '<span class="se-sp"></span>' +
      '<span class="se-cnt" id="se-cnt"></span>' +
      '<button class="se-btn se-dis" onclick="SAGCO_EDIT.discard()">✕ Discard</button>' +
      '<button class="se-btn se-sav" id="se-sav" onclick="SAGCO_EDIT.save()" disabled>💾 Save Changes</button>';
    document.body.appendChild(bar);

    /* Inline format bar */
    var fmt = document.createElement('div');
    fmt.id = 'se-fmt';
    fmt.innerHTML =
      '<button onclick="SAGCO_EDIT.fmt(\'bold\')"><b>B</b></button>' +
      '<button onclick="SAGCO_EDIT.fmt(\'italic\')"><i>I</i></button>' +
      '<button onclick="SAGCO_EDIT.fmt(\'underline\')"><u>U</u></button>' +
      '<div class="sep"></div>' +
      '<button onclick="SAGCO_EDIT.fmt(\'insertUnorderedList\')">≡</button>' +
      '<button onclick="SAGCO_EDIT.fmtSize(1)">A+</button>' +
      '<button onclick="SAGCO_EDIT.fmtSize(-1)">A-</button>' +
      '<div class="sep"></div>' +
      '<button class="se-done" onclick="SAGCO_EDIT.done()">Done ✓</button>';
    document.body.appendChild(fmt);

    /* Toast */
    var toast = document.createElement('div');
    toast.id = 'se-toast';
    document.body.appendChild(toast);
  }

  /* ── Toggle edit mode ────────────────────────────────────── */
  function toggle() {
    editActive = !editActive;
    var tb  = document.getElementById('se-toggle');
    var bar = document.getElementById('se-bar');
    if (editActive) {
      markEditables();
      document.body.classList.add('se-on');
      bar.classList.add('on');
      tb.classList.add('on');
      tb.textContent = '✏️ Editing';
      wireClicks();
    } else {
      document.body.classList.remove('se-on');
      bar.classList.remove('on');
      tb.classList.remove('on');
      tb.textContent = '✏️ Edit';
      unwireClicks();
      hideFmt();
    }
  }

  /* ── Click wiring ────────────────────────────────────────── */
  function wireClicks() {
    document.querySelectorAll('[data-editable]').forEach(function(el){
      el.addEventListener('click', onClick, true);
    });
  }
  function unwireClicks() {
    document.querySelectorAll('[data-editable]').forEach(function(el){
      el.removeEventListener('click', onClick, true);
      el.removeAttribute('contenteditable');
      el.classList.remove('se-active');
    });
  }
  function onClick(e) {
    if (!editActive) return;
    e.stopPropagation();
    startEdit(e.currentTarget);
  }

  /* ── Editing lifecycle ───────────────────────────────────── */
  function startEdit(el) {
    if (activeEl && activeEl !== el) stopEdit(activeEl);
    activeEl = el;
    el.setAttribute('contenteditable','true');
    el.classList.add('se-active');
    el.focus();
    /* Move caret to click position */
    showFmt(el);
    el.addEventListener('input', onInput);
    el.addEventListener('blur',  onBlur);
    el.addEventListener('keydown', onKey);
  }
  function stopEdit(el) {
    if (!el) return;
    el.removeAttribute('contenteditable');
    el.classList.remove('se-active');
    el.removeEventListener('input', onInput);
    el.removeEventListener('blur',  onBlur);
    el.removeEventListener('keydown', onKey);
    if (activeEl === el) activeEl = null;
    hideFmt();
  }
  function onInput(e) {
    var el   = e.currentTarget;
    var sel  = el.getAttribute('data-editable');
    var orig = el.getAttribute('data-orig');
    if (el.innerHTML !== orig) {
      pendingEdits[sel] = { html: el.innerHTML, el: el };
      el.classList.add('se-mod');
    } else {
      delete pendingEdits[sel];
      el.classList.remove('se-mod');
    }
    updateCount();
  }
  function onBlur(e) {
    var el = e.currentTarget;
    setTimeout(function(){
      var fmt = document.getElementById('se-fmt');
      if (fmt && fmt.contains(document.activeElement)) return;
      stopEdit(el);
    }, 160);
  }
  function onKey(e) {
    if (e.key === 'Escape') stopEdit(e.currentTarget);
  }

  /* ── Format bar ──────────────────────────────────────────── */
  function showFmt(el) {
    var fmt = document.getElementById('se-fmt');
    if (!fmt) return;
    var r = el.getBoundingClientRect();
    fmt.style.top  = Math.max(8, r.top + window.scrollY - 50) + 'px';
    fmt.style.left = Math.max(8, Math.min(r.left, window.innerWidth - 300)) + 'px';
    fmt.classList.add('on');
  }
  function hideFmt() {
    var fmt = document.getElementById('se-fmt');
    if (fmt) fmt.classList.remove('on');
  }

  /* ── Image editing ───────────────────────────────────────── */
  function editImage(img) {
    var inp = document.createElement('input');
    inp.type = 'file'; inp.accept = 'image/*';
    inp.onchange = function() {
      var file = inp.files[0]; if (!file) return;
      var fr = new FileReader();
      fr.onload = function(ev) {
        var url = ev.target.result;
        var origSrc = img.getAttribute('data-eimg') || img.src;
        img.src = url;
        pendingEdits['__img__' + origSrc] = { type:'image', el: img, dataUrl: url };
        img.style.outline = '2px solid #1e8449';
        updateCount();
      };
      fr.readAsDataURL(file);
    };
    inp.click();
  }

  /* ── Public API ──────────────────────────────────────────── */
  window.SAGCO_EDIT = {
    fmt: function(cmd) {
      document.execCommand(cmd, false, null);
      if (activeEl) onInput({currentTarget: activeEl});
    },
    fmtSize: function(dir) {
      document.execCommand('fontSize', false, dir > 0 ? '4' : '2');
      if (activeEl) onInput({currentTarget: activeEl});
    },
    done: function() { if (activeEl) stopEdit(activeEl); },
    discard: function() {
      var n = Object.keys(pendingEdits).length;
      if (n && !confirm('Discard ' + n + ' unsaved change' + (n>1?'s':'') + '?')) return;
      /* Restore all originals */
      document.querySelectorAll('[data-editable]').forEach(function(el){
        var orig = el.getAttribute('data-orig');
        if (orig !== null) el.innerHTML = orig;
        el.classList.remove('se-mod','se-active');
        el.removeAttribute('contenteditable');
      });
      document.querySelectorAll('[data-eimg]').forEach(function(img){
        img.src = img.getAttribute('data-eimg');
        img.style.outline = '';
      });
      pendingEdits = {};
      updateCount();
      if (editActive) toggle();
      toast('Changes discarded');
    },
    save: function() {
      var n = Object.keys(pendingEdits).length;
      if (!n) return;
      var btn = document.getElementById('se-sav');
      btn.textContent = '⏳ Saving...';
      btn.disabled = true;

      var page  = currentPage();
      var store = loadStore();
      store[page] = store[page] || {};

      Object.keys(pendingEdits).forEach(function(sel){
        var ed = pendingEdits[sel];
        if (ed.type === 'image') {
          store[page][sel] = { type:'image', src: ed.dataUrl };
        } else {
          store[page][sel] = { type:'text', html: ed.html };
          /* Update baseline so future edits compare to saved state */
          if (ed.el) ed.el.setAttribute('data-orig', ed.html);
        }
        if (ed.el) ed.el.classList.remove('se-mod');
      });

      saveStore(store);
      pendingEdits = {};
      updateCount();
      btn.textContent = '💾 Save Changes';
      btn.disabled = false;
      toast('✅ ' + n + ' change' + (n>1?'s':'') + ' saved');
      if (editActive) toggle();

      /* Optional: push to Google Sheets */
      if (typeof SHEETS_URL !== 'undefined' && SHEETS_URL) {
        try {
          var payload = encodeURIComponent(JSON.stringify({
            page: page, edits: store[page],
            savedBy: (function(){
              try { var s=JSON.parse(sessionStorage.getItem('sagco_ims_session')||'null'); return s?s.username:'unknown'; } catch(e){ return 'unknown'; }
            })(),
            savedAt: new Date().toISOString()
          }));
          fetch(SHEETS_URL + '?action=savePageEdits&data=' + payload).catch(function(){});
        } catch(e){}
      }
    }
  };

  /* ── Helpers ─────────────────────────────────────────────── */
  function currentPage() {
    return window.location.pathname.split('/').pop() || 'index.html';
  }
  function loadStore() {
    try { return JSON.parse(localStorage.getItem(STORE_KEY) || '{}'); } catch(e){ return {}; }
  }
  function saveStore(data) {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(data)); } catch(e){}
  }
  function updateCount() {
    var n   = Object.keys(pendingEdits).length;
    var cnt = document.getElementById('se-cnt');
    var btn = document.getElementById('se-sav');
    if (cnt) { cnt.textContent = n + ' change' + (n!==1?'s':''); cnt.className = 'se-cnt' + (n?' on':''); }
    if (btn) btn.disabled = !n;
  }
  function toast(msg, err) {
    var t = document.getElementById('se-toast');
    if (!t) return;
    t.textContent = msg;
    t.className = 'on' + (err?' err':'');
    setTimeout(function(){ t.className = err?'err':''; }, 3000);
  }

  /* ── Init ────────────────────────────────────────────────── */
  function init() {
    if (!canEdit()) return;
    injectCSS();
    applyPersistedEdits();
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', buildUI);
    } else {
      buildUI();
    }
  }

  init();

})();
