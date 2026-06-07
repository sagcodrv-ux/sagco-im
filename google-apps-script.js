/**
 * SAGCO IMS — Google Apps Script Web App
 * Deploy as Web App: Execute as Me, Anyone can access
 */

const SS = SpreadsheetApp.getActive();

const TABS = {
  context:    '📋 Context',
  pestle:     '📊 PESTLE-SWOT',
  risks:      '⚠ Risk Register',
  compliance: '⚖ Compliance',
  objectives: '🎯 Objectives',
  moc:        '🔄 MOC',
  energy:     '⚡ Energy',
  checklist:  '✅ Checklist',
};

// Maps sheet column headers → internal field names the website uses
const FIELD_MAP = {
  objectives: {
    'Obj ID':                    'id',
    'Category':                  'cat',
    'Standard':                  'std',
    'Objective / Target Statement': 'desc',
    'Clause':                    'clause',
    'Baseline / Current':        'baseline',
    'KPI Metric':                'kpi',
    'Target & Timeline':         'target',
    'Key Actions':               'action',
    'Owner':                     'owner',
    'Due Date':                  'due',
    'Review Freq.':              'freq',
    'Status':                    'status',
    'Risk Ref':                  'risk_ref',
    'MR Input?':                 'mr',
  },
  risks: {
    'Ref':                       'ref',
    'Risk Type':                 'type',
    'IMS Category':              'cat',
    'Standard':                  'std',
    'Risk / Hazard Description': 'desc',
    'L\nInherent':               'L_inh',
    'S\nInherent':               'S_inh',
    'Score\nInherent':           'score_inh',
    'Rating\nInherent':          'rating_inh',
    'Existing Controls':         'controls',
    'Treatment Action':          'action',
    'Owner':                     'owner',
    'Due Date':                  'due',
    'L\nResidual':               'L_res',
    'S\nResidual':               'S_res',
    'Score\nResidual':           'score_res',
    'Rating\nResidual':          'rating_res',
    'Monitoring Method':         'monitor',
    'Context Ref':               'ctx_ref',
    'Legal Ref':                 'legal',
    'Objective Ref':             'obj_ref',
    'MOC Ref':                   'moc_ref',
    'Energy Ref':                'energy_ref',
  },
  compliance: {
    'Ref':                             'ref',
    'Authority / Body':                'auth',
    'Legal Instrument / Requirement':  'instrument',
    'Key Obligation':                  'req',
    'Category':                        'cat',
    'Standard':                        'std',
    'Clause':                          'clause',
    'Status':                          'status',
    'Evidence / Current Notes':        'evidence',
    'Owner':                           'owner',
    'Next Review':                     'review',
    'Risk Ref':                        'risk_ref',
  },
  moc: {
    'MOC ID':                    'id',
    'IMS Category':              'cat',
    'Change Type':               'type',
    'Change Description':        'desc',
    'Trigger / Source':          'trigger',
    'Standard(s)':               'std',
    'Safety Impact':             'safety',
    'Environmental Impact':      'env',
    'Energy Impact':             'energy',
    'Quality / IMS Impact':      'quality',
    'Controls & Training Required': 'controls',
    'Owner':                     'owner',
    'Approval Status':           'approval',
    'Target / Impl. Date':       'impl',
    'Risk / Obj Ref':            'risk_ref',
  },
  energy: {
    'Energy ID':                       'id',
    'SEU / Energy Source Description': 'source',
    'SEU Classification':              'seu',
    'EnPI Metric':                     'enpi',
    'Energy Baseline (EnB)':           'enb',
    'Q1 2026 Actual & Performance':    'q1_actual',
    'Trend':                           'trend',
    'Action / Next Step':              'action',
    'Owner & Date':                    'owner',
    'Risk Ref':                        'risk_ref',
    'Objective Ref':                   'obj_ref',
  },
  context: {
    'Ref\n(E-/I-/S-)':          'ref',
    'Type':                      'ctx_type',
    'IMS Category':              'ims_cat',
    'PESTLE/Context\nCategory':  'pestle_cat',
    'Issue / Factor':            'issue',
    'Effect on IMS':             'effect',
    'Standard':                  'std',
    'Clause':                    'clause',
    'Trend':                     'trend',
    'Risk Ref':                  'risk_ref',
    'Obj Ref':                   'obj_ref',
    'Legal Ref':                 'legal_ref',
    'Influence\n(H/M/L)':        'influence',
    'Interest\n(H/M/L)':         'interest',
    'Owner':                     'owner',
    'Review':                    'review',
  },
  pestle: {
    'Ref':                       'ref',
    'Type\n(PESTLE/SWOT)':       'type',
    'Category':                  'category',
    'Description / Factor':      'description',
    'IMS Implication':           'implication',
    'SWOT\nOutput':              'swot_output',
    'Clause':                    'clause',
    'Risk / Opp Ref':            'risk_ref',
    'Context Ref':               'ctx_ref',
    'Trend':                     'trend',
    'Priority':                  'priority',
  },
  checklist: {
    'No.':                       'no',
    'Checklist Item':            'item',
    'Acceptance Criterion':      'criterion',
    'Source / Doc Ref':          'source',
    'Clause':                    'clause',
    'Standard(s)':               'std',
    'Evidence / Current Status': 'evidence',
    'Status':                    'status',
    'Findings / Notes':          'findings',
    'Action Required':           'action_req',
    'Owner':                     'owner',
    'Target Date':               'target_date',
    'Last Reviewed':             'last_reviewed',
    'Next Review':               'next_review',
    'MR Input?':                 'mr_input',
    'Risk / Obj Ref':            'rr_link',
  },
};

