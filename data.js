/**
 * SAGCO IMS — Data Layer  (data.js)
 * Google Sheets live sync + complete fallback dataset
 * ────────────────────────────────────────────────────
 * 1. Deploy google-apps-script.js as a Web App
 * 2. Paste the URL below into APPS_SCRIPT_URL
 * 3. That's it — site auto-refreshes every 5 min
 */

const IMS_CONFIG = {
  APPS_SCRIPT_URL: 'https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec',
  SHEET_ID:        'YOUR_GOOGLE_SHEET_ID',
  TABS: {
    context:    'Context Register',
    pestle:     'PESTLE SWOT',
    risks:      'Risk Register',
    compliance: 'Legal Compliance',
    objectives: 'Objectives KPI',
    moc:        'MOC Register',
    energy:     'Energy Planning',
    checklist:  'Annual Checklist',
  },
  REFRESH_MS: 300000,   // 5 minutes
};

// ── Cache ──────────────────────────────────────────────────
const _cache = {};
let _lastSync = null;

async function fetchTab(tabKey) {
  const tabName = IMS_CONFIG.TABS[tabKey];
  const cached  = _cache[tabKey];
  if (cached && Date.now() - cached.ts < 60000) return cached.data;
  try {
    const url = `${IMS_CONFIG.APPS_SCRIPT_URL}?tab=${encodeURIComponent(tabName)}`;
    const res  = await fetch(url, { cache: 'no-store' });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const json = await res.json();
    if (json.error) throw new Error(json.error);
    _cache[tabKey] = { data: json, ts: Date.now() };
    _lastSync = new Date();
    _updateSyncEl();
    return json;
  } catch (err) {
    console.warn('[IMS] Sheet fetch failed (' + tabKey + '):', err.message);
    return FALLBACK[tabKey] || [];
  }
}

function _updateSyncEl() {
  document.querySelectorAll('.js-last-sync').forEach(el => {
    el.textContent = _lastSync ? _lastSync.toLocaleTimeString() : '—';
  });
}

// ── Named getters ──────────────────────────────────────────
const getData = {
  risks:      () => fetchTab('risks'),
  objectives: () => fetchTab('objectives'),
  compliance: () => fetchTab('compliance'),
  moc:        () => fetchTab('moc'),
  energy:     () => fetchTab('energy'),
  context:    () => fetchTab('context'),
  pestle:     () => fetchTab('pestle'),
  checklist:  () => fetchTab('checklist'),
};

// ── Helpers ────────────────────────────────────────────────
function riskRating(score) {
  const s = parseInt(score) || 0;
  if (s >= 20) return { label:'CRITICAL', badge:'b-critical', pill:'sp-crit', kc:'kc-red'  };
  if (s >= 12) return { label:'HIGH',     badge:'b-high',     pill:'sp-high', kc:'kc-org'  };
  if (s >= 6)  return { label:'MEDIUM',   badge:'b-medium',   pill:'sp-med',  kc:'kc-amb'  };
  if (s >= 1)  return { label:'LOW',      badge:'b-low',      pill:'sp-low',  kc:'kc-grn'  };
  return               { label:'—',       badge:'b-monitor',  pill:'',        kc:'kc-navy' };
}

function statusBadge(s) {
  const v = String(s||'').toUpperCase().trim();
  if (v.includes('COMPLI') || v.includes('ON TRACK') || v.includes('COMPLETE')) return 'b-done';
  if (v.includes('IN PROGRESS') || v.includes('IMPROV'))  return 'b-prog';
  if (v.includes('AT RISK') || v.includes('PARTIAL'))     return 'b-atrisk';
  if (v.includes('URGENT') || v.includes('OVERDUE'))      return 'b-urgent';
  if (v.includes('PLANNED') || v.includes('NOT START'))   return 'b-planned';
  if (v.includes('MONITOR') || v.includes('STABLE'))      return 'b-monitor';
  if (v.includes('APPROVED'))                             return 'b-approved';
  if (v.includes('PENDING'))                              return 'b-pending';
  return 'b-monitor';
}

function traceLinks(refStr) {
  if (!refStr || refStr === '—') return '';
  return String(refStr).split(/[;,]/).map(r => {
    r = r.trim(); if (!r || r === '—') return '';
    let href = '#';
    if (/^(R-|O-|BRA-|ENV-)/.test(r))    href = `risk-register.html#${r}`;
    else if (/^OBJ-/.test(r))            href = `objectives.html#${r}`;
    else if (/^MOC-/.test(r))            href = `moc.html#${r}`;
    else if (/^EN-/.test(r))             href = `energy.html#${r}`;
    else if (/^(E-|I-|S-)/.test(r))      href = `context.html#${r}`;
    else if (/^(HS-|EN-\d|EG-|GG-|QM-|AC-|SR-|RM-|IM-|SP-)/.test(r)) href = `compliance.html#${r}`;
    else if (/^(PS-|SW-)/.test(r))        href = `pestle-swot.html#${r}`;
    return `<a href="${href}" class="trace-link">${r}</a>`;
  }).join('');
}

function scorePill(score, rating) {
  if (!score || score === '—' || score === '') return '<span style="color:var(--g400)">—</span>';
  const cls = { CRITICAL:'sp-crit', HIGH:'sp-high', MEDIUM:'sp-med', LOW:'sp-low' }[String(rating||'').toUpperCase()] || 'sp-med';
  return `<span class="score-pill ${cls}">${score}</span>`;
}

function showLoader(show) {
  const el = document.getElementById('loader');
  if (el) el.classList.toggle('hidden', !show);
}

function filterTable(inputId, tableId) {
  const inp = document.getElementById(inputId);
  const tbl = document.getElementById(tableId);
  if (!inp || !tbl) return;
  inp.addEventListener('input', () => {
    const q = inp.value.toLowerCase();
    let vis = 0;
    tbl.querySelectorAll('tbody tr').forEach(tr => {
      const show = tr.textContent.toLowerCase().includes(q);
      tr.style.display = show ? '' : 'none';
      if (show) vis++;
    });
    const cnt = document.querySelector(`[data-count="${tableId}"]`);
    if (cnt) cnt.textContent = `${vis} record${vis !== 1 ? 's' : ''}`;
  });
}

function scrollToHash() {
  const h = location.hash.replace('#', '');
  if (!h) return;
  setTimeout(() => {
    const el = document.getElementById(h);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.style.transition = 'background .3s';
      el.style.background = 'rgba(201,168,76,.18)';
      setTimeout(() => el.style.background = '', 2500);
    }
  }, 500);
}

function startRefresh(fn) {
  if (IMS_CONFIG.REFRESH_MS > 0) setInterval(fn, IMS_CONFIG.REFRESH_MS);
}

