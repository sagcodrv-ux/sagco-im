/* ═══════════════════════════════════════════════════════════════
   SAGCO IMS — Shared Navigation
   nav.js  |  Rev.18  |  June 2026
   Fixes: sidebar scroll position preserved on navigation (Issue 1)
          proper tree indentation with depth tracking (Issue 3)
═══════════════════════════════════════════════════════════════ */

/* ── Navigation Tree ───────────────────────────────────────── */
var TREE = [

  /* ══ HOME ═══════════════════════════════════════════════ */
  { id:'home-overview', label:'IMS Overview',  file:'ims-overview.html', level:'L0', badge:'System Map' },
  { id:'home-manual',   label:'IMS Manual',    file:'ims-manual.html',   level:'L0', badge:'L1 · MAN-01' },
  { id:'home-procs',  label:'Procedures Hub',  file:'procedures.html',   level:'L0', badge:'All Procedures' },

  /* ══ STRATEGIC FRAMEWORK ════════════════════════════════ */
  { id:'strat', label:'Strategic Framework', level:'clause', children:[
    { id:'strat-gov', label:'Governance',               file:'governance.html',        level:'L0', badge:'§5.1' },
    { id:'strat-pol', label:'Policies',                 file:'policies-hub.html',     level:'L0', badge:'PO-01→09' },
    { id:'strat-csf', label:'Critical Success Factors', file:'ims-framework.html',    level:'L0', badge:'7 CSFs' },
    { id:'strat-obj', label:'Objectives',               file:'ims-objectives.html',   level:'L0', badge:'ISO §6.2', children:[
      { id:'strat-obj-plan', label:'Objectives Planning Register', file:'ims-objectives-plan.html', level:'L2', badge:'§6.2' },
    ]},
    { id:'strat-kpi', label:'KPI Register',             file:'ims-framework.html',    level:'L0', badge:'26 KPIs' },
    { id:'strat-trc', label:'Traceability Matrix',      file:'ims-traceability.html', level:'L0', badge:'Full Chain' },
  ]},

  /* ══ PROCEDURES & DOCUMENTS ══════════════════════════════ */
  { id:'docs', label:'Procedures & Documents', level:'clause', children:[

    /* ── §4 Context & Scope ───────────────────────────── */
    { id:'p01', label:'Context & Scope', file:'proc-c4.html', level:'L2', badge:'L2-P-01 · §4',
      children:[
        { id:'p01-ctx',  label:'Context Register',    file:'context.html',     level:'L4', tag:'Sh.1'  },
        { id:'p01-pest', label:'PESTLE & SWOT',        file:'pestle-swot.html', level:'L4', tag:'Sh.2'  },
        { id:'p01-scp',  label:'Scope & Process Map',  file:'scope.html',       level:'L4', tag:'Sh.9'  },
        { id:'p01-chk',  label:'Annual MR Checklist',  file:'checklist.html',   level:'L4', tag:'Sh.10' },
      ]
    },

    /* ── §5 Leadership & Commitment ──────────────────── */
    { id:'p02', label:'Leadership & Commitment', file:'proc-c5.html', level:'L2', badge:'L2-P-02 · §5',
      children:[
        { id:'p02-pol',  label:'IMS Policies Register',       file:'policies.html',               level:'L4', tag:'Sh.11' },
        { id:'p02-wkp',  label:'Worker Participation',         file:'worker-participation.html',   level:'L4', tag:'Sh.12' },
        { id:'p02-pack', label:'Policy Acknowledgement',       file:'policy-acknowledgement.html', level:'L4', tag:'Sh.56', badge:'URGENT', bc:'red' },
        { id:'p02-gmb',  label:'Gemba Walk Log',               file:'gemba-walk-log.html',         level:'L4', tag:'Sh.62' },
        { id:'p02-stm',  label:'Steering Committee Minutes',   file:'steering-team-minutes.html',  level:'L4', tag:'Sh.63' },
        { id:'p02-ceo',  label:'CEO-Signed Records Tracker',   file:'ceo-signed-records.html',     level:'L4', tag:'Sh.67', badge:'URGENT', bc:'red' },
        { id:'p02-enc',  label:'EnMS Champion Record',         file:'enms-champion.html',          level:'L4', tag:'Sh.66', badge:'PENDING', bc:'amb' },
        { id:'p02-com',  label:'Communication Matrix',         file:'communication-matrix.html',   level:'L4', tag:'Sh.68' },
      ]
    },

    /* ── §6 Planning & Risk ───────────────────────────── */
    { id:'p03', label:'Planning & Risk', file:'proc-c6.html', level:'L2', badge:'L2-P-03 · §6',
      children:[
        { id:'p03-rsk',  label:'Integrated Risk Register',        file:'risk-register.html',        level:'L4', tag:'Sh.3',  badge:'CRIT',   bc:'red' },
        { id:'p03-cmp',  label:'Legal & Compliance Register',     file:'compliance.html',            level:'L4', tag:'Sh.4',  badge:'URGENT', bc:'red' },
        { id:'p03-hir',  label:'HIRA Register',                   file:'hira.html',                  level:'L4', tag:'Sh.13', badge:'OPEN',   bc:'red' },
        { id:'p03-sea',  label:'Environmental Aspects (SEA)',      file:'sea-register.html',          level:'L4', tag:'Sh.14' },
        { id:'p03-eny',  label:'Energy Planning Register',         file:'energy.html',                level:'L4', tag:'Sh.8'  },
        { id:'p03-bry',  label:'Bribery Risk Register',            file:'bribery-risk-register.html', level:'L4', tag:'Sh.61' },
        { id:'p03-mth',  label:'Risk Assessment Methodology',      file:'methodology.html',           level:'L3', tag:'Sh.5'  },
        { id:'p03-moc',  label:'Management of Change Register',    file:'moc.html',                   level:'L4', tag:'Sh.7'  },
        { id:'p03-ghg',  label:'GHG Inventory Report',             file:'ghg-inventory.html',         level:'L4', tag:'Sh.69' },
        { id:'p03-sc3',  label:'Scope 3 Emissions',                file:'scope3-emissions.html',      level:'L4', tag:'Sh.27' },
      ]
    },

    /* ── §7 Support & Competence ─────────────────────── */
    { id:'p04', label:'Support & Competence', file:'proc-c7.html', level:'L2', badge:'L2-P-04 · §7',
      children:[
        { id:'p04-cmp', label:'Competency Matrix',            file:'competency.html',          level:'L4', tag:'Sh.15' },
        { id:'p04-trn', label:'Training Register',            file:'training.html',            level:'L4', tag:'Sh.16' },
        { id:'p04-tra', label:'Training Attendance Records',  file:'training-attendance.html', level:'L4', tag:'Sh.60' },
        { id:'p04-ind', label:'Induction Records Register',   file:'induction-records.html',   level:'L4', tag:'Sh.55', badge:'URGENT', bc:'red' },
        { id:'p04-doc', label:'Documentation Register',       file:'documentation.html',       level:'L4', tag:'Sh.17' },
        { id:'p04-cal', label:'Calibration Register',         file:'calibration-register.html',level:'L4', tag:'Sh.54', badge:'URGENT', bc:'red' },
      ]
    },

    /* ── §8 Operational Control ──────────────────────── */
    { id:'p05', label:'Operational Control', file:'proc-c8.html', level:'L2', badge:'L2-P-05 · §8', children:[

      { id:'p05-hub', label:'Operational Control Overview', file:'operational-control.html', level:'L3', badge:'Hub' },
      { id:'oc1', label:'OC-01 Safety & Emergency', file:'oc01-safety.html', level:'L3', badge:'L3', children:[
        { id:'oc1-ptw',  label:'PTW Register',              file:'ptw-register.html',          level:'L4', tag:'Sh.36', badge:'CAPA-001', bc:'red' },
        { id:'oc1-eme',  label:'Emergency Response Plan',   file:'emergency-response.html',    level:'L4', tag:'Sh.34b',badge:'DRILL!',   bc:'red' },
        { id:'oc1-con',  label:'Contractor Register',        file:'contractor-register.html',   level:'L4', tag:'Sh.35' },
        { id:'oc1-lot',  label:'LOTO Device Register',       file:'loto-register.html',         level:'L4', tag:'Sh.37' },
        { id:'oc1-lta',  label:'LOTO Authorised Persons',    file:'loto-auth-persons.html',     level:'L4', tag:'Sh.59' },
        { id:'oc1-csl',  label:'Confined Space Entry Log',   file:'confined-space-log.html',    level:'L4', tag:'Sh.38' },
        { id:'oc1-hts',  label:'Heat Stress / WBGT Log',     file:'heat-stress-log.html',       level:'L4', tag:'Sh.39' },
        { id:'oc1-fxl',  label:'Fire Extinguisher Log',      file:'fire-extinguisher-log.html', level:'L4', tag:'Sh.40', badge:'CAPA-004', bc:'red' },
        { id:'oc1-fpl',  label:'Fire Pump Test Log',          file:'fire-pump-log.html',         level:'L4', tag:'Sh.41' },
        { id:'oc1-ohs',  label:'OH Surveillance Register',   file:'oh-surveillance.html',       level:'L4', tag:'Sh.42' },
        { id:'oc1-sca',  label:'Scaffold Inspection',         file:'scaffold-inspection.html',   level:'L4', tag:'Sh.64' },
        { id:'oc1-ndt',  label:'NDT / Radiography Log',       file:'ndt-permit-log.html',               level:'L4', tag:'Sh.43' },
        { id:'oc1-ghs',  label:'Chemical Inventory (GHS)',    file:'chemical-inventory.html',    level:'L4', tag:'Sh.44' },
        { id:'oc1-crl',  label:'Crane & Lifting Register',    file:'crane-lifting.html',         level:'L4', tag:'Sh.45' },
      ]},

      { id:'oc2', label:'OC-02 Environment & Energy', file:'oc02-environment.html', level:'L3', badge:'L3', children:[
        { id:'oc2-wst', label:'Waste Management Register',  file:'waste-management.html',    level:'L4', tag:'Sh.46' },
        { id:'oc2-chm', label:'Chemical Storage & Spills',  file:'chemical-storage.html',    level:'L4', tag:'Sh.47' },
        { id:'oc2-fur', label:'Furnace Monitoring Logs',    file:'furnace-monitoring.html',   level:'L4', tag:'Sh.48' },
        { id:'oc2-mps', label:'MEPS Compliance Register',   file:'meps-register.html',     level:'L4', tag:'Sh.49' },
        { id:'oc2-wat', label:'Water & Waste Data',         file:'water-waste.html',    level:'L4', tag:'Sh.50' },
      ]},

      { id:'oc3', label:'OC-03 Quality & Customer', file:'oc03-quality.html', level:'L3', badge:'L3', children:[
        { id:'oc3-cus', label:'Customer Requirements Reg.',  file:'customer-register.html', level:'L4', tag:'Sh.51' },
        { id:'oc3-inp', label:'In-Process Inspection Log',   file:'inprocess-inspection.html', level:'L4', tag:'Sh.52' },
        { id:'oc3-rel', label:'Product Release Records',     file:'product-release.html',       level:'L4', tag:'Sh.53' },
        { id:'oc3-ncf', label:'Nonconforming Products',      file:'nonconforming.html',level:'L4', tag:'Sh.57' },
        { id:'oc3-inc', label:'Incoming Inspection Records', file:'incoming-inspection.html',   level:'L4', tag:'Sh.58' },
      ]},

    ]},

    /* ── §9 Performance Evaluation ───────────────────── */
    { id:'p06', label:'Performance Evaluation', file:'proc-c9.html', level:'L2', badge:'L2-P-06 · §9',
      children:[
        { id:'p06-kpi', label:'KPI Dashboard',          file:'kpi-dashboard.html',    level:'L4', tag:'Sh.18' },
        { id:'p06-kpic',label:'KPI Consolidated View',    file:'kpi-consolidated.html', level:'L4', tag:'Sh.18b' },
        { id:'p06-cev', label:'Compliance Evaluation',  file:'compliance-eval.html',  level:'L4', tag:'Sh.19' },
        { id:'p06-aud', label:'Internal Audit Programme',file:'audit-programme.html', level:'L4', tag:'Sh.20' },
        { id:'p06-mr',  label:'Management Review',      file:'management-review.html',level:'L4', tag:'Sh.22' },
      ]
    },

    /* ── §10 Improvement ─────────────────────────────── */
    { id:'p07', label:'Improvement & Corrective Action', file:'proc-c10.html', level:'L2', badge:'L2-P-07 · §10',
      children:[
        { id:'p07-cap', label:'CAPA Register',     file:'capa-register.html',    level:'L4', tag:'Sh.23', badge:'4 OPEN', bc:'red' },
        { id:'p07-inc', label:'Incident Register', file:'incident-register.html',level:'L4', tag:'Sh.24' },
      ]
    },

  ]},

  /* ══ ESG & SUSTAINABILITY ════════════════════════════════ */
  { id:'esg', label:'ESG & Sustainability', level:'clause', children:[
    { id:'esg-ghg',  label:'GHG & Climate',            file:'ghg-inventory.html',       level:'L0', badge:'Scope 1+2+3' },
    { id:'esg-wat',  label:'Water & Waste',             file:'water-waste.html',    level:'L0' },
    { id:'esg-lhr',  label:'Labour & Human Rights',     file:'worker-participation.html',level:'L0', children:[
      { id:'esg-wfd', label:'Workforce Diversity', file:'workforce-diversity.html', level:'L2' },
    ]},
    { id:'esg-eth',  label:'Ethics & Anti-Bribery',     file:'bribery-risk-register.html',level:'L0', children:[
      { id:'esg-coi', label:'Conflict of Interest Register', file:'coi-register.html',       level:'L2' },
      { id:'esg-gft', label:'Gifts & Hospitality Register',  file:'gifts-hospitality.html',  level:'L2' },
      { id:'esg-tpd', label:'Third-Party Due Diligence',     file:'tpdd.html',               level:'L2' },
    ]},
    { id:'esg-pro',  label:'Sustainable Procurement',   file:'supplier-esg.html',        level:'L0', children:[
      { id:'esg-sup', label:'Supplier ESG Register',        file:'supplier-esg.html',         level:'L2' },
      { id:'esg-coc', label:'Supplier Code of Conduct',     file:'supplier-conduct.html',         level:'L2' },
    ]},
    { id:'esg-rpt',  label:'ESG Report',                file:'ecovadis-actions.html',    level:'L0', badge:'July deadline' },
  ]},

  /* ══ ADMINISTRATION ══════════════════════════════════════ */
  { id:'admin', label:'Administration', level:'clause', children:[
    { id:'adm-dms',  label:'Document Management',  file:'document-management.html', level:'L0' },
    { id:'adm-usr',  label:'User Management',       file:'user-management.html',     level:'L0' },
    { id:'adm-rdm',  label:'Project Roadmap',       file:'project-roadmap.html',     level:'L0' },
  ]},

]
;


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
function printCurrentPage() {
  /* Expand collapsed nav nodes */
  document.querySelectorAll('.nkids').forEach(function(el) {
    el._wc = (el.style.display === 'none');
    el.style.display = 'block';
  });

  /* Inject override CSS that removes all layout/overflow constraints for print */
  var styleId = 'sagco-print-override';
  if (!document.getElementById(styleId)) {
    var s = document.createElement('style');
    s.id  = styleId;
    s.setAttribute('media', 'print');
    s.textContent = [
      '@page { size:A4 portrait; margin:12mm 12mm 15mm 12mm; }',
      'html,body { width:100%!important; height:auto!important; overflow:visible!important; background:#fff!important; }',
      '.main { display:block!important; margin-left:0!important; padding-left:0!important; width:100%!important; height:auto!important; overflow:visible!important; }',
      '.content { display:block!important; width:100%!important; max-width:100%!important; height:auto!important; overflow:visible!important; padding:0!important; }',
      '#sidebar,#tb,.back-row,.pp-back,.pp-print-btn,.topbar-btn,.no-print,button,#se-bar,#se-toggle,#se-dismiss,#se-fmt,#se-toast,#se-restore-btn,.se-img-ov,#auth-user-bar,#edit-mode-bar,.edit-mode-bar,[id^="se-"],[class^="se-"],[id*="edit-mode"],[class*="edit-mode"] { display:none!important; }',
      '* { overflow:visible!important; max-height:none!important; -webkit-print-color-adjust:exact!important; print-color-adjust:exact!important; box-shadow:none!important; }',
      'table { page-break-inside:auto!important; width:100%!important; }',
      'tr { page-break-inside:avoid!important; }',
      'thead { display:table-header-group!important; }',
      'a::after { content:none!important; }'
    ].join('\n');
    document.head.appendChild(s);
  }

  window.print();

  /* Restore collapsed state */
  setTimeout(function() {
    document.querySelectorAll('.nkids').forEach(function(el) {
      if (el._wc) el.style.display = 'none';
    });
  }, 1500);
}

