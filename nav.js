/**
 * SAGCO IMS — Hierarchical Tree Navigation  Rev.16
 * ─────────────────────────────────────────────────
 * • Collapsible tree (dark navy sidebar)
 * • Auto-collapses 1.2s after mouse leaves
 * • Expands instantly on mouse enter / left-edge approach
 * • Active page's ancestor path always open
 * • sessionStorage remembers open/close state
 * • Live search filters the tree
 */

// ── Full document tree ────────────────────────────────────────────────────────
const TREE = [
  { id:'home', label:'IMS Dashboard',    file:'index.html',      level:'L0' },
  { id:'hub',  label:'Procedures Hub',   file:'procedures.html', level:'L0' },

  { id:'c4', label:'Clause 4 — Context', level:'clause', children:[
    { id:'c4p', label:'L2-P-01  Organisational Context', file:'proc-c4.html', level:'L2', badge:'Rev.02', children:[
      { id:'c4-1', label:'Context Register',    file:'context.html',     level:'L4', tag:'Sh.1'  },
      { id:'c4-2', label:'PESTLE & SWOT',        file:'pestle-swot.html', level:'L4', tag:'Sh.2'  },
      { id:'c4-3', label:'Scope & Process Map',  file:'scope.html',       level:'L4', tag:'Sh.9'  },
      { id:'c4-4', label:'Annual MR Checklist',  file:'checklist.html',   level:'L4', tag:'Sh.10', badge:'URGENT', bc:'red' },
    ]},
  ]},

  { id:'c5', label:'Clause 5 — Leadership', level:'clause', children:[
    { id:'c5p', label:'L2-P-02  Leadership & Commitment', file:'proc-c5.html', level:'L2', badge:'Rev.02', children:[
      { id:'c5-1', label:'IMS Policies Register',           file:'policies.html',               level:'L4', tag:'Sh.11' },
      { id:'c5-2', label:'Worker Participation',            file:'worker-participation.html',   level:'L4', tag:'Sh.12' },
      { id:'c5-3', label:'Policy Acknowledgement',          file:'policy-acknowledgement.html', level:'L4', tag:'Sh.56', badge:'URGENT', bc:'red' },
      { id:'c5-4', label:'Gemba Walk Log',                  file:'gemba-walk-log.html',         level:'L4', tag:'Sh.62' },
      { id:'c5-5', label:'Steering Team Minutes',           file:'steering-team-minutes.html',  level:'L4', tag:'Sh.63' },
      { id:'c5-6', label:'EnMS Champion Record',            file:'enms-champion.html',          level:'L4', tag:'Sh.66', badge:'PENDING', bc:'red' },
      { id:'c5-7', label:'CEO-Signed Records Tracker',      file:'ceo-signed-records.html',     level:'L4', tag:'Sh.67', badge:'URGENT',  bc:'red' },
      { id:'c5-8', label:'Communication Matrix',            file:'communication-matrix.html',   level:'L4', tag:'Sh.68' },
    ]},
  ]},

  { id:'c6', label:'Clause 6 — Planning', level:'clause', children:[
    { id:'c6p', label:'L2-P-03  Planning & Risk Management', file:'proc-c6.html', level:'L2', badge:'Rev.02', children:[
      { id:'c6-1',  label:'Integrated Risk Register',    file:'risk-register.html',         level:'L4', tag:'Sh.3',  badge:'CRIT',   bc:'red' },
      { id:'c6-2',  label:'Legal & Compliance Register', file:'compliance.html',            level:'L4', tag:'Sh.4',  badge:'URGENT', bc:'red' },
      { id:'c6-3',  label:'Risk Assessment WI',          file:'methodology.html',           level:'L3', tag:'Sh.5'  },
      { id:'c6-4',  label:'Objectives & KPI Register',   file:'objectives.html',            level:'L4', tag:'Sh.6',  badge:'URGENT', bc:'red' },
      { id:'c6-5',  label:'MOC Register',                file:'moc.html',                   level:'L4', tag:'Sh.7'  },
      { id:'c6-6',  label:'Energy Planning Register',    file:'energy.html',                level:'L4', tag:'Sh.8'  },
      { id:'c6-7',  label:'HIRA Register',               file:'hira.html',                  level:'L4', tag:'Sh.13' },
      { id:'c6-8',  label:'SEA Register',                file:'sea-register.html',          level:'L4', tag:'Sh.14' },
      { id:'c6-9',  label:'Bribery Risk Register',       file:'bribery-risk-register.html', level:'L4', tag:'Sh.61' },
      { id:'c6-10', label:'GHG Inventory Report',        file:'ghg-inventory.html',         level:'L4', tag:'Sh.69' },
      { id:'c6-11', label:'Scope 3 Emissions',           file:'scope3-emissions.html',      level:'L4', tag:'Sh.27' },
    ]},
  ]},

  { id:'c7', label:'Clause 7 — Support', level:'clause', children:[
    { id:'c7p', label:'L2-P-04  Support', file:'proc-c7.html', level:'L2', badge:'Rev.02', children:[
      { id:'c7-1', label:'Competency Matrix',            file:'competency.html',           level:'L4', tag:'Sh.15' },
      { id:'c7-2', label:'Training Register',            file:'training.html',             level:'L4', tag:'Sh.16' },
      { id:'c7-3', label:'Training Attendance Records',  file:'training-attendance.html',  level:'L4', tag:'Sh.60' },
      { id:'c7-4', label:'Induction Records Register',   file:'induction-records.html',    level:'L4', tag:'Sh.55', badge:'URGENT', bc:'red' },
      { id:'c7-5', label:'Documentation Register',       file:'documentation.html',        level:'L4', tag:'Sh.17' },
      { id:'c7-6', label:'Calibration Register',         file:'calibration-register.html', level:'L4', tag:'Sh.54', badge:'URGENT', bc:'red' },
    ]},
  ]},

  { id:'c8', label:'Clause 8 — Operations', level:'clause', children:[
    { id:'c8p', label:'L2-P-05  Operational Control', file:'proc-c8.html', level:'L2', badge:'Rev.01', children:[
      { id:'c8-fw', label:'Operational Framework', file:'operational-control.html', level:'L3' },

      { id:'oc1', label:'OC-01  Safety & Emergency', file:'oc01-safety.html', level:'L3', children:[
        { id:'oc1-1',  label:'PTW Register',                file:'ptw-register.html',          level:'L4', tag:'Sh.36', badge:'CAPA-001', bc:'red' },
        { id:'oc1-2',  label:'Emergency Response Plan',     file:'emergency-response.html',    level:'L4', tag:'Sh.34b', badge:'DRILL!', bc:'red' },
        { id:'oc1-3',  label:'Contractor Register',         file:'contractor-register.html',   level:'L4', tag:'Sh.35' },
        { id:'oc1-4',  label:'LOTO Device Register',        file:'loto-register.html',         level:'L4', tag:'Sh.37' },
        { id:'oc1-5',  label:'LOTO Authorised Persons',     file:'loto-auth-persons.html',     level:'L4', tag:'Sh.59' },
        { id:'oc1-6',  label:'Confined Space Entry Log',    file:'confined-space-log.html',    level:'L4', tag:'Sh.38' },
        { id:'oc1-7',  label:'Heat Stress / WBGT Log',      file:'heat-stress-log.html',       level:'L4', tag:'Sh.39', badge:'Jun–Sep', bc:'amb' },
        { id:'oc1-8',  label:'Fire Extinguisher Log',       file:'fire-extinguisher-log.html', level:'L4', tag:'Sh.40', badge:'CAPA-004', bc:'red' },
        { id:'oc1-9',  label:'Fire Pump Test Log',          file:'fire-pump-log.html',         level:'L4', tag:'Sh.41' },
        { id:'oc1-10', label:'OH Surveillance Register',    file:'oh-surveillance.html',       level:'L4', tag:'Sh.42' },
        { id:'oc1-11', label:'Scaffold Inspection',         file:'scaffold-inspection.html',   level:'L4', tag:'Sh.64' },
        { id:'oc1-12', label:'NDT / Radiography Log',       file:'ndt-permit-log.html',        level:'L4', tag:'Sh.65' },
        { id:'oc1-13', label:'Chemical Inventory (GHS)',    file:'chemical-inventory.html',    level:'L4', tag:'Sh.58' },
        { id:'oc1-14', label:'Crane & Lifting Register',    file:'crane-lifting.html',         level:'L4', tag:'Sh.57' },
      ]},

      { id:'oc2', label:'OC-02  Environment & Energy', file:'oc02-environment.html', level:'L3', children:[
        { id:'oc2-1', label:'Waste Management Register', file:'waste-management.html',   level:'L4', tag:'Sh.45b' },
        { id:'oc2-2', label:'Chemical Storage & Spills', file:'chemical-storage.html',   level:'L4', tag:'Sh.46'  },
        { id:'oc2-3', label:'Furnace Monitoring Logs',   file:'furnace-monitoring.html', level:'L4', tag:'Sh.47', badge:'F4!', bc:'red' },
        { id:'oc2-4', label:'MEPS Compliance Register',  file:'meps-register.html',      level:'L4', tag:'Sh.48'  },
        { id:'oc2-5', label:'Water & Waste Data',        file:'water-waste.html',        level:'L4', tag:'Sh.30'  },
      ]},

      { id:'oc3', label:'OC-03  Quality & Customer', file:'oc03-quality.html', level:'L3', children:[
        { id:'oc3-1', label:'Customer Requirements Reg.',  file:'customer-register.html',    level:'L4', tag:'Sh.52' },
        { id:'oc3-2', label:'In-Process Inspection Log',   file:'inprocess-inspection.html', level:'L4', tag:'Sh.53' },
        { id:'oc3-3', label:'Product Release Records',     file:'product-release.html',      level:'L4', tag:'Sh.49' },
        { id:'oc3-4', label:'Nonconforming Products',      file:'nonconforming.html',        level:'L4', tag:'Sh.50' },
        { id:'oc3-5', label:'Incoming Inspection Records', file:'incoming-inspection.html',  level:'L4', tag:'Sh.51' },
      ]},
    ]},
  ]},

  { id:'c9', label:'Clause 9 — Performance', level:'clause', children:[
    { id:'c9p', label:'L2-P-06  Performance Evaluation', file:'proc-c9.html', level:'L2', badge:'Rev.02', children:[
      { id:'c9-1', label:'KPI Dashboard',              file:'kpi-dashboard.html',    level:'L4', tag:'Sh.18' },
      { id:'c9-2', label:'Compliance Evaluation',      file:'compliance-eval.html',  level:'L4', tag:'Sh.19' },
      { id:'c9-3', label:'Internal Audit Programme',   file:'audit-programme.html',  level:'L4', tag:'Sh.20' },
      { id:'c9-4', label:'Management Review Register', file:'management-review.html',level:'L4', tag:'Sh.22' },
    ]},
  ]},

  { id:'c10', label:'Clause 10 — Improvement', level:'clause', children:[
    { id:'c10p', label:'L2-P-07  Improvement & Corrective Action', file:'proc-c10.html', level:'L2', badge:'Rev.02', children:[
      { id:'c10-1', label:'CAPA Register',     file:'capa-register.html',    level:'L4', tag:'Sh.21', badge:'4 OPEN', bc:'amb' },
      { id:'c10-2', label:'Incident Register', file:'incident-register.html',level:'L4', tag:'Sh.23' },
    ]},
  ]},

  { id:'esg', label:'ESG / Sustainability / Ethics', level:'clause', children:[
    { id:'esg-e', label:'Environment', level:'grp', children:[
      { id:'esg-e1', label:'Scope 3 Emissions',  file:'scope3-emissions.html',  level:'L4', tag:'Sh.27' },
      { id:'esg-e2', label:'Water & Waste Data', file:'water-waste.html',       level:'L4', tag:'Sh.30' },
    ]},
    { id:'esg-l', label:'Labour & Human Rights', level:'grp', children:[
      { id:'esg-l1', label:'Workforce Diversity', file:'workforce-diversity.html', level:'L4', tag:'Sh.28' },
    ]},
    { id:'esg-t', label:'Ethics & Anti-Bribery', level:'grp', children:[
      { id:'esg-t1', label:'Conflict of Interest',     file:'coi-register.html',      level:'L4', tag:'Sh.25' },
      { id:'esg-t2', label:'Gifts & Hospitality',      file:'gifts-hospitality.html', level:'L4', tag:'Sh.26' },
      { id:'esg-t3', label:'Third-Party Due Diligence',file:'tpdd.html',              level:'L4', tag:'Sh.29' },
    ]},
    { id:'esg-s', label:'Sustainable Procurement', level:'grp', children:[
      { id:'esg-s1', label:'Supplier ESG Register',     file:'supplier-esg.html',     level:'L4', tag:'Sh.24' },
      { id:'esg-s2', label:'Supplier Code of Conduct',  file:'supplier-conduct.html', level:'L4', tag:'Sh.31' },
    ]},
  ]},
];

