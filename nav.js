/* ═══════════════════════════════════════════════════════════════
   SAGCO IMS — Shared Navigation
   nav.js  |  Rev.18  |  June 2026
   Fixes: sidebar scroll position preserved on navigation (Issue 1)
          proper tree indentation with depth tracking (Issue 3)
═══════════════════════════════════════════════════════════════ */

/* ── Navigation Tree ───────────────────────────────────────── */
/* Structure:
   IMS Dashboard (root — collapsible)
     └─ Procedures Hub
     └─ Clause 4 (collapsible)
          └─ L2 Procedure (collapsible)
               └─ L4 Registers / Records
     └─ Clause 5 … etc.
     └─ ESG / Sustainability
     └─ Document Management
     └─ Administration
*/
var TREE = [
  { id:'root', label:'IMS Dashboard', file:'index.html', level:'L0', children:[

    { id:'procs', label:'Procedures Hub', file:'procedures.html', level:'L0' },

    /* ── IMS Manual ─────────────────────────────────────────── */
    { id:'ims-manual', label:'IMS Manual', file:'ims-manual.html', level:'L0', badge:'L1', tag:'MAN-01' },

    /* ── IMS Framework (Governance · KPIs · Policies — single page) ── */
    { id:'ims-framework', label:'IMS Framework', level:'clause', children:[
      { id:'fw-gov',  label:'Governance',            file:'ims-framework.html', level:'L0', badge:'§5.1' },
      { id:'fw-pol',  label:'Policies (PO-01→09)',   file:'ims-framework.html', level:'L0', badge:'9 Policies' },
      { id:'fw-kpi',  label:'KPIs & Objectives',     file:'ims-framework.html', level:'L0', badge:'26 KPIs' },
    ]},

    /* ── Clause 4 ─────────────────────────────────── */
    { id:'c4', label:'Clause 4 — Organisational Context', level:'clause', children:[
      { id:'c4p', label:'L2-P-01  Organisational Context', file:'proc-c4.html', level:'L2', badge:'Rev.02',
        children:[
          { id:'ctx',  label:'Context Register',    file:'context.html',    level:'L4', tag:'Sh.1'  },
          { id:'pest', label:'PESTLE & SWOT',        file:'pestle-swot.html',level:'L4', tag:'Sh.2'  },
          { id:'scp',  label:'Scope & Process Map',  file:'scope.html',      level:'L4', tag:'Sh.9'  },
          { id:'chk',  label:'Annual MR Checklist',  file:'checklist.html',  level:'L4', tag:'Sh.10' },
        ]
      }
    ]},

    /* ── Clause 5 ─────────────────────────────────── */
    { id:'c5', label:'Clause 5 — Leadership & Commitment', level:'clause', children:[
      { id:'c5p', label:'L2-P-02  Leadership & Commitment', file:'proc-c5.html', level:'L2', badge:'Rev.02',
        children:[
          { id:'pol',  label:'IMS Policies Register',       file:'policies.html',              level:'L4', tag:'Sh.11' },
          { id:'wkp',  label:'Worker Participation',         file:'worker-participation.html',  level:'L4', tag:'Sh.12' },
          { id:'pack', label:'Policy Acknowledgement',       file:'policy-acknowledgement.html',level:'L4', tag:'Sh.56', badge:'URGENT', bc:'red' },
          { id:'gmb',  label:'Gemba Walk Log',               file:'gemba-walk-log.html',        level:'L4', tag:'Sh.62' },
          { id:'stm',  label:'Steering Team Minutes',        file:'steering-team-minutes.html', level:'L4', tag:'Sh.63' },
          { id:'enc',  label:'EnMS Champion Record',         file:'enms-champion.html',         level:'L4', tag:'Sh.66', badge:'PENDING', bc:'amb' },
          { id:'ceo',  label:'CEO-Signed Records Tracker',   file:'ceo-signed-records.html',    level:'L4', tag:'Sh.67', badge:'URGENT', bc:'red' },
          { id:'com',  label:'Communication Matrix',         file:'communication-matrix.html',  level:'L4', tag:'Sh.68' },
        ]
      }
    ]},

    /* ── Clause 6 ─────────────────────────────────── */
    { id:'c6', label:'Clause 6 — Planning & Risk Management', level:'clause', children:[
      { id:'c6p', label:'L2-P-03  Planning & Risk Mgmt', file:'proc-c6.html', level:'L2', badge:'Rev.02',
        children:[
          { id:'rsk',  label:'Integrated Risk Register',    file:'risk-register.html',       level:'L4', tag:'Sh.3',  badge:'CRIT',   bc:'red' },
          { id:'cmp',  label:'Legal & Compliance Register', file:'compliance.html',           level:'L4', tag:'Sh.4',  badge:'URGENT', bc:'red' },
          { id:'mth',  label:'Risk Assessment WI',          file:'methodology.html',          level:'L3', tag:'Sh.5'  },
          { id:'obj',  label:'Objectives & KPI Register',   file:'objectives.html',           level:'L4', tag:'Sh.6',  badge:'URGENT', bc:'red' },
          { id:'moc',  label:'MOC Register',                file:'moc.html',                  level:'L4', tag:'Sh.7'  },
          { id:'eny',  label:'Energy Planning Register',    file:'energy.html',               level:'L4', tag:'Sh.8'  },
          { id:'hir',  label:'HIRA Register',               file:'hira.html',                 level:'L4', tag:'Sh.13' },
          { id:'sea',  label:'SEA Register',                file:'sea-register.html',         level:'L4', tag:'Sh.14' },
          { id:'bry',  label:'Bribery Risk Register',       file:'bribery-risk-register.html',level:'L4', tag:'Sh.61' },
          { id:'ghg',  label:'GHG Inventory Report',        file:'ghg-inventory.html',        level:'L4', tag:'Sh.69' },
          { id:'sc3',  label:'Scope 3 Emissions',           file:'scope3-emissions.html',     level:'L4', tag:'Sh.27' },
        ]
      }
    ]},

    /* ── Clause 7 ─────────────────────────────────── */
    { id:'c7', label:'Clause 7 — Support', level:'clause', children:[
      { id:'c7p', label:'L2-P-04  Support', file:'proc-c7.html', level:'L2', badge:'Rev.02',
        children:[
          { id:'cmp7', label:'Competency Matrix',           file:'competency.html',           level:'L4', tag:'Sh.15' },
          { id:'trn',  label:'Training Register',           file:'training.html',             level:'L4', tag:'Sh.16' },
          { id:'tra',  label:'Training Attendance Records', file:'training-attendance.html',  level:'L4', tag:'Sh.60' },
          { id:'ind',  label:'Induction Records Register',  file:'induction-records.html',    level:'L4', tag:'Sh.55', badge:'URGENT', bc:'red' },
          { id:'doc',  label:'Documentation Register',      file:'documentation.html',        level:'L4', tag:'Sh.17' },
          { id:'cal',  label:'Calibration Register',        file:'calibration-register.html', level:'L4', tag:'Sh.54', badge:'URGENT', bc:'red' },
        ]
      }
    ]},

    /* ── Clause 8 ─────────────────────────────────── */
    { id:'c8', label:'Clause 8 — Operational Control', level:'clause', children:[
      { id:'c8p', label:'L2-P-05  Operational Control', file:'proc-c8.html', level:'L2', badge:'Rev.01',
        children:[
          { id:'opc', label:'Operational Framework', file:'operational-control.html', level:'L2' },
          { id:'oc1', label:'OC-01  Safety & Emergency', file:'oc01-safety.html', level:'L3',
            children:[
              { id:'ptw',  label:'PTW Register',             file:'ptw-register.html',         level:'L4', tag:'Sh.36',  badge:'CAPA-001', bc:'red' },
              { id:'eme',  label:'Emergency Response Plan',   file:'emergency-response.html',   level:'L4', tag:'Sh.34b', badge:'DRILL!',   bc:'red' },
              { id:'con',  label:'Contractor Register',       file:'contractor-register.html',  level:'L4', tag:'Sh.35'  },
              { id:'lot',  label:'LOTO Device Register',      file:'loto-register.html',        level:'L4', tag:'Sh.37'  },
              { id:'lta',  label:'LOTO Authorised Persons',   file:'loto-auth-persons.html',    level:'L4', tag:'Sh.59'  },
              { id:'csl',  label:'Confined Space Entry Log',  file:'confined-space-log.html',   level:'L4', tag:'Sh.38'  },
              { id:'hts',  label:'Heat Stress / WBGT Log',    file:'heat-stress-log.html',      level:'L4', tag:'Sh.39'  },
              { id:'fxl',  label:'Fire Extinguisher Log',     file:'fire-extinguisher-log.html',level:'L4', tag:'Sh.40',  badge:'CAPA-004', bc:'red' },
              { id:'fpl',  label:'Fire Pump Test Log',        file:'fire-pump-log.html',        level:'L4', tag:'Sh.41'  },
              { id:'ohs',  label:'OH Surveillance Register',  file:'oh-surveillance.html',      level:'L4', tag:'Sh.42'  },
              { id:'sca',  label:'Scaffold Inspection',       file:'scaffold-inspection.html',  level:'L4', tag:'Sh.64'  },
              { id:'ndt',  label:'NDT / Radiography Log',     file:'ndt-permit-log.html',       level:'L4', tag:'Sh.65'  },
              { id:'chi',  label:'Chemical Inventory (GHS)',  file:'chemical-inventory.html',   level:'L4', tag:'Sh.58'  },
              { id:'crl',  label:'Crane & Lifting Register',  file:'crane-lifting.html',        level:'L4', tag:'Sh.57'  },
            ]
          },
          { id:'oc2', label:'OC-02  Environment & Energy', file:'oc02-environment.html', level:'L3',
            children:[
              { id:'wst',  label:'Waste Management Register',  file:'waste-management.html',    level:'L4', tag:'Sh.45b' },
              { id:'chs',  label:'Chemical Storage & Spills',  file:'chemical-storage.html',    level:'L4', tag:'Sh.46'  },
              { id:'fur',  label:'Furnace Monitoring Logs',    file:'furnace-monitoring.html',   level:'L4', tag:'Sh.47',  badge:'F4!', bc:'red' },
              { id:'mep',  label:'MEPS Compliance Register',   file:'meps-register.html',       level:'L4', tag:'Sh.48'  },
              { id:'wwd',  label:'Water & Waste Data',         file:'water-waste.html',          level:'L4', tag:'Sh.30'  },
            ]
          },
          { id:'oc3', label:'OC-03  Quality & Customer', file:'oc03-quality.html', level:'L3',
            children:[
              { id:'cus',  label:'Customer Requirements Reg.',  file:'customer-register.html',    level:'L4', tag:'Sh.52' },
              { id:'ipl',  label:'In-Process Inspection Log',   file:'inprocess-inspection.html', level:'L4', tag:'Sh.53' },
              { id:'prd',  label:'Product Release Records',     file:'product-release.html',      level:'L4', tag:'Sh.49' },
              { id:'ncr',  label:'Nonconforming Products',      file:'nonconforming.html',        level:'L4', tag:'Sh.50' },
              { id:'ini',  label:'Incoming Inspection Records', file:'incoming-inspection.html',  level:'L4', tag:'Sh.51' },
            ]
          },
        ]
      }
    ]},

    /* ── Clause 9 ─────────────────────────────────── */
    { id:'c9', label:'Clause 9 — Performance Evaluation', level:'clause', children:[
      { id:'c9p', label:'L2-P-06  Performance Evaluation', file:'proc-c9.html', level:'L2', badge:'Rev.02',
        children:[
          { id:'kpi',  label:'KPI Dashboard',           file:'kpi-dashboard.html',    level:'L4', tag:'Sh.18' },
          { id:'cve',  label:'Compliance Evaluation',    file:'compliance-eval.html',  level:'L4', tag:'Sh.19' },
          { id:'aud',  label:'Internal Audit Programme', file:'audit-programme.html',  level:'L4', tag:'Sh.20' },
          { id:'mgr',  label:'Management Review',        file:'management-review.html',level:'L4', tag:'Sh.22' },
        ]
      }
    ]},

    /* ── Clause 10 ────────────────────────────────── */
    { id:'c10', label:'Clause 10 — Improvement', level:'clause', children:[
      { id:'c10p', label:'L2-P-07  Improvement & CA', file:'proc-c10.html', level:'L2', badge:'Rev.02',
        children:[
          { id:'cap',  label:'CAPA Register',     file:'capa-register.html',     level:'L4', tag:'Sh.21', badge:'4 OPEN', bc:'red' },
          { id:'inc',  label:'Incident Register',  file:'incident-register.html', level:'L4', tag:'Sh.23' },
        ]
      }
    ]},

    /* ── ESG ──────────────────────────────────────── */
    { id:'esg', label:'ESG / Sustainability / Ethics', level:'clause', children:[
      { id:'esg-env', label:'Environment', level:'grp', children:[
        { id:'sc3b', label:'Scope 3 Emissions',  file:'scope3-emissions.html',   level:'L4', tag:'Sh.27' },
        { id:'wwdb', label:'Water & Waste Data', file:'water-waste.html',         level:'L4', tag:'Sh.30' },
      ]},
      { id:'esg-lab', label:'Labour & Human Rights', level:'grp', children:[
        { id:'div',  label:'Workforce Diversity', file:'workforce-diversity.html', level:'L4', tag:'Sh.28' },
      ]},
      { id:'esg-eth', label:'Ethics & Anti-Bribery', level:'grp', children:[
        { id:'coi',  label:'Conflict of Interest',     file:'coi-register.html',     level:'L4', tag:'Sh.25' },
        { id:'gif',  label:'Gifts & Hospitality',       file:'gifts-hospitality.html',level:'L4', tag:'Sh.26' },
        { id:'tpd',  label:'Third-Party Due Diligence', file:'tpdd.html',             level:'L4', tag:'Sh.29' },
      ]},
      { id:'esg-pro', label:'Sustainable Procurement', level:'grp', children:[
        { id:'sesg', label:'Supplier ESG Register',    file:'supplier-esg.html',     level:'L4', tag:'Sh.24' },
        { id:'ssc',  label:'Supplier Code of Conduct', file:'supplier-conduct.html', level:'L4', tag:'Sh.31' },
      ]},
    ]},

    /* ── Document Management ──────────────────────── */
    { id:'dms', label:'Document Management', level:'clause', children:[
      { id:'dmsp', label:'Document & Evidence Register', file:'document-management.html', level:'L2' },
    ]},

    /* ── Administration ───────────────────────────── */
    { id:'adm', label:'Administration', level:'clause', children:[
      { id:'adm-usr', label:'User Management', file:'user-management.html', level:'L2' },
    ]},

  ]} /* end root */
];

