/**
 * SAGCO IMS — Hierarchical Tree Navigation  Rev.16 Final
 * ─────────────────────────────────────────────────────────
 * • Full collapsible tree with dark navy background
 * • Auto-collapses when mouse leaves → expands on hover
 * • Active page's full ancestor path stays open
 * • Search filters the tree in real-time
 * • State persists in sessionStorage across page loads
 */

// ── Document tree ─────────────────────────────────────────────────────────────
const TREE = [
  { id:'home', label:'IMS Dashboard',        file:'index.html',      level:'L0', icon:'🏠' },
  { id:'hub',  label:'Procedures Hub',        file:'procedures.html', level:'L0', icon:'📋' },

  // ── CLAUSE 4 ──────────────────────────────────────────────────────────────
  { id:'c4', label:'Clause 4 — Context', level:'clause', icon:'🏢', children:[
    { id:'c4-proc', label:'L2-P-01 Organisational Context', file:'proc-c4.html', level:'L2', badge:'Rev.02', children:[
      { id:'c4-r1', label:'Context Register',      file:'context.html',     level:'L4', sheet:'Sh.1'  },
      { id:'c4-r2', label:'PESTLE & SWOT',          file:'pestle-swot.html', level:'L4', sheet:'Sh.2'  },
      { id:'c4-r3', label:'Scope & Process Map',    file:'scope.html',       level:'L4', sheet:'Sh.9'  },
      { id:'c4-r4', label:'Annual MR Checklist',    file:'checklist.html',   level:'L4', sheet:'Sh.10', badge:'URGENT', badgeCls:'nb-red' },
    ]},
  ]},

  // ── CLAUSE 5 ──────────────────────────────────────────────────────────────
  { id:'c5', label:'Clause 5 — Leadership', level:'clause', icon:'👔', children:[
    { id:'c5-proc', label:'L2-P-02 Leadership & Commitment', file:'proc-c5.html', level:'L2', badge:'Rev.02', children:[
      { id:'c5-r1', label:'IMS Policies Register',          file:'policies.html',              level:'L4', sheet:'Sh.11' },
      { id:'c5-r2', label:'Worker Participation',           file:'worker-participation.html',  level:'L4', sheet:'Sh.12' },
      { id:'c5-r3', label:'Policy Acknowledgement',         file:'policy-acknowledgement.html',level:'L4', sheet:'Sh.56', badge:'URGENT', badgeCls:'nb-red' },
      { id:'c5-r4', label:'Gemba Walk Log',                 file:'gemba-walk-log.html',        level:'L4', sheet:'Sh.62' },
      { id:'c5-r5', label:'Steering Team Minutes',          file:'steering-team-minutes.html', level:'L4', sheet:'Sh.63' },
      { id:'c5-r6', label:'EnMS Champion Record',           file:'enms-champion.html',         level:'L4', sheet:'Sh.66', badge:'PENDING', badgeCls:'nb-red' },
      { id:'c5-r7', label:'CEO-Signed Records Tracker',     file:'ceo-signed-records.html',    level:'L4', sheet:'Sh.67', badge:'URGENT', badgeCls:'nb-red' },
      { id:'c5-r8', label:'Communication Matrix',           file:'communication-matrix.html',  level:'L4', sheet:'Sh.68' },
    ]},
  ]},

  // ── CLAUSE 6 ──────────────────────────────────────────────────────────────
  { id:'c6', label:'Clause 6 — Planning', level:'clause', icon:'⚠', children:[
    { id:'c6-proc', label:'L2-P-03 Planning & Risk Mgmt', file:'proc-c6.html', level:'L2', badge:'Rev.02', children:[
      { id:'c6-r1',  label:'Integrated Risk Register',    file:'risk-register.html',         level:'L4', sheet:'Sh.3',  badge:'CRIT',   badgeCls:'nb-red' },
      { id:'c6-r2',  label:'Legal & Compliance Register', file:'compliance.html',            level:'L4', sheet:'Sh.4',  badge:'URGENT', badgeCls:'nb-red' },
      { id:'c6-r3',  label:'Risk Assessment WI',          file:'methodology.html',           level:'L3', sheet:'Sh.5'  },
      { id:'c6-r4',  label:'Objectives & KPI Register',   file:'objectives.html',            level:'L4', sheet:'Sh.6',  badge:'URGENT', badgeCls:'nb-red' },
      { id:'c6-r5',  label:'MOC Register',                file:'moc.html',                   level:'L4', sheet:'Sh.7'  },
      { id:'c6-r6',  label:'Energy Planning Register',    file:'energy.html',                level:'L4', sheet:'Sh.8'  },
      { id:'c6-r7',  label:'HIRA Register',               file:'hira.html',                  level:'L4', sheet:'Sh.13' },
      { id:'c6-r8',  label:'SEA Register',                file:'sea-register.html',          level:'L4', sheet:'Sh.14' },
      { id:'c6-r9',  label:'Bribery Risk Register',       file:'bribery-risk-register.html', level:'L4', sheet:'Sh.61' },
      { id:'c6-r10', label:'GHG Inventory Report',        file:'ghg-inventory.html',         level:'L4', sheet:'Sh.69' },
      { id:'c6-r11', label:'Scope 3 Emissions Register',  file:'scope3-emissions.html',      level:'L4', sheet:'Sh.27' },
    ]},
  ]},

  // ── CLAUSE 7 ──────────────────────────────────────────────────────────────
  { id:'c7', label:'Clause 7 — Support', level:'clause', icon:'🎓', children:[
    { id:'c7-proc', label:'L2-P-04 Support', file:'proc-c7.html', level:'L2', badge:'Rev.02', children:[
      { id:'c7-r1', label:'Competency Matrix',           file:'competency.html',            level:'L4', sheet:'Sh.15' },
      { id:'c7-r2', label:'Training Register',           file:'training.html',              level:'L4', sheet:'Sh.16' },
      { id:'c7-r3', label:'Training Attendance Records', file:'training-attendance.html',   level:'L4', sheet:'Sh.60' },
      { id:'c7-r4', label:'Induction Records Register',  file:'induction-records.html',     level:'L4', sheet:'Sh.55', badge:'URGENT', badgeCls:'nb-red' },
      { id:'c7-r5', label:'Documentation Register',      file:'documentation.html',         level:'L4', sheet:'Sh.17' },
      { id:'c7-r6', label:'Calibration Register',        file:'calibration-register.html',  level:'L4', sheet:'Sh.54', badge:'URGENT', badgeCls:'nb-red' },
    ]},
  ]},

  // ── CLAUSE 8 ──────────────────────────────────────────────────────────────
  { id:'c8', label:'Clause 8 — Operations', level:'clause', icon:'⚙', children:[
    { id:'c8-proc', label:'L2-P-05 Operational Control', file:'proc-c8.html', level:'L2', badge:'Rev.01', children:[
      { id:'c8-fw', label:'Operational Framework', file:'operational-control.html', level:'L3' },

      { id:'oc1', label:'OC-01 Safety & Emergency', file:'oc01-safety.html', level:'L3', children:[
        { id:'oc1-r1',  label:'PTW Register',                file:'ptw-register.html',          level:'L4', sheet:'Sh.36', badge:'CAPA-001', badgeCls:'nb-red' },
        { id:'oc1-r2',  label:'Emergency Response Plan',     file:'emergency-response.html',    level:'L4', sheet:'Sh.34b', badge:'DRILL!',  badgeCls:'nb-red' },
        { id:'oc1-r3',  label:'Contractor Register',         file:'contractor-register.html',   level:'L4', sheet:'Sh.35' },
        { id:'oc1-r4',  label:'LOTO Device Register',        file:'loto-register.html',         level:'L4', sheet:'Sh.37' },
        { id:'oc1-r5',  label:'LOTO Authorised Persons',     file:'loto-auth-persons.html',     level:'L4', sheet:'Sh.59' },
        { id:'oc1-r6',  label:'Confined Space Entry Log',    file:'confined-space-log.html',    level:'L4', sheet:'Sh.38' },
        { id:'oc1-r7',  label:'Heat Stress / WBGT Log',      file:'heat-stress-log.html',       level:'L4', sheet:'Sh.39', badge:'Jun–Sep', badgeCls:'nb-amb' },
        { id:'oc1-r8',  label:'Fire Extinguisher Log',       file:'fire-extinguisher-log.html', level:'L4', sheet:'Sh.40', badge:'CAPA-004', badgeCls:'nb-red' },
        { id:'oc1-r9',  label:'Fire Pump Test Log',          file:'fire-pump-log.html',         level:'L4', sheet:'Sh.41' },
        { id:'oc1-r10', label:'OH Surveillance Register',    file:'oh-surveillance.html',       level:'L4', sheet:'Sh.42' },
        { id:'oc1-r11', label:'Scaffold Inspection',         file:'scaffold-inspection.html',   level:'L4', sheet:'Sh.64' },
        { id:'oc1-r12', label:'Radiography / NDT Log',       file:'ndt-permit-log.html',        level:'L4', sheet:'Sh.65' },
        { id:'oc1-r13', label:'Chemical Inventory (GHS)',    file:'chemical-inventory.html',    level:'L4', sheet:'Sh.58' },
        { id:'oc1-r14', label:'Crane & Lifting Register',    file:'crane-lifting.html',         level:'L4', sheet:'Sh.57' },
      ]},

      { id:'oc2', label:'OC-02 Environment & Energy', file:'oc02-environment.html', level:'L3', children:[
        { id:'oc2-r1', label:'Waste Management Register',  file:'waste-management.html',   level:'L4', sheet:'Sh.45b' },
        { id:'oc2-r2', label:'Chemical Storage & Spills',  file:'chemical-storage.html',   level:'L4', sheet:'Sh.46' },
        { id:'oc2-r3', label:'Furnace Monitoring Logs',    file:'furnace-monitoring.html', level:'L4', sheet:'Sh.47', badge:'F4!', badgeCls:'nb-red' },
        { id:'oc2-r4', label:'MEPS Compliance Register',   file:'meps-register.html',      level:'L4', sheet:'Sh.48' },
        { id:'oc2-r5', label:'Water & Waste Data',         file:'water-waste.html',        level:'L4', sheet:'Sh.30' },
      ]},

      { id:'oc3', label:'OC-03 Quality & Customer', file:'oc03-quality.html', level:'L3', children:[
        { id:'oc3-r1', label:'Customer Requirements Reg.',  file:'customer-register.html',    level:'L4', sheet:'Sh.52' },
        { id:'oc3-r2', label:'In-Process Inspection Log',   file:'inprocess-inspection.html', level:'L4', sheet:'Sh.53' },
        { id:'oc3-r3', label:'Product Release Records',     file:'product-release.html',      level:'L4', sheet:'Sh.49' },
        { id:'oc3-r4', label:'Nonconforming Products',      file:'nonconforming.html',        level:'L4', sheet:'Sh.50' },
        { id:'oc3-r5', label:'Incoming Inspection Records', file:'incoming-inspection.html',  level:'L4', sheet:'Sh.51' },
      ]},
    ]},
  ]},

  // ── CLAUSE 9 ──────────────────────────────────────────────────────────────
  { id:'c9', label:'Clause 9 — Performance', level:'clause', icon:'📊', children:[
    { id:'c9-proc', label:'L2-P-06 Performance Evaluation', file:'proc-c9.html', level:'L2', badge:'Rev.02', children:[
      { id:'c9-r1', label:'KPI Dashboard',              file:'kpi-dashboard.html',   level:'L4', sheet:'Sh.18' },
      { id:'c9-r2', label:'Compliance Evaluation',      file:'compliance-eval.html', level:'L4', sheet:'Sh.19' },
      { id:'c9-r3', label:'Internal Audit Programme',   file:'audit-programme.html', level:'L4', sheet:'Sh.20' },
      { id:'c9-r4', label:'Management Review Register', file:'management-review.html',level:'L4',sheet:'Sh.22' },
    ]},
  ]},

  // ── CLAUSE 10 ─────────────────────────────────────────────────────────────
  { id:'c10', label:'Clause 10 — Improvement', level:'clause', icon:'🔧', children:[
    { id:'c10-proc', label:'L2-P-07 Improvement & CA', file:'proc-c10.html', level:'L2', badge:'Rev.02', children:[
      { id:'c10-r1', label:'CAPA Register',     file:'capa-register.html',    level:'L4', sheet:'Sh.21', badge:'4 OPEN', badgeCls:'nb-amb' },
      { id:'c10-r2', label:'Incident Register', file:'incident-register.html',level:'L4', sheet:'Sh.23' },
    ]},
  ]},

  // ── ESG ───────────────────────────────────────────────────────────────────
  { id:'esg', label:'ESG / Sustainability / Ethics', level:'clause', icon:'🌍', children:[
    { id:'esg-env', label:'Environment', level:'grp', children:[
      { id:'esg-e1', label:'Scope 3 Emissions',  file:'scope3-emissions.html',  level:'L4', sheet:'Sh.27' },
      { id:'esg-e2', label:'Water & Waste Data', file:'water-waste.html',       level:'L4', sheet:'Sh.30' },
    ]},
    { id:'esg-lab', label:'Labour & Human Rights', level:'grp', children:[
      { id:'esg-l1', label:'Workforce Diversity', file:'workforce-diversity.html', level:'L4', sheet:'Sh.28' },
    ]},
    { id:'esg-eth', label:'Ethics & Anti-Bribery', level:'grp', children:[
      { id:'esg-t1', label:'Conflict of Interest', file:'coi-register.html',      level:'L4', sheet:'Sh.25' },
      { id:'esg-t2', label:'Gifts & Hospitality',  file:'gifts-hospitality.html', level:'L4', sheet:'Sh.26' },
      { id:'esg-t3', label:'Third-Party Due Diligence', file:'tpdd.html',         level:'L4', sheet:'Sh.29' },
    ]},
    { id:'esg-sup', label:'Sustainable Procurement', level:'grp', children:[
      { id:'esg-s1', label:'Supplier ESG Register',    file:'supplier-esg.html',     level:'L4', sheet:'Sh.24' },
      { id:'esg-s2', label:'Supplier Code of Conduct', file:'supplier-conduct.html', level:'L4', sheet:'Sh.31' },
    ]},
  ]},
];