// ── Helpers ───────────────────────────────────────────────────────────────────
function flatTree(nodes, out) {
  out = out || [];
  nodes.forEach(function(n){ out.push(n); if(n.children) flatTree(n.children, out); });
  return out;
}
var FLAT = flatTree(TREE);

function findAncestors(targetId, nodes, path) {
  path = path || [];
  for(var i=0;i<nodes.length;i++){
    var n=nodes[i];
    if(n.id===targetId) return path.concat([n.id]);
    if(n.children){
      var r=findAncestors(targetId,n.children,path.concat([n.id]));
      if(r) return r;
    }
  }
  return null;
}

function getOpen(){
  try{ return JSON.parse(sessionStorage.getItem('ims-open')||'[]'); }catch(e){ return []; }
}
function saveOpen(arr){
  try{ sessionStorage.setItem('ims-open', JSON.stringify(arr)); }catch(e){}
}
function isOpen(id, arr){ return arr.indexOf(id) > -1; }

// ── Level colours ─────────────────────────────────────────────────────────────
function lvColor(lv){
  if(lv==='L2') return '#6aa3ff';
  if(lv==='L3') return '#5dd49a';
  if(lv==='L4') return 'rgba(255,255,255,.38)';
  return 'rgba(255,255,255,.25)';
}