function doGet(e) {
  const params = e ? (e.parameter || {}) : {};
  const tab    = params.tab    || '';
  const action = params.action || 'getData';

  let result;
  try {
    if (action === 'getData')      result = getTabData(tab);
    else if (action === 'summary') result = buildSummary();
    else if (action === 'ping')    result = { ok: true, ts: new Date().toISOString() };
    else result = { error: 'Unknown action: ' + action };
  } catch (err) {
    result = { error: err.message };
  }

  return ContentService
    .createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

function getTabData(tabKey) {
  const tabName = TABS[tabKey] || tabKey;
  const sheet = SS.getSheetByName(tabName);
  if (!sheet) return { error: 'Tab not found: ' + tabName };

  const values = sheet.getDataRange().getValues();

  // Find header row — first row where col A is a short field name (not a title)
  var headerRow = 0;
  for (var i = 0; i < Math.min(values.length, 5); i++) {
    var firstCell = String(values[i][0]).trim();
    if (firstCell.length > 0 && firstCell.length < 30 &&
        !firstCell.includes('SAGCO') && !firstCell.includes('ISO §')) {
      headerRow = i;
      break;
    }
  }

  if (headerRow >= values.length - 1) return [];

  const rawHeaders = values[headerRow].map(function(h) { return String(h).trim(); });
  const fieldMap   = FIELD_MAP[tabKey] || {};

  return values.slice(headerRow + 1)
    .filter(function(row) {
      return row.some(function(cell) { return cell !== '' && cell !== null; });
    })
    .map(function(row) {
      const obj = {};
      rawHeaders.forEach(function(h, i) {
        const key = fieldMap[h] || h; // use mapped name or original
        obj[key] = row[i] !== undefined ? String(row[i]).trim() : '';
      });
      return obj;
    });
}

function buildSummary() {
  const out = { lastUpdated: new Date().toISOString() };
  const countCol = function(tabKey, colName) {
    try {
      const rows = getTabData(tabKey);
      if (!Array.isArray(rows)) return {};
      const c = {};
      rows.forEach(function(r) {
        const v = String(r[colName] || '').trim();
        if (v) c[v] = (c[v] || 0) + 1;
      });
      return c;
    } catch(e) { return {}; }
  };
  out.risks      = countCol('risks',      'rating_inh');
  out.objectives = countCol('objectives', 'status');
  out.compliance = countCol('compliance', 'status');
  out.moc        = countCol('moc',        'approval');
  return out;
}
