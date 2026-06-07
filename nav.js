/**
 * SAGCO IMS — Hierarchical Tree Navigation  Rev.16 Final
 * ─────────────────────────────────────────────────────────
 * Tree driven entirely by the TREE constant below.
 * Each node: { id, label, file, level, badge, badgeCls, children[] }
 * Active page is highlighted; its full ancestor path stays open.
 * State (open/closed) persists in sessionStorage.
 * Clicking a link opens the page WITHOUT collapsing the tree.
 */

const TREE = [
  { id:'home', label:'IMS Home / Dashboard', file:'index.html', level:'L0', icon:'🏠' },
  { id:'hub',  label:'IMS Procedures Hub',   file:'procedures.html', level:'L0', icon:'📋' },

  // ── CLAUSE 4 ──────────────────────────────────────────────────────────────
  { id:'c4', label:'Clause 4 — Organisational Context', level:'clause', icon:'🏢', children:[
    { id:'c4-proc', label:'L2-IMS-400-P-01  Organisational Context', file:'proc-c4.html', level:'L2', icon:'📄', badge:'Rev.02',
      children:[
        { id:'c4-r1', label:'Context Register',      file:'context.html',      level:'L4', icon:'📊', sheet:'Sheet 1' },
        { id:'c4-r2', label:'PESTLE & SWOT',          file:'pestle-swot.html',  level:'L4', icon:'📊', sheet:'Sheet 2' },
        { id:'c4-r3', label:'Scope & Process Map',    file:'scope.html',        level:'L4', icon:'📊', sheet:'Sheet 9' },
        { id:'c4-r4', label:'Annual MR Checklist',    file:'checklist.html',    level:'L4', icon:'✅', sheet:'Sheet 10', badge:'URGENT', badgeCls:'nb-red' },
      ]
    }
  ]},

  // ── CLAUSE 5 ──────────────────────────────────────────────────────────────
  { id:'c5', label:'Clause 5 — Leadership & Commitment', level:'clause', icon:'👔', children:[
    { id:'c5-proc', label:'L2-IMS-500-P-02  Leadership and Commitment', file:'proc-c5.html', level:'L2', icon:'📄', badge:'Rev.02',
      children:[
        { id:'c5-r1', label:'IMS Policies Register',          file:'policies.html',             level:'L4', icon:'📋', sheet:'Sheet 11' },
        { id:'c5-r2', label:'Worker Participation Register',  file:'worker-participation.html', level:'L4', icon:'👷', sheet:'Sheet 12' },
        { id:'c5-r3', label:'Policy Acknowledgement Register',file:'policy-acknowledgement.html',level:'L4', icon:'✍', sheet:'Sheet 56' },
        { id:'c5-r4', label:'Gemba Walk Log',                 file:'gemba-walk-log.html',       level:'L4', icon:'🚶', sheet:'Sheet 62' },
        { id:'c5-r5', label:'Steering Team Minutes',          file:'steering-team-minutes.html',level:'L4', icon:'📝', sheet:'Sheet 63' },
        { id:'c5-r6', label:'EnMS Champion Record',           file:'enms-champion.html',        level:'L4', icon:'⚡', sheet:'Sheet 66', badge:'PENDING', badgeCls:'nb-red' },
        { id:'c5-r7', label:'CEO-Signed Records Tracker',     file:'ceo-signed-records.html',   level:'L4', icon:'📌', sheet:'Sheet 67', badge:'URGENT', badgeCls:'nb-red' },
        { id:'c5-r8', label:'Communication Matrix',           file:'communication-matrix.html', level:'L4', icon:'📡', sheet:'Sheet 68' },
      ]
    }
  ]},

  // ── CLAUSE 6 ──────────────────────────────────────────────────────────────
  { id:'c6', label:'Clause 6 — Planning & Risk Management', level:'clause', icon:'⚠', children:[
    { id:'c6-proc', label:'L2-IMS-600-P-03  Planning and Risk Management', file:'proc-c6.html', level:'L2', icon:'📄', badge:'Rev.02',
      children:[
        { id:'c6-r1',  label:'Integrated Risk Register',    file:'risk-register.html',  level:'L4', icon:'⚠', sheet:'Sheet 3',  badge:'CRIT',   badgeCls:'nb-red' },
        { id:'c6-r2',  label:'Legal & Compliance Register', file:'compliance.html',     level:'L4', icon:'⚖', sheet:'Sheet 4',  badge:'URGENT', badgeCls:'nb-red' },
        { id:'c6-r3',  label:'Risk Assessment WI',          file:'methodology.html',    level:'L3', icon:'📐', sheet:'Sheet 5' },
        { id:'c6-r4',  label:'Objectives & KPI Register',   file:'objectives.html',     level:'L4', icon:'🎯', sheet:'Sheet 6',  badge:'URGENT', badgeCls:'nb-red' },
        { id:'c6-r5',  label:'MOC Register',                file:'moc.html',            level:'L4', icon:'🔄', sheet:'Sheet 7' },
        { id:'c6-r6',  label:'Energy Planning Register',    file:'energy.html',         level:'L4', icon:'⚡', sheet:'Sheet 8' },
        { id:'c6-r7',  label:'HIRA Register',               file:'hira.html',           level:'L4', icon:'⛑', sheet:'Sheet 13' },
        { id:'c6-r8',  label:'SEA Register',                file:'sea-register.html',   level:'L4', icon:'🌿', sheet:'Sheet 14' },
        { id:'c6-r9',  label:'Bribery Risk Register',       file:'bribery-risk-register.html', level:'L4', icon:'🔍', sheet:'Sheet 61' },
        { id:'c6-r10', label:'GHG Inventory Report',        file:'ghg-inventory.html',  level:'L4', icon:'🌡', sheet:'Sheet 69' },
        { id:'c6-r11', label:'Scope 3 Emissions Register',  file:'scope3-emissions.html',level:'L4',icon:'🌱', sheet:'Sheet 27' },
      ]
    }
  ]},

  // ── CLAUSE 7 ──────────────────────────────────────────────────────────────
  { id:'c7', label:'Clause 7 — Support', level:'clause', icon:'🎓', children:[
    { id:'c7-proc', label:'L2-IMS-700-P-04  Support', file:'proc-c7.html', level:'L2', icon:'📄', badge:'Rev.02',
      children:[
        { id:'c7-r1', label:'Competency Matrix',          file:'competency.html',     level:'L4', icon:'🎓', sheet:'Sheet 15' },
        { id:'c7-r2', label:'Training Register',          file:'training.html',       level:'L4', icon:'📚', sheet:'Sheet 16' },
        { id:'c7-r3', label:'Training Attendance Records',file:'training-attendance.html', level:'L4', icon:'✅', sheet:'Sheet 60' },
        { id:'c7-r4', label:'Induction Records Register', file:'induction-records.html',   level:'L4', icon:'🆕', sheet:'Sheet 55', badge:'URGENT', badgeCls:'nb-red' },
        { id:'c7-r5', label:'Documentation Register',     file:'documentation.html',  level:'L4', icon:'📄', sheet:'Sheet 17' },
        { id:'c7-r6', label:'Calibration Register',       file:'calibration-register.html', level:'L4', icon:'🔬', sheet:'Sheet 54', badge:'URGENT', badgeCls:'nb-red' },
      ]
    }
  ]},

  // ── CLAUSE 8 ──────────────────────────────────────────────────────────────
  { id:'c8', label:'Clause 8 — Operational Control', level:'clause', icon:'⚙', children:[
    { id:'c8-proc', label:'L2-IMS-800-P-05  Operational Control', file:'proc-c8.html', level:'L2', icon:'📄', badge:'Rev.01',
      children:[
        { id:'c8-fw', label:'Operational Framework', file:'operational-control.html', level:'L3', icon:'🗺' },

        // OC-01
        { id:'oc1', label:'L3-IMS-800-OC-01  Safety & Emergency Controls', file:'oc01-safety.html', level:'L3', icon:'🦺',
          children:[
            { id:'oc1-r1',  label:'PTW Register',                file:'ptw-register.html',          level:'L4', icon:'📋', sheet:'Sheet 36', badge:'CAPA-001', badgeCls:'nb-red' },
            { id:'oc1-r2',  label:'Emergency Response Plan',     file:'emergency-response.html',    level:'L4', icon:'🚨', sheet:'Sheet 34b', badge:'DRILL!', badgeCls:'nb-red' },
            { id:'oc1-r3',  label:'Contractor Register',         file:'contractor-register.html',   level:'L4', icon:'🏭', sheet:'Sheet 35' },
            { id:'oc1-r4',  label:'LOTO Device Register',        file:'loto-register.html',         level:'L4', icon:'🔒', sheet:'Sheet 37' },
            { id:'oc1-r5',  label:'LOTO Authorised Persons',     file:'loto-auth-persons.html',     level:'L4', icon:'👤', sheet:'Sheet 59' },
            { id:'oc1-r6',  label:'Confined Space Entry Log',    file:'confined-space-log.html',    level:'L4', icon:'⬛', sheet:'Sheet 38' },
            { id:'oc1-r7',  label:'Heat Stress / WBGT Log',      file:'heat-stress-log.html',       level:'L4', icon:'🌡', sheet:'Sheet 39', badge:'Jun–Sep', badgeCls:'nb-amb' },
            { id:'oc1-r8',  label:'Fire Extinguisher Log',       file:'fire-extinguisher-log.html', level:'L4', icon:'🧯', sheet:'Sheet 40', badge:'CAPA-004', badgeCls:'nb-red' },
            { id:'oc1-r9',  label:'Fire Pump Test Log',          file:'fire-pump-log.html',         level:'L4', icon:'💧', sheet:'Sheet 41' },
            { id:'oc1-r10', label:'OH Surveillance Register',    file:'oh-surveillance.html',       level:'L4', icon:'🏥', sheet:'Sheet 42' },
            { id:'oc1-r11', label:'Scaffold Inspection Register',file:'scaffold-inspection.html',   level:'L4', icon:'🏗', sheet:'Sheet 64' },
            { id:'oc1-r12', label:'Radiography / NDT Permit Log',file:'ndt-permit-log.html',        level:'L4', icon:'☢', sheet:'Sheet 65' },
            { id:'oc1-r13', label:'Chemical Inventory Register', file:'chemical-inventory.html',    level:'L4', icon:'⚗', sheet:'Sheet 58', badge:'GHS', badgeCls:'nb-amb' },
            { id:'oc1-r14', label:'Crane & Lifting Register',    file:'crane-lifting.html',         level:'L4', icon:'🏗', sheet:'Sheet 57' },
          ]
        },

        // OC-02
        { id:'oc2', label:'L3-IMS-800-OC-02  Environmental & Energy Controls', file:'oc02-environment.html', level:'L3', icon:'🌿',
          children:[
            { id:'oc2-r1', label:'Waste Management Register',    file:'waste-management.html',   level:'L4', icon:'♻', sheet:'Sheet 45b' },
            { id:'oc2-r2', label:'Chemical Storage & Spills',    file:'chemical-storage.html',   level:'L4', icon:'🧪', sheet:'Sheet 46' },
            { id:'oc2-r3', label:'Furnace Monitoring Logs',      file:'furnace-monitoring.html', level:'L4', icon:'🔥', sheet:'Sheet 47', badge:'F4 URGENT', badgeCls:'nb-red' },
            { id:'oc2-r4', label:'MEPS Compliance Register',     file:'meps-register.html',      level:'L4', icon:'⚡', sheet:'Sheet 48' },
            { id:'oc2-r5', label:'Water & Waste Data',           file:'water-waste.html',        level:'L4', icon:'💧', sheet:'Sheet 30' },
          ]
        },

        // OC-03
        { id:'oc3', label:'L3-IMS-800-OC-03  Quality & Customer Controls', file:'oc03-quality.html', level:'L3', icon:'✅',
          children:[
            { id:'oc3-r1', label:'Customer Requirements Register', file:'customer-register.html',    level:'L4', icon:'🤝', sheet:'Sheet 52' },
            { id:'oc3-r2', label:'In-Process Inspection Log',      file:'inprocess-inspection.html', level:'L4', icon:'🔎', sheet:'Sheet 53' },
            { id:'oc3-r3', label:'Product Release Records',        file:'product-release.html',      level:'L4', icon:'✅', sheet:'Sheet 49' },
            { id:'oc3-r4', label:'Nonconforming Products Register',file:'nonconforming.html',        level:'L4', icon:'❌', sheet:'Sheet 50' },
            { id:'oc3-r5', label:'Incoming Inspection Records',    file:'incoming-inspection.html',  level:'L4', icon:'📥', sheet:'Sheet 51' },
          ]
        },
      ]
    }
  ]},

  // ── CLAUSE 9 ──────────────────────────────────────────────────────────────
  { id:'c9', label:'Clause 9 — Performance Evaluation', level:'clause', icon:'📊', children:[
    { id:'c9-proc', label:'L2-IMS-900-P-06  Performance Evaluation', file:'proc-c9.html', level:'L2', icon:'📄', badge:'Rev.02',
      children:[
        { id:'c9-r1', label:'KPI Dashboard',              file:'kpi-dashboard.html',   level:'L4', icon:'📊', sheet:'Sheet 18' },
        { id:'c9-r2', label:'Compliance Evaluation',      file:'compliance-eval.html', level:'L4', icon:'⚖', sheet:'Sheet 19' },
        { id:'c9-r3', label:'Internal Audit Programme',   file:'audit-programme.html', level:'L4', icon:'🔍', sheet:'Sheet 20' },
        { id:'c9-r4', label:'Management Review Register', file:'management-review.html',level:'L4',icon:'📋', sheet:'Sheet 22' },
      ]
    }
  ]},

  // ── CLAUSE 10 ─────────────────────────────────────────────────────────────
  { id:'c10', label:'Clause 10 — Improvement & Corrective Action', level:'clause', icon:'🔧', children:[
    { id:'c10-proc', label:'L2-IMS-1000-P-07  Improvement and Corrective Action', file:'proc-c10.html', level:'L2', icon:'📄', badge:'Rev.02',
      children:[
        { id:'c10-r1', label:'CAPA Register',       file:'capa-register.html',   level:'L4', icon:'🔧', sheet:'Sheet 21', badge:'4 OPEN', badgeCls:'nb-amb' },
        { id:'c10-r2', label:'Incident Register',   file:'incident-register.html',level:'L4',icon:'🚨', sheet:'Sheet 23' },
      ]
    }
  ]},

  // ── ESG / SUSTAINABILITY / ETHICS ─────────────────────────────────────────
  { id:'esg', label:'ESG / Sustainability / Ethics', level:'clause', icon:'🌍', children:[
    { id:'esg-env', label:'Environment', level:'group', icon:'🌿', children:[
      { id:'esg-e1', label:'Scope 3 Emissions Register', file:'scope3-emissions.html', level:'L4', icon:'🌱', sheet:'Sheet 27' },
      { id:'esg-e2', label:'Water & Waste Data',          file:'water-waste.html',      level:'L4', icon:'💧', sheet:'Sheet 30' },
    ]},
    { id:'esg-lab', label:'Labour & Human Rights', level:'group', icon:'👥', children:[
      { id:'esg-l1', label:'Workforce Diversity Register',file:'workforce-diversity.html',level:'L4', icon:'👥', sheet:'Sheet 28' },
    ]},
    { id:'esg-eth', label:'Ethics & Anti-Bribery', level:'group', icon:'🔍', children:[
      { id:'esg-t1', label:'Conflict of Interest Register', file:'coi-register.html',      level:'L4', icon:'📝', sheet:'Sheet 25' },
      { id:'esg-t2', label:'Gifts & Hospitality Register',  file:'gifts-hospitality.html', level:'L4', icon:'🎁', sheet:'Sheet 26' },
      { id:'esg-t3', label:'Third-Party Due Diligence Log', file:'tpdd.html',              level:'L4', icon:'🔎', sheet:'Sheet 29' },
    ]},
    { id:'esg-sup', label:'Sustainable Procurement', level:'group', icon:'🏭', children:[
      { id:'esg-s1', label:'Supplier ESG Register',       file:'supplier-esg.html',     level:'L4', icon:'📊', sheet:'Sheet 24' },
      { id:'esg-s2', label:'Supplier Code of Conduct',    file:'supplier-conduct.html', level:'L4', icon:'📜', sheet:'Sheet 31' },
    ]},
  ]},
];

