/**
 * SAGCO IMS — Shared Navigation Rev.16
 * All 7 procedures under their clauses | Clause 8 registers | Full hierarchy
 */
const NAV = [
  { file:'index.html',               label:'Executive Dashboard',         num:'00',  grp:'overview' },
  { file:'procedures.html',          label:'All Procedures',              num:'HUB', grp:'procs' },

  // Clause 4 — Context
  { file:'proc-c4.html',             label:'Procedure L2-P-01',           num:'P',   grp:'c4', badge:'Rev.02', badgeCls:'nav-badge amber' },
  { file:'context.html',             label:'Context Register',            num:'01',  grp:'c4' },
  { file:'pestle-swot.html',         label:'PESTLE & SWOT',               num:'02',  grp:'c4' },
  { file:'scope.html',               label:'Scope & Process Map',         num:'09',  grp:'c4' },

  // Clause 5 — Leadership
  { file:'proc-c5.html',             label:'Procedure L2-P-02',           num:'P',   grp:'c5', badge:'Rev.02', badgeCls:'nav-badge amber' },
  { file:'policies.html',            label:'IMS Policies Register',       num:'11',  grp:'c5' },
  { file:'worker-participation.html',label:'Worker Participation',        num:'12',  grp:'c5' },

  // Clause 6 — Planning
  { file:'proc-c6.html',             label:'Procedure L2-P-03',           num:'P',   grp:'c6', badge:'Rev.02', badgeCls:'nav-badge amber' },
  { file:'risk-register.html',       label:'Risk Register',               num:'03',  grp:'c6', badge:'CRIT',   badgeCls:'nav-badge' },
  { file:'compliance.html',          label:'Legal & Compliance',          num:'04',  grp:'c6', badge:'URGENT', badgeCls:'nav-badge' },
  { file:'methodology.html',         label:'Risk Assessment WI',          num:'05',  grp:'c6' },
  { file:'objectives.html',          label:'Objectives & KPI',            num:'06',  grp:'c6', badge:'URGENT', badgeCls:'nav-badge' },
  { file:'moc.html',                 label:'MOC Register',                num:'07',  grp:'c6' },
  { file:'energy.html',              label:'Energy Planning',             num:'08',  grp:'c6' },
  { file:'hira.html',                label:'HIRA Register',               num:'13',  grp:'c6' },
  { file:'sea-register.html',        label:'SEA Register',                num:'14',  grp:'c6' },

  // Clause 7 — Support
  { file:'proc-c7.html',             label:'Procedure L2-P-04',           num:'P',   grp:'c7', badge:'Rev.02', badgeCls:'nav-badge amber' },
  { file:'competency.html',          label:'Competency Matrix',           num:'15',  grp:'c7' },
  { file:'training.html',            label:'Training Register',           num:'16',  grp:'c7' },
  { file:'documentation.html',       label:'Documentation Register',      num:'17',  grp:'c7' },

  // Clause 8 — Operations
  { file:'proc-c8.html',             label:'Procedure L2-P-05',           num:'P',   grp:'c8', badge:'Rev.01', badgeCls:'nav-badge amber' },
  { file:'operational-control.html', label:'Operational Framework',       num:'P05', grp:'c8' },
  { file:'oc01-safety.html',         label:'OC-01 Safety & Emergency',    num:'OC1', grp:'c8' },
  { file:'oc02-environment.html',    label:'OC-02 Env & Energy',          num:'OC2', grp:'c8' },
  { file:'oc03-quality.html',        label:'OC-03 Quality & Customer',    num:'OC3', grp:'c8' },
  { file:'ptw-register.html',        label:'PTW Register',                num:'R1',  grp:'c8', badge:'4 OPEN', badgeCls:'nav-badge amber' },
  { file:'emergency-response.html',  label:'Emergency Response Plan',     num:'R2',  grp:'c8', badge:'DRILL!', badgeCls:'nav-badge' },
  { file:'contractor-register.html', label:'Contractor Register',         num:'R3',  grp:'c8' },
  { file:'product-release.html',     label:'Product Release Records',     num:'R4',  grp:'c8' },
  { file:'nonconforming.html',       label:'Nonconforming Products',      num:'R5',  grp:'c8' },
  { file:'incoming-inspection.html', label:'Incoming Inspection',         num:'R6',  grp:'c8' },

  // Clause 9 — Performance
  { file:'proc-c9.html',             label:'Procedure L2-P-06',           num:'P',   grp:'c9', badge:'Rev.02', badgeCls:'nav-badge amber' },
  { file:'kpi-dashboard.html',       label:'KPI Dashboard',               num:'18',  grp:'c9' },
  { file:'compliance-eval.html',     label:'Compliance Evaluation',       num:'19',  grp:'c9' },
  { file:'audit-programme.html',     label:'Internal Audit Programme',    num:'20',  grp:'c9' },
  { file:'checklist.html',           label:'Annual MR Checklist',         num:'10',  grp:'c9', badge:'URGENT', badgeCls:'nav-badge' },

  // Clause 10 — Improvement
  { file:'proc-c10.html',            label:'Procedure L2-P-07',           num:'P',   grp:'c10', badge:'Rev.02', badgeCls:'nav-badge amber' },
  { file:'capa-register.html',       label:'CAPA Register',               num:'21',  grp:'c10', badge:'4 OPEN', badgeCls:'nav-badge amber' },
  { file:'management-review.html',   label:'Management Review',           num:'22',  grp:'c10' },
  { file:'incident-register.html',   label:'Incident Register',           num:'23',  grp:'c10' },

  // ESG / Sustainability / Ethics
  { file:'supplier-esg.html',        label:'Supplier ESG Register',       num:'24',  grp:'esg' },
  { file:'coi-register.html',        label:'Conflict of Interest',        num:'25',  grp:'esg' },
  { file:'gifts-hospitality.html',   label:'Gifts & Hospitality',         num:'26',  grp:'esg' },
  { file:'scope3-emissions.html',    label:'Scope 3 Emissions',           num:'27',  grp:'esg' },
  { file:'workforce-diversity.html', label:'Workforce Diversity',         num:'28',  grp:'esg' },
  { file:'tpdd.html',                label:'Third-Party Due Diligence',   num:'29',  grp:'esg' },
  { file:'water-waste.html',         label:'Water & Waste Data',          num:'30',  grp:'esg' },
  { file:'supplier-conduct.html',    label:'Supplier Code of Conduct',    num:'31',  grp:'esg' },
];

