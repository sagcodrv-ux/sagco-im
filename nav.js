/**
 * SAGCO IMS — Shared Navigation (nav.js)
 */
const NAV = [
  { file:'index.html',          label:'Executive Dashboard',        num:'00', grp:'overview' },
  { file:'context.html',        label:'IMS Context Register',       num:'01', grp:'c4', badge:null },
  { file:'pestle-swot.html',    label:'PESTLE & SWOT',              num:'02', grp:'c4' },
  { file:'risk-register.html',  label:'Integrated Risk Register',   num:'03', grp:'c6', badge:'2 CRIT', badgeCls:'nav-badge' },
  { file:'compliance.html',     label:'Legal & Compliance',         num:'04', grp:'c6', badge:'3 URGENT', badgeCls:'nav-badge' },
  { file:'methodology.html',    label:'Risk Assessment WI',         num:'05', grp:'c6' },
  { file:'objectives.html',     label:'Objectives & KPI',           num:'06', grp:'c6', badge:'2 URGENT', badgeCls:'nav-badge' },
  { file:'moc.html',            label:'MOC Register',               num:'07', grp:'c6', badge:'1 PENDING', badgeCls:'nav-badge amber' },
  { file:'energy.html',         label:'Energy Planning',            num:'08', grp:'c6' },
  { file:'scope.html',          label:'Scope & Process Map',        num:'09', grp:'c4' },
  { file:'checklist.html',      label:'Annual Checklist',           num:'10', grp:'review', badge:'3 URGENT', badgeCls:'nav-badge' },
];
const GRP_LABELS = { overview:'Overview', c4:'Clause 4 — Context', c6:'Clause 6 — Planning', review:'Management Review' };
const GRP_ORDER  = ['overview','c4','c6','review'];

function renderNav(activePage) {
  let html = `<div class="sidebar">
    <a class="sb-logo" href="index.html">
      <div class="sb-logo-icon">S</div>
      <div class="sb-logo-text">
        <strong>SAGCO IMS</strong>
        <span>Rev.12 · May 2026</span>
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
    <div style="margin-top:4px;opacity:.7">ISO 45001 · 14001 · 50001</div>
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
    <span>Connected to <strong>Google Sheets</strong> — edits made in the sheet appear here automatically · refresh every 5 min</span>
    <span style="margin-left:auto;font-family:var(--mono);font-size:10.5px">Updated: <span class="js-last-sync">—</span></span>
  </div>`;
}

function initPage(activePage) {
  // Inject sidebar
  const sidebar = document.createElement('div');
  sidebar.innerHTML = renderNav(activePage);
  document.body.insertBefore(sidebar.firstElementChild, document.body.firstChild);
}

// Chart.js defaults
function chartDefaults() {
  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { labels: { font: { family: "'IBM Plex Sans'", size: 10 }, boxWidth: 11, padding: 10 } }
    }
  };
}

// Common chart colours
const CC = {
  crit:'#B71C1C', high:'#E65100', med:'#F9A825', low:'#2E7D32',
  opp:'#0D47A1',  navy:'#1B2A4A', gold:'#C9A84C', grey:'#8A94A6',
  prog:'#1565C0', envt:'#004D40', enrg:'#003366', sust:'#4A148C',
  socc:'#1A237E', bra:'#3E0066',
  catMap: {
    'Safety / OH&S':'#7F0000', 'Environmental':'#004D40', 'Energy':'#003366',
    'Sustainability':'#4A148C', 'Social / Labour':'#1A237E', 'Anti-Bribery':'#3E0066',
    'Compliance Risk':'#37474F', 'Opportunity':'#0D47A1',
    'Quality':'#1B5E20', 'Social':'#1A237E', 'Multi':'#37474F',
  },
};
