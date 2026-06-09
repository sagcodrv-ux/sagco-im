/* ═══════════════════════════════════════════════════════════════
   SAGCO IMS — SharePoint Links
   sharepoint-links.js  |  Rev.01  |  June 2026

   Adds a "View in SharePoint" button to any IMS page.
   Load this script on any page that has a SharePoint list:
     <script src="sharepoint-links.js"></script>

   The script reads the current page filename and automatically
   shows the correct SharePoint link for that page.
═══════════════════════════════════════════════════════════════ */

/* ── SharePoint base URL ────────────────────────────────────── */
var SP_BASE = 'https://sagconet.sharepoint.com';

/* ── Page → SharePoint List URL map ────────────────────────── */
var SP_LINKS = {
  /* Phase 1 — 5 lists already created */
  'capa-register.html':      SP_BASE + '/sites/SAGCOIMS/Lists/CAPA_Register/AllItems.aspx',
  'risk-register.html':      SP_BASE + '/sites/SAGCOIMS/Lists/Risk%20register/AllItems.aspx',
  'objectives.html':         SP_BASE + '/sites/SAGCOIMS/Lists/Objectives/AllItems.aspx',
  'kpi-dashboard.html':      SP_BASE + '/sites/SAGCOIMS/Lists/KPI_dashboard/AllItems.aspx',
  'document-management.html':SP_BASE + '/sites/SAGCOIMS/Lists/Document%20register/AllItems.aspx',

  /* Phase 2 — add remaining lists here as you create them */
  'context.html':            SP_BASE + '/sites/SAGCOIMS/Lists/Context/AllItems.aspx',
  'pestle-swot.html':        SP_BASE + '/sites/SAGCOIMS/Lists/PESTLE_SWOT/AllItems.aspx',
  'policies.html':           SP_BASE + '/sites/SAGCOIMS/Lists/Policies/AllItems.aspx',
  'hira.html':               SP_BASE + '/sites/SAGCOIMS/Lists/HIRA/AllItems.aspx',
  'sea-register.html':       SP_BASE + '/sites/SAGCOIMS/Lists/SEA_Register/AllItems.aspx',
  'compliance.html':         SP_BASE + '/sites/SAGCOIMS/Lists/Compliance/AllItems.aspx',
  'energy.html':             SP_BASE + '/sites/SAGCOIMS/Lists/Energy/AllItems.aspx',
  'competency.html':         SP_BASE + '/sites/SAGCOIMS/Lists/Competency/AllItems.aspx',
  'training.html':           SP_BASE + '/sites/SAGCOIMS/Lists/Training/AllItems.aspx',
  'audit-programme.html':    SP_BASE + '/sites/SAGCOIMS/Lists/Audit_Programme/AllItems.aspx',
  'management-review.html':  SP_BASE + '/sites/SAGCOIMS/Lists/Management_Review/AllItems.aspx',
  'incident-register.html':  SP_BASE + '/sites/SAGCOIMS/Lists/Incidents/AllItems.aspx',
};

/* ── Inject SharePoint button into the page ─────────────────── */
(function () {
  document.addEventListener('DOMContentLoaded', function () {
    var page = window.location.pathname.split('/').pop() || 'index.html';
    var spUrl = SP_LINKS[page];
    if (!spUrl) return; /* no SharePoint list for this page */

    /* Build the banner */
    var banner = document.createElement('div');
    banner.id = 'sp-banner';
    banner.style.cssText = [
      'background:#fff',
      'border:1px solid #d0d8e8',
      'border-left:4px solid #0078d4',
      'border-radius:0 6px 6px 0',
      'padding:10px 16px',
      'margin-bottom:14px',
      'display:flex',
      'align-items:center',
      'justify-content:space-between',
      'flex-wrap:wrap',
      'gap:10px',
      'font-family:Arial,sans-serif',
      'font-size:12px',
      'box-shadow:0 2px 8px rgba(0,0,0,.08)',
    ].join(';');

    banner.innerHTML = ''
      + '<div style="display:flex;align-items:center;gap:10px">'
      +   '<img src="https://res.cdn.office.net/files/fabric-cdn-prod_20230727.002/assets/brand-icons/product/svg/sharepoint_16x1.svg" '
      +        'width="20" height="20" onerror="this.style.display=\'none\'" alt="SharePoint">'
      +   '<div>'
      +     '<div style="font-weight:700;color:#1B2A4A">Live data stored in SharePoint</div>'
      +     '<div style="color:#5A6478;font-size:11px">This register is managed in SAGCO SharePoint. Sign in with your SAGCO account to view, edit, or add records.</div>'
      +   '</div>'
      + '</div>'
      + '<div style="display:flex;gap:8px;flex-shrink:0">'
      +   '<a href="' + spUrl + '" target="_blank" '
      +      'style="background:#0078d4;color:#fff;border:none;border-radius:5px;padding:7px 14px;'
      +             'font-size:11px;font-weight:600;text-decoration:none;cursor:pointer;'
      +             'display:inline-flex;align-items:center;gap:5px">'
      +     '📋 Open in SharePoint'
      +   '</a>'
      +   '<a href="' + spUrl.replace('AllItems.aspx', 'EditForm.aspx') + '" target="_blank" '
      +      'style="background:#107c10;color:#fff;border:none;border-radius:5px;padding:7px 14px;'
      +             'font-size:11px;font-weight:600;text-decoration:none;cursor:pointer;'
      +             'display:inline-flex;align-items:center;gap:5px">'
      +     '＋ Add New Record'
      +   '</a>'
      + '</div>';

    /* Insert after back-row or at top of content */
    var content = document.querySelector('.content');
    if (!content) return;
    var backRow = content.querySelector('.back-row');
    if (backRow) {
      backRow.insertAdjacentElement('afterend', banner);
    } else {
      content.insertBefore(banner, content.firstChild);
    }
  });
})();