/* ══════════════════════════════════════════════════════════════
   SESSION STORAGE
══════════════════════════════════════════════════════════════ */
var NAV_KEY    = 'ims-nav-open';
var SCROLL_KEY = 'ims-nav-scroll';

function getOpen() {
  try { return JSON.parse(sessionStorage.getItem(NAV_KEY) || '[]'); } catch(e) { return []; }
}
function setOpen(arr) {
  try { sessionStorage.setItem(NAV_KEY, JSON.stringify(arr)); } catch(e) {}
}
function saveScroll() {
  var tree = document.getElementById('nav-tree');
  if (tree) {
    try { sessionStorage.setItem(SCROLL_KEY, String(tree.scrollTop)); } catch(e) {}
  }
}
function restoreScroll() {
  var tree = document.getElementById('nav-tree');
  if (!tree) return;
  try {
    var v = parseInt(sessionStorage.getItem(SCROLL_KEY) || '0');
    tree.scrollTop = v;
  } catch(e) {}
}

/* ══════════════════════════════════════════════════════════════
   TREE LOOKUP HELPERS
══════════════════════════════════════════════════════════════ */
function findByFile(file, nodes, path) {
  path = path || [];
  for (var i = 0; i < nodes.length; i++) {
    var n   = nodes[i];
    var cur = path.concat(n.id);
    if (n.file === file) return cur;
    if (n.children) {
      var r = findByFile(file, n.children, cur);
      if (r) return r;
    }
  }
  return null;
}