// ── Flatten for lookups ───────────────────────────────────────────────────────
function flatTree(nodes, out=[]) {
  nodes.forEach(n => { out.push(n); if(n.children) flatTree(n.children, out); });
  return out;
}
const FLAT = flatTree(TREE);

// ── Find ancestor IDs of a node ───────────────────────────────────────────────
function ancestors(targetId, nodes, path=[]) {
  for(const n of nodes) {
    if(n.id === targetId) return [...path, n.id];
    if(n.children) {
      const r = ancestors(targetId, n.children, [...path, n.id]);
      if(r) return r;
    }
  }
  return null;
}

// ── sessionStorage helpers ────────────────────────────────────────────────────
const STORE_KEY = 'ims-nav-open';
function getOpen()    { try { return new Set(JSON.parse(sessionStorage.getItem(STORE_KEY)||'[]')); } catch(e){ return new Set(); } }
function saveOpen(s)  { try { sessionStorage.setItem(STORE_KEY, JSON.stringify([...s])); } catch(e){} }

// ── Level → colour ─────────────────────────────────────────────────────────
const LV_COLOR = { L2:'#3d7de8', L3:'#27a86e', L4:'rgba(255,255,255,.45)', grp:'rgba(255,255,255,.3)' };

// ── Build one node's HTML ────────────────────────────────────────────────────
function nodeHtml(n, depth, openIds, activePage) {
  const isActive  = n.file === activePage;
  const hasKids   = !!(n.children && n.children.length);
  const isOpen    = hasKids && openIds.has(n.id);
  const indent    = 10 + depth * 12;

  const tog = hasKids
    ? `<span class="nt" data-id="${n.id}">${isOpen ? '▾' : '▸'}</span>`
    : `<span class="nt-pad"></span>`;

  const lvPill = (n.level && n.level !== 'clause' && n.level !== 'L0')
    ? `<span class="nlv" style="color:${LV_COLOR[n.level]||'rgba(255,255,255,.4)'}">${n.level}</span>` : '';

  const bdg = n.badge
    ? `<span class="nb ${n.badgeCls||'nb-gold'}">${n.badge}</span>` : '';

  const sheetTag = n.sheet
    ? `<span class="nsh">${n.sheet}</span>` : '';

  const rowCls = [
    'nrow',
    isActive  ? 'active' : '',
    !n.file   ? 'no-link' : '',
    depth === 0 && n.level === 'clause' ? 'clause-row' : '',
  ].filter(Boolean).join(' ');

  const inner = `${tog}<span class="nlabel">${n.label}</span>${lvPill}${sheetTag}${bdg}`;

  let row;
  if(n.file) {
    row = `<a href="${n.file}" class="${rowCls}" style="padding-left:${indent}px" data-id="${n.id}">${inner}</a>`;
  } else {
    row = `<div class="${rowCls}" style="padding-left:${indent}px" data-id="${n.id}">${inner}</div>`;
  }

  const kids = hasKids
    ? `<div class="nkids ${isOpen?'open':''}" id="nk-${n.id}">${n.children.map(c => nodeHtml(c, depth+1, openIds, activePage)).join('')}</div>`
    : '';

  return row + kids;
}

