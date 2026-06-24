/* ═══════════════════════════════════════════════════════════════
   SAGCO IMS — Document & Evidence Widget
   dms-widget.js  |  Rev.18a  |  June 2026
   FIX: Attachment count bug — files uploaded at creation now
        populate d.files[] so count and modal display correctly.
═══════════════════════════════════════════════════════════════ */
(function () {
'use strict';
var HK = 'sagco_dms_hist';
var RK = 'sagco_dms_role';
var MAX_FILE_MB = 4;

/* ── Delegate storage to DMS_DATA (dms-data.js) ─────────────────
   dms-data.js is the single source of truth — reads/writes Google
   Sheets. The widget uses the same data layer as document-management.html
   so records are visible across ALL browsers and devices.
   If dms-data.js is not loaded, falls back to localStorage.
────────────────────────────────────────────────────────────────*/
/* ── Local files store ──────────────────────────────────────────
   DMS_DATA.cacheSet() strips files[] and versions[] (too large for
   Sheets). We keep them in a separate localStorage key so they
   survive DMS_DATA cache refreshes.
─────────────────────────────────────────────────────────────── */
var FILES_KEY = 'sagco_dms_files_v2';

function getLocalFiles() {
  try { return JSON.parse(localStorage.getItem(FILES_KEY)||'{}'); } catch(e){ return {}; }
}
function saveLocalFiles(docId, files, versions) {
  if (!files.length && !versions.length) return;
  var store = getLocalFiles();
  store[docId] = { files: files, versions: versions, ts: new Date().toISOString() };
  try { localStorage.setItem(FILES_KEY, JSON.stringify(store)); } catch(e){
    /* Quota — keep only last 20 docs */
    var keys = Object.keys(store).sort(function(a,b){
      return (store[a].ts||'') < (store[b].ts||'') ? -1 : 1;
    });
    while (keys.length > 20) { delete store[keys.shift()]; }
    try { localStorage.setItem(FILES_KEY, JSON.stringify(store)); } catch(e2){}
  }
}

function gAll() {
  /* Get metadata from DMS_DATA (Sheets-backed) */
  var docs = (typeof DMS_DATA !== 'undefined') ? DMS_DATA.cache() :
    (function(){ try{ return JSON.parse(localStorage.getItem('sagco_dms_v2')||'[]'); }catch(e){ return []; } })();
  /* Merge local files/versions back in */
  var lf = getLocalFiles();
  return docs.map(function(d) {
    var local = lf[d.id] || {};
    return Object.assign({}, d, {
      files:    (local.files    && local.files.length)    ? local.files    : (d.files    || []),
      versions: (local.versions && local.versions.length) ? local.versions : (d.versions || []),
    });
  });
}
function sAll(a) { /* no-op — DMS_DATA.saveDoc() handles persistence */ }
function savePageLink(docId, pages) { /* kept for compat — pages now in DMS_DATA */ }
function nextId() {
  if (typeof DMS_DATA !== 'undefined') return DMS_DATA.nextId();
  var nums = gAll().map(function(d){ return parseInt((d.id||'DOC-000').split('-')[1])||0; });
  return 'DOC-' + String(Math.max.apply(null,[0].concat(nums))+1).padStart(3,'0');
}
function gHist()  { try { return JSON.parse(localStorage.getItem(HK)||'[]'); } catch(e){ return []; } }
function sHist(a) { localStorage.setItem(HK, JSON.stringify(a)); }
function gRole()  { return sessionStorage.getItem(RK) || 'viewer'; }
function sRole(r) { sessionStorage.setItem(RK, r); }
function canAdd() { return ['contributor','editor','admin'].includes(gRole()); }
function canEd()  { return ['editor','admin'].includes(gRole()); }
function isAdm()  { return gRole() === 'admin'; }
function logH(id, action, detail) {
  var h = gHist();
  h.push({ docId:id, action:action, detail:detail, user:gRole(), ts:new Date().toISOString() });
  sHist(h);
}

function PAGE() { return window.location.pathname.split('/').pop().replace(/\.html$/i,'') || 'index'; }
function esc(s) { return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
function fileIcon(name) {
  var ext = (name||'').split('.').pop().toLowerCase();
  return {pdf:'📄',docx:'📝',doc:'📝',xlsx:'📊',xls:'📊',pptx:'📋',ppt:'📋',
          jpg:'🖼',jpeg:'🖼',png:'🖼',gif:'🖼',webp:'🖼',
          zip:'🗜',rar:'🗜',txt:'📃',csv:'📊',mp4:'🎥',mp3:'🎵'}[ext] || '📎';
}
function readFileAsDataUrl(file) {
  return new Promise(function(resolve, reject) {
    if (file.size / 1048576 > MAX_FILE_MB) { reject(new Error('"' + file.name + '" exceeds ' + MAX_FILE_MB + ' MB limit.')); return; }
    var r = new FileReader();
    r.onload  = function(e) { resolve(e.target.result); };
    r.onerror = function()  { reject(new Error('Could not read ' + file.name)); };
    r.readAsDataURL(file);
  });
}
function sBadge(s) {
  var m = {'Active':'nb-grn','Under Review':'nb-amb','Superseded':'nb-blue','Obsolete':'nb-red','Archived':'nb-grey'};
  return '<span class="nb '+(m[s]||'nb-grey')+'">'+s+'</span>';
}
function daysUntil(d) { return Math.ceil((new Date(d)-new Date())/86400000); }
function revCls(d) { if(!d)return''; var n=daysUntil(d); if(n<0)return'dms-overdue'; if(n<90)return'dms-duesoon'; return''; }
function revLbl(d) { if(!d)return'—'; var n=daysUntil(d); if(n<0)return d+' ⚠'; if(n<90)return d+' ('+n+'d)'; return d; }

/* ── Helper: build a local file entry object ─────────────── */
function mkLocalFile(id, fileName, dataUrl, date) {
  return {
    fileId: id, fileName: fileName, size: '', date: date,
    source: 'local', dataUrl: dataUrl,
    downloadLink: dataUrl, webViewLink: null
  };
}


function injectStyles() {
  if (document.getElementById('dms-w-styles')) return;
  var s = document.createElement('style');
  s.id = 'dms-w-styles';
  s.textContent = [
    '#dms-widget-container{margin-top:24px}',
    '#dms-widget{border:1px solid #d0d8e8;border-radius:var(--radius-lg,10px);overflow:hidden;box-shadow:var(--shadow,0 2px 10px rgba(0,0,0,.12))}',
    '.dw-hdr{background:var(--navy,#1B2A4A);color:#fff;padding:8px 14px;display:flex;align-items:center;justify-content:space-between;gap:8px}',
    '.dw-hdr-left{display:flex;align-items:center;gap:8px;font-size:11px;font-weight:700}',
    '.dw-cnt{background:var(--gold,#C9A84C);color:var(--navy,#1B2A4A);border-radius:8px;padding:1px 7px;font-size:9px;font-family:var(--mono,monospace);font-weight:700}',
    '.dw-hdr-right{display:flex;gap:5px;align-items:center}',
    '.dw-role{font-family:var(--mono,monospace);font-size:9px;font-weight:700;border-radius:8px;padding:2px 8px;border:1px solid rgba(255,255,255,.3);color:#fff;background:rgba(255,255,255,.12);cursor:pointer;white-space:nowrap}',
    '.dw-role:hover{background:rgba(255,255,255,.22)}',
    '.dw-tbl-wrap{overflow-x:auto;max-height:300px;overflow-y:auto}',
    '.dw-tbl{width:100%;border-collapse:collapse;font-size:10px;font-family:var(--font,Arial,sans-serif)}',
    '.dw-tbl th{background:var(--navy,#1B2A4A);color:#fff;font-size:9px;font-weight:700;padding:6px 9px;text-align:left;white-space:nowrap;position:sticky;top:0;z-index:1}',
    '.dw-tbl td{padding:6px 9px;border-bottom:1px solid #e8ecf3;vertical-align:middle}',
    '.dw-tbl tbody tr:nth-child(even) td{background:var(--g100,#EAF0F8)}',
    '.dw-tbl tbody tr:hover td{background:#dce6f5}',
    '.dw-overlay{display:none;position:fixed;inset:0;background:rgba(12,19,32,.6);z-index:9999;align-items:center;justify-content:center}',
    '.dw-overlay.open{display:flex}',
    '.dw-modal{background:#fff;border-radius:var(--radius-lg,10px);box-shadow:0 10px 40px rgba(0,0,0,.3);width:700px;max-width:96vw;max-height:92vh;overflow-y:auto;font-family:var(--font,Arial,sans-serif);font-size:13px}',
    '.dw-mhdr{background:var(--navy,#1B2A4A);color:#fff;padding:14px 20px;border-radius:var(--radius-lg,10px) var(--radius-lg,10px) 0 0;display:flex;justify-content:space-between;align-items:center}',
    '.dw-mhdr h4{font-size:13px;margin:0}',
    '.dw-mclose{background:none;border:none;color:#fff;font-size:20px;cursor:pointer;line-height:1;padding:0 2px}',
    '.dw-mbody{padding:18px}',
    '.dw-mftr{padding:12px 18px;border-top:1px solid #e8ecf3;display:flex;justify-content:flex-end;gap:8px;background:#f8fafc;border-radius:0 0 var(--radius-lg,10px) var(--radius-lg,10px)}',
    '.dw-field{margin-bottom:12px}',
    '.dw-field label{display:block;font-size:11px;font-weight:600;color:var(--navy,#1B2A4A);margin-bottom:4px}',
    '.dw-field input,.dw-field select,.dw-field textarea{width:100%;border:1px solid #c8d4e8;border-radius:5px;padding:7px 10px;font-family:var(--font,Arial,sans-serif);font-size:12px;outline:none;box-sizing:border-box}',
    '.dw-field input:focus,.dw-field select:focus,.dw-field textarea:focus{border-color:var(--gold,#C9A84C)}',
    '.dw-field-row{display:grid;grid-template-columns:1fr 1fr;gap:12px}',
    '.dw-req{color:var(--red,#B71C1C)}',
    '.dw-att-list{display:flex;flex-direction:column;gap:5px;margin-top:8px}',
    '.dw-att-item{display:flex;align-items:center;gap:7px;background:var(--g100,#EAF0F8);border:1px solid #d0d8e8;border-radius:5px;padding:6px 10px;font-size:11px}',
    '.dw-att-icon{font-size:15px;flex-shrink:0}',
    '.dw-att-name{flex:1;font-weight:600;color:var(--navy,#1B2A4A);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;min-width:0}',
    '.dw-att-meta{font-size:9px;color:var(--text-lt,#5A6478);white-space:nowrap;margin-left:auto}',
    '.dw-att-btn{display:inline-flex;align-items:center;gap:3px;font-size:9px;font-weight:600;color:var(--blue,#0D47A1);background:#e3f2fd;border:1px solid #90caf9;border-radius:4px;padding:2px 7px;cursor:pointer;white-space:nowrap;text-decoration:none;flex-shrink:0}',
    '.dw-att-btn:hover{background:#bbdefb}',
    '.dw-att-del{flex-shrink:0;color:var(--red,#B71C1C);cursor:pointer;font-weight:700;padding:2px 5px;border-radius:3px;font-size:11px}',
    '.dw-att-del:hover{background:#fdecea}',
    '.dw-dropzone{border:2px dashed #c8d4e8;border-radius:6px;padding:16px;text-align:center;color:var(--text-lt,#5A6478);font-size:11px;cursor:pointer;transition:border-color .15s,background .15s}',
    '.dw-dropzone:hover,.dw-dropzone.drag-over{border-color:var(--gold,#C9A84C);background:#fef9ed}',
    '.dw-dropzone strong{color:var(--navy,#1B2A4A)}',
    '.dw-uprog{font-size:10px;color:var(--text-lt,#5A6478);margin-top:5px;min-height:14px}',
    '.dw-ver-row{display:grid;grid-template-columns:52px 82px 1fr auto;align-items:center;gap:8px;padding:9px 12px;border-bottom:1px solid #edf0f5;font-size:11px}',
    '.dw-ver-row:hover{background:var(--g100,#EAF0F8)}',
    '.dw-ver-row.dw-active{background:#e8f5e9}',
    '.dw-ver-row.dw-active .dw-vnum::after{content:" ✓";color:var(--grn,#2E7D32);font-size:9px}',
    '.dw-vnum{font-family:var(--mono,monospace);font-weight:700;color:var(--navy,#1B2A4A);font-size:11px}',
    '.dw-vdate{font-size:10px;color:var(--text-lt,#5A6478);font-family:var(--mono,monospace)}',
    '.dw-vnote{color:var(--text,#1A2233);line-height:1.4}',
    '.dw-vnote small{display:block;font-size:9px;color:var(--text-lt,#5A6478);margin-top:1px}',
    '.dw-vdl{display:inline-flex;align-items:center;gap:3px;font-size:9px;font-weight:600;color:var(--blue,#0D47A1);background:#e3f2fd;border:1px solid #90caf9;border-radius:4px;padding:2px 7px;cursor:pointer;white-space:nowrap;text-decoration:none;margin:1px}',
    '.dw-vdl:hover{background:#bbdefb}',
    '.dw-vno{font-size:9px;color:var(--text-lt,#5A6478);font-style:italic}',
    '.dw-mtabs{display:flex;border-bottom:2px solid var(--g100,#EAF0F8);margin:0 -18px 14px;padding:0 18px}',
    '.dw-mtab{padding:7px 14px;font-size:11px;font-weight:600;cursor:pointer;color:var(--text-lt,#5A6478);border-bottom:2px solid transparent;margin-bottom:-2px}',
    '.dw-mtab:hover{color:var(--navy,#1B2A4A)}',
    '.dw-mtab.active{color:var(--navy,#1B2A4A);border-bottom-color:var(--gold,#C9A84C)}',
    '.dw-alert-amb{background:#fff8e1;border-left:3px solid var(--amb,#F9A825);border-radius:5px;padding:8px 12px;font-size:10px;color:#7a5800;margin-top:8px}',
    '.dw-empty{text-align:center;padding:20px;color:var(--text-lt,#5A6478);font-size:11px}',
    '#dms-w-toast{position:fixed;bottom:20px;right:20px;background:var(--navy,#1B2A4A);color:#fff;padding:9px 16px;border-radius:6px;font-size:12px;font-weight:600;box-shadow:0 4px 18px rgba(0,0,0,.25);z-index:99999;transform:translateY(60px);opacity:0;transition:transform .2s,opacity .2s;pointer-events:none}',
    '#dms-w-toast.show{transform:translateY(0);opacity:1}',
    '#dms-w-toast.t-ok{border-left:4px solid var(--grn,#2E7D32)}',
    '#dms-w-toast.t-err{border-left:4px solid var(--red,#B71C1C)}',
  ].join('\n');
  document.head.appendChild(s);
}

function toast(msg, type) {
  var el = document.getElementById('dms-w-toast');
  if (!el) { el = document.createElement('div'); el.id = 'dms-w-toast'; document.body.appendChild(el); }
  el.textContent = msg;
  el.className = 'show t-' + (type||'ok');
  clearTimeout(el._t);
  el._t = setTimeout(function(){ el.className = ''; }, 3500);
}

function ensureOverlay() {
  var ov = document.getElementById('dms-w-overlay');
  if (!ov) {
    ov = document.createElement('div');
    ov.id = 'dms-w-overlay';
    ov.className = 'dw-overlay';
    ov.innerHTML = '<div class="dw-modal" id="dms-w-modal"></div>';
    document.body.appendChild(ov);
    ov.addEventListener('click', function(e){ if (e.target === ov) closeOv(); });
  }
  return ov;
}
function openOv(html) {
  ensureOverlay();
  document.getElementById('dms-w-modal').innerHTML = html;
  document.getElementById('dms-w-overlay').classList.add('open');
  var cl = document.querySelector('#dms-w-modal .dw-mclose');
  if (cl) cl.addEventListener('click', closeOv);
}
function closeOv() {
  var ov = document.getElementById('dms-w-overlay');
  if (ov) ov.classList.remove('open');
}

function renderWidget() {
  var page = PAGE();
  var docs = gAll().filter(function(d){ return !d.deleted && (d.pages||[]).includes(page); });
  var cnt  = docs.length;
  var html = '<div id="dms-widget">'
    + '<div class="dw-hdr">'
    +   '<div class="dw-hdr-left">📄 Document &amp; Evidence Register <span class="dw-cnt">'+cnt+'</span></div>'
    +   '<div class="dw-hdr-right">'
    +     '<span class="dw-role" id="dw-role-pill" title="Click to change role">● <span id="dw-rlbl">'+gRole()+'</span></span>'
    +     (canAdd() ? '<button class="btn btn-gold btn-sm" id="dw-qkadd">＋ Add</button>' : '')
    +     '<a href="document-management.html" class="btn btn-ghost btn-sm" style="text-decoration:none">All Docs →</a>'
    +   '</div>'
    + '</div>';
  if (!cnt) {
    html += '<div class="dw-empty">'
      + '<strong style="display:block;color:var(--navy,#1B2A4A);margin-bottom:4px">No documents linked to this page yet</strong>'
      + (canAdd()
          ? 'Click <b>＋ Add</b> to attach the first document, or link existing documents from <a href="document-management.html">Document Management</a>.'
          : 'Documents linked to this page will appear here.')
      + '</div>';
  } else {
    html += '<div class="dw-tbl-wrap"><table class="dw-tbl">'
      + '<thead><tr>'
      + '<th>Doc No.</th><th>Title</th><th style="text-align:center">Rev.</th>'
      + '<th>Type</th><th>Status</th><th>Review Due</th><th>Owner</th>'
      + '<th style="text-align:center">Files</th><th style="text-align:center">Vers.</th>'
      + '<th>Actions</th>'
      + '</tr></thead><tbody>';
    docs.forEach(function(d) {
      var rc  = revCls(d.reviewDue);
      var rl  = revLbl(d.reviewDue);
      /* FIX: count files from d.files[] AND version entries that have a dataUrl */
      var fc  = (d.files||[]).length;
      var vc  = (d.versions||[]).length;
      var fBadge = fc ? '<span class="nb nb-blue">'+fc+'</span>' : '<span class="muted">—</span>';
      var vBadge = vc ? '<span class="nb nb-gold">'+vc+'</span>' : '<span class="muted">—</span>';
      var acts = '<button class="btn btn-teal btn-xs" data-wa="view" data-wid="'+d.id+'" title="View details">🔍</button>';
      if (canEd()) acts += '<button class="btn btn-navy btn-xs" data-wa="edit" data-wid="'+d.id+'" title="Edit metadata">✏️</button>';
      acts += '<button class="btn btn-ghost-dk btn-xs" data-wa="attach" data-wid="'+d.id+'" title="Attachments">📎</button>';
      acts += '<button class="btn btn-ghost-dk btn-xs" data-wa="version" data-wid="'+d.id+'" title="Version history">📋</button>';
      if (isAdm()) acts += '<button class="btn btn-red btn-xs" data-wa="del" data-wid="'+d.id+'" title="Move to bin">🗑</button>';
      html += '<tr>'
        + '<td><span class="dms-num">'+esc(d.number)+'</span></td>'
        + '<td style="font-weight:600;white-space:normal;max-width:200px">'+esc(d.title)+'</td>'
        + '<td style="text-align:center;font-family:var(--mono,monospace);font-weight:700">'+esc(d.rev)+'</td>'
        + '<td>'+esc(d.type)+'</td>'
        + '<td>'+sBadge(d.status)+'</td>'
        + '<td class="nowrap '+rc+'">'+rl+'</td>'
        + '<td class="nowrap">'+esc(d.owner||'—')+'</td>'
        + '<td style="text-align:center">'+fBadge+'</td>'
        + '<td style="text-align:center">'+vBadge+'</td>'
        + '<td><div class="dms-actions">'+acts+'</div></td>'
        + '</tr>';
    });
    html += '</tbody></table></div>';
  }
  html += '</div>';
  var container = document.getElementById('dms-widget-container');
  container.innerHTML = html;
  container.querySelectorAll('[data-wa]').forEach(function(btn) {
    btn.addEventListener('click', function() { dispatch(btn.dataset.wa, btn.dataset.wid); });
  });
  var rp = document.getElementById('dw-role-pill');
  if (rp) rp.addEventListener('click', promptRole);
  var qa = document.getElementById('dw-qkadd');
  if (qa) qa.addEventListener('click', function(){ openQuickAdd(); });
}

function dispatch(action, id) {
  var doc = gAll().find(function(d){ return d.id === id; });
  if (!doc) return;
  if (action === 'view')    openViewModal(doc);
  if (action === 'edit')    openEditModal(doc);
  if (action === 'attach')  openAttachModal(doc);
  if (action === 'version') openVersionModal(doc);
  if (action === 'del')     softDel(id);
}

function softDel(id) {
  if (!confirm('Move to Recycle Bin? It can be restored from Document Management.')) return;
  var docs = gAll(), d = docs.find(function(x){ return x.id===id; });
  if (d) {
    d.deleted=true; d.deletedAt=new Date().toISOString().split('T')[0];
    if (typeof DMS_DATA !== 'undefined') DMS_DATA.saveDoc(d);
    var lf=getLocalFiles(); delete lf[id];
    try{localStorage.setItem(FILES_KEY,JSON.stringify(lf));}catch(e){}
    logH(id,'ARCHIVED','Moved to bin'); renderWidget(); toast('Moved to Recycle Bin','ok');
  }
}

function promptRole() {
  var r = prompt('Enter role:\n  viewer / contributor / editor / admin\n\nCurrent: '+gRole(), gRole());
  var valid = ['viewer','contributor','editor','admin'];
  if (r && valid.includes(r.trim().toLowerCase())) {
    sRole(r.trim().toLowerCase()); renderWidget(); toast('Role: '+gRole(),'ok');
  } else if (r !== null) { toast('Invalid role.','err'); }
}

function openViewModal(doc) {
  var rows = [
    ['Document Number', '<span class="dms-num">'+esc(doc.number)+'</span>'],
    ['Title',           '<strong>'+esc(doc.title)+'</strong>'],
    ['Current Revision','<span style="font-family:var(--mono,monospace);font-weight:700">Rev. '+esc(doc.rev)+'</span>'],
    ['Type',            esc(doc.type||'—')],
    ['Status',          sBadge(doc.status)],
    ['Date of Issue',   esc(doc.issued||'—')],
    ['Review Due',      '<span class="'+revCls(doc.reviewDue)+'">'+revLbl(doc.reviewDue)+'</span>'],
    ['Owner',           esc(doc.owner||'—')],
    ['Attachments',     (doc.files||[]).length+' file(s)'],
    ['Versions on record', (doc.versions||[]).length],
  ];
  openOv(
    '<div class="dw-mhdr"><h4>🔍 '+esc(doc.id)+' — '+esc(doc.title)+'</h4><button class="dw-mclose">×</button></div>'
    +'<div class="dw-mbody" style="padding:0"><table style="width:100%;border-collapse:collapse">'
    +rows.map(function(r){
      return '<tr><td style="width:140px;font-size:10px;font-weight:600;color:var(--navy,#1B2A4A);padding:7px 14px;border-bottom:1px solid #f0f3f9;vertical-align:top">'+r[0]+'</td>'
        +'<td style="font-size:11px;padding:7px 14px;border-bottom:1px solid #f0f3f9">'+r[1]+'</td></tr>';
    }).join('')
    +'</table></div>'
    +'<div class="dw-mftr">'
    +(canEd() ? '<button class="btn btn-navy" id="wv-edit">✏️ Edit</button>' : '')
    +'<button class="btn btn-ghost-dk" id="wv-att">📎 Attachments</button>'
    +'<button class="btn btn-ghost-dk" id="wv-ver">📋 Versions</button>'
    +'<button class="btn btn-gold" id="wv-close">Close</button>'
    +'</div>'
  );
  document.getElementById('wv-close').addEventListener('click', closeOv);
  document.getElementById('wv-att').addEventListener('click', function(){ closeOv(); openAttachModal(doc); });
  document.getElementById('wv-ver').addEventListener('click', function(){ closeOv(); openVersionModal(doc); });
  if (canEd()) document.getElementById('wv-edit').addEventListener('click', function(){ closeOv(); openEditModal(doc); });
}

var TYPES    = ['Procedure','Policy','Register','Record','Certificate','Report','Checklist','Form','Monitoring Log','Drawing','Specification','Image','Other'];
var STATUSES = ['Active','Under Review','Superseded','Obsolete','Archived'];

function openEditModal(doc) {
  var isNew = !doc;
  var d = doc || { id:nextId(), pages:[PAGE()], files:[], versions:[], status:'Active', type:'Register' };
  var typeOpts   = TYPES.map(function(t){ return '<option'+(d.type===t?' selected':'')+'>'+t+'</option>'; }).join('');
  var statusOpts = STATUSES.map(function(s){ return '<option'+(d.status===s?' selected':'')+'>'+s+'</option>'; }).join('');
  openOv(
    '<div class="dw-mhdr"><h4>'+(isNew?'＋ Add Document':'✏️ Edit — '+esc(d.id))+'</h4><button class="dw-mclose">×</button></div>'
    +'<div class="dw-mbody">'
    +'<div class="dw-field-row">'
      +'<div class="dw-field"><label>Title <span class="dw-req">*</span></label><input id="we-title" value="'+esc(d.title||'')+'" placeholder="e.g. CAPA Register"></div>'
      +'<div class="dw-field"><label>Document Number <span class="dw-req">*</span></label><input id="we-num" value="'+esc(d.number||'')+'" placeholder="e.g. L4-IMS-1000-R-01"></div>'
    +'</div>'
    +'<div class="dw-field-row">'
      +'<div class="dw-field"><label>Revision <span class="dw-req">*</span></label><input id="we-rev" value="'+esc(d.rev||'01')+'" placeholder="01" style="width:100px"></div>'
      +'<div class="dw-field"><label>Type</label><select id="we-type">'+typeOpts+'</select></div>'
    +'</div>'
    +'<div class="dw-field-row">'
      +'<div class="dw-field"><label>Date of Issue</label><input type="date" id="we-issued" value="'+esc(d.issued||'')+'"></div>'
      +'<div class="dw-field"><label>Review Due</label><input type="date" id="we-review" value="'+esc(d.reviewDue||'')+'"></div>'
    +'</div>'
    +'<div class="dw-field-row">'
      +'<div class="dw-field"><label>Owner</label><input id="we-owner" value="'+esc(d.owner||'')+'" placeholder="e.g. IMS Manager"></div>'
      +'<div class="dw-field"><label>Status</label><select id="we-status">'+statusOpts+'</select></div>'
    +'</div>'
    +'<div class="dw-field"><label>Linked Pages <span style="font-weight:400;color:var(--text-lt,#5A6478)">(comma-separated, no .html)</span></label>'
      +'<input id="we-pages" value="'+esc((d.pages||[]).join(', '))+'" placeholder="hira, sea-register"></div>'
    +(isNew
      ? '<div class="dw-field" style="background:#f8fafc;border:1px solid #e8ecf3;border-radius:5px;padding:10px">'
          +'<label>Upload First Version File <span style="font-weight:400;color:var(--text-lt,#5A6478)">(optional, max '+MAX_FILE_MB+' MB)</span></label>'
          +'<input type="file" id="we-firstfile" style="margin-top:6px;font-size:11px">'
          +'<div class="dw-uprog" id="we-fprog"></div>'
        +'</div>'
      : '<div class="dw-field"><label>Revision Note</label><textarea id="we-note" rows="2" placeholder="Describe what changed…"></textarea></div>'
    )
    +'</div>'
    +'<div class="dw-mftr">'
      +'<button class="btn btn-ghost-dk" id="we-cancel">Cancel</button>'
      +'<button class="btn btn-gold" id="we-save">'+(isNew?'Add Document':'Save Changes')+'</button>'
    +'</div>'
  );
  document.getElementById('we-cancel').addEventListener('click', closeOv);
  document.getElementById('we-save').addEventListener('click', function() {
    var tv = document.getElementById('we-title').value.trim();
    var nv = document.getElementById('we-num').value.trim();
    if (!tv||!nv) { toast('Title and Document Number are required.','err'); return; }
    var revVal = document.getElementById('we-rev').value.trim() || '01';
    var note   = (document.getElementById('we-note')||{value:''}).value.trim();

    function doSave(dataUrl, fileName, driveFile) {
      var docs = gAll(), idx = docs.findIndex(function(x){ return x.id===d.id; });
      var finalFileName = driveFile ? driveFile.fileName : (fileName||null);
      var newVer = { rev:revVal, ts:new Date().toISOString().split('T')[0],
                     note:isNew?'Initial issue':(note||'Metadata updated'), user:gRole(),
                     fileName:  finalFileName,
                     dataUrl:   driveFile ? null : (dataUrl||null),
                     webViewLink:  driveFile ? driveFile.webViewLink  : null,
                     downloadLink: driveFile ? driveFile.downloadLink : (dataUrl||null) };
      var existVer = d.versions||[];
      var latestRev = existVer.length ? existVer[0].rev : '';
      var versionsUpd = (isNew||revVal!==latestRev||dataUrl||driveFile) ? [newVer].concat(existVer) : existVer;
      /* Build files[] — Drive file takes priority over base64 */
      var filesUpd = d.files || [];
      if (isNew) {
        if (driveFile) { filesUpd = [driveFile]; }
        else if (dataUrl && fileName) { filesUpd = [mkLocalFile(d.id+'-v1', fileName, dataUrl, newVer.ts)]; }
      }
      var upd = Object.assign({}, d, {
        title:tv, number:nv, rev:revVal,
        type:   document.getElementById('we-type').value,
        issued: document.getElementById('we-issued').value,
        reviewDue: document.getElementById('we-review').value,
        owner:  document.getElementById('we-owner').value.trim(),
        status: document.getElementById('we-status').value,
        pages:  document.getElementById('we-pages').value.split(',').map(function(p){return p.trim();}).filter(Boolean),
        versions: versionsUpd, files: filesUpd,
      });
      if (idx>=0) docs[idx]=upd; else docs.push(upd);
      /* Persist files/versions locally before DMS_DATA strips them */
      saveLocalFiles(upd.id, upd.files||[], upd.versions||[]);
      if (typeof DMS_DATA !== 'undefined') {
        DMS_DATA.saveDoc(upd);
      }
      logH(d.id, isNew?'ADDED':'EDITED', note||'Saved');
      closeOv(); renderWidget();
      toast(isNew?'Document added.':'Changes saved.','ok');
    }

    if (isNew) {
      var fi = document.getElementById('we-firstfile');
      var f  = fi&&fi.files&&fi.files[0] ? fi.files[0] : null;
      if (f) {
        var prog2 = document.getElementById('we-fprog');
        if (typeof DMS_DRIVE !== 'undefined' && DMS_DRIVE.isConfigured()) {
          prog2.textContent = 'Opening upload window…';
          var who2 = (typeof IMS_AUTH !== 'undefined' && IMS_AUTH.getUser()) ? IMS_AUTH.getUser().username : gRole();
          DMS_DRIVE.uploadFile(f, d.id, 'attachment', 'Initial upload', who2)
            .then(function(fileData) {
              prog2.textContent = 'Uploaded to Drive ✓';
              doSave(null, null, fileData);
            })
            .catch(function(e) {
              prog2.textContent = 'Drive upload cancelled — saving locally…';
              readFileAsDataUrl(f).then(function(du){ doSave(du, f.name, null); })
                .catch(function(e2){ toast(e2.message,'err'); prog2.textContent=''; });
            });
        } else {
          prog2.textContent = 'Reading…';
          readFileAsDataUrl(f).then(function(du){ doSave(du, f.name, null); })
            .catch(function(e){ toast(e.message,'err'); prog2.textContent=''; });
        }
      } else { doSave(null, null, null); }
    } else { doSave(null, null, null); }
  });
}

function openQuickAdd() {
  var page = PAGE();
  var typeOpts = TYPES.map(function(t){ return '<option'+(t==='Register'?' selected':'')+'>'+t+'</option>'; }).join('');
  openOv(
    '<div class="dw-mhdr"><h4>＋ Add Document — linked to <em>'+esc(page)+'</em></h4><button class="dw-mclose">×</button></div>'
    +'<div class="dw-mbody">'
    +'<div style="font-size:10px;background:var(--g100,#EAF0F8);border-left:3px solid var(--gold,#C9A84C);border-radius:0 5px 5px 0;padding:7px 12px;margin-bottom:12px;color:var(--text-lt,#5A6478)">'
      +'This document will be automatically linked to the current page (<strong>'+esc(page)+'</strong>). '
      +'You can add additional page links and full details from <a href="document-management.html" style="color:var(--navy,#1B2A4A);font-weight:600">Document Management</a>.'
    +'</div>'
    +'<div class="dw-field-row">'
      +'<div class="dw-field"><label>Title <span class="dw-req">*</span></label><input id="qa-title" placeholder="e.g. HIRA Furnace Operations Rev.02"></div>'
      +'<div class="dw-field"><label>Document Number <span class="dw-req">*</span></label><input id="qa-num" placeholder="e.g. L4-SHEE-PR-01-R-01"></div>'
    +'</div>'
    +'<div class="dw-field-row">'
      +'<div class="dw-field"><label>Type</label><select id="qa-type">'+typeOpts+'</select></div>'
      +'<div class="dw-field"><label>Revision</label><input id="qa-rev" value="01" placeholder="01" style="width:80px"></div>'
    +'</div>'
    +'<div class="dw-field-row">'
      +'<div class="dw-field"><label>Date of Issue</label><input type="date" id="qa-issued" value="'+new Date().toISOString().split('T')[0]+'"></div>'
      +'<div class="dw-field"><label>Owner</label><input id="qa-owner" placeholder="e.g. SHEE Head"></div>'
    +'</div>'
    +'<div class="dw-field" style="background:#f8fafc;border:1px solid #e8ecf3;border-radius:5px;padding:10px">'
      +'<label>Upload Document File <span style="font-weight:400;color:var(--text-lt,#5A6478)">(optional, max '+MAX_FILE_MB+' MB)</span></label>'
      +'<input type="file" id="qa-file" style="margin-top:6px;font-size:11px">'
      +'<div class="dw-uprog" id="qa-fprog"></div>'
    +'</div>'
    +'</div>'
    +'<div class="dw-mftr">'
      +'<button class="btn btn-ghost-dk" id="qa-cancel">Cancel</button>'
      +'<button class="btn btn-gold" id="qa-save">Add &amp; Link to this page</button>'
    +'</div>'
  );
  document.getElementById('qa-cancel').addEventListener('click', closeOv);
  document.getElementById('qa-save').addEventListener('click', function() {
    var tv = document.getElementById('qa-title').value.trim();
    var nv = document.getElementById('qa-num').value.trim();
    if (!tv||!nv) { toast('Title and Number are required.','err'); return; }
    var revVal = document.getElementById('qa-rev').value.trim()||'01';
    var fi = document.getElementById('qa-file');
    var f  = fi&&fi.files&&fi.files[0] ? fi.files[0] : null;

    function doAdd(dataUrl, fileName, driveFile) {
      var newId = nextId();
      var docs  = gAll();
      var today = new Date().toISOString().split('T')[0];
      var finalFileName = driveFile ? driveFile.fileName : (fileName||null);
      var newVer = { rev:revVal, ts:today, note:'Initial issue', user:gRole(),
                     fileName:finalFileName,
                     dataUrl:  driveFile ? null : (dataUrl||null),
                     webViewLink:  driveFile ? driveFile.webViewLink  : null,
                     downloadLink: driveFile ? driveFile.downloadLink : (dataUrl||null) };
      /* Build files[] — Drive file takes priority over base64 */
      var initFiles = driveFile
        ? [driveFile]  /* Drive: shared across all browsers */
        : (dataUrl && fileName)
          ? [mkLocalFile(newId+'-v1', fileName, dataUrl, today)]
          : [];
      docs.push({
        id:newId, title:tv, number:nv, rev:revVal,
        type:   document.getElementById('qa-type').value,
        issued: document.getElementById('qa-issued').value,
        reviewDue:'', owner:document.getElementById('qa-owner').value.trim(),
        status:'Active', pages:[page], deleted:false,
        files: initFiles,      /* FIX 1 — was always [] */
        versions:[newVer],
        created:today,
      });
      var newDoc = docs[docs.length-1];
      /* Persist files/versions locally before DMS_DATA strips them */
      saveLocalFiles(newDoc.id, newDoc.files||[], newDoc.versions||[]);
      if (typeof DMS_DATA !== 'undefined') {
        DMS_DATA.saveDoc(newDoc);
      }
      logH(newId,'ADDED','Quick-added from page: '+page);
      closeOv(); renderWidget();
      toast('Document added and linked to this page.','ok');
    }

    if (f) {
      var prog = document.getElementById('qa-fprog');
      if (typeof DMS_DRIVE !== 'undefined' && DMS_DRIVE.isConfigured()) {
        /* Upload to Google Drive via popup — shared across all browsers */
        prog.textContent = 'Opening upload window…';
        var tempId = nextId(); /* tentative ID for Drive folder */
        var who = (typeof IMS_AUTH !== 'undefined' && IMS_AUTH.getUser()) ? IMS_AUTH.getUser().username : gRole();
        DMS_DRIVE.uploadFile(f, tempId, 'attachment', 'Initial upload', who)
          .then(function(fileData) {
            prog.textContent = 'Uploaded to Drive ✓';
            doAdd(null, null, fileData); /* pass Drive file metadata */
          })
          .catch(function(e) {
            /* User cancelled popup or Drive failed — fall back to base64 */
            prog.textContent = 'Drive upload cancelled — saving locally…';
            readFileAsDataUrl(f).then(function(du){ doAdd(du, f.name, null); })
              .catch(function(e2){ toast(e2.message,'err'); prog.textContent=''; });
          });
      } else {
        /* No Drive configured — store base64 locally */
        prog.textContent = 'Reading…';
        readFileAsDataUrl(f).then(function(du){ doAdd(du, f.name, null); })
          .catch(function(e){ toast(e.message,'err'); prog.textContent=''; });
      }
    } else { doAdd(null, null, null); }
  });
}

function openAttachModal(doc) {
  var driveAvail = typeof DMS_DRIVE !== 'undefined';

  function loadAndRender() {
    var el = document.getElementById('w-att-list');
    if (el) el.innerHTML = '<div class="dw-empty">⏳ Loading…</div>';
    /* ── FIX 3: always include locally stored files from d.files[] ── */
    var localFiles = (doc.files||[]).map(function(f){ return Object.assign({source:'local'}, f); });
    var promise = driveAvail ? DMS_DRIVE.listFiles(doc.id) : Promise.resolve({files:[]});
    promise.then(function(result) {
      /* Merge Drive files with local files — deduplicate by fileId */
      var driveFiles = (result.files||[]).map(function(f){ return Object.assign({source:'drive'}, f); });
      var driveIds   = driveFiles.map(function(f){ return f.fileId; });
      var localOnly  = localFiles.filter(function(f){ return !driveIds.includes(f.fileId); });
      var files      = driveFiles.concat(localOnly);
      if (el) { el.innerHTML = buildList(files); wireDelBtns(files); wireOpenBtns(files); }
    }).catch(function() {
      /* Drive failed — show local files only */
      if (el) { el.innerHTML = buildList(localFiles); wireDelBtns(localFiles); wireOpenBtns(localFiles); }
    });
  }

  function buildList(files) {
    if (!files.length) return '<div class="dw-empty">No supporting files attached yet.</div>';
    return '<div class="dw-att-list">'
      + files.map(function(f){
          var fname = f.fileName || f.name || 'file';
          /* Open: use blob URL so browser previews instead of downloading */
          function openLocal(dataUrl, name) {
            try {
              var arr = dataUrl.split(','), mime = arr[0].match(/:(.*?);/)[1];
              var bstr = atob(arr[1]), n = bstr.length, u8 = new Uint8Array(n);
              while(n--){ u8[n] = bstr.charCodeAt(n); }
              var blob = new Blob([u8], {type: mime});
              var url  = URL.createObjectURL(blob);
              var win  = window.open(url, '_blank');
              /* Revoke after short delay so tab has time to load */
              setTimeout(function(){ URL.revokeObjectURL(url); }, 10000);
              if (!win) { /* popup blocked — fall back to direct open */
                var a = document.createElement('a');
                a.href = url; a.target = '_blank'; a.click();
              }
            } catch(e) {
              /* Fallback: open dataUrl directly */
              window.open(dataUrl, '_blank');
            }
          }
          var fid_key = esc(f.fileId||'');
          var viewHtml = f.webViewLink
            ? '<a class="dw-att-btn" href="'+esc(f.webViewLink)+'" target="_blank">↗ Open</a>'
              +'<a class="dw-att-btn" href="'+esc(f.downloadLink)+'" target="_blank">⬇ Download</a>'
            : (f.downloadLink
                ? '<button class="dw-att-btn" data-open-fid="'+fid_key+'">↗ Open</button>'
                  +'<a class="dw-att-btn" href="'+esc(f.downloadLink)+'" download="'+esc(fname)+'">⬇ Download</a>'
                : '<span class="dw-att-btn" style="opacity:.5;cursor:default">no link</span>');
          var src = (f.source==='drive')
            ? '<span style="font-size:8px;color:#2E7D32"> ☁</span>'
            : '<span style="font-size:8px;color:#F9A825"> 💾</span>';
          return '<div class="dw-att-item">'
            +'<span class="dw-att-icon">'+fileIcon(fname)+'</span>'
            +'<span class="dw-att-name" title="'+esc(fname)+'">'+esc(fname)+src+'</span>'
            +'<span class="dw-att-meta">'+esc(f.size||'')+'&nbsp;·&nbsp;'+esc(f.date||f.uploadedDate||'')+'</span>'
            +viewHtml
            +(canEd() ? '<span class="dw-att-del" data-fid="'+esc(f.fileId)+'" title="Remove">✕</span>' : '')
            +'</div>';
        }).join('')
      +'</div>';
  }

  /* Previewable MIME types — browser renders inline */
  var PREVIEW_TYPES = ['application/pdf','image/jpeg','image/png','image/gif',
                       'image/webp','image/svg+xml','text/plain','text/html',
                       'video/mp4','audio/mpeg'];

  function wireOpenBtns(files) {
    document.querySelectorAll('button[data-open-fid]').forEach(function(btn) {
      btn.addEventListener('click', function() {
        var fid  = btn.getAttribute('data-open-fid');
        var file = files.find(function(f){ return String(f.fileId||'') === String(fid||''); });
        if (!file || !file.downloadLink) return;
        var dataUrl = file.downloadLink;
        try {
          var arr  = dataUrl.split(',');
          var mime = arr[0].match(/:(.*?);/)[1];
          var bstr = atob(arr[1]), n = bstr.length, u8 = new Uint8Array(n);
          while(n--){ u8[n] = bstr.charCodeAt(n); }
          var blob = new Blob([u8], {type: mime});
          var url  = URL.createObjectURL(blob);
          /* For non-previewable types (DOCX, XLSX etc) use an <a> click
             so the browser opens with the associated app rather than
             showing a save dialog */
          if (!PREVIEW_TYPES.includes(mime)) {
            var a = document.createElement('a');
            a.href = url; a.target = '_blank'; a.rel = 'noopener';
            document.body.appendChild(a); a.click();
            document.body.removeChild(a);
          } else {
            window.open(url, '_blank');
          }
          setTimeout(function(){ URL.revokeObjectURL(url); }, 15000);
        } catch(e) {
          window.open(dataUrl, '_blank');
        }
      });
    });
  }

  function wireDelBtns(files) {
    document.querySelectorAll('.dw-att-del[data-fid]').forEach(function(btn) {
      btn.addEventListener('click', function() {
        if (!confirm('Remove this file? This cannot be undone.')) return;
        var fid = btn.dataset.fid;
        /* Remove from d.files[] in localStorage */
        var docs = gAll(), d2 = docs.find(function(x){ return x.id===doc.id; });
        if (d2) {
          d2.files = (d2.files||[]).filter(function(f){ return f.fileId !== fid; });
          sAll(docs);
          doc = d2;
        }
        var promise = driveAvail ? DMS_DRIVE.deleteFile(fid, doc.id) : Promise.resolve({ok:true});
        promise.then(function() { loadAndRender(); renderWidget(); toast('Removed.','ok'); })
               .catch(function(e){ toast(e.message,'err'); });
      });
    });
  }

  var maxMb = driveAvail ? (DMS_DRIVE.isConfigured() ? 20 : 4) : 4;
  var storageDesc = (driveAvail && DMS_DRIVE.isConfigured())
    ? '☁ Files upload to <strong>Google Drive</strong> — visible to all users on all devices.'
    : '⚠ <strong>Local mode</strong> — Google Drive not configured. Files visible in this browser only.';

  openOv(
    '<div class="dw-mhdr"><h4>📎 Attachments — '+esc(doc.number)+'</h4><button class="dw-mclose">×</button></div>'
    +'<div class="dw-mbody">'
    +(!canEd()
      ? '<div style="background:#fff8e1;border-left:3px solid #F9A825;border-radius:0 5px 5px 0;padding:8px 12px;margin-bottom:10px;font-size:11px;color:#7a5800">'
          +'🔒 <strong>Upload disabled — role: '+gRole()+'</strong> — need editor or admin. Click the role pill to change.'
        +'</div>'
      : '')
    +'<div style="font-size:10px;background:#EAF0F8;border-left:3px solid #C9A84C;border-radius:0 5px 5px 0;padding:7px 12px;margin-bottom:12px;color:#5A6478">'+storageDesc+' Max '+maxMb+' MB/file.</div>'
    +(canEd()
      ? '<div class="dw-dropzone" id="w-dz">'
          +'<input type="file" id="w-fi" style="display:none" multiple>'
          +'<div>📂 <strong>Click to select files</strong> or drag and drop</div>'
          +'<div style="margin-top:4px;font-size:10px">PDF · DOCX · XLSX · JPG · PNG · any format</div>'
          +'<div class="dw-uprog" id="w-prog"></div>'
        +'</div>'
      : '')
    +'<div id="w-att-list" style="margin-top:10px"></div>'
    +'</div>'
    +'<div class="dw-mftr"><button class="btn btn-ghost-dk" id="w-att-cancel">Close</button></div>'
  );
  document.getElementById('w-att-cancel').addEventListener('click', closeOv);
  loadAndRender();

  if (canEd()) {
    var zone = document.getElementById('w-dz');
    var inp  = document.getElementById('w-fi');
    zone.addEventListener('click', function(e){ if(e.target!==inp) inp.click(); });
    zone.addEventListener('dragover',  function(e){ e.preventDefault(); zone.classList.add('drag-over'); });
    zone.addEventListener('dragleave', function()  { zone.classList.remove('drag-over'); });
    zone.addEventListener('drop', function(e){ e.preventDefault(); zone.classList.remove('drag-over'); handleUpload(Array.from(e.dataTransfer.files)); });
    inp.addEventListener('change', function(){ handleUpload(Array.from(inp.files)); inp.value=''; });

    function handleUpload(files) {
      if (!files.length) return;
      var prog = document.getElementById('w-prog');
      prog.textContent = 'Uploading '+files.length+' file(s)…';
      var who = (typeof IMS_AUTH !== 'undefined' && IMS_AUTH.getUser()) ? IMS_AUTH.getUser().username : gRole();

      if (driveAvail && DMS_DRIVE.isConfigured()) {
        /* Upload to Drive */
        Promise.all(files.map(function(f){ return DMS_DRIVE.uploadFile(f, doc.id, 'attachment', '', who); }))
          .then(function(){ prog.textContent = files.length+' file(s) uploaded to Drive.'; loadAndRender(); renderWidget(); })
          .catch(function(e){ toast(e.message,'err'); prog.textContent=''; });
      } else {
        /* Local mode — save to d.files[] in localStorage */
        var today = new Date().toISOString().split('T')[0];
        Promise.all(files.map(function(f){ return readFileAsDataUrl(f).then(function(du){ return {f:f, du:du}; }); }))
          .then(function(results){
            var docs = gAll(), d2 = docs.find(function(x){ return x.id===doc.id; });
            if (!d2) return;
            results.forEach(function(r, i){
              d2.files = (d2.files||[]).concat([mkLocalFile(doc.id+'-att-'+Date.now()+'-'+i, r.f.name, r.du, today)]);
            });
            saveLocalFiles(d2.id, d2.files||[], d2.versions||[]);
            if (typeof DMS_DATA !== 'undefined') DMS_DATA.saveDoc(d2);
            prog.textContent = results.length+' file(s) saved locally.';
            loadAndRender(); renderWidget();
          })
          .catch(function(e){ toast(e.message,'err'); prog.textContent=''; });
      }
    }
  }
}

function openVersionModal(doc) {
  var activeTab = 'history';

  function buildHistory() {
    var versions = doc.versions||[];
    if (!versions.length) return '<div class="dw-empty">No versions recorded yet. Use "Upload New Revision" to add the first.</div>';
    return versions.map(function(v,i){
      var isActive = i===0;
      var dlHtml = v.webViewLink
        ? '<a class="dw-vdl" href="'+esc(v.webViewLink)+'" target="_blank">↗ Open</a>'
          +'<a class="dw-vdl" href="'+esc(v.downloadLink)+'" target="_blank">⬇ Download</a>'
        : (v.dataUrl || v.downloadLink)
          ? '<a class="dw-vdl" href="'+(v.downloadLink||v.dataUrl)+'" download="'+(v.fileName||'document')+'">⬇ Rev.'+esc(v.rev)+'</a>'
            +'<button class="dw-vdl" data-open-fid="'+esc(v.fileName||'')+'" data-open-url="'+(v.downloadLink||v.dataUrl)+'">↗ Open</button>'
          : '<span class="dw-vno">no file attached</span>';
      return '<div class="dw-ver-row'+(isActive?' dw-active':'')+'">'
        +'<span class="dw-vnum">Rev. '+esc(v.rev)+'</span>'
        +'<span class="dw-vdate">'+esc(v.ts||'—')+'</span>'
        +'<span class="dw-vnote">'+esc(v.note||'—')+'<small>'+esc(v.user||'—')+(v.fileName?' · '+esc(v.fileName):'')+'</small></span>'
        +'<span style="display:flex;flex-wrap:wrap;gap:3px;justify-content:flex-end">'+dlHtml+'</span>'
        +'</div>';
    }).join('');
  }

  function buildNewRev() {
    return '<div>'
      +'<div class="dw-field-row">'
        +'<div class="dw-field"><label>New Revision Number <span class="dw-req">*</span></label><input id="nv-rev" value="'+esc(doc.rev||'01')+'" placeholder="e.g. 03" style="width:120px"></div>'
        +'<div class="dw-field"><label>Date</label><input type="date" id="nv-date" value="'+new Date().toISOString().split('T')[0]+'"></div>'
      +'</div>'
      +'<div class="dw-field"><label>Description of Changes <span class="dw-req">*</span></label><textarea id="nv-note" rows="3" placeholder="e.g. Section 3 updated following F4 investigation"></textarea></div>'
      +'<div class="dw-field" style="background:#f8fafc;border:1px solid #e8ecf3;border-radius:5px;padding:10px">'
        +'<label>Upload Document File for This Revision <span style="font-weight:400;color:var(--text-lt,#5A6478)">(optional, max '+MAX_FILE_MB+' MB)</span></label>'
        +'<div style="font-size:10px;color:var(--text-lt,#5A6478);margin:3px 0 7px">The previous revision remains downloadable after saving.</div>'
        +'<input type="file" id="nv-file" style="font-size:11px">'
        +'<div class="dw-uprog" id="nv-prog"></div>'
      +'</div>'
      +'<div class="dw-alert-amb">⚠ Saving creates a new version entry at the top of the history and updates the current revision number. Previous versions are preserved.</div>'
    +'</div>';
  }

  function render() {
    var roleNotice = !canEd()
      ? '<div style="background:#fff8e1;border-left:3px solid #F9A825;border-radius:0 5px 5px 0;padding:7px 12px;margin-bottom:10px;font-size:11px;color:#7a5800">'
          +'🔒 <strong>Role: '+gRole()+'</strong> — "Upload New Revision" requires editor or admin.'
        +'</div>'
      : '';
    openOv(
      '<div class="dw-mhdr"><h4>📋 Version Control — '+esc(doc.number)+'</h4><button class="dw-mclose">×</button></div>'
      +'<div class="dw-mbody" style="padding-bottom:0">'
      +roleNotice
      +'<div class="dw-mtabs">'
        +'<div class="dw-mtab'+(activeTab==='history'?' active':'')+'" id="wmt-hist">Version History</div>'
        +(canEd() ? '<div class="dw-mtab'+(activeTab==='newrev'?' active':'')+'" id="wmt-new">＋ Upload New Revision</div>' : '')
      +'</div>'
      +'<div id="wmt-body" style="max-height:380px;overflow-y:auto;min-height:140px">'
        +(activeTab==='history' ? buildHistory() : buildNewRev())
      +'</div>'
      +'</div>'
      +'<div class="dw-mftr">'
        +(activeTab==='newrev'&&canEd() ? '<button class="btn btn-gold" id="nv-save">Save New Revision</button>' : '')
        +'<button class="btn btn-ghost-dk" id="nv-cancel">Close</button>'
      +'</div>'
    );
    document.getElementById('nv-cancel').addEventListener('click', closeOv);
    var ht = document.getElementById('wmt-hist');
    if (ht) ht.addEventListener('click', function(){ activeTab='history'; render(); });
    var nt = document.getElementById('wmt-new');
    if (nt) nt.addEventListener('click', function(){ activeTab='newrev'; render(); });

    if (activeTab==='newrev' && canEd()) {
      document.getElementById('nv-save').addEventListener('click', function() {
        var newRev  = document.getElementById('nv-rev').value.trim();
        var newNote = document.getElementById('nv-note').value.trim();
        if (!newRev||!newNote) { toast('Revision number and description are required.','err'); return; }
        var fi   = document.getElementById('nv-file');
        var f    = fi&&fi.files&&fi.files[0] ? fi.files[0] : null;
        var prog = document.getElementById('nv-prog');

        function saveRev(dataUrl, fileName, driveFile) {
          var docs = gAll(), d2 = docs.find(function(x){ return x.id===doc.id; });
          if (!d2) return;
          var finalFileName = driveFile ? driveFile.fileName : (fileName||null);
          var newVer = { rev:newRev,
                         ts:document.getElementById('nv-date').value||new Date().toISOString().split('T')[0],
                         note:newNote, user:gRole(),
                         fileName:     finalFileName,
                         dataUrl:      driveFile ? null : (dataUrl||null),
                         webViewLink:  driveFile ? driveFile.webViewLink  : null,
                         downloadLink: driveFile ? driveFile.downloadLink : (dataUrl||null) };
          d2.versions = [newVer].concat(d2.versions||[]);
          d2.rev = newRev;
          /* Mirror file into d.files[] — Drive file or local base64 */
          if (driveFile) {
            d2.files = (d2.files||[]).concat([driveFile]);
          } else if (dataUrl && fileName) {
            d2.files = (d2.files||[]).concat([
              mkLocalFile(doc.id+'-rev-'+newRev, fileName, dataUrl, newVer.ts)
            ]);
          }
          /* Persist updated files/versions locally */
          saveLocalFiles(d2.id, d2.files||[], d2.versions||[]);
          if (typeof DMS_DATA !== 'undefined') {
            DMS_DATA.saveDoc(d2);
            DMS_DATA.saveVersion({
              docId: doc.id, rev: newRev,
              ts: newVer.ts, note: newNote,
              user: gRole(), fileName: fileName||'',
              webViewLink: '', downloadLink: ''
            });
          }
          logH(doc.id,'NEW REVISION','Rev.'+newRev+' — '+newNote+(fileName?' — '+fileName:''));
          doc = d2;
          activeTab = 'history';
          render();
          renderWidget();
          toast('Rev. '+newRev+' saved.','ok');
        }

        if (f) {
          if (typeof DMS_DRIVE !== 'undefined' && DMS_DRIVE.isConfigured()) {
            if (prog) prog.textContent = 'Opening upload window…';
            var who3 = (typeof IMS_AUTH !== 'undefined' && IMS_AUTH.getUser()) ? IMS_AUTH.getUser().username : gRole();
            DMS_DRIVE.uploadFile(f, doc.id, 'revision', newNote, who3)
              .then(function(fileData) {
                if (prog) prog.textContent = 'Uploaded to Drive ✓';
                saveRev(null, fileData.fileName, fileData);
              })
              .catch(function(e) {
                if (prog) prog.textContent = 'Drive upload cancelled — saving locally…';
                readFileAsDataUrl(f).then(function(du){ saveRev(du,f.name,null); })
                  .catch(function(e2){ toast(e2.message,'err'); if(prog)prog.textContent=''; });
              });
          } else {
            if (prog) prog.textContent = 'Reading…';
            readFileAsDataUrl(f).then(function(du){ saveRev(du,f.name,null); })
              .catch(function(e){ toast(e.message,'err'); if(prog)prog.textContent=''; });
          }
        } else { saveRev(null,null,null); }
      });
    }
  }

  render();
}

/* ════════════════════════════════════════════════════════════
   INJECT & INIT
════════════════════════════════════════════════════════════ */
function inject() {
  injectStyles();
  /* Init DMS_DATA with the Sheets URL from data.js */
  if (typeof DMS_DATA !== 'undefined' && typeof SHEETS_URL !== 'undefined') {
    DMS_DATA.init(SHEETS_URL);
  }
  var container = document.getElementById('dms-widget-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'dms-widget-container';
    var target = document.querySelector('.content') || document.body;
    target.appendChild(container);
  }
  /* Render immediately from cache, then refresh from Sheets in background */
  renderWidget();
  if (typeof DMS_DATA !== 'undefined') {
    /* DMS_DATA.loadAll — exact same call as document-management.html */
    DMS_DATA.loadAll(function(docs) {
      renderWidget(); /* re-render with fresh Sheets data */
    });
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', inject);
} else {
  inject();
}

})(); /* end IIFE */