/* ══════════════════════════════════════════════════════════════
   RENDER SIDEBAR HTML
   depth: 0 = top-level (L0 / clause), 1 = L2 procedure,
          2 = L3 OC spec,              3 = L4 register
══════════════════════════════════════════════════════════════ */
function buildSidebar(activeFile) {
  var open = getOpen();

  /* Always open ancestors of the active page */
  var path = findByFile(activeFile, TREE);
  if (path) {
    path.forEach(function(id) { if (open.indexOf(id) < 0) open.push(id); });
    /* Always keep root open when any child is active */
    if (path.length > 0 && open.indexOf('root') < 0) open.push('root');
    setOpen(open);
  }

  var html = '<div id="sidebar">';
  html += '<div class="sb-logo">'
       +  '<img src="sagco-logo.jpg" alt="SAGCO">'
       +  '<div class="sb-logo-text"><strong>SAGCO IMS</strong><span>Rev.18 · June 2026</span></div>'
       +  '</div>';
  html += '<div class="sb-search-wrap"><input class="sb-search" id="sb-search" type="text" placeholder="🔍  Search…"></div>';
  html += '<div class="nav-tree" id="nav-tree">' + renderNodes(TREE, open, activeFile, 0) + '</div>';
  html += '<div class="sb-foot"><span class="sync-dot"></span>'
       +  '<span class="sb-foot-text">ISO 45001 · 14001 · 50001 · 9001<br>TÜV Austria Stage 2</span></div>';
  html += '</div>';
  return html;
}