// ── Level colour map ──────────────────────────────────────────────────────────
const LEVEL_COLOR = {
  L0:'#1B2A4A', clause:'#1B2A4A', group:'#2A3F6A',
  L2:'#1565C0', L3:'#1A5C1A', L4:'#37474F'
};
const LEVEL_BG = {
  L0:'rgba(201,168,76,.15)', clause:'rgba(201,168,76,.08)', group:'rgba(255,255,255,.04)',
  L2:'rgba(21,101,192,.12)', L3:'rgba(26,92,26,.10)', L4:'transparent'
};
const LEVEL_LABEL = { L0:'Home', clause:'Clause', group:'Group', L2:'Procedure', L3:'OC Spec', L4:'Register/Record' };

// ── Flatten tree for lookup ───────────────────────────────────────────────────
function flattenTree(nodes, result=[]) {
  nodes.forEach(n => { result.push(n); if(n.children) flattenTree(n.children, result); });
  return result;
}
const FLAT = flattenTree(TREE);

// ── Find active node and all ancestor IDs ─────────────────────────────────────
function findActive(file) {
  return FLAT.find(n => n.file === file) || null;
}
function getAncestors(nodeId, nodes, path=[]) {
  for(const n of nodes) {
    if(n.id === nodeId) return [...path, n.id];
    if(n.children) {
      const found = getAncestors(nodeId, n.children, [...path, n.id]);
      if(found) return found;
    }
  }
  return null;
}