// ── Render sidebar ────────────────────────────────────────────────────────────
function renderNav(activePage) {
  const activeNode = FLAT.find(n => n.file === activePage);
  const openIds    = getOpen();

  if(activeNode) {
    const path = ancestors(activeNode.id, TREE) || [];
    path.forEach(id => openIds.add(id));
    saveOpen(openIds);
  }

  const treeHtml = TREE.map(n => nodeHtml(n, 0, openIds, activePage)).join('');

  return `<nav class="sidebar" id="sidebar">
  <div class="sb-inner">
    <a class="sb-brand" href="index.html">
      <div class="sb-logo-mark">S</div>
      <div class="sb-brand-text"><strong>SAGCO IMS</strong><span>Rev.16 · June 2026</span></div>
    </a>
    <div class="sb-search-wrap">
      <input class="sb-search" id="nav-srch" type="text" placeholder="🔍  Search documents…" autocomplete="off">
    </div>
    <div class="nav-tree" id="nav-tree">${treeHtml}</div>
    <div class="sb-foot">
      <span class="sync-dot"></span><span>Live · Google Sheets</span>
      <div style="margin-top:3px;opacity:.5;font-size:9px">ISO 45001 · 14001 · 50001 · 9001</div>
    </div>
  </div>
</nav>`;
}

