/**
 * SAGCO IMS — Shared Navigation Rev.15
 */
const NAV = [
  // Overview
  { file:'index.html',           label:'Executive Dashboard',          num:'00', grp:'overview' },
  // Clause 4
  { file:'context.html',         label:'IMS Context Register',         num:'01', grp:'c4' },
  { file:'pestle-swot.html',     label:'PESTLE & SWOT',                num:'02', grp:'c4' },
  { file:'scope.html',           label:'Scope & Process Map',          num:'09', grp:'c4' },
  // Clause 5
  { file:'policies.html',        label:'IMS Policies Register',        num:'11', grp:'c5' },
  { file:'worker-participation.html', label:'Worker Participation',    num:'12', grp:'c5' },
  // Clause 6
  { file:'risk-register.html',   label:'Integrated Risk Register',     num:'03', grp:'c6', badge:'2 CRIT', badgeCls:'nav-badge' },
  { file:'compliance.html',      label:'Legal & Compliance',           num:'04', grp:'c6', badge:'3 URGENT', badgeCls:'nav-badge' },
  { file:'methodology.html',     label:'Risk Assessment WI',           num:'05', grp:'c6' },
  { file:'objectives.html',      label:'Objectives & KPI',             num:'06', grp:'c6', badge:'2 URGENT', badgeCls:'nav-badge' },
  { file:'moc.html',             label:'MOC Register',                 num:'07', grp:'c6', badge:'1 PENDING', badgeCls:'nav-badge amber' },
  { file:'energy.html',          label:'Energy Planning',              num:'08', grp:'c6' },
  { file:'hira.html',            label:'HIRA Register',                num:'13', grp:'c6' },
  { file:'sea-register.html',    label:'SEA Register',                 num:'14', grp:'c6' },
  // Clause 7
  { file:'competency.html',      label:'Competency Matrix',            num:'15', grp:'c7' },
  { file:'training.html',        label:'Training Register',            num:'16', grp:'c7' },
  { file:'documentation.html',   label:'Documentation Register',       num:'17', grp:'c7' },
  // Clause 9
  { file:'kpi-dashboard.html',   label:'KPI Dashboard',                num:'18', grp:'c9' },
  { file:'compliance-eval.html', label:'Compliance Evaluation',        num:'19', grp:'c9' },
  { file:'audit-programme.html', label:'Internal Audit Programme',     num:'20', grp:'c9' },
  { file:'checklist.html',       label:'Annual Checklist',             num:'10', grp:'c9', badge:'3 URGENT', badgeCls:'nav-badge' },
  // Clause 10
  { file:'capa-register.html',   label:'CAPA Register',                num:'21', grp:'c10', badge:'6 OPEN', badgeCls:'nav-badge amber' },
  { file:'management-review.html', label:'Management Review',          num:'22', grp:'c10' },
  { file:'incident-register.html', label:'Incident Register',          num:'23', grp:'c10' },
  // ESG
  { file:'supplier-esg.html',    label:'Supplier ESG Register',        num:'24', grp:'ecov' },
  { file:'coi-register.html',    label:'Conflict of Interest',         num:'25', grp:'ecov' },
  { file:'gifts-hospitality.html', label:'Gifts & Hospitality',        num:'26', grp:'ecov' },
  { file:'scope3-emissions.html', label:'Scope 3 Emissions',           num:'27', grp:'ecov' },
  { file:'workforce-diversity.html', label:'Workforce Diversity',      num:'28', grp:'ecov' },
  { file:'tpdd.html',            label:'Third-Party Due Diligence',     num:'29', grp:'ecov' },
  { file:'water-waste.html',     label:'Water & Waste Data',           num:'30', grp:'ecov' },
  { file:'supplier-conduct.html', label:'Supplier Code of Conduct',    num:'31', grp:'ecov' },
];

const GRP_LABELS = {
  overview: 'Overview',
  c4:  'Clause 4 — Context',
  c5:  'Clause 5 — Leadership',
  c6:  'Clause 6 — Planning',
  c7:  'Clause 7 — Support',
  c9:  'Clause 9 — Performance',
  c10: 'Clause 10 — Improvement',
  ecov:'ESG / Sustainability / Ethics',
};
const GRP_ORDER = ['overview','c4','c5','c6','c7','c9','c10','ecov'];

function renderNav(activePage) {
  let html = `<div class="sidebar">
    <a class="sb-logo" href="index.html">
      <div class="sb-logo-icon">S</div>
      <div class="sb-logo-text">
        <strong>SAGCO IMS</strong>
        <span>Rev.15 · May 2026</span>
      </div>
    </a>`;
  GRP_ORDER.forEach(gk => {
    const items = NAV.filter(n => n.grp === gk);
    html += `<div class="sb-section"><div class="sb-label">${GRP_LABELS[gk]}</div>`;
    items.forEach(n => {
      const cls = activePage === n.file ? 'nav-item active' : 'nav-item';
      const badge = n.badge ? `<span class="${n.badgeCls||'nav-badge'}">${n.badge}</span>` : '';
      html += `<a href="${n.file}" class="${cls}">
        <span class="nav-num">${n.num}</span>
        <span style="flex:1">${n.label}</span>
        ${badge}
      </a>`;
    });
    html += `</div>`;
  });
  html += `<div class="sb-footer">
    <div class="sync-row"><span class="sync-dot"></span><span>Live — Google Sheets</span></div>
    <div>Last sync: <span class="js-last-sync">—</span></div>
    <div style="margin-top:4px;opacity:.7">ISO 45001 · 14001 · 50001 · 9001</div>
  </div></div>`;
  return html;
}

function renderTopbar(title, subtitle) {
  return `<div class="topbar">
    <div class="topbar-left">
      <div class="breadcrumb">SAGCO IMS &rsaquo; <strong>${title}</strong></div>
    </div>
    <div class="topbar-right">
      ${subtitle ? `<span style="font-size:11px;color:var(--g400)">${subtitle}</span>` : ''}
      <button class="btn btn-ghost" onclick="location.reload()">↻ Refresh</button>
      <a href="google-apps-script.js" class="btn btn-gold" download>⚙ Setup Guide</a>
    </div>
  </div>`;
}

function renderSyncBar() {
  return `<div class="sync-bar">
    <span class="sync-dot" style="width:8px;height:8px;border-radius:50%;background:var(--low);animation:pulse 2.5s infinite"></span>
    <span>Connected to <strong>Google Sheets</strong> — edits appear here automatically · refresh every 5 min</span>
    <span style="margin-left:auto;font-family:var(--mono);font-size:10.5px">Updated: <span class="js-last-sync">—</span></span>
  </div>`;
}

function initPage(activePage) {
  const sidebar = document.createElement('div');
  sidebar.innerHTML = renderNav(activePage);
  document.body.insertBefore(sidebar.firstElementChild, document.body.firstChild);
}

function chartDefaults() {
  return {
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { labels: { font: { family: "'IBM Plex Sans'", size: 10 }, boxWidth: 11, padding: 10 } } }
  };
}
const CC = {
  crit:'#B71C1C', high:'#E65100', med:'#F9A825', low:'#2E7D32',
  opp:'#0D47A1', navy:'#1B2A4A', gold:'#C9A84C', grey:'#8A94A6',
  catMap: {
    'Safety / OH&S':'#7F0000','Environmental':'#004D40','Energy':'#003366',
    'Sustainability':'#4A148C','Social / Labour':'#1A237E','Anti-Bribery':'#3E0066',
    'Compliance Risk':'#37474F','Opportunity':'#0D47A1',
    'Quality':'#1B5E20','Social':'#1A237E','Multi':'#37474F',
  },
};
