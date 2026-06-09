/* ═══════════════════════════════════════════════════════════════
   SAGCO IMS — Document & Evidence Widget
   dms-widget.js  |  Rev.17  |  June 2026

   Usage: add  <script src="dms-widget.js"></script>  before </body>
   on any existing IMS page. Reads the shared localStorage store
   (key: sagco_dms_store) and shows only documents linked to the
   current page. All styling comes from style.css.
═══════════════════════════════════════════════════════════════ */

(function () {
  'use strict';
  var SK = 'sagco_dms_store';
  var HK = 'sagco_dms_hist';
  var RK = 'sagco_dms_role';

  function gAll()  { try { return JSON.parse(localStorage.getItem(SK)||'[]'); } catch(e){ return []; } }
  function sAll(a) { localStorage.setItem(SK, JSON.stringify(a)); }
  function gHist() { try { return JSON.parse(localStorage.getItem(HK)||'[]'); } catch(e){ return []; } }
  function sHist(a){ localStorage.setItem(HK, JSON.stringify(a)); }
  function gRole() { return sessionStorage.getItem(RK) || 'viewer'; }
  function canAdd(){ return ['contributor','editor','admin'].includes(gRole()); }
  function canEd() { return ['editor','admin'].includes(gRole()); }
  function isAdm() { return gRole() === 'admin'; }
  function logH(id,a,d){ var h=gHist(); h.push({docId:id,action:a,detail:d,user:gRole(),ts:new Date().toISOString()}); sHist(h); }
  function PAGE()  { return window.location.pathname.split('/').pop().replace('.html','') || 'index'; }
  function esc(s)  { return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

  function daysUntil(d){ return Math.ceil((new Date(d)-new Date())/86400000); }
  function revCls(d){ if(!d)return''; var n=daysUntil(d); if(n<0)return'dms-overdue'; if(n<90)return'dms-duesoon'; return''; }
  function revLbl(d){ if(!d)return'—'; var n=daysUntil(d); if(n<0)return d+' ⚠'; if(n<90)return d+' ('+n+'d)'; return d; }
  function sBadge(s){
    var m={'Active':'nb-grn','Under Review':'nb-amb','Superseded':'nb-blue','Obsolete':'nb-red','Archived':'nb-grey'};
    return '<span class="nb '+(m[s]||'nb-grey')+'">'+s+'</span>';
  }

  /* ── Build panel ──────────────────────────────────────────── */
  function buildPanel() {
    var page = PAGE();
    var docs = gAll().filter(function(d){ return !d.deleted && (d.pages||[]).includes(page); });
    var cnt  = docs.length;

    var html = '<div id="dms-widget">'
      + '<div class="dms-widget-hdr">'
      + '<h4>📄 Document & Evidence Register <span class="cnt" id="dw-cnt">'+cnt+'</span></h4>'
      + '<div style="display:flex;gap:6px;align-items:center">'
      + '<span class="role-pill" id="dw-role" title="Click to change role">● <span id="dw-rlbl">'+gRole()+'</span></span>'
      + (canAdd() ? '<button class="btn btn-gold btn-sm" id="dw-add">＋ Add</button>' : '')
      + '<a href="document-management.html" class="btn btn-ghost btn-sm" style="text-decoration:none">All Docs →</a>'
      + '</div>'
      + '</div>';

    if (!cnt) {
      html += '<div class="empty-state" style="padding:20px">'
        + '<strong>No documents linked to this page yet</strong>'
        + (canAdd() ? 'Click <b>＋ Add</b> to attach the first one.' : 'Documents linked to this page will appear here.')
        + '</div>';
    } else {
      html += '<div style="overflow-x:auto;max-height:280px;overflow-y:auto">'
        + '<table class="dms-tbl"><thead><tr>'
        + '<th>Doc Number</th><th>Title</th><th>Rev.</th><th>Type</th><th>Status</th>'
        + '<th>Review Due</th><th>Owner</th><th>Files</th><th>Actions</th>'
        + '</tr></thead><tbody id="dw-tbody">';
      docs.forEach(function(d) {
        var rc = revCls(d.reviewDue); var rl = revLbl(d.reviewDue);
        var fc = (d.files||[]).length;
        var fBadge = fc ? '<span class="nb nb-blue">'+fc+'</span>' : '<span class="muted">—</span>';
        var acts = '<button class="btn btn-teal btn-xs" data-a="view"  data-id="'+d.id+'">🔍</button>';
        if (canEd()) acts += '<button class="btn btn-navy btn-xs" data-a="edit"  data-id="'+d.id+'">✏️</button>';
        acts += '<button class="btn btn-ghost-dk btn-xs" data-a="files" data-id="'+d.id+'">📎</button>';
        html += '<tr data-id="'+d.id+'">'
          +'<td><span class="dms-num">'+esc(d.number)+'</span></td>'
          +'<td style="font-weight:600;white-space:normal">'+esc(d.title)+'</td>'
          +'<td style="text-align:center;font-weight:700">'+esc(d.rev)+'</td>'
          +'<td>'+esc(d.type)+'</td>'
          +'<td>'+sBadge(d.status)+'</td>'
          +'<td class="nowrap '+rc+'">'+rl+'</td>'
          +'<td class="nowrap">'+esc(d.owner||'—')+'</td>'
          +'<td>'+fBadge+'</td>'
          +'<td><div class="dms-actions">'+acts+'</div></td>'
          +'</tr>';
      });
      html += '</tbody></table></div>';
    }
    html += '</div>';
    return html;
  }

  /* ── Inject panel ─────────────────────────────────────────── */
  function inject() {
    var container = document.getElementById('dms-widget-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'dms-widget-container';
      var content = document.querySelector('.content');
      if (content) content.appendChild(container);
      else document.body.appendChild(container);
    }
    container.innerHTML = buildPanel();
    wirePanel();
  }

  /* ── Wire events ──────────────────────────────────────────── */
  function wirePanel() {
    var addBtn = document.getElementById('dw-add');
    if (addBtn) addBtn.addEventListener('click', function(){ openAddModal(); });

    var rp = document.getElementById('dw-role');
    if (rp) rp.addEventListener('click', function(){
      var r = prompt('Enter role: viewer / contributor / editor / admin\n(Current: '+gRole()+')', gRole());
      if (r && ['viewer','contributor','editor','admin'].includes(r.trim().toLowerCase())) {
        sessionStorage.setItem(RK, r.trim().toLowerCase());
        inject();
      }
    });

    document.querySelectorAll('#dms-widget [data-a]').forEach(function(btn) {
      btn.addEventListener('click', function(){
        var id = btn.dataset.id;
        var doc = gAll().find(function(d){ return d.id === id; });
        if (!doc) return;
        if (btn.dataset.a === 'view')  window.location.href = 'document-management.html';
        if (btn.dataset.a === 'files') openFilesModal(doc);
        if (btn.dataset.a === 'edit')  window.location.href = 'document-management.html';
      });
    });
  }

  /* ── Ensure overlay exists ────────────────────────────────── */
  function ensureOverlay() {
    if (!document.getElementById('dw-overlay')) {
      var ov = document.createElement('div');
      ov.id = 'dw-overlay';
      ov.className = 'dms-overlay';
      ov.innerHTML = '<div class="dms-modal" id="dw-modal"></div>';
      document.body.appendChild(ov);
      ov.addEventListener('click', function(e){ if(e.target.id==='dw-overlay') closeOv(); });
    }
  }
  function openOv(html) {
    ensureOverlay();
    document.getElementById('dw-modal').innerHTML = html;
    document.getElementById('dw-overlay').classList.add('open');
    var cl = document.querySelector('#dw-overlay .dms-modal-close');
    if (cl) cl.addEventListener('click', closeOv);
  }
  function closeOv() {
    var ov = document.getElementById('dw-overlay');
    if (ov) ov.classList.remove('open');
  }

  /* ── Quick add modal ──────────────────────────────────────── */
  function openAddModal() {
    var page = PAGE();
    openOv(
      '<div class="dms-modal-hdr"><h4>＋ Add Document — Link to this page</h4><button class="dms-modal-close">×</button></div>'
      +'<div class="dms-modal-body">'
      +'<div class="req-text">This document will be linked to page: <strong>'+page+'</strong>. '
      +'You can edit all details from <a href="document-management.html" style="color:var(--navy)">Document Management</a>.</div>'
      +'<div class="dms-field-row">'
        +'<div class="dms-field"><label>Document Title *</label><input id="qa-title" placeholder="e.g. CAPA Register"></div>'
        +'<div class="dms-field"><label>Document Number *</label><input id="qa-num" placeholder="e.g. L4-IMS-1000-R-01"></div>'
      +'</div>'
      +'<div class="dms-field-row">'
        +'<div class="dms-field"><label>Type</label><select id="qa-type">'
        +'<option>Register</option><option>Procedure</option><option>Policy</option>'
        +'<option>Record</option><option>Certificate</option><option>Report</option>'
        +'<option>Checklist</option><option>Form</option><option>Other</option>'
        +'</select></div>'
        +'<div class="dms-field"><label>Revision</label><input id="qa-rev" value="01" placeholder="01"></div>'
      +'</div>'
      +'<div class="dms-field-row">'
        +'<div class="dms-field"><label>Date of Issue</label><input type="date" id="qa-issued"></div>'
        +'<div class="dms-field"><label>Review Due</label><input type="date" id="qa-review"></div>'
      +'</div>'
      +'<div class="dms-field"><label>Document Owner</label><input id="qa-owner" placeholder="e.g. IMS Manager"></div>'
      +'</div>'
      +'<div class="dms-modal-ftr">'
        +'<button class="btn btn-ghost-dk" id="qa-cancel">Cancel</button>'
        +'<button class="btn btn-gold" id="qa-save">Add &amp; Link</button>'
      +'</div>'
    );
    document.getElementById('qa-cancel').addEventListener('click', closeOv);
    document.getElementById('qa-save').addEventListener('click', function(){
      var tv = document.getElementById('qa-title').value.trim();
      var nv = document.getElementById('qa-num').value.trim();
      if (!tv || !nv) { alert('Title and Number required.'); return; }
      var docs = gAll();
      var nums = docs.map(function(d){ return parseInt((d.id||'DOC-000').split('-')[1])||0; });
      var newId = 'DOC-' + String(Math.max.apply(null,[0].concat(nums))+1).padStart(3,'0');
      docs.push({
        id: newId, title:tv, number:nv,
        rev:  document.getElementById('qa-rev').value.trim()||'01',
        type: document.getElementById('qa-type').value,
        issued: document.getElementById('qa-issued').value,
        reviewDue: document.getElementById('qa-review').value,
        owner: document.getElementById('qa-owner').value.trim(),
        status:'Active', pages:[page], deleted:false, history:[], files:[],
        created: new Date().toISOString().split('T')[0]
      });
      sAll(docs);
      logH(newId,'ADDED','Quick-added from page: '+page);
      closeOv();
      inject();
    });
  }

  /* ── File attachments modal ───────────────────────────────── */
  function openFilesModal(doc) {
    var fileList = (doc.files||[]).slice();
    function buildList() {
      if (!fileList.length) return '<div style="padding:12px;color:var(--text-lt);font-size:11px;text-align:center">No files attached.</div>';
      return fileList.map(function(f,i){
        return '<div class="dms-attach-item">'
          +'<span class="fa-name">'+esc(f.name)+'</span>'
          +'<span class="fa-size">'+esc(f.size)+'</span>'
          +'<span class="fa-size muted">'+esc(f.date)+'</span>'
          +(canEd() ? '<span class="fa-del" data-fi="'+i+'">✕</span>' : '')
          +'</div>';
      }).join('');
    }
    openOv(
      '<div class="dms-modal-hdr"><h4>📎 Attachments — '+esc(doc.number)+'</h4><button class="dms-modal-close">×</button></div>'
      +'<div class="dms-modal-body">'
      +(canEd()
        ? '<div class="dms-attach-zone" id="dw-zone"><input type="file" id="dw-finp" style="display:none" multiple>'
          +'<div>📂 <strong>Click or drag files here</strong></div>'
          +'<div class="muted" style="font-size:10px;margin-top:4px">Any format accepted</div>'
          +'</div>'
        : '')
      +'<div id="dw-flist" style="margin-top:8px">'+buildList()+'</div>'
      +'</div>'
      +'<div class="dms-modal-ftr">'
      +(canEd() ? '<button class="btn btn-gold" id="dw-fsave">Save</button>' : '')
      +'<button class="btn btn-ghost-dk" id="dw-fcancel">Close</button>'
      +'</div>'
    );
    document.getElementById('dw-fcancel').addEventListener('click', closeOv);
    if (canEd()) {
      var zone = document.getElementById('dw-zone');
      var inp  = document.getElementById('dw-finp');
      zone.addEventListener('click', function(){ inp.click(); });
      zone.addEventListener('dragover',  function(e){ e.preventDefault(); zone.style.borderColor='var(--gold)'; });
      zone.addEventListener('dragleave', function(){ zone.style.borderColor=''; });
      zone.addEventListener('drop', function(e){ e.preventDefault(); zone.style.borderColor=''; addF(e.dataTransfer.files); });
      inp.addEventListener('change', function(){ addF(inp.files); });
      function addF(fls) {
        Array.from(fls).forEach(function(f){
          fileList.push({ name:f.name, size: f.size>1048576?(f.size/1048576).toFixed(1)+' MB':(f.size/1024).toFixed(0)+' KB', date: new Date().toISOString().split('T')[0], user:gRole() });
        });
        document.getElementById('dw-flist').innerHTML = buildList();
        wireDelF();
      }
      function wireDelF() {
        document.querySelectorAll('.fa-del[data-fi]').forEach(function(b){
          b.addEventListener('click', function(){ fileList.splice(parseInt(b.dataset.fi),1); document.getElementById('dw-flist').innerHTML=buildList(); wireDelF(); });
        });
      }
      wireDelF();
      document.getElementById('dw-fsave').addEventListener('click', function(){
        var docs = gAll();
        var d2 = docs.find(function(x){ return x.id===doc.id; });
        if (d2) { d2.files = fileList; sAll(docs); logH(doc.id,'FILES UPDATED', fileList.length+' file(s)'); }
        closeOv(); inject();
      });
    }
  }

  /* ── Auto-init ────────────────────────────────────────────── */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', inject);
  } else {
    inject();
  }

})();