/* ── Indentation per depth ─────────────────────────────────── */
var DEPTH_PAD = [10, 14, 20, 26, 32];

function depthPad(depth) {
  var px = DEPTH_PAD[Math.min(depth, DEPTH_PAD.length - 1)];
  return 'padding-left:' + px + 'px';
}

function renderNodes(nodes, open, activeFile, depth) {
  var html = '';
  depth = depth || 0;

  for (var i = 0; i < nodes.length; i++) {
    var n        = nodes[i];
    var isOpen   = open.indexOf(n.id) >= 0;
    var hasKids  = n.children && n.children.length > 0;
    var isActive = n.file === activeFile;

    /* ── Clause heading — collapsible section divider ────────── */
    if (n.level === 'clause') {
      var cArrow = hasKids
        ? '<span class="nt" data-toggle="'+n.id+'">'+(isOpen?'▾':'▸')+'</span>'
        : '<span class="nt-pad"></span>';
      html += '<div class="nc-toggle" data-id="'+n.id+'" style="'+depthPad(depth)+';display:flex;align-items:center;cursor:pointer;padding-top:8px;padding-bottom:3px">'
            + cArrow
            + '<span class="nc" style="padding:0;margin:0;flex:1">'+n.label+'</span>'
            + '</div>';
      if (hasKids) {
        html += '<div class="nkids" id="nk-'+n.id+'" style="display:'+(isOpen?'block':'none')+'">';
        html += renderNodes(n.children, open, activeFile, depth + 1);
        html += '</div>';
      }
      continue;
    }

    /* ── ESG sub-group heading — also collapsible ────────────── */
    if (n.level === 'grp') {
      var gArrow = hasKids
        ? '<span class="nt" data-toggle="'+n.id+'">'+(isOpen?'▾':'▸')+'</span>'
        : '<span class="nt-pad"></span>';
      html += '<div class="nc-toggle" data-id="'+n.id+'" style="'+depthPad(depth)+';display:flex;align-items:center;cursor:pointer;padding-top:5px;padding-bottom:2px">'
            + gArrow
            + '<span class="nc-grp" style="padding:0;margin:0;flex:1">'+n.label+'</span>'
            + '</div>';
      if (hasKids) {
        html += '<div class="nkids" id="nk-'+n.id+'" style="display:'+(isOpen?'block':'none')+'">';
        html += renderNodes(n.children, open, activeFile, depth + 1);
        html += '</div>';
      }
      continue;
    }

    /* ── Regular node (root / L0 / L2 / L3 / L4) ────────────── */
    var arrow = hasKids
      ? '<span class="nt" data-toggle="'+n.id+'">'+(isOpen?'▾':'▸')+'</span>'
      : '<span class="nt-pad"></span>';

    var lvlPill = (n.level && n.level !== 'L0')
      ? '<span class="nlv nlv-'+n.level+'">'+n.level+'</span>'
      : '';
    var tagEl  = n.tag   ? '<span class="ntag">'+n.tag+'</span>'                                   : '';
    var bdgEl  = n.badge ? '<span class="nbdg nbdg-'+(n.bc||'gold')+'">'+n.badge+'</span>'         : '';

    var tag      = n.file ? 'a'   : 'div';
    var hrefAttr = n.file ? ' href="'+n.file+'"' : '';

    /* Root node gets special bold gold styling */
    var rootStyle = (n.id === 'root')
      ? ' style="'+depthPad(depth)+';font-weight:700;font-size:12px"'
      : ' style="'+depthPad(depth)+'"';

    html += '<'+tag+hrefAttr
          + ' class="nn'+(isActive?' active':'')+'"'
          + ' data-id="'+n.id+'"'
          + ' data-lvl="'+(n.level||'')+'"'
          + rootStyle
          + '>';
    html += arrow;
    html += '<span class="nlbl">'+n.label+'</span>';
    html += lvlPill + tagEl + bdgEl;
    html += '</'+tag+'>';

    if (hasKids) {
      html += '<div class="nkids" id="nk-'+n.id+'" style="display:'+(isOpen?'block':'none')+'">';
      html += renderNodes(n.children, open, activeFile, depth + 1);
      html += '</div>';
    }
  }
  return html;
}