// ── Session storage for tree state ───────────────────────────────────────────
function getOpenIds() {
  try { return new Set(JSON.parse(sessionStorage.getItem('ims-nav-open')||'[]')); }
  catch(e) { return new Set(); }
}
function saveOpenIds(set) {
  try { sessionStorage.setItem('ims-nav-open', JSON.stringify([...set])); } catch(e){}
}

// ── Build nav HTML ────────────────────────────────────────────────────────────
function buildNav(activePage, openIds) {
  function nodeHtml(node, depth) {
    const isActive = node.file === activePage;
    const hasChildren = node.children && node.children.length > 0;
    const isOpen = hasChildren && (openIds.has(node.id) || isActive);
    const indent = depth * 14;
    const lc = LEVEL_COLOR[node.level] || '#555';
    const lb = LEVEL_BG[node.level] || 'transparent';

    let badge = '';
    if(node.badge) {
      const bc = node.badgeCls || 'nb-gold';
      badge = `<span class="nb ${bc}">${node.badge}</span>`;
    }

    let levelPill = '';
    if(node.level && node.level !== 'clause' && node.level !== 'group' && node.level !== 'L0') {
      levelPill = `<span class="nlvl" style="background:${lc}20;color:${lc}">${node.level}</span>`;
    }

    let toggle = hasChildren
      ? `<span class="ntog ${isOpen?'open':''}" data-id="${node.id}">▶</span>`
      : `<span class="ntog-pad"></span>`;

    let icon = node.icon ? `<span class="nicon">${node.icon}</span>` : '';

    let content;
    if(node.file) {
      content = `<a href="${node.file}" class="nlink ${isActive?'active':''}" style="padding-left:${indent+4}px;background:${isActive?'rgba(201,168,76,.18)':lb}" data-id="${node.id}">
        ${toggle}${icon}<span class="nlabel">${node.label}</span>${levelPill}${badge}
      </a>`;
    } else {
      content = `<div class="ngroup" style="padding-left:${indent+4}px;background:${lb}" data-id="${node.id}">
        ${toggle}${icon}<span class="nlabel">${node.label}</span>${badge}
      </div>`;
    }

    let children = '';
    if(hasChildren) {
      children = `<div class="nchildren ${isOpen?'open':''}" id="nc-${node.id}">
        ${node.children.map(c => nodeHtml(c, depth+1)).join('')}
      </div>`;
    }
    return content + children;
  }

  return TREE.map(n => nodeHtml(n, 0)).join('');
}