// ── Build node HTML ───────────────────────────────────────────────────────────
function nodeHtml(n, depth, openArr, active){
  var isActive = n.file===active;
  var hasKids  = !!(n.children && n.children.length);
  var open     = hasKids && isOpen(n.id, openArr);
  var indent   = 8 + depth*13;

  var tog = hasKids
    ? '<span class="nt" data-id="'+n.id+'">'+(open?'▾':'▸')+'</span>'
    : '<span class="nt-pad"></span>';

  var lvp = (n.level && n.level!=='clause' && n.level!=='L0' && n.level!=='grp')
    ? '<span class="nlv" style="color:'+lvColor(n.level)+'">'+n.level+'</span>' : '';

  var tg = n.tag ? '<span class="ntag">'+n.tag+'</span>' : '';

  var bc = {'red':'#c0392b','amb':'#e67e22','gold':'#C9A84C'}[n.bc||'gold']||'#C9A84C';
  var bdg = n.badge ? '<span class="nbdg" style="background:'+bc+';color:'+(n.bc==='amb'?'#333':'#fff')+'">'+n.badge+'</span>' : '';

  var rowCls = 'nrow'+(isActive?' active':'')+(n.level==='clause'?' clause-row':'')+(n.level==='grp'?' grp-row':'')+((!n.file)?' nolink':'');

  var rowStyle = 'padding-left:'+indent+'px';

  var inner = tog+'<span class="nlbl">'+n.label+'</span>'+lvp+tg+bdg;

  var row = n.file
    ? '<a href="'+n.file+'" class="'+rowCls+'" style="'+rowStyle+'" data-id="'+n.id+'">'+inner+'</a>'
    : '<div class="'+rowCls+'" style="'+rowStyle+'" data-id="'+n.id+'">'+inner+'</div>';

  var kids = hasKids
    ? '<div class="nkids'+(open?' open':'')+'" id="nk-'+n.id+'">'+
        n.children.map(function(c){ return nodeHtml(c,depth+1,openArr,active); }).join('')+
      '</div>'
    : '';

  return row+kids;
}