/* ══════════════════════════════════════════════════════════════
   WIRE TOGGLE ARROWS
══════════════════════════════════════════════════════════════ */
function wireToggles() {
  /* Wire toggle arrows on regular nodes */
  document.querySelectorAll('.nt[data-toggle]').forEach(function(el) {
    el.addEventListener('click', function(e) {
      e.preventDefault();
      e.stopPropagation();
      toggleNode(el.dataset.toggle, el);
    });
  });

  /* Wire clause and grp heading rows — click anywhere on the row toggles */
  document.querySelectorAll('.nc-toggle').forEach(function(row) {
    row.addEventListener('click', function(e) {
      e.preventDefault();
      var id  = row.dataset.id;
      var arr = row.querySelector('.nt[data-toggle]');
      toggleNode(id, arr);
    });
  });
}

function toggleNode(id, arrowEl) {
  var kids   = document.getElementById('nk-' + id);
  var openArr = getOpen();
  if (kids) {
    var isNowOpen = kids.style.display !== 'none';
    kids.style.display = isNowOpen ? 'none' : 'block';
    if (arrowEl) arrowEl.textContent = isNowOpen ? '▸' : '▾';
    if (isNowOpen) {
      var idx = openArr.indexOf(id);
      if (idx >= 0) openArr.splice(idx, 1);
    } else {
      if (openArr.indexOf(id) < 0) openArr.push(id);
    }
    setOpen(openArr);
  }
}