// ── Topbar ────────────────────────────────────────────────────────────────────
function renderTopbar(title, subtitle) {
  return `<div class="topbar">
  <div class="topbar-left">
    <div class="breadcrumb">SAGCO IMS &rsaquo; <strong>${title}</strong></div>
  </div>
  <div class="topbar-right">
    ${subtitle ? `<span class="tb-sub">${subtitle}</span>` : ''}
    <button class="btn btn-ghost" onclick="location.reload()">↻ Refresh</button>
  </div>
</div>`;
}

// ── Init page ─────────────────────────────────────────────────────────────────
function initPage(activePage) {
  // Inject sidebar
  const wrap = document.createElement('div');
  wrap.innerHTML = renderNav(activePage);
  document.body.insertBefore(wrap.firstElementChild, document.body.firstChild);

  requestAnimationFrame(() => {
    attachHandlers();
    scrollActiveIntoView();
    initHoverCollapse();
  });
}

// ── Event handlers ─────────────────────────────────────────────────────────────
function attachHandlers() {
  const tree = document.getElementById('nav-tree');
  if(!tree) return;

  // Toggle on arrow click or group-row click
  tree.addEventListener('click', e => {
    const tog = e.target.closest('.nt');
    const row = e.target.closest('.nrow');

    if(tog) {
      e.preventDefault(); e.stopPropagation();
      toggle(tog.dataset.id);
      return;
    }
    if(row && row.classList.contains('no-link')) {
      const id = row.dataset.id;
      if(id) toggle(id);
    }
  });

  // Search
  const inp = document.getElementById('nav-srch');
  if(inp) inp.addEventListener('input', () => filterTree(inp.value.trim().toLowerCase()));
}