const GRP_LABELS = {
  overview:'Overview', procs:'IMS Procedures',
  c4:'Clause 4 — Context',       c5:'Clause 5 — Leadership',
  c6:'Clause 6 — Planning',      c7:'Clause 7 — Support',
  c8:'Clause 8 — Operations',    c9:'Clause 9 — Performance',
  c10:'Clause 10 — Improvement', esg:'ESG / Sustainability / Ethics',
};
const GRP_ORDER = ['overview','procs','c4','c5','c6','c7','c8','c9','c10','esg'];

function renderNav(activePage){
  let html=`<div class="sidebar">
  <a class="sb-logo" href="index.html">
    <div class="sb-logo-icon">S</div>
    <div class="sb-logo-text"><strong>SAGCO IMS</strong><span>Rev.16 · June 2026</span></div>
  </a>`;
  GRP_ORDER.forEach(gk=>{
    const items=NAV.filter(n=>n.grp===gk);
    html+=`<div class="sb-section"><div class="sb-label">${GRP_LABELS[gk]}</div>`;
    items.forEach(n=>{
      const cls=activePage===n.file?'nav-item active':'nav-item';
      const badge=n.badge?`<span class="${n.badgeCls||'nav-badge'}">${n.badge}</span>`:'';
      const isProc=n.num==='P';
      html+=`<a href="${n.file}" class="${cls}${isProc?' proc-link':''}">
        <span class="nav-num">${n.num}</span>
        <span style="flex:1">${n.label}</span>${badge}
      </a>`;
    });
    html+=`</div>`;
  });
  html+=`<div class="sb-footer">
    <div class="sync-row"><span class="sync-dot"></span><span>Live — Google Sheets</span></div>
    <div style="margin-top:4px;opacity:.7">ISO 45001 · 14001 · 50001 · 9001</div>
  </div></div>`;
  return html;
}