function renderTopbar(title, subtitle) {
  return '<div class="topbar">'
    + '<div class="topbar-left">'
    + '<div class="topbar-title">' + title + '</div>'
    + '<div class="topbar-sub">'   + (subtitle || '') + '</div>'
    + '</div>'
    + '<div class="topbar-right">'
    + '<button id="se-restore-btn" title="Show Edit button" onclick="restoreEditBtn()" style="display:none">&#9998; Edit</button>'
    + '<button class="btn btn-ghost" onclick="printCurrentPage()" title="Print this page">&#128424; Print</button>'
    + '<button class="btn btn-ghost" onclick="localStorage.clear();var u=location.href.split(&quot;?&quot;)[0]+&quot;?_cb=&quot;+Date.now();location.replace(u)">&#8635; Refresh</button>'
    + '</div>'
    + '</div>';
}

function restoreEditBtn() {
  /* Show the floating Edit toggle and dismiss buttons again */
  var tb = document.getElementById('se-toggle');
  var dm = document.getElementById('se-dismiss');
  var rb = document.getElementById('se-restore-btn');
  if (tb) tb.style.display = '';
  if (dm) dm.style.display = '';
  if (rb) rb.style.display = 'none';
  try { sessionStorage.removeItem('sagco_edit_hidden'); } catch(e){}
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
  /* Inject edit-mode.js dynamically if not already loaded */
  if (!document.getElementById('sagco-edit-mode-script')) {
    var s = document.createElement('script');
    s.id  = 'sagco-edit-mode-script';
    s.src = 'edit-mode.js';
    document.head.appendChild(s);
  }
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

/* ════════════════════════════════════════════════════════════
   GLOBAL ABBREVIATION TOOLTIP SYSTEM
   Scans page text on load, wraps known abbreviations in
   interactive spans, shows definition on hover.
   Skips: badges, code, headings, document codes, tooltips.
════════════════════════════════════════════════════════════ */
var ABBR_DICT = {
  // Management Systems & Standards
  'IMS':    'Integrated Management System',
  'QMS':    'Quality Management System',
  'EMS':    'Environmental Management System',
  'OHSMS':  'Occupational Health and Safety Management System',
  'EnMS':   'Energy Management System',
  'ABMS':   'Anti-Bribery Management System',
  'FSSC':   'Food Safety System Certification',
  'PDCA':   'Plan, Do, Check, Act — the continual improvement cycle',
  // Performance & Measurement
  'KPI':    'Key Performance Indicator',
  'CSF':    'Critical Success Factor',
  'SHC':    'Specific Heat Consumption — energy consumed per kilogram of packed glass (kcal/kg)',
  'EnPI':   'Energy Performance Indicator',
  'LTIFR':  'Lost Time Injury Frequency Rate — (Lost Time Injuries × 1,000,000) ÷ Total hours worked',
  'TRIR':   'Total Recordable Incident Rate',
  'LTI':    'Lost Time Injury — any work-related injury resulting in at least one full working day lost',
  'MR':     'Management Review',
  'NC':     'Nonconformity',
  'NCR':    'Nonconformity Report',
  'CAPA':   'Corrective Action and Preventive Action',
  'RCA':    'Root Cause Analysis',
  'AQL':    'Acceptable Quality Level',
  // Environmental & Energy
  'GHG':    'Greenhouse Gas',
  'GRI':    'Global Reporting Initiative',
  'ESG':    'Environmental, Social and Governance',
  'ECM':    'Energy Conservation Measure',
  'SEU':    'Significant Energy Use',
  'SEA':    'Significant Environmental Aspect',
  'TCFD':   'Task Force on Climate-related Financial Disclosures',
  'SASB':   'Sustainability Accounting Standards Board',
  'NDC':    'Nationally Determined Contribution',
  'HFO':    'Heavy Fuel Oil',
  'HVAC':   'Heating, Ventilation and Air Conditioning',
  'CEMS':   'Continuous Emissions Monitoring System',
  'MEPS':   'Minimum Energy Performance Standard',
  'WBGT':   'Wet Bulb Globe Temperature — heat stress index used to assess heat exposure risk',
  // Safety & Operations
  'SHEE':   'Safety, Health, Environment and Energy',
  'HSE':    'Health, Safety and Environment',
  'HSSE':   'Health, Safety, Security and Environment',
  'HIRA':   'Hazard Identification and Risk Assessment',
  'PTW':    'Permit to Work',
  'LOTO':   'Lock-Out / Tag-Out — energy isolation procedure to prevent accidental equipment start-up',
  'WAH':    'Working at Height',
  'PPE':    'Personal Protective Equipment',
  'TBT':    'Toolbox Talk',
  'NDT':    'Non-Destructive Testing',
  'MOC':    'Management of Change',
  'SPC':    'Statistical Process Control',
  // Governance & Ethics
  'RACI':   'Responsible, Accountable, Consulted, Informed — a roles and responsibilities matrix',
  'CoI':    'Conflict of Interest',
  'PDPL':   'Personal Data Protection Law (Saudi Arabia)',
  'WG':     'Working Group',
  'CEO':    'Chief Executive Officer',
  'TPDD':   'Third-Party Due Diligence',
  // Certifications & Ratings
  'SGP':    'Supplier Guiding Principles (Coca-Cola)',
  'ASR':    'Annual Supplier Review',
  'SGS':    'Société Générale de Surveillance — a global inspection and certification company',
  // Saudi Regulatory Bodies & Legislation
  'NCEC':   'National Center for Environmental Compliance (Saudi Arabia)',
  'MEWA':   'Ministry of Environment, Water and Agriculture (Saudi Arabia)',
  'MHRSD':  'Ministry of Human Resources and Social Development (Saudi Arabia)',
  'MODON':  'Saudi Authority for Industrial Cities and Technology Zones',
  'NAZAHA': 'National Anti-Corruption Commission (Saudi Arabia)',
  'SEEC':   'Saudi Energy Efficiency Center',
  'SASO':   'Saudi Standards, Metrology and Quality Organization',
  // Tools & Frameworks
  'PESTLE': 'Political, Economic, Social, Technological, Legal, Environmental — strategic analysis framework',
  'SWOT':   'Strengths, Weaknesses, Opportunities, Threats — strategic analysis framework',
  'SMART':  'Specific, Measurable, Achievable, Relevant, Time-bound — objective-setting criteria',
  'RAG':    'Red, Amber, Green — traffic-light status indicator',
  'DMS':    'Document Management System',
  'ASL':    'Approved Supplier List',
  'ILO':    'International Labour Organization',
  // OH&S handled separately below due to special character
};

/* Special cases with non-word characters */
var ABBR_SPECIAL = {
  'OH&S':    'Occupational Health and Safety',
  'MIM-ICP': 'Ministry of Industry and Mineral Resources — Industrial Compliance Programme',
};

/* CSS injected once */
var ABBR_CSS_INJECTED = false;

function injectAbbrCSS() {
  if (ABBR_CSS_INJECTED) return;
  ABBR_CSS_INJECTED = true;
  var style = document.createElement('style');
  style.textContent = [
    '.ims-abbr{',
      'border-bottom:1px dashed var(--gold,#C9A84C);',
      'cursor:help;',
      'color:inherit;',
      'text-decoration:none;',
    '}',
    '#ims-abbr-tip{',
      'display:none;',
      'position:fixed;',
      'z-index:199999;',
      'max-width:320px;',
      'background:var(--navy,#1B2A4A);',
      'color:#fff;',
      'border-radius:7px;',
      'padding:0;',
      'box-shadow:0 6px 28px rgba(0,0,0,.28);',
      'font-family:Arial,sans-serif;',
      'font-size:12px;',
      'pointer-events:none;',
    '}',
    '#ims-abbr-tip.visible{display:block}',
    '#ims-abbr-tip .at-code{',
      'background:var(--gold,#C9A84C);',
      'color:var(--navy,#1B2A4A);',
      'font-weight:700;',
      'font-size:11px;',
      'padding:6px 12px 5px;',
      'border-radius:7px 7px 0 0;',
      'letter-spacing:.04em;',
    '}',
    '#ims-abbr-tip .at-def{',
      'padding:8px 12px 10px;',
      'line-height:1.6;',
      'color:rgba(255,255,255,.92);',
    '}',
  ].join('');
  document.head.appendChild(style);

  /* Shared tooltip element */
  var tip = document.createElement('div');
  tip.id = 'ims-abbr-tip';
  tip.innerHTML = '<div class="at-code"></div><div class="at-def"></div>';
  document.body.appendChild(tip);
}

function positionAbbrTip(el) {
  var tip = document.getElementById('ims-abbr-tip');
  if (!tip) return;
  var rect = el.getBoundingClientRect();
  var tw = 320; var th = tip.offsetHeight || 80;
  var vw = window.innerWidth; var vh = window.innerHeight;
  var left = rect.left;
  var top  = rect.bottom + 6;
  if (left + tw > vw - 8) left = vw - tw - 8;
  if (left < 8) left = 8;
  if (top + th > vh - 8) top = rect.top - th - 6;
  if (top < 8) top = 8;
  tip.style.left = left + 'px';
  tip.style.top  = top  + 'px';
}

function attachAbbrEvents(span, code, def) {
  var tip = null;
  var hideT = null;
  span.addEventListener('mouseenter', function() {
    clearTimeout(hideT);
    tip = document.getElementById('ims-abbr-tip');
    if (!tip) return;
    tip.querySelector('.at-code').textContent = code;
    tip.querySelector('.at-def').textContent  = def;
    tip.classList.add('visible');
    positionAbbrTip(span);
  });
  span.addEventListener('mousemove', function() {
    if (tip && tip.classList.contains('visible')) positionAbbrTip(span);
  });
  span.addEventListener('mouseleave', function() {
    hideT = setTimeout(function() {
      var t = document.getElementById('ims-abbr-tip');
      if (t) t.classList.remove('visible');
    }, 100);
  });
}

/* Tags to skip entirely */
var ABBR_SKIP_TAGS = {
  'SCRIPT':1,'STYLE':1,'CODE':1,'PRE':1,'A':1,'INPUT':1,'TEXTAREA':1,'SELECT':1,'BUTTON':1,
  'H1':1,'H2':1,'H3':1,
};

/* Class fragments to skip */
var ABBR_SKIP_CLASSES = ['badge','iso-badge','obj-badge','pol-badge','kpi-badge','csf-pill',
  'ims-abbr','tip-','trc-','doc-code','pp-meta','meta-val','sidebar','topbar'];

function shouldSkipNode(node) {
  var el = node.parentElement;
  while (el) {
    if (ABBR_SKIP_TAGS[el.tagName]) return true;
    var cls = el.className || '';
    for (var i = 0; i < ABBR_SKIP_CLASSES.length; i++) {
      if (cls.indexOf(ABBR_SKIP_CLASSES[i]) !== -1) return true;
    }
    if (el.id === 'sidebar' || el.id === 'tb' || el.id === 'trc-tip' || el.id === 'ims-abbr-tip') return true;
    el = el.parentElement;
  }
  return false;
}

function scanAndWrapAbbreviations() {
  injectAbbrCSS();

  /* Build combined regex from all keys — longest first to avoid partial matches */
  var allKeys = Object.keys(ABBR_DICT).concat(Object.keys(ABBR_SPECIAL));
  allKeys.sort(function(a,b){ return b.length - a.length; });

  /* Escape special regex chars */
  function escRe(s){ return s.replace(/[.*+?^${}()|[\]\\&]/g,'\\$&'); }

  /* Pattern: word boundary + key + word boundary (for normal), or literal for special */
  var pattern = allKeys.map(function(k){
    if (k.indexOf('&') !== -1 || k.indexOf('-') !== -1) return escRe(k);
    return '\\b' + escRe(k) + '\\b';
  }).join('|');
  var re = new RegExp('(' + pattern + ')', 'g');

  /* Walk text nodes */
  var walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null, false);
  var nodes = [];
  var node;
  while ((node = walker.nextNode())) {
    if (node.nodeValue.trim() && re.test(node.nodeValue)) {
      re.lastIndex = 0;
      if (!shouldSkipNode(node)) nodes.push(node);
    }
  }

  /* Track already-wrapped per container to show each abbr only once per block */
  nodes.forEach(function(textNode) {
    re.lastIndex = 0;
    var text = textNode.nodeValue;
    var match;
    var lastIndex = 0;
    var frag = document.createDocumentFragment();
    var wrapped = false;

    /* Find nearest block parent to track per-block occurrence */
    var blockEl = textNode.parentElement;
    while (blockEl && blockEl !== document.body) {
      var tag = blockEl.tagName;
      if (tag==='P'||tag==='TD'||tag==='LI'||tag==='DIV'||tag==='SPAN') break;
      blockEl = blockEl.parentElement;
    }
    if (!blockEl._abbrSeen) blockEl._abbrSeen = {};

    while ((match = re.exec(text)) !== null) {
      var abbr = match[0];
      var def  = ABBR_DICT[abbr] || ABBR_SPECIAL[abbr];
      if (!def) continue;

      /* Only wrap first occurrence per block element */
      if (blockEl._abbrSeen[abbr]) continue;
      blockEl._abbrSeen[abbr] = true;

      /* Text before match */
      if (match.index > lastIndex) {
        frag.appendChild(document.createTextNode(text.slice(lastIndex, match.index)));
      }
      /* Wrapped abbreviation span */
      var span = document.createElement('span');
      span.className = 'ims-abbr';
      span.textContent = abbr;
      attachAbbrEvents(span, abbr, def);
      frag.appendChild(span);
      lastIndex = match.index + abbr.length;
      wrapped = true;
    }

    if (wrapped) {
      /* Remaining text */
      if (lastIndex < text.length) {
        frag.appendChild(document.createTextNode(text.slice(lastIndex)));
      }
      textNode.parentNode.replaceChild(frag, textNode);
    }
  });
}

/* Run after DOM is ready — use a short delay to allow dynamic content to settle */
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', function(){
    setTimeout(scanAndWrapAbbreviations, 600);
  });
} else {
  setTimeout(scanAndWrapAbbreviations, 600);
}