function toggle(id) {
  const kids = document.getElementById('nk-' + id);
  const tog  = document.querySelector(`.nt[data-id="${id}"]`);
  if(!kids) return;
  const open  = getOpen();
  if(open.has(id)) {
    open.delete(id); kids.classList.remove('open'); if(tog) tog.textContent = '▸';
  } else {
    open.add(id);    kids.classList.add('open');    if(tog) tog.textContent = '▾';
  }
  saveOpen(open);
}

function filterTree(q) {
  const rows = document.querySelectorAll('#nav-tree .nrow');
  if(!q) {
    rows.forEach(r => r.style.display = '');
    document.querySelectorAll('#nav-tree .nkids').forEach(k => {
      // restore to saved open state
      const id = k.id.replace('nk-','');
      k.classList.toggle('open', getOpen().has(id));
    });
    return;
  }
  // Show matching rows and their parents
  const matchIds = new Set();
  FLAT.forEach(n => {
    if(n.label.toLowerCase().includes(q) || (n.sheet||'').toLowerCase().includes(q)) {
      matchIds.add(n.id);
      const path = ancestors(n.id, TREE) || [];
      path.forEach(pid => matchIds.add(pid));
    }
  });
  rows.forEach(r => {
    const id = r.dataset.id;
    r.style.display = matchIds.has(id) ? '' : 'none';
  });
  document.querySelectorAll('#nav-tree .nkids').forEach(k => {
    const id = k.id.replace('nk-','');
    k.classList.toggle('open', matchIds.has(id));
  });
}