// ══════════════════════════════════════════════════════════
// FALLBACK DATA — mirrors IMS Workbook Rev12
// ══════════════════════════════════════════════════════════
const FALLBACK = {

risks: [
  { ref:'R-S-01', type:'OHS Risk', cat:'Safety / OH&S', std:'ISO 45001',
    desc:'Molten glass contact — severe burn or fatality at furnace hot end',
    L_inh:5, S_inh:5, score_inh:25, rating_inh:'CRITICAL',
    controls:'PTW (PR-16); aluminised suit & gloves; furnace tap-out SOP; Emergency Response Plan PR-17; hot-end exclusion zones enforced',
    action:'Formalise furnace tap-out SOP with GM sign-off; annual hot-metal emergency drill; monthly PPE stock check vs PR-16 schedule',
    owner:'Production Manager / HSE Manager', due:'Q3 2026',
    L_res:4, S_res:5, score_res:20, rating_res:'CRITICAL',
    monitor:'Monthly PTW compliance audit; annual drill record',
    ctx_ref:'E-13;E-17 / I-05;I-23', legal:'HS-02;HS-06', obj_ref:'OBJ-02' },
  { ref:'R-S-02', type:'OHS Risk', cat:'Safety / OH&S', std:'ISO 45001',
    desc:'Furnace explosion or catastrophic blowback — mass casualty event',
    L_inh:3, S_inh:5, score_inh:15, rating_inh:'HIGH',
    controls:'Daily furnace inspection checklist; water exclusion zones; blast shields; Emergency Response Plan PR-17 registered Civil Defense; 7 generators',
    action:'⚠️ URGENT: Conduct 2026 emergency drill IMMEDIATELY — OVERDUE; thermal cameras F3/F4 crowns Q4 2026; update PR-17 after each debrief',
    owner:'HSE Manager / Engineering Manager', due:'IMMEDIATE (drill)',
    L_res:2, S_res:5, score_res:10, rating_res:'MEDIUM',
    monitor:'Daily refractory inspection; annual drill; thermal imaging F3/F4',
    ctx_ref:'E-17 / I-06;I-13', legal:'HS-02;RM-04', obj_ref:'OBJ-02' },
  { ref:'R-S-03', type:'OHS Risk', cat:'Safety / OH&S', std:'ISO 45001',
    desc:'Confined space fatality — oxygen deficiency or toxic gas (CO/SO₂/CO₂)',
    L_inh:3, S_inh:5, score_inh:15, rating_inh:'HIGH',
    controls:'Confined space programme PR-16 (pending formal issue); mandatory gas test before entry; standby attendant; rescue equipment pre-positioned',
    action:'Issue PR-16 formally before Stage 2; confined space location register; quarterly rescue equipment inspection; CS entry drill before Stage 2',
    owner:'HSE Manager', due:'Stage 2 audit',
    L_res:2, S_res:5, score_res:10, rating_res:'MEDIUM',
    monitor:'PTW confined space log per entry; annual rescue drill',
    ctx_ref:'E-13 / I-11;I-13', legal:'HS-02;HS-08', obj_ref:'OBJ-03' },
  { ref:'R-S-04', type:'OHS Risk', cat:'Safety / OH&S', std:'ISO 45001',
    desc:'Hot work fire or explosion — welding/grinding/cutting near flammables',
    L_inh:3, S_inh:5, score_inh:15, rating_inh:'HIGH',
    controls:'Hot work PTW PR-12; fire watch 30 min post-work; gas line isolation confirmed; fire extinguisher standby; post-work inspection',
    action:'⚠️ URGENT: 2026 fire extinguisher inspection MISSING — conduct immediately (HS-04); close CAPA-001 PTW; issue LOTO PR-19',
    owner:'HSE Manager', due:'IMMEDIATE',
    L_res:2, S_res:5, score_res:10, rating_res:'MEDIUM',
    monitor:'Monthly fire extinguisher log; PTW reconciliation monthly',
    ctx_ref:'E-13 / I-11;I-13;I-14', legal:'HS-04;HS-08;RM-04', obj_ref:'OBJ-03' },
  { ref:'R-S-05', type:'OHS Risk', cat:'Safety / OH&S', std:'ISO 45001',
    desc:'Electrical fatality — arc flash or electrocution during HV maintenance',
    L_inh:3, S_inh:5, score_inh:15, rating_inh:'HIGH',
    controls:'LOTO programme PR-19 (pending formal issue); electrical safety PR-11; arc flash assessment; Cat.3 PPE; HV permit',
    action:'Issue LOTO PR-19 formally; electrical infrastructure condition survey; mark arc flash boundary on all switchgear; annual HV permit audit',
    owner:'Maintenance Manager / HSE Manager', due:'Q3 2026',
    L_res:2, S_res:5, score_res:10, rating_res:'MEDIUM',
    monitor:'PTW electrical log; LOTO tag count monthly',
    ctx_ref:'E-13 / I-08;I-11', legal:'HS-02;HS-08', obj_ref:'OBJ-03' },
  { ref:'R-S-07', type:'OHS Risk', cat:'Safety / OH&S', std:'ISO 45001',
    desc:'Forklift–pedestrian collision — serious injury or fatality in logistics areas',
    L_inh:4, S_inh:4, score_inh:16, rating_inh:'HIGH',
    controls:'Traffic management PR-28; pedestrian barriers; 5 km/h limit enforced; banksman in pedestrian zones; CCTV at key intersections',
    action:'Complete traffic route risk assessment; procure proximity warning systems on all forklifts; quarterly pedestrian-forklift incident review',
    owner:'Logistics Manager', due:'Q4 2026',
    L_res:3, S_res:3, score_res:9, rating_res:'MEDIUM',
    monitor:'Quarterly incident/near-miss log; monthly barrier inspection',
    ctx_ref:'E-13 / I-11;I-12', legal:'HS-02;HS-10', obj_ref:'OBJ-02' },
  { ref:'R-S-09', type:'OHS Risk', cat:'Safety / OH&S', std:'ISO 45001',
    desc:'Heat stress — worker incapacitation or fatality in furnace environment',
    L_inh:4, S_inh:4, score_inh:16, rating_inh:'HIGH',
    controls:'Heat stress programme PR-14; AC rest areas at each furnace; chilled water; WBGT monitoring; work-rest rotation; MO 3337 compliance',
    action:'Quarterly WBGT records at all furnace positions; supervisor training on MO 3337; heat stroke scenario in first aid training; HVAC review pre-summer 2027',
    owner:'HSE Manager', due:'May 2027 (pre-summer)',
    L_res:3, S_res:4, score_res:12, rating_res:'HIGH',
    monitor:'Quarterly WBGT; daily work-rest compliance in summer months',
    ctx_ref:'E-17;E-20 / I-05;I-13', legal:'HS-05;HS-07', obj_ref:'OBJ-02' },
  { ref:'R-E-01', type:'Environmental Aspect', cat:'Environmental', std:'ISO 14001',
    desc:'Furnace stack emissions exceeding NCEC/MEWA limits — NOₓ, SOₓ, PM',
    L_inh:4, S_inh:4, score_inh:16, rating_inh:'HIGH',
    controls:'Stack monitoring; EMCO Dec-2024 validation (all 5 furnaces NCEC compliant); electrostatic precipitators; annual stack test',
    action:'Install CEMS on all 5 stacks Q4 2026; formalise monthly stack data review meeting; prepare 24-hour NCEC exceedance notification procedure',
    owner:'Engineering Manager', due:'Q4 2026 (CEMS)',
    L_res:3, S_res:4, score_res:12, rating_res:'HIGH',
    monitor:'Monthly stack data; CEMS real-time post Q4 2026; annual EMCO validation',
    ctx_ref:'E-03;E-04 / I-09', legal:'EN-01;EN-02', obj_ref:'OBJ-09' },
  { ref:'R-E-02', type:'OHS Risk', cat:'Environmental', std:'ISO 14001/45001',
    desc:'Fugitive silica dust — batch house air quality breach and silicosis risk',
    L_inh:4, S_inh:5, score_inh:20, rating_inh:'CRITICAL',
    controls:'Bag filters on all batch house transfer points; enclosed conveyors; P3 respirators mandatory; quarterly silica dust monitoring; negative pressure batch house',
    action:'Formal silica HIRA per MODON OHS-TG; real-time PM2.5 monitor in batch house; formalise silica health surveillance (HS-07); annual occupational hygiene survey',
    owner:'Production Manager / HSE Manager', due:'Q3 2026',
    L_res:3, S_res:5, score_res:15, rating_res:'HIGH',
    monitor:'Quarterly silica dust monitoring; annual occupational hygiene survey',
    ctx_ref:'E-03;E-13;E-19 / I-09', legal:'HS-07;EN-01', obj_ref:'OBJ-02' },
  { ref:'R-E-07', type:'Compliance Risk', cat:'Environmental', std:'ISO 14001',
    desc:'Regulatory non-compliance — NCEC/MEWA environmental licence failure',
    L_inh:3, S_inh:5, score_inh:15, rating_inh:'HIGH',
    controls:'Legal compliance register quarterly; MEWA/MODON liaison; annual EMCO validation; ISO 14001 Stage 2 in progress',
    action:'Resolve all URGENT gaps before Stage 2: fire extinguisher (IMMEDIATE), emergency drill (IMMEDIATE), PTW CAPA-001, Group A programme approvals',
    owner:'HSE Manager / IMS Champion', due:'Stage 2 audit',
    L_res:2, S_res:5, score_res:10, rating_res:'MEDIUM',
    monitor:'Quarterly legal compliance review; RAG dashboard at Management Review',
    ctx_ref:'E-03;E-04 / I-09;I-12;I-17;I-20', legal:'EN-08;EN-09', obj_ref:'OBJ-05' },
  { ref:'R-E-08', type:'Environmental Aspect', cat:'Environmental', std:'ISO 14001',
    desc:'GHG Scope 1+2 exceeding baseline — carbon intensity 615 kgCO₂e/tonne packed glass',
    L_inh:4, S_inh:3, score_inh:12, rating_inh:'HIGH',
    controls:'Annual GHG inventory validated by EMCO; 615.27 kgCO₂e/tonne baseline (2024); cullet increase programme; furnace rebuild roadmap',
    action:'Complete 2025 GHG inventory Q2 2026; SBTi near-term target by 2028; cullet 25% by 2027; solar PV feasibility Q2 2026; report in ESG Report',
    owner:'Energy Manager / Sustainability Manager', due:'Q2 2026 (inventory)',
    L_res:3, S_res:3, score_res:9, rating_res:'MEDIUM',
    monitor:'Monthly GHG intensity tracking; annual EMCO GHG inventory',
    ctx_ref:'E-02;E-17 / I-06;I-16', legal:'GG-01;GG-02', obj_ref:'OBJ-06' },
  { ref:'R-EN-01', type:'Energy Risk', cat:'Energy', std:'ISO 50001',
    desc:'Furnace energy efficiency degradation — SHC above age-adjusted baseline targets',
    L_inh:4, S_inh:4, score_inh:16, rating_inh:'HIGH',
    controls:'ISO 50001 EnMS certified 2024; annual combustion analysis; quarterly furnace thermal survey; structured rebuild programme F1(2025)/F2(2026)',
    action:'F2 rebuild/regenerative conversion decision Aug 2026 (URGENT); F4 root cause investigation Jun 2026 (URGENT); ECM 1 engineering study',
    owner:'Energy Manager', due:'F2 decision Aug 2026',
    L_res:3, S_res:3, score_res:9, rating_res:'MEDIUM',
    monitor:'Monthly furnace SHC kcal/kg vs age-adjusted target; quarterly combustion analysis',
    ctx_ref:'E-07;E-14 / I-06;I-25', legal:'EG-01;EG-02', obj_ref:'OBJ-10;OBJ-11;OBJ-12' },
  { ref:'R-EN-02', type:'Energy Risk', cat:'Energy', std:'ISO 50001',
    desc:'Energy procurement price volatility — HFO tariff +45.9% Jan 2026 (0.42 SAR/L)',
    L_inh:4, S_inh:3, score_inh:12, rating_inh:'HIGH',
    controls:'Quarterly energy cost variance reporting; ECM 1 NPV 457M SAR confirms strong business case at current tariff; 90-day HFO buffer stock policy (planned)',
    action:'Complete solar PV feasibility Q2 2026; build 90-day HFO buffer stock policy Q3 2026; model SEC tariff scenarios in 3-year budget; energy price risk in IMS review',
    owner:'Finance Manager / Energy Manager', due:'Q3 2026',
    L_res:3, S_res:3, score_res:9, rating_res:'MEDIUM',
    monitor:'Monthly energy cost vs budget; quarterly tariff review; HFO stock level',
    ctx_ref:'E-05;E-07;E-08 / I-06', legal:'EG-01', obj_ref:'OBJ-10;OBJ-16' },
  { ref:'R-EN-03', type:'Energy Risk', cat:'Energy', std:'ISO 50001',
    desc:'Compressed air system leakage — 20–30% estimated energy waste identified as SEU',
    L_inh:5, S_inh:3, score_inh:15, rating_inh:'HIGH',
    controls:'Identified as ISO 50001 SEU; ultrasonic survey planned Q2 2026; target <5% leakage rate; sub-metering planned Q3 2026',
    action:'Ultrasonic leak detection survey Q2 2026; repair all leaks within 30 days; install sub-metering Q3 2026; establish quarterly leak detection as routine',
    owner:'Engineering Manager', due:'Q2 2026 (survey)',
    L_res:3, S_res:2, score_res:6, rating_res:'MEDIUM',
    monitor:'Quarterly leakage rate %; compressed air kWh sub-meter monthly',
    ctx_ref:'E-07;E-08 / I-07', legal:'EG-02', obj_ref:'OBJ-15' },
  { ref:'R-SUS-01', type:'Sustainability Risk', cat:'Sustainability', std:'ISO 14001',
    desc:'Climate physical risk — extreme Jeddah heat increasing worker risk and energy demand',
    L_inh:3, S_inh:4, score_inh:12, rating_inh:'HIGH',
    controls:'Heat stress programme PR-14; WBGT monitoring; AC cooling at all furnaces; work-rest rotation; MO 3337 compliance',
    action:'TCFD physical risk scenario analysis Q4 2026; IPCC SSP2-4.5 modelling for furnace operations; climate adaptation plan HVAC capacity increase',
    owner:'HSE Manager / Sustainability Manager', due:'Q4 2026',
    L_res:3, S_res:3, score_res:9, rating_res:'MEDIUM',
    monitor:'Quarterly WBGT; annual climate risk review at Management Review',
    ctx_ref:'E-17;E-19 / I-05', legal:'HS-05', obj_ref:'OBJ-02' },
  { ref:'R-SUS-03', type:'Sustainability Risk', cat:'Sustainability', std:'ISO 14001',
    desc:'ESG non-disclosure — reputational damage and key customer contract loss',
    L_inh:3, S_inh:4, score_inh:12, rating_inh:'HIGH',
    controls:'Annual ESG Report (GRI Core); EMCO Dec-2024 validated; ISO 14001/45001 Stage 2 in progress; EcoVadis profile active',
    action:'Achieve Stage 2 certification; GRI Comprehensive by 2027; EMCO limited assurance for 2025 ESG Report Q2 2026; EcoVadis profile improvement',
    owner:'IMS Champion / Sustainability Manager', due:'Post Stage 2 / Q2 2026',
    L_res:2, S_res:3, score_res:6, rating_res:'MEDIUM',
    monitor:'EcoVadis score; ESG Report publication date; certification milestone tracker',
    ctx_ref:'E-11;E-23 / I-17;I-22', legal:'GG-06;QM-08', obj_ref:'OBJ-20' },
  { ref:'R-SR-02', type:'Social Risk', cat:'Social / Labour', std:'ISO 45001',
    desc:'Contractor HSE non-compliance — injury or fatality on SAGCO site',
    L_inh:4, S_inh:4, score_inh:16, rating_inh:'HIGH',
    controls:'Contractor management PR-22; HSE pre-qualification; mandatory site induction; SAGCO HSE supervisor assigned per contractor',
    action:'Implement contractor HSE scorecard (quarterly review); ISO 45001 certification required for all high-risk contractors by 2027',
    owner:'HSE Manager', due:'Q4 2026',
    L_res:3, S_res:3, score_res:9, rating_res:'MEDIUM',
    monitor:'Quarterly contractor scorecard; incident log; induction register',
    ctx_ref:'E-13;E-20 / I-02;I-03;I-11', legal:'HS-10;SR-05', obj_ref:'OBJ-02' },
  { ref:'BRA-01', type:'Anti-Bribery', cat:'Anti-Bribery', std:'ISO 37001',
    desc:'Procurement kickback — supplier pays kickback to Procurement Manager for contract award',
    L_inh:3, S_inh:4, score_inh:12, rating_inh:'HIGH',
    controls:'Tender evaluation committee (min. 3 members); segregation of duties; Ethics Committee approval for single-source >SAR 500K',
    action:'CoI declarations before each tender (Q3 2026); post-award audit programme; annual anti-bribery training for all procurement staff',
    owner:'Procurement Manager / Ethics Committee', due:'Q3 2026',
    L_res:2, S_res:3, score_res:6, rating_res:'MEDIUM',
    monitor:'CoI register quarterly; post-award audit log; annual training records',
    ctx_ref:'E-01;E-25 / I-22;I-24', legal:'AC-01;AC-02;SP-01', obj_ref:'OBJ-22' },
  { ref:'BRA-02', type:'Anti-Bribery', cat:'Anti-Bribery', std:'ISO 37001',
    desc:'Facilitation payment to government official — permit/inspection expediting',
    L_inh:2, S_inh:4, score_inh:8, rating_inh:'MEDIUM',
    controls:'Zero tolerance policy; government interactions logged; no cash handling policy; Legal Officer attends all regulatory inspections',
    action:'Government interaction log active Q3 2026; annual staff briefings on prohibition; awareness training record',
    owner:'Legal / Compliance Officer / Ethics Committee', due:'Q3 2026',
    L_res:1, S_res:4, score_res:4, rating_res:'LOW',
    monitor:'Monthly interaction log review; annual training completion',
    ctx_ref:'E-01;E-04;E-09;E-20 / I-22', legal:'AC-01;AC-02;AC-03', obj_ref:'OBJ-22' },
  { ref:'O-S-01', type:'Opportunity', cat:'Opportunity', std:'ISO 45001',
    desc:'ISO 45001 certification — competitive advantage in government tenders and international contracts',
    L_inh:null, S_inh:null, score_inh:null, rating_inh:'OPPORTUNITY',
    controls:'IMS programme implementation underway; Stage 1/2 with TÜV Austria',
    action:'Complete Stage 2 June 2026; communicate in all tender submissions; annual surveillance programme',
    owner:'IMS Champion', due:'Post Stage 2 / Annual',
    L_res:null, S_res:null, score_res:null, rating_res:'OPPORTUNITY',
    monitor:'Tender win rate; customer qualification status; surveillance audit compliance',
    ctx_ref:'E-25 / I-17', legal:'IM-01', obj_ref:'OBJ-01' },
  { ref:'O-EN-01', type:'Opportunity', cat:'Opportunity', std:'ISO 50001',
    desc:'Regenerative furnace conversion (ECM 1) — NPV 457M SAR, IRR 17.4%, payback 7.3 yrs',
    L_inh:null, S_inh:null, score_inh:null, rating_inh:'OPPORTUNITY',
    controls:'ECM 1 Level 3 IGA study completed (L4-630-A-21); F1 regenerative experience base (rebuilt 2025)',
    action:'F2 rebuild decision Aug 2026; full engineering study F3/F4/F5; develop phased CAPEX plan 2026–2031',
    owner:'Energy Manager / EnMS Champion', due:'Aug 2026 (F2 decision)',
    L_res:null, S_res:null, score_res:null, rating_res:'OPPORTUNITY',
    monitor:'Rebuild milestone tracker; post-rebuild SHC vs regenerative benchmark',
    ctx_ref:'E-07;E-14 / I-06;I-24', legal:'EG-01;EG-02', obj_ref:'OBJ-12;OBJ-13;OBJ-14' },
  { ref:'O-EN-02', type:'Opportunity', cat:'Opportunity', std:'ISO 50001',
    desc:'On-site solar PV — 10–15% electricity cost reduction, Scope 2 GHG reduction',
    L_inh:null, S_inh:null, score_inh:null, rating_inh:'OPPORTUNITY',
    controls:'Solar feasibility study planned Q2 2026; SEC net-metering tariff reviewed; Jeddah irradiance >2,000 kWh/m²/yr',
    action:'Roof survey and feasibility Q2 2026; CAPEX proposal to GM Q4 2026; target 15% renewable by 2035',
    owner:'Energy Manager', due:'Q2 2026 (feasibility)',
    L_res:null, S_res:null, score_res:null, rating_res:'OPPORTUNITY',
    monitor:'Feasibility study completion; CAPEX approval; Scope 2 GHG reduction post-installation',
    ctx_ref:'E-08;E-16 / I-24', legal:'EG-04;EG-05', obj_ref:'OBJ-16' },
],

objectives: [
  { id:'OBJ-01', cat:'Safety / OH&S', std:'ISO 45001', desc:'Achieve ISO 45001:2018 Stage 2 Certification by June 2026', clause:'§6.2;§9.2;§9.3', baseline:'Not yet certified', kpi:'Certification status', target:'ISO 45001 Stage 2 by June 2026', action:'Complete Group A programme approvals (URGENT); conduct emergency drill; fire extinguisher inspection; internal audit; Management Review', owner:'IMS Champion', due:'June 2026', freq:'Monthly milestone', status:'IN PROGRESS', risk_ref:'O-S-01;R-E-07', mr:'Yes' },
  { id:'OBJ-02', cat:'Safety / OH&S', std:'ISO 45001', desc:'Zero Lost-Time Injuries (LTI) and TRIR ≤ 1.0 per 200,000 hours worked in 2026', clause:'§6.2;§9.1', baseline:'2024 TRIR: ESG Report baseline', kpi:'TRIR per 200,000 hrs; LTI count', target:'LTI=0; TRIR ≤1.0 by Dec 2026', action:'Mandatory WBGT monitoring; heat stress supervisor training; close CAPA-001 PTW; emergency drill; formalise first aider shift matrix', owner:'HSE Manager', due:'Dec 2026', freq:'Monthly', status:'MONITORING', risk_ref:'R-S-01 to R-S-15', mr:'Yes' },
  { id:'OBJ-03', cat:'Safety / OH&S', std:'ISO 45001', desc:'Achieve ≥95% PTW compliance rate and close CAPA-001 reconciliation by Stage 2', clause:'§6.2;§8.1', baseline:'130 register vs 84 physical permits (CAPA-001)', kpi:'PTW compliance rate %; CAPA-001 closed', target:'100% reconciliation; ≥95% PTW compliance', action:'Reconcile PTW register; issue Confined Space PR-16 and LOTO PR-19; monthly PTW compliance audit', owner:'HSE Manager', due:'Stage 2 audit', freq:'Monthly', status:'IN PROGRESS', risk_ref:'R-S-03;R-S-04;R-S-05', mr:'Yes' },
  { id:'OBJ-04', cat:'Safety / OH&S', std:'ISO 45001', desc:'Conduct 100% mandatory HSE training and formalise training matrix by Q3 2026', clause:'§6.2;§7.2', baseline:'Training matrix absent (I-15)', kpi:'Training matrix completion %; mandatory training rate', target:'100% matrix populated; 100% mandatory training by Q3 2026', action:'Establish centralised training matrix; identify mandatory training per role; schedule 2026 training calendar', owner:'HSE Manager / HR Manager', due:'Q3 2026', freq:'Quarterly', status:'PLANNED', risk_ref:'R-S-15;R-SR-02', mr:'Yes' },
  { id:'OBJ-05', cat:'Environmental', std:'ISO 14001', desc:'Achieve ISO 14001:2015 Stage 2 Certification by June 2026', clause:'§6.2;§9.2;§9.3', baseline:'Not yet certified', kpi:'Certification status', target:'ISO 14001 Stage 2 by June 2026', action:'Complete Environmental Aspects Register; activate Air Emissions programme PR-23; conduct internal audit; Management Review; Stage 1 Q1 / Stage 2 Q2 2026', owner:'HSE Manager / IMS Champion', due:'June 2026', freq:'Monthly milestone', status:'IN PROGRESS', risk_ref:'O-E-02;R-E-07', mr:'Yes' },
  { id:'OBJ-06', cat:'Environmental', std:'ISO 14001', desc:'Reduce GHG Scope 1+2 intensity to ≤ 590 kgCO₂e/tonne packed glass by Dec 2026', clause:'§6.2;§6.1.2', baseline:'615.27 kgCO₂e/tonne (EMCO 2024)', kpi:'Annual GHG intensity kgCO₂e/tonne', target:'≤590 kgCO₂e/t by Dec 2026; ≤480 by 2035 (SBTi)', action:'Complete 2025 GHG inventory (EMCO) Q2 2026; increase cullet ratio; advance F2 rebuild; solar PV feasibility Q2 2026', owner:'Energy Manager / Sustainability Manager', due:'Dec 2026', freq:'Quarterly', status:'MONITORING', risk_ref:'R-E-08', mr:'Yes' },
  { id:'OBJ-07', cat:'Environmental', std:'ISO 14001', desc:'Increase cullet usage ratio from 20% to ≥25% of batch by Q4 2027', clause:'§6.2;§6.1.2', baseline:'20% cullet (2024); F3 dropped to 36% Q4 2025', kpi:'Monthly cullet ratio % (weighted average)', target:'F3 ≥45% by Jul 2026; site ≥25% by Q4 2027; ≥30% by 2030', action:'Restore F3 cullet ≥45% Jul 2026; resolve supply bottlenecks; develop reverse logistics; deposit-return pilot Q4 2026', owner:'Operations Manager / Energy Coordinator', due:'Q4 2027', freq:'Monthly', status:'AT RISK', risk_ref:'R-E-08;O-E-01', mr:'Yes' },
  { id:'OBJ-09', cat:'Environmental', std:'ISO 14001', desc:'Maintain 100% compliance with NCEC stack emission limits on all 5 furnaces', clause:'§6.2;§6.1.3', baseline:'EMCO Dec-2024: full NCEC compliance all 5 furnaces', kpi:'Annual NCEC exceedances; CEMS data', target:'Zero exceedances 2026–2027; CEMS all stacks by Q4 2026', action:'Maintain quarterly EMCO stack tests; CEMS on all 5 stacks Q4 2026; formalise monthly stack review meeting', owner:'Engineering Manager', due:'Q4 2026 (CEMS)', freq:'Monthly CEMS; Quarterly manual', status:'ON TRACK', risk_ref:'R-E-01;R-E-07', mr:'Yes' },
  { id:'OBJ-10', cat:'Energy', std:'ISO 50001', desc:'Maintain Facility SPC ≤ 565 kWh/tonne packed glass in 2026 (Q1 2026: 562.90)', clause:'§6.2;§6.3;§9.1', baseline:'2025 FY: 561.24 kWh/tonne (EnB)', kpi:'Monthly Facility SPC = Total kWh ÷ Packed glass MT', target:'≤565 kWh/tonne 2026; ≤540 post F2 rebuild', action:'Monitor SCECO feeder-level data monthly; investigate Q1 2026 +5.6% electricity increase; LED retrofit Q4 2026; compressed air survey Q2 2026', owner:'Energy Manager', due:'Dec 2026', freq:'Monthly', status:'MONITORING', risk_ref:'R-EN-01;R-EN-02', mr:'Yes' },
  { id:'OBJ-11', cat:'Energy', std:'ISO 50001', desc:'Furnace F1: Maintain SHC ≤ age-adjusted target of 1,242 kcal/kg through 2026', clause:'§6.2;§6.3', baseline:'Q1 2026 SHC: 1,208 kcal/kg (below target 1,242) — rebuilt 2025', kpi:'Monthly F1 SHC kcal/kg draw', target:'SHC ≤1,242 kcal/kg throughout 2026', action:'Continue booster operation; verify booster continuity Q2 2026; maintain crown temp 1,558–1,572°C; monthly SEET review', owner:'Energy Coordinator / Furnaces Manager', due:'Dec 2026', freq:'Monthly', status:'ON TRACK', risk_ref:'R-EN-01', mr:'Yes' },
  { id:'OBJ-12', cat:'Energy', std:'ISO 50001', desc:'Furnace F2: Rebuild/regenerative conversion decision by Aug 2026 (lifecycle end, SHC 1,608 vs target 1,580)', clause:'§6.2;§6.3;§8.1', baseline:'Q1 2026 SHC: 1,608 kcal/kg (+28 vs target) — lifecycle end', kpi:'F2 rebuild decision confirmed; SHC trend post-rebuild', target:'Rebuild decision Aug 2026; SHC ≤1,200 kcal/kg post-rebuild', action:'Confirm F2 rebuild decision by Aug 2026 (EnMS Champion + Plant Manager); ECM 1 engineering study; procure regenerative technology', owner:'EnMS Champion / Plant Manager', due:'Aug 2026 (decision)', freq:'Monthly SHC monitoring', status:'URGENT', risk_ref:'R-EN-01;O-EN-01', mr:'Yes' },
  { id:'OBJ-13', cat:'Energy', std:'ISO 50001', desc:'Restore F3 cullet ratio to ≥45% by July 2026 to recover ~60 kcal/kg SHC', clause:'§6.2;§6.3', baseline:'Q1 2026 F3 SHC: 2,021 kcal/kg; cullet at 36% (was 49%)', kpi:'F3 cullet % monthly; F3 SHC monthly', target:'F3 cullet ≥45% by Jul 2026; F3 SHC ≤2,000 by Q3 2026', action:'Identify cause of cullet reduction; coordinate procurement and recycling; restore supply chain; investigate residual SHC elevation', owner:'Energy Coordinator / Production Manager', due:'Jul 2026', freq:'Monthly', status:'AT RISK', risk_ref:'R-EN-01;R-E-08', mr:'Yes' },
  { id:'OBJ-14', cat:'Energy', std:'ISO 50001', desc:'Initiate F4 root cause investigation for SHC +119 kcal/kg above age-adjusted target (2,185 vs 2,066)', clause:'§6.2;§6.3', baseline:'Q1 2026 F4 SHC: 2,185 kcal/kg; age-adjusted target 2,066', kpi:'F4 SHC monthly vs target; root cause findings', target:'Root cause report Jun 2026; corrective actions defined; improvement ≥50 kcal/kg by Q4 2026', action:'Initiate root cause investigation Jun 2026; check combustion A:F ratio, recuperator condition, crown profile; include in ECM 1 scope', owner:'Furnaces Manager / Energy Coordinator', due:'Jun 2026', freq:'Monthly', status:'URGENT', risk_ref:'R-EN-01', mr:'Yes' },
  { id:'OBJ-15', cat:'Energy', std:'ISO 50001', desc:'Complete compressed air leak detection survey and achieve ≤5% leakage by Q3 2026', clause:'§6.2;§6.3', baseline:'20–30% estimated leakage; no sub-metering', kpi:'Leakage rate %; kWh/Nm³', target:'Leakage ≤5% by Q3 2026; reduce electricity use ~1.2 GWh/yr', action:'Ultrasonic survey Q2 2026; repair all leaks within 30 days; install sub-metering Q3 2026; quarterly detection routine', owner:'Engineering Manager', due:'Q3 2026', freq:'Quarterly', status:'PLANNED', risk_ref:'R-EN-03', mr:'Yes' },
  { id:'OBJ-16', cat:'Energy', std:'ISO 50001', desc:'Solar PV feasibility study completed and CAPEX proposal to management by Q4 2026', clause:'§6.2;§6.3', baseline:'No on-site renewable generation', kpi:'Feasibility study completion; CAPEX proposal submitted', target:'Feasibility Q2 2026; CAPEX proposal Q4 2026; 15% renewable by 2035', action:'Roof survey and solar PV feasibility Q2 2026; SEC net-metering tariff review; IRR/NPV analysis; present Q4 2026', owner:'Energy Manager', due:'Q4 2026', freq:'Milestone-based', status:'PLANNED', risk_ref:'O-EN-02', mr:'Yes' },
  { id:'OBJ-17', cat:'Quality', std:'ISO 9001', desc:'Maintain zero critical product defects (contamination/structural) reaching key customers in 2026', clause:'§6.2;§8.6', baseline:'AIM 100% inspection; no critical defects recorded 2024', kpi:'Critical defect rate (per million); customer complaint rate', target:'Zero critical defects; ≤1 complaint per 500K bottles', action:'Maintain AIM 100% uptime; formalise calibration register Q3 2026; formal customer satisfaction monitoring', owner:'Operations Manager', due:'Dec 2026', freq:'Monthly', status:'ON TRACK', risk_ref:'R-SUS-03', mr:'Yes' },
  { id:'OBJ-20', cat:'Sustainability', std:'Multi-standard', desc:'Publish SAGCO 2025 ESG Report (GRI Core) by Q2 2026 and improve EcoVadis score', clause:'§6.2;§7.4', baseline:'2024 ESG Report published; EMCO validated', kpi:'ESG Report publication date; EcoVadis score; GRI level', target:'2025 ESG Report by Q2 2026; EcoVadis score improvement ≥5 points', action:'Compile 2025 sustainability data; EMCO limited assurance; GRI core preparation; publish on SAGCO website; update EcoVadis profile', owner:'IMS Champion / Sustainability Manager', due:'Q2 2026', freq:'Annual (Report); Quarterly (EcoVadis)', status:'IN PROGRESS', risk_ref:'O-SUS-01;R-SUS-03', mr:'Yes' },
  { id:'OBJ-21', cat:'Social', std:'Multi-standard', desc:'Achieve Saudization NITAQAT target and develop Female Workforce Action Plan (target 8% by 2030)', clause:'§6.2;§7.2', baseline:'Female workforce ~3% (23/884); NITAQAT met 2025', kpi:'Saudization % monthly (Qiwa); female workforce %', target:'NITAQAT maintained; female workforce 8% by 2030; trainee programme Q4 2026', action:'Develop Female Workforce Action Plan; partner with Jeddah TVTC; Saudization succession plan; quarterly Qiwa reporting', owner:'HR Manager', due:'Annual review', freq:'Monthly (Qiwa)', status:'MONITORING', risk_ref:'O-SR-01;R-SR-01', mr:'Yes' },
  { id:'OBJ-22', cat:'Multi', std:'ISO 37001', desc:'Activate anti-bribery controls for HIGH risks (BRA-01, BRA-02, BRA-03, BRA-07) by Q3 2026', clause:'§6.2;§8.2;§8.4', baseline:'Government interaction log not implemented; CoI declarations not formalised', kpi:'Government interaction log active; CoI declarations filed quarterly', target:'All 4 HIGH BRA controls fully active by Q3 2026', action:'Government interaction log Q3 2026; CoI declaration register Q3 2026; activate agent anti-bribery declarations Q2 2026; brief procurement staff', owner:'Ethics Committee / Legal Compliance Officer', due:'Q3 2026', freq:'Quarterly Ethics Committee', status:'IN PROGRESS', risk_ref:'BRA-01;BRA-02;BRA-03;BRA-07', mr:'Yes' },
],

compliance: [
  { ref:'HS-01', auth:'KSA OHS Standards', instrument:'Occupational Safety & Health General Standards', req:'IMS OHS programme; hazard identification; incident reporting', cat:'Health & Safety', std:'ISO 45001', clause:'§6.1.3', status:'COMPLIANT', evidence:'IMS OHS programme documented; 30+ HSEE programmes', owner:'HSE Manager', review:'Annual', risk_ref:'R-S-01 to R-S-15' },
  { ref:'HS-04', auth:'Civil Defense', instrument:'Fire Safety Inspection & Equipment Requirements', req:'Annual fire extinguisher inspection; records retention', cat:'Health & Safety', std:'ISO 45001', clause:'§8.1', status:'PARTIAL', evidence:'2026 INSPECTION NOT YET CONDUCTED — URGENT ACTION REQUIRED', owner:'HSE Manager', review:'IMMEDIATE', risk_ref:'R-S-04' },
  { ref:'HS-07', auth:'MODON OHS-TG', instrument:'MODON OH&S Technical Guidelines §7 — Occupational Health', req:'Health surveillance for silica dust, noise; audiometric testing programme', cat:'Health & Safety', std:'ISO 45001', clause:'§8.1', status:'PARTIAL', evidence:'Audiometric testing informal; silica health surveillance not formalised (I-28)', owner:'HSE Manager', review:'Q3 2026', risk_ref:'R-E-02;R-S-10' },
  { ref:'HS-08', auth:'MODON OHS-TG', instrument:'MODON OH&S Technical Guidelines §8 — PTW/Confined Space/LOTO', req:'PTW system; confined space programme; LOTO programme', cat:'Health & Safety', std:'ISO 45001', clause:'§8.1', status:'PARTIAL', evidence:'CAPA-001 open (130 vs 84 permits); PR-16 confined space and PR-19 LOTO both pending formal issue', owner:'HSE Manager', review:'Stage 2 audit', risk_ref:'R-S-03;R-S-04;R-S-05' },
  { ref:'EN-01', auth:'NCEC', instrument:'National Center for Environmental Compliance — Air Quality Standards', req:'Stack emission limits NOₓ/SOₓ/PM; monitoring records; CEMS (planned)', cat:'Environment', std:'ISO 14001', clause:'§6.1.3', status:'COMPLIANT', evidence:'EMCO Dec-2024 validated; all 5 furnaces NCEC compliant; CEMS Q4 2026', owner:'SHEE Manager', review:'Annual (EMCO)', risk_ref:'R-E-01;R-E-07' },
  { ref:'EN-06', auth:'MEWA', instrument:'Water Conservation Regulation', req:'Water use efficiency; monitoring; conservation measures documented', cat:'Environment', std:'ISO 14001', clause:'§6.1.3', status:'IN PROGRESS', evidence:'194,020 m³/yr tracked; unit metering Q3 2026 planned; target 190K by 2027', owner:'Engineering Manager', review:'Annual', risk_ref:'R-E-06;R-SUS-02' },
  { ref:'EG-01', auth:'SEEC/MODON', instrument:'Saudi Energy Efficiency Program (SEEP)', req:'ISO 50001 certification; EnPI reporting; SEU register maintained', cat:'Energy', std:'ISO 50001', clause:'§6.1', status:'COMPLIANT', evidence:'ISO 50001 certified 2024; EnMS operational; SEU register current', owner:'Energy Manager', review:'Annual', risk_ref:'R-EN-01;R-EN-02' },
  { ref:'GG-01', auth:'Saudi Green Initiative', instrument:'Saudi Green Initiative — GHG reduction targets', req:'GHG inventory; emissions reduction targets; public reporting', cat:'GHG & Emissions', std:'ISO 14001', clause:'§6.1.3', status:'IN PROGRESS', evidence:'2024 GHG inventory EMCO validated; 2025 inventory Q2 2026; SBTi by 2028', owner:'Sustainability Manager', review:'Annual', risk_ref:'R-E-08;R-SUS-04' },
  { ref:'AC-01', auth:'NAZAHA / KSA', instrument:'KSA Anti-Bribery Law (Royal Decree M/36)', req:'Anti-bribery policy; training; whistleblowing mechanism; ethical conduct', cat:'Anti-Corruption', std:'ISO 37001', clause:'§6.1.3', status:'COMPLIANT', evidence:'Anti-Bribery Policy issued April 2026; Ethics Committee active; training programme in progress', owner:'Ethics Committee / Legal Counsel', review:'Annual', risk_ref:'BRA-01;BRA-02' },
  { ref:'RM-04', auth:'Civil Defense', instrument:'Emergency Response Plan Registration & Annual Drill Requirements', req:'Annual emergency drill; EPR registered with Civil Defense', cat:'Risk Management', std:'ISO 45001', clause:'§8.2', status:'PARTIAL', evidence:'2026 DRILL OVERDUE — URGENT; EPR registered; last drill April 2025', owner:'HSE Manager', review:'IMMEDIATE', risk_ref:'R-S-02;R-E-07' },
  { ref:'QM-07', auth:'SASO/ISO', instrument:'ISO 9001:2015 §7.1.5 — Monitoring & Measurement Resources', req:'Calibration register; instruments traceable to national standards', cat:'Quality (ISO 9001)', std:'ISO 9001', clause:'§7.1.5', status:'PARTIAL', evidence:'Calibration register not established (I-28); AIM calibrated informally — Q3 2026 target', owner:'Operations Manager', review:'Q3 2026', risk_ref:'R-SUS-03' },
],

moc: [
  { id:'MOC-01', cat:'Energy', type:'Regulatory Change', desc:'HFO tariff increase to 0.42 SAR/L effective 1 Jan 2026 (+45.9%) — energy cost run-rate +8.6M SAR/yr; strengthens ECM 1 NPV to 457M SAR', trigger:'Saudi Aramco tariff notification Q4 2025', std:'ISO 50001 §6.3', safety:'No direct safety impact', env:'Makes ECM 1 regenerative conversion business case stronger', energy:'Annual energy cost increases ~+8.6M SAR/yr; ECM 1 payback 9.2→7.3 yrs', quality:'Budget revision required; update EnPI cost targets', controls:'Update energy cost targets in EnMS; revise annual budget; update ECM 1 financial model', owner:'Energy Manager / Finance Manager', approval:'APPROVED', impl:'Jan 2026 (effective)', risk_ref:'R-EN-02;OBJ-10;OBJ-12' },
  { id:'MOC-02', cat:'Safety / OH&S', type:'Regulatory Change', desc:'ISO 45001:2018 Stage 1 and Stage 2 certification process — new IMS controls and programme requirements across all 30+ HSEE programmes', trigger:'TÜV Austria certification contract; key customer qualification requirements (customer SGP)', std:'ISO 45001 §6.3;§8.1', safety:'Formalises safety controls; risk during transition if programmes not implemented before audit', env:'ISO 14001 concurrent — integrated benefits', energy:'No direct energy impact', quality:'Positive: ISO 45001 opens government tenders (O-S-01)', controls:'Resolve CAPA-001 PTW; issue PR-16 and PR-19; conduct emergency drill; complete Group A approvals; internal audit; Management Review', owner:'IMS Champion', approval:'IN PROGRESS', impl:'June 2026', risk_ref:'R-E-07;R-SUS-03;OBJ-01;OBJ-03' },
  { id:'MOC-04', cat:'Energy', type:'Equipment Change', desc:'Furnace F2 end-of-lifecycle — rebuild and regenerative conversion decision required (rebuilt 2018, 8-yr lifecycle end; SHC 1,608 vs target 1,580)', trigger:'ISO 50001 EnPI review; Energy Review L4-630-A-21', std:'ISO 50001 §6.3;§8.1', safety:'HIGH risk rebuild phase: hot work, confined space, WAH, LOTO — dedicated HSE officer required', env:'Positive: regenerative conversion eliminates ~30% F2 HFO consumption; CO₂ reduction ~5,000 tCO₂/yr', energy:'Largest single energy saving per furnace (~1,800→1,200 kcal/kg SHC); part of ECM 1 220M SAR CAPEX', quality:'CAPEX requires GM approval; production scheduling during outage required', controls:'PTW for all hot work/confined space/LOTO during rebuild; dedicated HSE officer; specialist furnace contractor pre-qualification', owner:'EnMS Champion / Plant Manager / Engineering Manager', approval:'PLANNED', impl:'Aug 2026 (decision)', risk_ref:'R-EN-01;OBJ-12' },
  { id:'MOC-05', cat:'Energy', type:'Process Change', desc:'F3 cullet ratio reduction from ~49% to ~36% (Oct 2025) — driven by production constraints; elevating F3 SHC to 2,021 kcal/kg vs target 1,996', trigger:'EnMS monthly ENPI review; Energy Review L4-630-A-21', std:'ISO 50001 §6.3;§8.1', safety:'No direct safety impact', env:'Negative: higher CO₂ from carbonate decomposition; Scope 3 Cat.1 increase; Scope 1 GHG intensity rises', energy:'Additional ~80,000–100,000 SAR/quarter HFO cost vs 49% cullet baseline', quality:'GHG ESG disclosure impacted; cullet target at risk; OBJ-07 and OBJ-13 both AT RISK', controls:'Restore F3 cullet ≥45% Jul 2026; investigate residual SHC elevation (combustion/booster/crown)', owner:'Energy Coordinator / Production Manager / Procurement Manager', approval:'IN PROGRESS', impl:'Jul 2026 (target)', risk_ref:'R-EN-01;OBJ-13;OBJ-07' },
  { id:'MOC-07', cat:'Safety / OH&S', type:'Process Change', desc:'Emergency drill programme overdue in 2026 — scope expansion to include furnace blowback and gas leak scenarios; Stage 2 nonconformity if not conducted', trigger:'I-13 (internal issue — overdue); ISO 45001 §8.2; annual drill requirement PR-14', std:'ISO 45001 §8.2;§6.3', safety:'HIGH: untested emergency response; staff not validated on evacuation routes and roles; Stage 2 nonconformity', env:'Gas leak scenario includes environmental exposure; test containment response', energy:'No energy impact', quality:'HIGH: Stage 2 nonconformity risk if not conducted before June 2026 audit', controls:'Conduct full emergency drill IMMEDIATELY; include furnace blowback, gas leak, fire scenarios; debrief and document; update PR-17', owner:'HSE Manager / Production Manager', approval:'PENDING IMMEDIATE', impl:'IMMEDIATE', risk_ref:'R-S-02;R-S-03;R-S-04;OBJ-02;I-13' },
  { id:'MOC-08', cat:'Environmental', type:'Strategic Change', desc:'Scope 3 GHG baseline programme — first full Cat.1/3/4/5 inventory by Q4 2026; extends GHG reporting obligations', trigger:'Customer ESG requirements (customer SGP); EU CBAM readiness; ESG Report GRI 305-3; E-11', std:'ISO 14001 §6.1.2;§9.1', safety:'No direct safety impact', env:'Scope 3 includes raw material extraction, inbound logistics, end-of-life — new reduction opportunities identified', energy:'No direct energy impact on site', quality:'Customer SGP requires Scope 3 data; CBAM readiness requires Cat.1 data; GRI 305-3 compliance', controls:'Engage EMCO for Scope 3 baseline; update Supplier Code of Conduct; develop supplier GHG data collection process', owner:'Sustainability Manager / Procurement Manager', approval:'APPROVED', impl:'Q4 2026', risk_ref:'R-E-09;OBJ-06;OBJ-20' },
  { id:'MOC-09', cat:'Quality', type:'Technology Change', desc:'ISO 9001:2015 Amendment 1:2024 — climate change integration requirement in QMS context §4.1 and §4.2; effective for audits from 2026', trigger:'ISO publication — Amendment 1 to ISO 9001:2015; effective from 2026; regulatory landscape update', std:'ISO 9001 §4.1;§4.2;§6.3', safety:'Climate change affects heat stress risk — cross-reference R-SUS-01 and OBJ-02', env:'Climate change is material for SAGCO: Jeddah IPCC SSP2-4.5 +1.5–2.0°C by 2050; documented in E-17', energy:'Climate change strengthens ECM 1 and solar PV business cases', quality:'QMS context documentation must be updated to address climate change; include in ISO 9001 gap assessment', controls:'Update QMS context worksheets (Sheet 1 E-26; Sheet 9); document climate change determination; confirm in ISO 9001 gap assessment', owner:'Operations Manager / IMS Champion', approval:'COMPLETE', impl:'May 2026', risk_ref:'R-SUS-04;E-26;OBJ-19' },
  { id:'MOC-11', cat:'Energy', type:'Geopolitical / Supply Chain', desc:'USA–Iran geopolitical tension and global energy market volatility — potential HFO supply disruption or further price increases beyond 0.42 SAR/L', trigger:'External: geopolitical analysis; E-05 (HFO supply policy); R-EN-02 (energy procurement risk)', std:'ISO 50001 §4.1;§6.3', safety:'Indirect: HFO shortage could force emergency furnace shutdown — unsafe cooling risk (R-S-14)', env:'Emergency shutdown or alternative fuel may have emission implications', energy:'HIGH: HFO is primary fuel for all 5 furnaces; supply disruption would halt production', quality:'HFO supply contract terms may require renegotiation; insurance/hedging review needed', controls:'Build 90-day HFO buffer stock policy (formalise in procurement procedure Q3 2026); assess alternative fuel capability', owner:'Energy Manager / Procurement Manager / Finance Manager', approval:'PLANNED', impl:'Q3 2026', risk_ref:'R-EN-02;OBJ-16;E-05' },
],

energy: [
  { id:'EN-T-01', source:'HFO Combustion — Furnace F1 (Regenerative, rebuilt 2025)', seu:'SEU-T-01 Primary thermal SEU — Regenerative', enpi:'SHC (kcal/kg draw)', enb:'Age-adj. target 1,242 kcal/kg (rebuild 2025, age 1yr)', q1_actual:'1,208 kcal/kg (Q1 2026) ✅ −34 vs age target', trend:'▼ IMPROVING', action:'Maintain SHC; verify F1 booster continuity Q2 2026; report SEET monthly. Q1 consumption: 1,336,733 L HFO (~15.54 GWh). 8.2% of thermal.', owner:'Energy Coordinator | Jul 2026', risk_ref:'R-EN-01', obj_ref:'OBJ-11' },
  { id:'EN-T-02', source:'HFO Combustion — Furnace F2 (Regenerative, rebuilt 2018 — lifecycle END)', seu:'SEU-T-02 Primary thermal SEU — Lifecycle end, rebuild due 2026', enpi:'SHC (kcal/kg draw)', enb:'Age-adj. target 1,580 kcal/kg (age 8yr — lifecycle end)', q1_actual:'1,608 kcal/kg (Q1 2026) ⚠️ +28 vs target', trend:'▲ ADVERSE', action:'Confirm rebuild/regenerative conversion decision by Aug 2026 (ECM 1 scope) — URGENT. Q1: 1,919,888 L HFO (~22.31 GWh). 11.8% of thermal.', owner:'EnMS Champion / Plant Manager | Aug 2026', risk_ref:'R-EN-01', obj_ref:'OBJ-12' },
  { id:'EN-T-03', source:'HFO Combustion — Furnace F3 (Recuperative, rebuilt 2023 — cullet-driven SHC)', seu:'SEU-T-03 Primary thermal SEU — Cullet-driven performance issue', enpi:'SHC (kcal/kg draw)', enb:'Age-adj. target 1,996 kcal/kg (rebuild 2023, age 3yr)', q1_actual:'2,021 kcal/kg (Q1 2026) ⚠️ +25 vs target (cullet at 36% — was 49%)', trend:'▲ ADVERSE (cullet-driven)', action:'Restore cullet ≥45% by Jul 2026; investigate residual SHC elevation (combustion, booster, crown profile) — AT RISK. Q1: 2,674,446 L HFO (~31.06 GWh). 16.5% of thermal.', owner:'Energy Coordinator + Production Manager | Jul 2026', risk_ref:'R-EN-01', obj_ref:'OBJ-13; OBJ-07' },
  { id:'EN-T-04', source:'HFO Combustion — Furnace F4 (Recuperative, rebuilt 2022 🔴 Structural deviation)', seu:'SEU-T-04 Primary thermal SEU — Largest structural deviation; root cause investigation URGENT', enpi:'SHC (kcal/kg draw)', enb:'Age-adj. target 2,066 kcal/kg (rebuild 2022, age 4yr)', q1_actual:'2,185 kcal/kg (Q1 2026) 🔴 +119 vs target — LARGEST DEVIATION', trend:'▲ ADVERSE (structural)', action:'Root cause investigation by Jun 2026 (combustion A:F ratio, recuperator condition, crown temp profile) — URGENT. Q1: 4,184,436 L HFO (~48.62 GWh). 25.8% of thermal.', owner:'Furnaces Manager + Energy Coordinator | Jun 2026', risk_ref:'R-EN-01', obj_ref:'OBJ-14' },
  { id:'EN-T-05', source:'HFO Combustion — Furnace F5 (Recuperative, rebuilt 2021 — highest load)', seu:'SEU-T-05 Primary thermal SEU — Highest load unit; within aging range', enpi:'SHC (kcal/kg draw)', enb:'Age-adj. target 2,138 kcal/kg (rebuild 2021, age 5yr)', q1_actual:'2,171 kcal/kg (Q1 2026) ⚠️ +33 vs target — within aging range', trend:'▲ SLIGHT ADVERSE', action:'Monitor SHC monthly vs age-adjusted target; plan 2029 rebuild (ECM 1 scope). Q1: 6,090,499 L HFO (~70.76 GWh). 37.6% of thermal — highest load unit.', owner:'Energy Coordinator | Dec 2026 (monitoring)', risk_ref:'R-EN-01', obj_ref:'OBJ-10' },
  { id:'EN-E-01', source:'Electricity — Total Site (SCECO 6 feeders)', seu:'SEU-E-01 Primary electrical SEU — all site load', enpi:'Facility SPC (kWh/tonne packed glass)', enb:'EnB 2025 FY: 561.24 kWh/tonne packed glass', q1_actual:'562.90 kWh/tonne Q1 2026 (+1.66 vs EnB; within ±2% tolerance) — +5.6% vs 2025 FY', trend:'▲ ADVERSE +5.6%', action:'Investigate +5.6% Q1 electricity increase (Action 5); ECM 2 compressed air survey Q2 2026; LED retrofit Q4 2026; VSD fans ECM 6. Q1 total: 39,290,303 kWh = 39.29 GWh. 15.7% of site total.', owner:'Services Manager + Energy Manager | Jul 2026', risk_ref:'R-EN-02; R-EN-03', obj_ref:'OBJ-10; OBJ-15' },
  { id:'EN-E-03', source:'Electricity — Compressed Air System', seu:'SEU-E-03 Electrical sub-SEU — 20–30% leakage identified; ECM 2 priority', enpi:'Leakage rate % (target <5%); kWh/Nm³', enb:'TBD — pending ultrasonic survey Q2 2026', q1_actual:'Survey not yet conducted — baseline TBD; ECM 2 saving estimated 900 MWh/yr + SAR 877,500/yr', trend:'? UNKNOWN', action:'Ultrasonic leak detection survey Q2 2026; repair all leaks within 30 days; install sub-metering Q3 2026 — PLANNED. ECM 2 payback <1 yr.', owner:'Engineering Manager | Q2 2026 (survey); Q3 2026 (sub-meter)', risk_ref:'R-EN-03', obj_ref:'OBJ-15' },
  { id:'EN-ECM', source:'ECM 1 — Recuperative → Regenerative Furnace Conversion (F3, F4, F5)', seu:'Priority 1 — Critical ECM (IGA Audit, May 2026 — L4-630-A-21)', enpi:'SHC post-conversion (kcal/kg) — target 1,200 kcal/kg per furnace', enb:'Post-conversion benchmark: 1,200 kcal/kg (regenerative); current baseline 1,800–2,200 kcal/kg', q1_actual:'Not yet implemented — rebuild schedule: F2 2026; F4 2030; F5 2029; F3 2031', trend:'▲ OPPORTUNITY', action:'ECM 1 decision Aug 2026 (F2); commission full engineering study F3/F4/F5; phased CAPEX plan. NPV 457M SAR | IRR 17.4% | Payback 7.3 yrs | CAPEX 220M SAR | Energy saving 251.8 GWh/yr | Cost saving 13.3M SAR/yr', owner:'EnMS Champion + Plant Manager + Engineering Manager | Aug 2026', risk_ref:'R-EN-01; O-EN-01', obj_ref:'OBJ-12; OBJ-13; OBJ-14' },
],

checklist: [
  { no:'1.1', item:'External issues register reviewed and updated', criterion:'All 29 external factors reviewed; trend indicators current', source:'Sheet 1', clause:'§4.1', std:'All', status:'✅  COMPLETE', evidence:'External issues E-01–E-29 reviewed May 2026', owner:'IMS Champion', target_date:'Annual' },
  { no:'2.2', item:'URGENT: Emergency drill (I-13) — 2026 drill overdue', criterion:'2026 emergency drill conducted and documented', source:'I-13', clause:'§8.2', std:'ISO 45001', status:'🔴  URGENT', evidence:'2026 drill NOT conducted — IMMEDIATE action required before Stage 2', owner:'HSE Manager', target_date:'IMMEDIATE' },
  { no:'2.3', item:'URGENT: Fire extinguisher inspection (I-14) — 2026 records missing', criterion:'2026 fire extinguisher inspection completed and records filed', source:'I-14', clause:'§8.1', std:'ISO 45001', status:'🔴  URGENT', evidence:'2026 inspection records ABSENT — nonconformity confirmed (HS-04)', owner:'HSE Manager', target_date:'IMMEDIATE' },
  { no:'2.4', item:'URGENT: Group A programme approvals (I-17) — 8 pending GM', criterion:'All Group A programmes approved by General Manager', source:'I-17', clause:'§7.5', std:'ISO 45001/14001', status:'🔴  URGENT', evidence:'8 Group A programmes awaiting GM sign-off — blocks Stage 2', owner:'IMS Champion', target_date:'THIS WEEK' },
  { no:'2.5', item:'PTW system discrepancy resolved (I-11) — CAPA-001 progress', criterion:'PTW register reconciled (130 vs 84); CAPA-001 closed', source:'I-11', clause:'§8.1', std:'ISO 45001', status:'🔵  IN PROGRESS', evidence:'CAPA-001 open; reconciliation in progress', owner:'HSE Manager', target_date:'Stage 2 audit' },
  { no:'2.6', item:'CEMS installation progress (I-09) on track for Q4 2026', criterion:'CEMS installed and operational on all 5 stacks by Q4 2026', source:'I-09', clause:'§9.1', std:'ISO 14001', status:'🔵  IN PROGRESS', evidence:'Procurement initiated; CEMS Q4 2026 on track', owner:'Engineering Manager', target_date:'Q4 2026' },
  { no:'3.2', item:'Major Customer A (S-01) requirements current — ISO 14001, GHG data', criterion:'Customer SGP requirements verified and documented', source:'S-01', clause:'§4.2', std:'ISO 14001/Sustainability', status:'🔵  IN PROGRESS', evidence:'ISO 14001 Stage 2 in progress; GHG 2025 inventory Q2 2026', owner:'IMS Champion', target_date:'Post Stage 2' },
  { no:'6.2', item:'2 CRITICAL risks (R-S-01, R-E-02) — treatment plans on track', criterion:'CRITICAL risk treatment actions progressing with owners and dates', source:'Sheet 3', clause:'§6.1', std:'ISO 45001/14001', status:'🔵  IN PROGRESS', evidence:'R-S-01 residual 4×5=20 (CRITICAL — inherent to molten glass); R-E-02 treatment progressing', owner:'Production Manager / HSE Manager', target_date:'Q3 2026' },
  { no:'8.1', item:'Legal compliance register reviewed — all 65 obligations', criterion:'65 obligations reviewed; 44 Compliant, 7 Partial, 7 In Progress, 7 Monitoring', source:'Sheet 4', clause:'§6.1.3', std:'All', status:'✅  COMPLETE', evidence:'Legal compliance register reviewed May 2026; 3 URGENT items actioned', owner:'HSE Manager / IMS Champion', target_date:'Annual' },
  { no:'13.1', item:'Management Review agenda prepared — all §9.3 required inputs', criterion:'Full §9.3 agenda prepared; KPI report, audit findings, context changes included', source:'Sheet 9', clause:'§9.3', std:'All', status:'📋  PLANNED', evidence:'Management Review planned; checklist preparation underway', owner:'IMS Champion', target_date:'Post Stage 2' },
],

};