/* ══════════════════════════════════════════════════════════════
   WIRE NAV LINKS — save scroll before leaving
   FIX for Issue 1: scroll position preserved across navigation
══════════════════════════════════════════════════════════════ */
function wireNavLinks() {
  document.querySelectorAll('#sidebar a.nn').forEach(function(link) {
    link.addEventListener('click', function(e) {
      var href = link.getAttribute('href');
      if (!href || href === '#') return;
      /* Prevent the default href navigation so we can save scroll first */
      e.preventDefault();
      saveScroll();
      /* Navigate after a microtask so sessionStorage write completes */
      setTimeout(function() { window.location.href = href; }, 0);
    });
  });
}

/* ══════════════════════════════════════════════════════════════
   SEARCH
══════════════════════════════════════════════════════════════ */
function wireSearch() {
  var inp = document.getElementById('sb-search');
  if (!inp) return;
  inp.addEventListener('input', function() {
    var q = inp.value.trim().toLowerCase();
    if (!q) { restoreTreeDisplay(); return; }
    filterTree(q);
  });
}

function restoreTreeDisplay() {
  var openArr = getOpen();
  document.querySelectorAll('.nn').forEach(function(el) { el.style.display = ''; });
  document.querySelectorAll('.nkids').forEach(function(el) {
    var id = el.id.replace('nk-', '');
    el.style.display = openArr.indexOf(id) >= 0 ? 'block' : 'none';
  });
  document.querySelectorAll('.nt[data-toggle]').forEach(function(el) {
    var kids = document.getElementById('nk-' + el.dataset.toggle);
    el.textContent = (kids && kids.style.display !== 'none') ? '▾' : '▸';
  });
}

function filterTree(q) {
  document.querySelectorAll('.nkids').forEach(function(el) { el.style.display = 'block'; });
  document.querySelectorAll('.nn').forEach(function(el) {
    var lbl   = (el.querySelector('.nlbl') || {}).textContent || '';
    var tag   = (el.querySelector('.ntag') || {}).textContent || '';
    var match = lbl.toLowerCase().includes(q) || tag.toLowerCase().includes(q);
    el.style.display = match ? '' : 'none';
  });
  document.querySelectorAll('.nt[data-toggle]').forEach(function(el) { el.textContent = '▾'; });
}