function renderTopbar(title,subtitle){
  return `<div class="topbar">
    <div class="topbar-left"><div class="breadcrumb">SAGCO IMS &rsaquo; <strong>${title}</strong></div></div>
    <div class="topbar-right">
      ${subtitle?`<span style="font-size:11px;color:var(--g400)">${subtitle}</span>`:''}
      <button class="btn btn-ghost" onclick="location.reload()">↻ Refresh</button>
    </div>
  </div>`;
}

function initPage(activePage){
  const s=document.createElement('div');
  s.innerHTML=renderNav(activePage);
  document.body.insertBefore(s.firstElementChild,document.body.firstChild);
}

// ── Chart and UI helpers (used by index.html and other pages) ────────────────
function chartDefaults() {
  return {
    responsive: true, maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: { font: { family: "'IBM Plex Sans', Arial, sans-serif", size: 10 },
                  boxWidth: 11, padding: 10 }
      }
    }
  };
}

const CC = {
  crit:'#B71C1C', high:'#E65100', med:'#F9A825', low:'#2E7D32',
  opp:'#0D47A1',  navy:'#1B2A4A', gold:'#C9A84C', grey:'#8A94A6',
  catMap: {
    'Safety / OH&S':'#7F0000',  'Environmental':'#004D40',
    'Energy':'#003366',         'Sustainability':'#4A148C',
    'Social / Labour':'#1A237E','Anti-Bribery':'#3E0066',
    'Compliance Risk':'#37474F','Opportunity':'#0D47A1',
    'Quality':'#1B5E20',        'Social':'#1A237E', 'Multi':'#37474F',
  },
};

// ── Dynamic nav additions — Clause 8 full register set ──────────────────────
// These are appended to the NAV array at runtime if not already present
(function() {
  const c8extras = [
    { file:'loto-register.html',        label:'LOTO Device Register',         num:'S1', grp:'c8' },
    { file:'confined-space-log.html',   label:'Confined Space Log',           num:'S2', grp:'c8' },
    { file:'heat-stress-log.html',      label:'Heat Stress / WBGT Log',       num:'S3', grp:'c8', badge:'Jun–Sep', badgeCls:'nav-badge amber' },
    { file:'fire-extinguisher-log.html',label:'Fire Extinguisher Log',        num:'S4', grp:'c8', badge:'CAPA-004', badgeCls:'nav-badge' },
    { file:'fire-pump-log.html',        label:'Fire Pump Test Log',           num:'S5', grp:'c8' },
    { file:'oh-surveillance.html',      label:'OH Surveillance Register',     num:'S6', grp:'c8' },
    { file:'waste-management.html',     label:'Waste Management Register',    num:'E1', grp:'c8' },
    { file:'chemical-storage.html',     label:'Chemical Storage & Spills',    num:'E2', grp:'c8' },
    { file:'meps-register.html',        label:'MEPS Compliance Register',     num:'E3', grp:'c8' },
    { file:'furnace-monitoring.html',   label:'Furnace Monitoring Logs',      num:'E4', grp:'c8', badge:'F4 URGENT', badgeCls:'nav-badge' },
    { file:'customer-register.html',    label:'Customer Register',            num:'Q1', grp:'c8' },
    { file:'inprocess-inspection.html', label:'In-Process Inspection Log',    num:'Q2', grp:'c8' },
  ];
  const existing = NAV.map(n => n.file);
  c8extras.forEach(n => { if (!existing.includes(n.file)) NAV.push(n); });
})();