// ── Render sidebar ─────────────────────────────────────────────────────────────
function renderNav(active){
  var activeNode = null;
  for(var i=0;i<FLAT.length;i++){ if(FLAT[i].file===active){ activeNode=FLAT[i]; break; } }

  var openArr = getOpen();
  if(activeNode){
    var path = findAncestors(activeNode.id, TREE) || [];
    path.forEach(function(id){ if(openArr.indexOf(id)<0) openArr.push(id); });
    saveOpen(openArr);
  }

  var treeHtml = TREE.map(function(n){ return nodeHtml(n,0,openArr,active); }).join('');

  return '<div class="sidebar" id="sidebar">'+
    '<a class="sb-logo" href="index.html">'+
      '<img src="sagco-logo.jpg" class="sb-logo-img" alt="SAGCO">'+
      '<div class="sb-logo-text"><strong>SAGCO IMS</strong><span>Rev.16 · June 2026</span></div>'+
    '</a>'+
    '<div class="sb-search-wrap">'+
      '<input class="sb-search" id="nsrch" type="text" placeholder="🔍  Search…" autocomplete="off">'+
    '</div>'+
    '<div class="nav-tree" id="ntree">'+treeHtml+'</div>'+
    '<div class="sb-foot">'+
      '<span class="sync-dot"></span><span style="opacity:.55;font-size:9px">Live · Google Sheets &nbsp;|&nbsp; ISO 45001 · 14001 · 50001 · 9001</span>'+
    '</div>'+
  '</div>';
}