/* ══════════════════════════════════════════════════════════════
   TOPBAR
══════════════════════════════════════════════════════════════ */
function renderTopbar(title, subtitle) {
  return '<div class="topbar">'
    + '<div class="topbar-left">'
    + '<div class="topbar-title">' + title + '</div>'
    + '<div class="topbar-sub">'   + (subtitle || '') + '</div>'
    + '</div>'
    + '<div class="topbar-right">'
    + '<button class="btn btn-ghost" onclick="localStorage.clear();var u=location.href.split(&quot;?&quot;)[0]+&quot;?_cb=&quot;+Date.now();location.replace(u)">↻ Refresh</button>'
    + '</div>'
    + '</div>';
}

/* ══════════════════════════════════════════════════════════════
   HOVER-COLLAPSE  (spec-compliant per Discussion Summary §3.2)
══════════════════════════════════════════════════════════════ */
function bindHoverCollapse() {
  var sb    = document.getElementById('sidebar');
  var main  = document.querySelector('.main');
  var timer = null;

  function collapse() {
    sb.classList.add('sb-off');
    if (main) main.classList.add('sb-off');
  }
  function expand() {
    clearTimeout(timer);
    sb.classList.remove('sb-off');
    if (main) main.classList.remove('sb-off');
  }

  sb.addEventListener('mouseleave', function() { timer = setTimeout(collapse, 1200); });
  sb.addEventListener('mouseenter', expand);
  document.addEventListener('mousemove', function(e) { if (e.clientX <= 6) expand(); });
}

/* ══════════════════════════════════════════════════════════════
   initPage  — called once per page
══════════════════════════════════════════════════════════════ */
function initPage(filename) {
  /* Inject sidebar HTML */
  var placeholder = document.getElementById('sidebar');
  if (placeholder) {
    placeholder.outerHTML = buildSidebar(filename);
  } else {
    var wrapper = document.createElement('div');
    wrapper.innerHTML = buildSidebar(filename);
    document.body.insertBefore(wrapper.firstChild, document.body.firstChild);
  }

  wireToggles();
  wireNavLinks();
  wireSearch();
  bindHoverCollapse();
  restoreScroll();

  /* ── Sidebar starts collapsed on all pages ──────────────────
     Expands instantly on hover / left-edge mouse approach.
     Dashboard (index.html) always starts collapsed for full width.
     All other pages also start collapsed — user hovers to expand. */
  var sb   = document.getElementById('sidebar');
  var main = document.querySelector('.main');
  if (sb)   sb.classList.add('sb-off');
  if (main) main.classList.add('sb-off');
}

/* ══════════════════════════════════════════════════════════════
   CHART HELPERS  (index.html)
══════════════════════════════════════════════════════════════ */
var CC = {
  navy:  '#1B2A4A', gold:  '#C9A84C', red:   '#B71C1C',
  grn:   '#2E7D32', amb:   '#F9A825', org:   '#E65100',
  blue:  '#0D47A1', g100:  '#EAF0F8', white: '#FFFFFF',
};

function chartDefaults() {
  if (typeof Chart === 'undefined') return;
  Chart.defaults.font.family = 'Arial';
  Chart.defaults.font.size   = 11;
  Chart.defaults.color       = '#1A2233';
  Chart.defaults.plugins.legend.labels.boxWidth = 12;
}

/* ══════════════════════════════════════════════════════════════
   DASHBOARD EXTENSIONS — Rev.18
   Functions called by index.html: chartDefaults (return value),
   CC.catMap, statusBadge, scorePill, riskRating,
   getData, startRefresh
══════════════════════════════════════════════════════════════ */

/* ── chartDefaults — return shared options object ──────────── */
/* Override: now returns a base options object AND sets defaults */
(function() {
  var _orig = chartDefaults;
  chartDefaults = function() {
    if (typeof Chart !== 'undefined') {
      Chart.defaults.font.family = 'Arial';
      Chart.defaults.font.size   = 11;
      Chart.defaults.color       = '#1A2233';
      Chart.defaults.plugins.legend.labels.boxWidth = 12;
    }
    /* Return a base options object that charts spread with {...cd} */
    return {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom',
          labels: { font: { size: 9, family: 'Arial' }, padding: 8, boxWidth: 10 }
        },
        tooltip: { bodyFont: { size: 10 }, titleFont: { size: 10 } }
      }
    };
  };
})();