// ── Render full sidebar ───────────────────────────────────────────────────────
function renderNav(activePage) {
  const activeNode = findActive(activePage);
  const openIds = getOpenIds();

  // Always open ancestors of active page
  if(activeNode) {
    const ancestors = getAncestors(activeNode.id, TREE) || [];
    ancestors.forEach(id => openIds.add(id));
    saveOpenIds(openIds);
  }

  const navHtml = buildNav(activePage, openIds);

  return `<div class="sidebar" id="sidebar">
    <a class="sb-logo" href="index.html">
      <div class="sb-logo-icon">S</div>
      <div class="sb-logo-text"><strong>SAGCO IMS</strong><span>Rev.16 · June 2026</span></div>
    </a>
    <div class="sb-search">
      <input type="text" id="nav-search" placeholder="Search documents…" autocomplete="off">
    </div>
    <div class="nav-tree" id="nav-tree">${navHtml}</div>
    <div class="sb-footer">
      <div class="sync-row"><span class="sync-dot"></span><span>Live — Google Sheets</span></div>
      <div style="margin-top:4px;opacity:.7;font-size:9px">ISO 45001 · 14001 · 50001 · 9001</div>
    </div>
  </div>`;
}

// ── Toggle handler (delegated) ────────────────────────────────────────────────
function initTreeHandlers() {
  const tree = document.getElementById('nav-tree');
  if(!tree) return;

  tree.addEventListener('click', e => {
    const tog = e.target.closest('.ntog');
    const grp = e.target.closest('.ngroup');

    if(tog) {
      e.preventDefault(); e.stopPropagation();
      const id = tog.dataset.id;
      const children = document.getElementById('nc-' + id);
      if(!children) return;
      const openIds = getOpenIds();
      if(openIds.has(id)) { openIds.delete(id); tog.classList.remove('open'); children.classList.remove('open'); }
      else                { openIds.add(id);    tog.classList.add('open');    children.classList.add('open'); }
      saveOpenIds(openIds);
      return;
    }

    if(grp) {
      const id = grp.dataset.id;
      const tog2 = grp.querySelector('.ntog');
      const children = document.getElementById('nc-' + id);
      if(!children || !tog2) return;
      const openIds = getOpenIds();
      if(openIds.has(id)) { openIds.delete(id); tog2.classList.remove('open'); children.classList.remove('open'); }
      else                { openIds.add(id);    tog2.classList.add('open');    children.classList.add('open'); }
      saveOpenIds(openIds);
    }
  });

  // Search filter
  const search = document.getElementById('nav-search');
  if(search) {
    search.addEventListener('input', () => {
      const q = search.value.toLowerCase().trim();
      if(!q) { tree.querySelectorAll('.nlink,.ngroup').forEach(el=>el.style.display=''); return; }
      FLAT.forEach(n => {
        const el = tree.querySelector(`[data-id="${n.id}"]`);
        if(el) el.style.display = n.label.toLowerCase().includes(q) ? '' : 'none';
      });
    });
  }
}