// ── Topbar ────────────────────────────────────────────────────────────────────
function renderTopbar(title, subtitle){
  return '<div class="topbar">'+
    '<div class="topbar-left">'+
      '<div class="breadcrumb">SAGCO IMS &rsaquo; <strong>'+title+'</strong></div>'+
    '</div>'+
    '<div class="topbar-right">'+
      (subtitle?'<span style="font-size:11px;color:var(--g400)">'+subtitle+'</span>':'')+
      '<button class="btn btn-ghost" onclick="location.reload()">↻ Refresh</button>'+
    '</div>'+
  '</div>';
}

// ── initPage ──────────────────────────────────────────────────────────────────
function initPage(active){
  var wrap = document.createElement('div');
  wrap.innerHTML = renderNav(active);
  document.body.insertBefore(wrap.firstElementChild, document.body.firstChild);

  setTimeout(function(){
    bindTree();
    bindSearch();
    scrollActive();
    bindHoverCollapse();
  }, 0);
}

// ── Tree click ────────────────────────────────────────────────────────────────
function bindTree(){
  var tree = document.getElementById('ntree');
  if(!tree) return;
  tree.addEventListener('click', function(e){
    var tog = e.target.closest ? e.target.closest('.nt') : null;
    var row = e.target.closest ? e.target.closest('.nrow') : null;

    if(tog){
      e.preventDefault(); e.stopPropagation();
      doToggle(tog.dataset.id);
      return;
    }
    if(row && row.classList.contains('nolink')){
      var id = row.getAttribute('data-id');
      if(id) doToggle(id);
    }
  });
}

