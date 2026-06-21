/* ═══════════════════════════════════════════════════════════════
   SAGCO IMS — Edit Mode
   edit-mode.js | Rev.01 | June 2026
   Non-technical inline editor for all site pages.
   Saves to Google Sheets via the existing SHEETS_URL endpoint.
   Only visible to superadmin and admin roles.
═══════════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  /* ── Config ─────────────────────────────────────────────── */
  var EDIT_KEY   = 'sagco_edit_mode';
  var STORE_KEY  = 'sagco_edits';        /* localStorage cache  */
  var ALLOWED    = ['superadmin', 'admin', 'editor'];

  /* ── State ──────────────────────────────────────────────── */
  var editActive = false;
  var pendingEdits = {};                 /* { selector: newValue } */
  var activeEl = null;

  /* ── Role check ─────────────────────────────────────────── */
  function canEdit() {
    try {
      var s = JSON.parse(sessionStorage.getItem('sagco_ims_session') || 'null');
      return s && ALLOWED.indexOf(s.role) >= 0;
    } catch(e) { return false; }
  }

  /* ── CSS injection ──────────────────────────────────────── */
  function injectCSS() {
    if (document.getElementById('sagco-edit-css')) return;
    var style = document.createElement('style');
    style.id = 'sagco-edit-css';
    style.textContent = `
      /* Edit Mode toolbar */
      #sagco-edit-bar {
        position: fixed; bottom: 0; left: 0; right: 0; z-index: 99999;
        background: #1a2340; color: #fff;
        display: flex; align-items: center; gap: 10px;
        padding: 10px 20px; font-family: -apple-system, sans-serif;
        font-size: 12px; box-shadow: 0 -2px 16px rgba(0,0,0,.4);
        transform: translateY(100%); transition: transform .3s ease;
      }
      #sagco-edit-bar.visible { transform: translateY(0); }
      #sagco-edit-bar .eb-logo { font-weight: 700; color: #c8a84b; font-size: 13px; }
      #sagco-edit-bar .eb-status {
        font-size: 11px; color: rgba(255,255,255,.6);
        border-left: 1px solid rgba(255,255,255,.15); padding-left: 10px;
      }
      #sagco-edit-bar .eb-status strong { color: #fff; }
      #sagco-edit-bar .eb-spacer { flex: 1; }
      #sagco-edit-bar .eb-count {
        background: #c8a84b; color: #1a2340; border-radius: 20px;
        padding: 2px 10px; font-size: 11px; font-weight: 700;
        display: none;
      }
      #sagco-edit-bar .eb-count.has-edits { display: inline-block; }
      #sagco-edit-bar .eb-btn {
        padding: 6px 16px; border-radius: 6px; font-size: 12px;
        font-weight: 600; cursor: pointer; border: none;
        font-family: inherit; transition: all .15s;
      }
      #sagco-edit-bar .eb-toggle {
        background: rgba(255,255,255,.1); color: #fff;
      }
      #sagco-edit-bar .eb-toggle:hover { background: rgba(255,255,255,.2); }
      #sagco-edit-bar .eb-toggle.active { background: #c8a84b; color: #1a2340; }
      #sagco-edit-bar .eb-save {
        background: #1e8449; color: #fff;
      }
      #sagco-edit-bar .eb-save:hover { background: #27ae60; }
      #sagco-edit-bar .eb-save:disabled { background: #374151; color: #9ca3af; cursor: not-allowed; }
      #sagco-edit-bar .eb-discard {
        background: rgba(192,57,43,.3); color: #ff6b6b;
      }
      #sagco-edit-bar .eb-discard:hover { background: rgba(192,57,43,.5); }

      /* Edit Mode toggle button (always visible for admins) */
      #sagco-edit-toggle {
        position: fixed; bottom: 20px; right: 80px; z-index: 99998;
        background: #1a2340; color: #c8a84b;
        border: 1px solid rgba(200,168,75,.4); border-radius: 20px;
        padding: 6px 14px; font-size: 11px; font-weight: 700;
        cursor: pointer; font-family: inherit;
        box-shadow: 0 4px 12px rgba(0,0,0,.3);
        transition: all .2s; letter-spacing: .5px;
      }
      #sagco-edit-toggle:hover { background: #c8a84b; color: #1a2340; }
      #sagco-edit-toggle.active { background: #c8a84b; color: #1a2340; }

      /* Editable elements highlight */
      body.edit-mode-on [data-editable]:hover {
        outline: 2px dashed #c8a84b !important;
        outline-offset: 2px !important;
        cursor: text !important;
        border-radius: 2px;
        background: rgba(200,168,75,.05) !important;
      }
      body.edit-mode-on [data-editable].editing {
        outline: 2px solid #c8a84b !important;
        outline-offset: 2px !important;
        background: rgba(200,168,75,.08) !important;
        min-width: 40px; min-height: 20px;
      }
      body.edit-mode-on [data-editable].modified {
        outline: 2px solid #1e8449 !important;
        background: rgba(30,132,73,.05) !important;
      }

      /* Inline editor toolbar */
      #sagco-inline-toolbar {
        position: fixed; z-index: 100000;
        background: #1a2340; border-radius: 8px;
        padding: 6px 10px; display: none;
        gap: 4px; align-items: center;
        box-shadow: 0 4px 20px rgba(0,0,0,.4);
        font-family: -apple-system, sans-serif;
      }
      #sagco-inline-toolbar.visible { display: flex; }
      #sagco-inline-toolbar button {
        background: none; border: none; color: rgba(255,255,255,.7);
        font-size: 13px; padding: 4px 8px; cursor: pointer;
        border-radius: 4px; font-family: inherit; line-height: 1;
      }
      #sagco-inline-toolbar button:hover { background: rgba(255,255,255,.1); color: #fff; }
      #sagco-inline-toolbar button.active { background: #c8a84b; color: #1a2340; }
      #sagco-inline-toolbar .it-sep {
        width: 1px; height: 16px; background: rgba(255,255,255,.15); margin: 0 2px;
      }
      #sagco-inline-toolbar .it-done {
        background: #1e8449; color: #fff; font-size: 11px;
        font-weight: 700; padding: 4px 10px;
      }

      /* Save notification */
      #sagco-save-toast {
        position: fixed; top: 20px; right: 20px; z-index: 100001;
        background: #1e8449; color: #fff; border-radius: 8px;
        padding: 12px 20px; font-family: -apple-system, sans-serif;
        font-size: 13px; font-weight: 600;
        box-shadow: 0 4px 20px rgba(0,0,0,.3);
        transform: translateX(200%); transition: transform .3s ease;
      }
      #sagco-save-toast.visible { transform: translateX(0); }
      #sagco-save-toast.error { background: #c0392b; }

      /* Image edit overlay */
      .sagco-img-overlay {
        position: absolute; inset: 0; z-index: 10;
        background: rgba(200,168,75,.15); border: 2px dashed #c8a84b;
        display: flex; align-items: center; justify-content: center;
        cursor: pointer; border-radius: 4px; opacity: 0;
        transition: opacity .2s;
      }
      body.edit-mode-on [data-editable-img]:hover .sagco-img-overlay { opacity: 1; }
      .sagco-img-overlay span {
        background: #c8a84b; color: #1a2340; font-weight: 700;
        font-size: 11px; padding: 6px 14px; border-radius: 20px;
        font-family: -apple-system, sans-serif;
      }
    `;
    document.head.appendChild(style);
  }

  /* ── Build toolbar HTML ─────────────────────────────────── */
  function buildToolbar() {
    if (document.getElementById('sagco-edit-bar')) return;

    /* Toggle button */
    var toggleBtn = document.createElement('button');
    toggleBtn.id = 'sagco-edit-toggle';
    toggleBtn.textContent = '✏️ Edit';
    toggleBtn.title = 'Toggle Edit Mode';
    toggleBtn.onclick = toggleEditMode;
    document.body.appendChild(toggleBtn);

    /* Main edit bar */
    var bar = document.createElement('div');
    bar.id = 'sagco-edit-bar';
    bar.innerHTML = `
      <span class="eb-logo">✏️ Edit Mode</span>
      <span class="eb-status">Click any text or image to edit</span>
      <span class="eb-spacer"></span>
      <span class="eb-count" id="eb-count">0 changes</span>
      <button class="eb-btn eb-discard" id="eb-discard" onclick="SAGCO_EDIT.discard()">✕ Discard</button>
      <button class="eb-btn eb-save" id="eb-save" onclick="SAGCO_EDIT.save()" disabled>💾 Save All Changes</button>
    `;
    document.body.appendChild(bar);

    /* Inline formatting toolbar */
    var toolbar = document.createElement('div');
    toolbar.id = 'sagco-inline-toolbar';
    toolbar.innerHTML = `
      <button onclick="SAGCO_EDIT.fmt('bold')" title="Bold"><b>B</b></button>
      <button onclick="SAGCO_EDIT.fmt('italic')" title="Italic"><i>I</i></button>
      <button onclick="SAGCO_EDIT.fmt('underline')" title="Underline"><u>U</u></button>
      <div class="it-sep"></div>
      <button onclick="SAGCO_EDIT.fmt('insertUnorderedList')" title="Bullet list">≡</button>
      <button onclick="SAGCO_EDIT.fmtFontSize('larger')" title="Bigger">A+</button>
      <button onclick="SAGCO_EDIT.fmtFontSize('smaller')" title="Smaller">A-</button>
      <div class="it-sep"></div>
      <button class="it-done" onclick="SAGCO_EDIT.doneEditing()">Done ✓</button>
    `;
    document.body.appendChild(toolbar);

    /* Save toast */
    var toast = document.createElement('div');
    toast.id = 'sagco-save-toast';
    document.body.appendChild(toast);
  }

  /* ── Mark editable elements ─────────────────────────────── */
  function markEditables() {
    /* Mark ALL elements that directly contain visible text */
    var all = document.querySelectorAll('*');
    all.forEach(function(el) {
      /* Skip non-content elements */
      var tag = el.tagName.toLowerCase();
      if (['script','style','meta','link','br','hr','input','textarea',
           'button','select','option','iframe','svg','path','img'].indexOf(tag) >= 0) return;
      /* Skip structural/nav wrappers */
      if (el.id && ['sidebar','tb','sagco-edit-bar','sagco-inline-toolbar',
          'sagco-edit-toggle','sagco-save-toast','login-modal','nav-tree'].indexOf(el.id) >= 0) return;
      if (el.closest('#sidebar, #sagco-edit-bar, #sagco-inline-toolbar, #login-modal, script, style')) return;
      /* Skip elements that only contain child elements (no direct text) */
      var hasDirectText = Array.from(el.childNodes).some(function(n){
        return n.nodeType === 3 && n.textContent.trim().length > 2;
      });
      /* Also include leaf elements with text content */
      var isLeaf = el.children.length === 0 && el.textContent.trim().length > 2;
      if (!hasDirectText && !isLeaf) return;
      if (el.hasAttribute('data-editable')) return;

      /* Generate unique selector */
      var sel = generateSelector(el);
      el.setAttribute('data-editable', sel);
      el.setAttribute('data-edit-original', el.innerHTML);
    });

    /* Mark images */
    document.querySelectorAll('img').forEach(function(img) {
      if (img.closest('#sidebar, #sagco-edit-bar')) return;
      if (img.hasAttribute('data-editable-img')) return;
      img.setAttribute('data-editable-img', img.src);
      /* Wrap in relative container for overlay */
      if (img.parentElement.style.position !== 'relative') {
        img.parentElement.style.position = 'relative';
      }
      var overlay = document.createElement('div');
      overlay.className = 'sagco-img-overlay';
      overlay.innerHTML = '<span>🖼 Change Image</span>';
      overlay.onclick = function() { editImage(img); };
      img.parentElement.appendChild(overlay);
    });
  }

  /* ── Generate a unique CSS-like selector for an element ─── */
  function generateSelector(el) {
    var path = [];
    var current = el;
    for (var i = 0; i < 4 && current && current !== document.body; i++) {
      var tag = current.tagName.toLowerCase();
      var id = current.id ? '#' + current.id : '';
      var cls = current.className && typeof current.className === 'string'
        ? '.' + current.className.trim().split(/\s+/)[0] : '';
      var nth = '';
      if (!id) {
        var siblings = current.parentElement
          ? Array.from(current.parentElement.children).filter(function(c){ return c.tagName === current.tagName; })
          : [];
        if (siblings.length > 1) nth = ':nth-of-type(' + (siblings.indexOf(current) + 1) + ')';
      }
      path.unshift(tag + id + (id ? '' : cls) + nth);
      if (id) break;
      current = current.parentElement;
    }
    return path.join('>') + '_' + Date.now() % 100000;
  }

  /* ── Toggle Edit Mode ───────────────────────────────────── */
  function toggleEditMode() {
    editActive = !editActive;
    var bar       = document.getElementById('sagco-edit-bar');
    var toggleBtn = document.getElementById('sagco-edit-toggle');

    if (editActive) {
      markEditables();
      document.body.classList.add('edit-mode-on');
      bar.classList.add('visible');
      toggleBtn.classList.add('active');
      toggleBtn.textContent = '✏️ Editing';
      wireClickHandlers();
      /* Restore any cached edits */
      restoreLocalEdits();
    } else {
      document.body.classList.remove('edit-mode-on');
      bar.classList.remove('visible');
      toggleBtn.classList.remove('active');
      toggleBtn.textContent = '✏️ Edit';
      unwireClickHandlers();
      hideInlineToolbar();
    }
  }

  /* ── Wire click handlers on editable elements ──────────── */
  function wireClickHandlers() {
    document.querySelectorAll('[data-editable]').forEach(function(el) {
      el.addEventListener('click', onEditClick);
    });
  }

  function unwireClickHandlers() {
    document.querySelectorAll('[data-editable]').forEach(function(el) {
      el.removeEventListener('click', onEditClick);
      el.removeAttribute('contenteditable');
      el.classList.remove('editing');
    });
  }

  function onEditClick(e) {
    if (!editActive) return;
    e.stopPropagation();
    var el = e.currentTarget;
    startEditing(el);
  }

  /* ── Start editing an element ───────────────────────────── */
  function startEditing(el) {
    /* Stop editing previous */
    if (activeEl && activeEl !== el) {
      stopEditing(activeEl);
    }
    activeEl = el;
    el.setAttribute('contenteditable', 'true');
    el.classList.add('editing');
    el.focus();

    /* Position inline toolbar above element */
    showInlineToolbar(el);

    /* Track changes */
    el.addEventListener('input', onInput);
    el.addEventListener('blur', onBlur);
    el.addEventListener('keydown', onKeydown);
  }

  function stopEditing(el) {
    if (!el) return;
    el.removeAttribute('contenteditable');
    el.classList.remove('editing');
    el.removeEventListener('input', onInput);
    el.removeEventListener('blur', onBlur);
    el.removeEventListener('keydown', onKeydown);
    if (activeEl === el) activeEl = null;
    hideInlineToolbar();
  }

  function onInput(e) {
    var el = e.currentTarget;
    var sel = el.getAttribute('data-editable');
    var orig = el.getAttribute('data-edit-original');
    if (el.innerHTML !== orig) {
      pendingEdits[sel] = { html: el.innerHTML, text: el.textContent, el: el };
      el.classList.add('modified');
      updateEditCount();
      cacheEditsLocally();
    } else {
      delete pendingEdits[sel];
      el.classList.remove('modified');
      updateEditCount();
    }
  }

  function onBlur(e) {
    /* Small delay so toolbar click doesn't trigger blur */
    setTimeout(function() {
      var toolbar = document.getElementById('sagco-inline-toolbar');
      if (toolbar && document.activeElement && toolbar.contains(document.activeElement)) return;
      stopEditing(e.currentTarget);
    }, 150);
  }

  function onKeydown(e) {
    if (e.key === 'Escape') {
      stopEditing(e.currentTarget);
    }
  }

  /* ── Inline toolbar ─────────────────────────────────────── */
  function showInlineToolbar(el) {
    var toolbar = document.getElementById('sagco-inline-toolbar');
    if (!toolbar) return;
    var rect = el.getBoundingClientRect();
    var top = rect.top + window.scrollY - 48;
    var left = Math.min(rect.left, window.innerWidth - 280);
    toolbar.style.top  = Math.max(10, top) + 'px';
    toolbar.style.left = Math.max(10, left) + 'px';
    toolbar.classList.add('visible');
  }

  function hideInlineToolbar() {
    var toolbar = document.getElementById('sagco-inline-toolbar');
    if (toolbar) toolbar.classList.remove('visible');
  }

  /* ── Image editing ──────────────────────────────────────── */
  function editImage(img) {
    var input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = function() {
      var file = input.files[0];
      if (!file) return;
      var reader = new FileReader();
      reader.onload = function(e) {
        var dataUrl = e.target.result;
        var origSrc = img.getAttribute('data-editable-img') || img.src;
        img.src = dataUrl;
        pendingEdits['img_' + origSrc] = { type: 'image', el: img, dataUrl: dataUrl, origSrc: origSrc };
        img.style.outline = '2px solid #1e8449';
        updateEditCount();
        cacheEditsLocally();
      };
      reader.readAsDataURL(file);
    };
    input.click();
  }

  /* ── Formatting commands ────────────────────────────────── */
  window.SAGCO_EDIT = {
    fmt: function(cmd) {
      document.execCommand(cmd, false, null);
      if (activeEl) {
        var e = {currentTarget: activeEl};
        onInput(e);
      }
    },
    fmtFontSize: function(size) {
      document.execCommand('fontSize', false, size === 'larger' ? '4' : '2');
    },
    doneEditing: function() {
      if (activeEl) stopEditing(activeEl);
    },
    discard: function() {
      if (Object.keys(pendingEdits).length === 0) { toggleEditMode(); return; }
      if (!confirm('Discard all ' + Object.keys(pendingEdits).length + ' changes?')) return;
      /* Restore originals */
      document.querySelectorAll('[data-editable]').forEach(function(el) {
        var orig = el.getAttribute('data-edit-original');
        if (orig) el.innerHTML = orig;
        el.classList.remove('modified', 'editing');
        el.removeAttribute('contenteditable');
      });
      /* Restore images */
      document.querySelectorAll('[data-editable-img]').forEach(function(img) {
        img.src = img.getAttribute('data-editable-img');
        img.style.outline = '';
      });
      pendingEdits = {};
      updateEditCount();
      clearLocalCache();
      toggleEditMode();
      showToast('Changes discarded', false);
    },
    save: function() {
      var count = Object.keys(pendingEdits).length;
      if (count === 0) return;
      var saveBtn = document.getElementById('eb-save');
      saveBtn.textContent = '⏳ Saving...';
      saveBtn.disabled = true;

      /* Build save payload */
      var page = window.location.pathname.split('/').pop() || 'index.html';
      var edits = [];
      Object.keys(pendingEdits).forEach(function(sel) {
        var edit = pendingEdits[sel];
        if (edit.type === 'image') {
          edits.push({ type:'image', selector: sel, dataUrl: edit.dataUrl, origSrc: edit.origSrc });
        } else {
          edits.push({ type:'text', selector: sel, html: edit.html, text: edit.text });
        }
      });

      var payload = {
        action: 'savePageEdits',
        page: page,
        edits: JSON.stringify(edits),
        savedBy: (function(){
          try {
            var s = JSON.parse(sessionStorage.getItem('sagco_ims_session')||'null');
            return s ? s.username : 'unknown';
          } catch(e) { return 'unknown'; }
        })(),
        savedAt: new Date().toISOString()
      };

      /* Save to Google Sheets via SHEETS_URL if available */
      var saved = false;
      if (typeof SHEETS_URL !== 'undefined' && SHEETS_URL) {
        var params = Object.keys(payload).map(function(k){
          return encodeURIComponent(k) + '=' + encodeURIComponent(typeof payload[k] === 'object' ? JSON.stringify(payload[k]) : payload[k]);
        }).join('&');
        fetch(SHEETS_URL + '?' + params)
          .then(function(r){ return r.json(); })
          .then(function(data){
            saved = true;
            afterSave(count);
          })
          .catch(function(){
            /* Fall back to localStorage only */
            afterSave(count);
          });
      } else {
        /* No Sheets URL — save to localStorage only */
        afterSave(count);
      }

      function afterSave(count) {
        /* Mark edits as saved in localStorage */
        var allSaved = JSON.parse(localStorage.getItem(STORE_KEY) || '{}');
        allSaved[page] = allSaved[page] || {};
        Object.keys(pendingEdits).forEach(function(sel) {
          var edit = pendingEdits[sel];
          allSaved[page][sel] = edit.type === 'image'
            ? { type:'image', src: edit.dataUrl }
            : { type:'text', html: edit.html };
        });
        localStorage.setItem(STORE_KEY, JSON.stringify(allSaved));

        /* Mark elements as saved */
        Object.keys(pendingEdits).forEach(function(sel) {
          var edit = pendingEdits[sel];
          if (edit.el) {
            edit.el.setAttribute('data-edit-original', edit.html || '');
            edit.el.classList.remove('modified');
          }
        });

        pendingEdits = {};
        updateEditCount();
        saveBtn.textContent = '💾 Save All Changes';
        saveBtn.disabled = false;
        showToast('✅ ' + count + ' change' + (count > 1 ? 's' : '') + ' saved', false);
        toggleEditMode();
      }
    }
  };

  /* ── Update change counter ──────────────────────────────── */
  function updateEditCount() {
    var count = Object.keys(pendingEdits).length;
    var countEl  = document.getElementById('eb-count');
    var saveBtn  = document.getElementById('eb-save');
    if (countEl) {
      countEl.textContent = count + ' change' + (count !== 1 ? 's' : '');
      countEl.classList.toggle('has-edits', count > 0);
    }
    if (saveBtn) saveBtn.disabled = count === 0;
  }

  /* ── Toast notification ─────────────────────────────────── */
  function showToast(msg, isError) {
    var toast = document.getElementById('sagco-save-toast');
    if (!toast) return;
    toast.textContent = msg;
    toast.className = 'visible' + (isError ? ' error' : '');
    setTimeout(function(){ toast.className = isError ? 'error' : ''; }, 3000);
  }

  /* ── Local cache (survives page reload in same session) ─── */
  function cacheEditsLocally() {
    var page = window.location.pathname.split('/').pop() || 'index.html';
    var cache = JSON.parse(sessionStorage.getItem('sagco_edit_cache') || '{}');
    cache[page] = {};
    Object.keys(pendingEdits).forEach(function(sel) {
      var edit = pendingEdits[sel];
      cache[page][sel] = edit.type === 'image'
        ? { type:'image', src: edit.dataUrl }
        : { type:'text', html: edit.html };
    });
    sessionStorage.setItem('sagco_edit_cache', JSON.stringify(cache));
  }

  function clearLocalCache() {
    var page = window.location.pathname.split('/').pop() || 'index.html';
    var cache = JSON.parse(sessionStorage.getItem('sagco_edit_cache') || '{}');
    delete cache[page];
    sessionStorage.setItem('sagco_edit_cache', JSON.stringify(cache));
  }

  /* ── Restore saved edits on page load ───────────────────── */
  function restoreLocalEdits() {
    var page = window.location.pathname.split('/').pop() || 'index.html';
    /* Restore from localStorage (permanently saved) */
    try {
      var allSaved = JSON.parse(localStorage.getItem(STORE_KEY) || '{}');
      var saved = allSaved[page] || {};
      Object.keys(saved).forEach(function(sel) {
        var edit = saved[sel];
        var el = document.querySelector('[data-editable="' + CSS.escape(sel) + '"]');
        if (el && edit.type === 'text' && edit.html) {
          el.innerHTML = edit.html;
          el.setAttribute('data-edit-original', edit.html);
          el.classList.add('modified');
          pendingEdits[sel] = { html: edit.html, text: el.textContent, el: el };
        }
      });
      updateEditCount();
    } catch(e) {}
  }

  /* ── Auto-restore saved edits on ALL page loads ─────────── */
  function applyPersistedEdits() {
    var page = window.location.pathname.split('/').pop() || 'index.html';
    try {
      var allSaved = JSON.parse(localStorage.getItem(STORE_KEY) || '{}');
      var saved = allSaved[page] || {};
      if (Object.keys(saved).length === 0) return;
      /* Wait for content to render */
      setTimeout(function() {
        document.querySelectorAll('[data-editable]').forEach(function(el) {
          var sel = el.getAttribute('data-editable');
          if (saved[sel] && saved[sel].type === 'text' && saved[sel].html) {
            el.innerHTML = saved[sel].html;
          }
        });
      }, 500);
    } catch(e) {}
  }

  /* ── Init ───────────────────────────────────────────────── */
  function init() {
    if (!canEdit()) return;    /* Only show to admin roles */
    injectCSS();
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', function() {
        buildToolbar();
        applyPersistedEdits();
      });
    } else {
      buildToolbar();
      applyPersistedEdits();
    }
  }

  init();

})();