/* ── CC — add catMap for objective category colours ─────────── */
CC.catMap = {
  'Energy':       '#0D47A1',
  'Environment':  '#1B5E20',
  'Safety':       '#B71C1C',
  'Quality':      '#E65100',
  'Social':       '#4A148C',
  'Governance':   '#37474F',
  'ESG':          '#00695C',
};

/* ── statusBadge — returns CSS class string for a status ────── */
function statusBadge(s) {
  var v = String(s || '').toUpperCase().trim();
  if (['URGENT','CRITICAL','OPEN','FAILED','NOT DONE'].some(function(x){ return v.includes(x); })) return 'badge-red';
  if (['AT RISK','OVERDUE'].some(function(x){ return v.includes(x); }))                            return 'badge-org';
  if (['IN PROGRESS','PENDING','PLANNED','MONITORING','MONITOR'].some(function(x){ return v.includes(x); })) return 'badge-amb';
  if (['ON TRACK','COMPLETE','COMPLIANT','APPROVED','CLOSED','PASS','ACTIVE'].some(function(x){ return v.includes(x); })) return 'badge-grn';
  return 'badge-grey';
}

/* ── scorePill — coloured score chip ───────────────────────── */
function scorePill(score, rating) {
  var s = parseInt(score) || 0;
  var bg = '#9e9e9e';
  var r = String(rating || '').toUpperCase();
  if (r.includes('CRITICAL') || s >= 20) bg = '#B71C1C';
  else if (r.includes('HIGH') || s >= 12) bg = '#E65100';
  else if (r.includes('MEDIUM') || s >= 6) bg = '#F9A825';
  else if (r.includes('LOW') || s >= 1)   bg = '#2E7D32';
  return '<span class="score-pill" style="background:' + bg + '">' + (score || '—') + '</span>';
}

/* ── riskRating — returns {label, badge} for a score ───────── */
function riskRating(score) {
  var s = parseInt(score) || 0;
  if (s >= 20) return { label: 'CRITICAL', badge: 'badge-red'  };
  if (s >= 12) return { label: 'HIGH',     badge: 'badge-org'  };
  if (s >= 6)  return { label: 'MEDIUM',   badge: 'badge-amb'  };
  if (s >= 1)  return { label: 'LOW',      badge: 'badge-grn'  };
  return           { label: '—',       badge: 'badge-grey' };
}

/* ── getData — fetch from Google Sheets via data.js ─────────── */
/* Wraps autoLoadPageData into typed fetchers used by index.html */
var getData = (function() {
  function fetchTab(tab) {
    return fetch(SHEETS_URL + '?tab=' + tab + '&action=read')
      .then(function(r) { return r.json(); })
      .then(function(data) {
        /* Convert rows to objects keyed by header */
        if (!data || !data.headers || !data.rows) return [];
        return data.rows.map(function(row) {
          var obj = {};
          data.headers.forEach(function(h, i) { obj[h.toLowerCase().replace(/\s+/g,'_')] = row[i] || ''; });
          return obj;
        });
      });
  }
  return {
    risks:      function() { return fetchTab('risks'); },
    objectives: function() { return fetchTab('objectives'); },
    compliance: function() { return fetchTab('compliance'); },
    kpis:       function() { return fetchTab('kpi_dashboard'); },
  };
})();

/* ── startRefresh — auto-refresh dashboard every 5 minutes ──── */
function startRefresh(fn) {
  var INTERVAL = 5 * 60 * 1000; /* 5 minutes */
  setTimeout(function tick() {
    fn();
    setTimeout(tick, INTERVAL);
  }, INTERVAL);
}

/* ── traceLinks — global utility for all pages ──────────────── */
/* Converts semicolon-separated ref strings to anchor links.
   Used by pestle-swot.html, risk-register.html, etc.            */
function traceLinks(refs) {
  if (!refs || refs === '—' || String(refs).trim() === '') return '—';
  return String(refs).split(';').map(function(r) {
    r = r.trim();
    if (!r || r === '—') return '';
    return '<a href="#' + r + '" class="trace-link" style="font-size:10px;margin-right:4px">' + r + '</a>';
  }).filter(Boolean).join(' ');
}

/* ── scrollToHash — scroll to anchor on page load ───────────── */
function scrollToHash() {
  if (window.location.hash) {
    var el = document.querySelector(window.location.hash);
    if (el) setTimeout(function(){ el.scrollIntoView({behavior:'smooth',block:'center'}); }, 300);
  }
}