function doToggle(id){
  var kids = document.getElementById('nk-'+id);
  var tog  = document.querySelector('.nt[data-id="'+id+'"]');
  if(!kids) return;
  var arr = getOpen();
  var idx = arr.indexOf(id);
  if(idx>-1){
    arr.splice(idx,1);
    kids.classList.remove('open');
    if(tog) tog.textContent='▸';
  } else {
    arr.push(id);
    kids.classList.add('open');
    if(tog) tog.textContent='▾';
  }
  saveOpen(arr);
}

// ── Search ────────────────────────────────────────────────────────────────────
function bindSearch(){
  var inp = document.getElementById('nsrch');
  if(!inp) return;
  inp.addEventListener('input', function(){
    var q = inp.value.trim().toLowerCase();
    var rows = document.querySelectorAll('#ntree .nrow');
    if(!q){
      rows.forEach(function(r){ r.style.display=''; });
      return;
    }
    var show = {};
    FLAT.forEach(function(n){
      if((n.label||'').toLowerCase().indexOf(q)>-1 || (n.tag||'').toLowerCase().indexOf(q)>-1){
        show[n.id]=true;
        var path = findAncestors(n.id,TREE)||[];
        path.forEach(function(pid){ show[pid]=true; });
      }
    });
    rows.forEach(function(r){
      var id=r.getAttribute('data-id');
      r.style.display = show[id] ? '' : 'none';
      if(show[id]){
        var k=document.getElementById('nk-'+id);
        if(k) k.classList.add('open');
      }
    });
  });
}

// ── Scroll active into view ───────────────────────────────────────────────────
function scrollActive(){
  var a=document.querySelector('#ntree .nrow.active');
  if(a) a.scrollIntoView({block:'nearest',behavior:'smooth'});
}

// ── Hover-collapse ────────────────────────────────────────────────────────────
function bindHoverCollapse(){
  var sb   = document.getElementById('sidebar');
  var main = document.querySelector('.main');
  if(!sb) return;

  var timer = null;

  function collapse(){
    sb.classList.add('sb-off');
    if(main) main.classList.add('sb-off');
  }
  function expand(){
    clearTimeout(timer);
    sb.classList.remove('sb-off');
    if(main) main.classList.remove('sb-off');
  }

  sb.addEventListener('mouseleave', function(){
    timer = setTimeout(collapse, 1200);
  });
  sb.addEventListener('mouseenter', expand);

  // Expand when cursor touches left edge
  document.addEventListener('mousemove', function(e){
    if(e.clientX <= 6) expand();
  });
}

// ── Chart helpers (index.html) ────────────────────────────────────────────────
function chartDefaults(){
  return {
    responsive:true, maintainAspectRatio:false,
    plugins:{legend:{labels:{font:{family:'IBM Plex Sans,Arial',size:10},boxWidth:11,padding:10}}}
  };
}
var CC = {
  crit:'#B71C1C',high:'#E65100',med:'#F9A825',low:'#2E7D32',
  opp:'#0D47A1',navy:'#1B2A4A',gold:'#C9A84C',grey:'#8A94A6',
  catMap:{
    'Safety / OH&S':'#7F0000','Environmental':'#004D40','Energy':'#003366',
    'Sustainability':'#4A148C','Social / Labour':'#1A237E','Anti-Bribery':'#3E0066',
    'Compliance Risk':'#37474F','Opportunity':'#0D47A1','Quality':'#1B5E20',
    'Social':'#1A237E','Multi':'#37474F',
  },
};