function scrollActiveIntoView() {
  const a = document.querySelector('#nav-tree .nrow.active');
  if(a) a.scrollIntoView({ block:'nearest', behavior:'smooth' });
}

// ── Hover-collapse behaviour ──────────────────────────────────────────────────
// Sidebar starts expanded. Collapses 1.2s after mouse leaves. Re-expands instantly on hover.
function initHoverCollapse() {
  const sb   = document.getElementById('sidebar');
  const main = document.querySelector('.main');
  if(!sb) return;

  let leaveTimer = null;
  const DELAY = 1200; // ms before collapse after mouse leaves

  function collapse() {
    sb.classList.add('sb-collapsed');
    if(main) main.classList.add('sb-collapsed');
  }
  function expand() {
    sb.classList.remove('sb-collapsed');
    if(main) main.classList.remove('sb-collapsed');
  }

  sb.addEventListener('mouseleave', () => {
    leaveTimer = setTimeout(collapse, DELAY);
  });
  sb.addEventListener('mouseenter', () => {
    if(leaveTimer) { clearTimeout(leaveTimer); leaveTimer = null; }
    expand();
  });

  // Expand when mouse approaches left edge of window (within 8px)
  document.addEventListener('mousemove', e => {
    if(e.clientX <= 8) expand();
  });
}

// ── Chart helpers (used by index.html) ───────────────────────────────────────
function chartDefaults() {
  return {
    responsive: true, maintainAspectRatio: false,
    plugins:{ legend:{ labels:{ font:{ family:'IBM Plex Sans, Arial', size:10 }, boxWidth:11, padding:10 } } }
  };
}
const CC = {
  crit:'#B71C1C', high:'#E65100', med:'#F9A825', low:'#2E7D32',
  opp:'#0D47A1', navy:'#1B2A4A', gold:'#C9A84C', grey:'#8A94A6',
  catMap:{
    'Safety / OH&S':'#7F0000','Environmental':'#004D40','Energy':'#003366',
    'Sustainability':'#4A148C','Social / Labour':'#1A237E','Anti-Bribery':'#3E0066',
    'Compliance Risk':'#37474F','Opportunity':'#0D47A1','Quality':'#1B5E20',
    'Social':'#1A237E','Multi':'#37474F',
  },
};