// ── Topbar ────────────────────────────────────────────────────────────────────
function renderTopbar(title, subtitle) {
  return `<div class="topbar">
    <div class="topbar-left">
      <button class="sb-toggle" onclick="document.getElementById('sidebar').classList.toggle('collapsed')" title="Toggle navigation">☰</button>
      <div class="breadcrumb">SAGCO IMS &rsaquo; <strong>${title}</strong></div>
    </div>
    <div class="topbar-right">
      ${subtitle ? `<span style="font-size:11px;color:var(--g400)">${subtitle}</span>` : ''}
      <button class="btn btn-ghost" onclick="location.reload()">↻</button>
    </div>
  </div>`;
}

// ── Init ──────────────────────────────────────────────────────────────────────
function initPage(activePage) {
  const sb = document.createElement('div');
  sb.innerHTML = renderNav(activePage);
  document.body.insertBefore(sb.firstElementChild, document.body.firstChild);
  requestAnimationFrame(initTreeHandlers);

  // Scroll active item into view
  requestAnimationFrame(() => {
    const active = document.querySelector('.nlink.active');
    if(active) active.scrollIntoView({ block:'nearest', behavior:'smooth' });
  });
}

// ── Chart / CC helpers (used by index.html) ───────────────────────────────────
function chartDefaults() {
  return {
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { labels: { font: { family:"Arial", size:10 }, boxWidth:11, padding:10 } } }
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
