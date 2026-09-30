import { useMemo, useRef, useState } from 'react';
import './App.css';
import {
  Activity,
  ArrowDownToLine,
  ArrowRight,
  BadgeCheck,
  Boxes,
  Check,
  CheckCircle2,
  ChevronDown,
  CircleDollarSign,
  CircleHelp,
  ClipboardList,
  Clock3,
  FileCheck2,
  FileText,
  Filter,
  Layers3,
  ListFilter,
  LoaderCircle,
  Package,
  Plus,
  Search,
  ShieldCheck,
  Sparkles,
  TriangleAlert,
  Upload,
  Warehouse,
  X,
  XCircle,
} from 'lucide-react';
import initialData from './data/recovery_cases.json';
import initialEvidence from './data/upstream_evidence.json';
import { evaluateUnseenDataset } from './utils/ruleEngine.js';

const SOURCES = ['receiving', 'prep', 'pack', 'returns'];
const SOURCE_LABELS = {
  receiving: 'Receiving',
  prep: 'Prep',
  pack: 'Pack',
  returns: 'Returns',
};
const DECISION_FILTERS = ['all', 'SUPPORTED', 'CONTRADICTED', 'UNCERTAIN'];

function parseCSV(text) {
  const rows = [];
  let row = [];
  let value = '';
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (character === '"' && quoted && text[index + 1] === '"') {
      value += '"';
      index += 1;
    } else if (character === '"') {
      quoted = !quoted;
    } else if (character === ',' && !quoted) {
      row.push(value.trim());
      value = '';
    } else if ((character === '\n' || character === '\r') && !quoted) {
      if (character === '\r' && text[index + 1] === '\n') index += 1;
      row.push(value.trim());
      if (row.some((cell) => cell !== '')) rows.push(row);
      row = [];
      value = '';
    } else {
      value += character;
    }
  }

  row.push(value.trim());
  if (row.some((cell) => cell !== '')) rows.push(row);
  if (!rows.length) return [];

  const headers = rows.shift().map((header) => header.replace(/^"|"$/g, '').trim());
  return rows.map((cells) => Object.fromEntries(
    headers.map((header, index) => [header, (cells[index] || '').replace(/^"|"$/g, '').trim()]),
  ));
}

function rowsFromFile(content, fileName) {
  const trimmed = content.trim();
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    const parsed = JSON.parse(trimmed);
    if (Array.isArray(parsed)) return parsed;
    const source = SOURCES.find((name) => fileName.toLowerCase().includes(name));
    if (source && Array.isArray(parsed[source])) return parsed[source];
    for (const key of ['charges', 'fee_records', 'fee_report', 'reimbursements', 'records', 'cases', 'data']) {
      if (Array.isArray(parsed[key])) return parsed[key];
    }
    throw new Error(`${fileName} must contain an array of records.`);
  }
  return parseCSV(content);
}

function normalizeChargeType(value) {
  const normalized = String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  const knownTypes = {
    'inbound defect fee': 'inbound_defect_fee',
    'inbound defect': 'inbound_defect_fee',
    'packaging defect': 'inbound_defect_fee',
    'packaging defect fee': 'inbound_defect_fee',
    'lost inbound': 'lost_inbound',
    'lost inbound quantity': 'lost_inbound',
    'refund issued item not returned': 'refund_issued_item_not_returned',
    'refund not returned': 'refund_issued_item_not_returned',
    'fulfillment fee weight tier': 'fulfilment_fee_weight_tier',
    'fulfilment fee weight tier': 'fulfilment_fee_weight_tier',
    'weight tier': 'fulfilment_fee_weight_tier',
    'damaged in warehouse': 'damaged_in_warehouse',
    'warehouse damage': 'damaged_in_warehouse',
  };
  return knownTypes[normalized] || String(value || '').trim();
}

function normalizeChargeRecord(record) {
  const normalizedKeys = Object.fromEntries(
    Object.entries(record).map(([key, value]) => [key.toLowerCase().replace(/[^a-z0-9]/g, ''), value]),
  );
  const pick = (...keys) => keys.map((key) => normalizedKeys[key]).find((value) => value !== undefined && value !== '');
  const rawType = pick('chargetype', 'feetype', 'reason');
  return {
    ...record,
    line_id: pick('lineid', 'chargeid', 'id') || record.line_id,
    org_id: pick('orgid', 'organizationid', 'tenantid') || record.org_id,
    unit_id: pick('unitid', 'inventoryunitid') || record.unit_id,
    sku: pick('sku', 'asin') || record.sku,
    fba_shipment_id: pick('fbashipmentid', 'shipmentid', 'shipment') || record.fba_shipment_id,
    order_id: pick('orderid', 'order') || record.order_id,
    charge_type: normalizeChargeType(rawType ?? record.charge_type),
    amount_usd: pick('amountusd', 'chargeamount', 'chargedamount', 'amount') ?? record.amount_usd ?? record.amount,
    posted_date: pick('posteddate', 'chargedate', 'date') || record.posted_date,
  };
}

function getChargeTypeLabel(type = '') {
  const labels = {
    inbound_defect_fee: 'Inbound defect fee',
    lost_inbound: 'Lost inbound quantity',
    refund_issued_item_not_returned: 'Refund — item not returned',
    fulfilment_fee_weight_tier: 'Fulfillment weight tier',
    damaged_in_warehouse: 'Warehouse damage',
  };
  return labels[type] || type.replaceAll('_', ' ') || 'Unspecified charge';
}

function formatCurrency(value = 0) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(value) || 0);
}

function chargeAmount(item) {
  return Number(item?.charge?.amount_usd ?? item?.charge?.amount ?? 0) || 0;
}

function isReimbursed(item) {
  if (item?.reimbursement?.status === 'reimbursed') return true;
  const charge = item?.sourceCharge || item?.charge || {};
  const explicitFlag = [charge.already_reimbursed, charge.reimbursed, charge.is_reimbursed]
    .some((value) => ['true', 'yes', '1'].includes(String(value).toLowerCase()));
  const status = String(charge.reimbursement_status || charge.recovery_status || '').toLowerCase();
  const reimbursedAmount = Number(charge.reimbursed_amount ?? charge.amount_reimbursed ?? charge.recovery_amount ?? 0);
  return explicitFlag
    || ['reimbursed', 'paid', 'recovered', 'refunded'].includes(status)
    || (charge.reimbursement_id && reimbursedAmount >= chargeAmount(item) && chargeAmount(item) > 0);
}

function getAssessment(item) {
  if (isReimbursed(item)) return 'REIMBURSED';
  return item?.decision?.recovery_decision || 'UNCERTAIN';
}

function assessmentLabel(decision) {
  if (decision === 'SUPPORTED') return 'Claim candidate';
  if (decision === 'CONTRADICTED') return 'Charge supported';
  if (decision === 'REIMBURSED') return 'Already reimbursed';
  return 'Silent / uncertain';
}

function assessmentCopy(decision) {
  if (decision === 'SUPPORTED') return 'Evidence supports disputing this charge.';
  if (decision === 'CONTRADICTED') return 'Evidence supports the charge; no claim is recommended.';
  if (decision === 'REIMBURSED') return 'A reimbursement is already documented; exclude from claims.';
  return 'Evidence is missing or ambiguous; no claim is recommended.';
}

function DecisionBadge({ decision }) {
  const icon = decision === 'SUPPORTED'
    ? <CheckCircle2 size={14} />
    : decision === 'CONTRADICTED'
      ? <XCircle size={14} />
      : decision === 'REIMBURSED'
        ? <BadgeCheck size={14} />
        : <CircleHelp size={14} />;
  return <span className={`decision-badge decision-${decision.toLowerCase()}`}>{icon}{assessmentLabel(decision)}</span>;
}

function IconTile({ children, tone = 'blue' }) {
  return <div className={`icon-tile icon-tile-${tone}`}>{children}</div>;
}

function StatCard({ icon, label, value, helper, tone }) {
  return (
    <article className="stat-card">
      <div className="stat-card-top">
        <span className="stat-label">{label}</span>
        <IconTile tone={tone}>{icon}</IconTile>
      </div>
      <div className="stat-value">{value}</div>
      <p className="stat-helper">{helper}</p>
    </article>
  );
}

function evidenceRecordFor(reference, evidenceStore) {
  return (evidenceStore[reference.source] || []).find((record) => (
    record.record_id === reference.record_id
    && record.org_id === reference.org_id
    && record.unit_id === reference.unit_id
  ));
}

function CaseDrawer({ item, evidenceStore, onClose }) {
  if (!item) return null;
  const decision = getAssessment(item);
  const references = item.evidence || [];
  const checks = item.checks || [];

  return (
    <div className="drawer-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <aside className="case-drawer" role="dialog" aria-modal="true" aria-labelledby="drawer-title">
        <div className="drawer-header">
          <div>
            <div className="eyebrow">Charge review · {item.charge?.posted_date || 'Date not provided'}</div>
            <h2 id="drawer-title">{item.case_id || item.charge?.line_id || 'Charge details'}</h2>
          </div>
          <button className="icon-button" onClick={onClose} aria-label="Close details"><X size={19} /></button>
        </div>
        <div className="drawer-content">
          <section className={`assessment-panel assessment-panel-${decision.toLowerCase()}`}>
            <div className="assessment-panel-heading">
              <DecisionBadge decision={decision} />
              {decision === 'SUPPORTED' && <strong>{formatCurrency(item.decision?.amount_usd ?? chargeAmount(item))} potential claim</strong>}
            </div>
            <p>{item.decision?.reason || assessmentCopy(decision)}</p>
            <small>{assessmentCopy(decision)}</small>
          </section>

          <section>
            <div className="section-title"><ReceiptIcon /><h3>Charge details</h3></div>
            <div className="detail-grid">
              {[
                ['Charge type', getChargeTypeLabel(item.charge?.charge_type)],
                ['Amount', formatCurrency(chargeAmount(item))],
                ['Shipment', item.charge?.fba_shipment_id || 'Not provided'],
                ['Order', item.charge?.order_id || 'Not provided'],
                ['SKU', item.charge?.sku || 'Not provided'],
                ['Unit', item.charge?.unit_id || 'Not provided'],
                ['Organization', item.charge?.org_id || 'Not provided'],
                ['Quantity', item.charge?.quantity ?? 'Not provided'],
              ].map(([label, value]) => (
                <div className="detail-cell" key={label}><span>{label}</span><strong>{value}</strong></div>
              ))}
            </div>
          </section>

          <section>
            <div className="section-title"><Sparkles size={17} /><h3>Assessment trace</h3></div>
            {checks.length ? (
              <div className="check-list">
                {checks.map((check, index) => (
                  <div className="check-card" key={`${check.check_key}-${index}`}>
                    <div className="check-card-top"><strong>{check.check_key?.replaceAll('_', ' ') || 'Evidence check'}</strong><span className={`check-verdict check-${String(check.verdict).toLowerCase()}`}>{check.verdict}</span></div>
                    <p>{check.detail}</p>
                    <small>{Math.round((check.confidence || 0) * 100)}% confidence · {check.evidence_refs?.length || 0} cited records</small>
                  </div>
                ))}
              </div>
            ) : <p className="muted-copy">No separate assessment trace was included with this record.</p>}
          </section>

          <section>
            <div className="section-title"><Layers3 size={17} /><h3>Linked operational evidence</h3><span className="count-pill">{references.length}</span></div>
            {references.length ? (
              <div className="evidence-list">
                {references.map((reference, index) => {
                  const record = evidenceRecordFor(reference, evidenceStore);
                  return (
                    <details className="evidence-item" key={`${reference.source}-${reference.record_id}-${index}`}>
                      <summary>
                        <span className="evidence-source-icon"><Warehouse size={15} /></span>
                        <span className="evidence-title"><strong>{SOURCE_LABELS[reference.source] || reference.source} record</strong><small>{reference.record_id || 'Record ID unavailable'} · {reference.captured_at || 'Timestamp unavailable'}</small></span>
                        <ChevronDown size={16} className="details-chevron" />
                      </summary>
                      <div className="evidence-record-data">
                        <p>Linked by organization and unit: <strong>{reference.org_id || '—'} / {reference.unit_id || '—'}</strong></p>
                        {reference.operator_id && <p>Recorded by <strong>{reference.operator_id}</strong></p>}
                        {record ? (
                          <dl>
                            {Object.entries(record).filter(([key, value]) => (
                              value !== '' && value !== null && value !== undefined
                              && !['org_id', 'unit_id', 'record_id', 'operator_id', 'captured_at'].includes(key)
                            )).map(([key, value]) => (
                              <div key={key}><dt>{key.replaceAll('_', ' ')}</dt><dd>{String(value)}</dd></div>
                            ))}
                          </dl>
                        ) : <p className="muted-copy">The referenced record's full fields are not present in the loaded evidence set.</p>}
                      </div>
                    </details>
                  );
                })}
              </div>
            ) : (
              <div className="empty-evidence"><CircleHelp size={20} /><div><strong>No matching evidence linked</strong><p>No operational record is available for this charge. It remains non-claimable.</p></div></div>
            )}
          </section>
          {item.content_hash && <p className="record-hash">Record fingerprint <code>{item.content_hash}</code></p>}
        </div>
      </aside>
    </div>
  );
}

function ReceiptIcon() {
  return <FileText size={17} />;
}

function ImportDialog({ onClose, onImport }) {
  const inputRef = useRef(null);
  const [files, setFiles] = useState([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function processFiles() {
    if (!files.length) {
      setError('Choose at least one fee report or evidence file to continue.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      await onImport(files);
      onClose();
    } catch (importError) {
      setError(importError.message || 'The selected data could not be processed.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="import-modal" role="dialog" aria-modal="true" aria-labelledby="import-title">
        <div className="modal-heading">
          <div><div className="eyebrow">Data intake</div><h2 id="import-title">Add reports and evidence</h2><p>Upload a fee or reimbursement report and, optionally, operational evidence CSV/JSON files.</p></div>
          <button className="icon-button" onClick={onClose} aria-label="Close upload"><X size={19} /></button>
        </div>
        <button className="drop-zone" onClick={() => inputRef.current?.click()}>
          <span className="drop-icon"><Upload size={22} /></span>
          <strong>Select CSV or JSON files</strong>
          <span>Choose a report and evidence files together. Evidence files are identified by names containing receiving, prep, pack, or returns.</span>
          <span className="drop-cta">Browse files <ArrowRight size={14} /></span>
        </button>
        <input ref={inputRef} type="file" accept=".csv,.json,application/json,text/csv" multiple hidden onChange={(event) => setFiles(Array.from(event.target.files || []))} />
        {files.length > 0 && <div className="selected-files">{files.map((file) => <div key={`${file.name}-${file.size}`}><FileText size={15} /><span>{file.name}</span><small>{(file.size / 1024).toFixed(1)} KB</small></div>)}</div>}
        <div className="intake-guidance"><ShieldCheck size={18} /><p>Only explicit, linked records can support a claim. Missing or ambiguous evidence stays <strong>silent / uncertain</strong>.</p></div>
        {error && <p className="form-error" role="alert">{error}</p>}
        <div className="modal-actions"><button className="button button-quiet" onClick={onClose}>Cancel</button><button className="button button-primary" onClick={processFiles} disabled={busy}>{busy ? <LoaderCircle size={16} className="spin" /> : <Activity size={16} />}{busy ? 'Analyzing records…' : 'Analyze data'}</button></div>
      </section>
    </div>
  );
}

function App() {
  const [cases, setCases] = useState(initialData.cases || []);
  const [evidenceStore, setEvidenceStore] = useState(initialEvidence);
  const [search, setSearch] = useState('');
  const [decisionFilter, setDecisionFilter] = useState('all');
  const [chargeTypeFilter, setChargeTypeFilter] = useState('all');
  const [selectedCase, setSelectedCase] = useState(null);
  const [showImport, setShowImport] = useState(false);
  const [running, setRunning] = useState(false);
  const [notice, setNotice] = useState('');

  const metrics = useMemo(() => {
    const decisions = cases.map(getAssessment);
    const supported = cases.filter((item) => getAssessment(item) === 'SUPPORTED');
    const totalCharged = cases.reduce((sum, item) => sum + chargeAmount(item), 0);
    return {
      count: cases.length,
      totalCharged,
      potentialRecovery: supported.reduce((sum, item) => sum + Number(item.decision?.amount_usd ?? chargeAmount(item)), 0),
      claimCandidates: supported.length,
      chargeSupported: decisions.filter((decision) => decision === 'CONTRADICTED').length,
      silent: decisions.filter((decision) => decision === 'UNCERTAIN').length,
      reimbursed: decisions.filter((decision) => decision === 'REIMBURSED').length,
    };
  }, [cases]);

  const filteredCases = useMemo(() => cases.filter((item) => {
    const decision = getAssessment(item);
    if (decisionFilter !== 'all' && decision !== decisionFilter) return false;
    if (chargeTypeFilter !== 'all' && item.charge?.charge_type !== chargeTypeFilter) return false;
    const query = search.trim().toLowerCase();
    if (!query) return true;
    return [
      item.case_id,
      item.charge?.line_id,
      item.charge?.sku,
      item.charge?.unit_id,
      item.charge?.order_id,
      item.charge?.org_id,
      item.charge?.fba_shipment_id,
      item.charge?.charge_type,
    ].some((value) => String(value || '').toLowerCase().includes(query));
  }), [cases, chargeTypeFilter, decisionFilter, search]);

  const sourceCounts = useMemo(() => Object.fromEntries(
    SOURCES.map((source) => [source, evidenceStore[source]?.length || 0]),
  ), [evidenceStore]);

  async function importFiles(selectedFiles) {
    const parsedFiles = await Promise.all(selectedFiles.map(async (file) => ({
      name: file.name,
      rows: rowsFromFile(await file.text(), file.name),
    })));
    let nextEvidence = { ...evidenceStore };
    let feeRows = null;
    let importedCases = null;

    for (const file of parsedFiles) {
      const name = file.name.toLowerCase();
      const source = SOURCES.find((candidate) => name.includes(candidate));
      if (source) {
        nextEvidence[source] = [...(nextEvidence[source] || []), ...file.rows];
      } else if (feeRows) {
        throw new Error('Select one fee/reimbursement report per import. Operational evidence files can be added alongside it.');
      } else if (file.rows.some((row) => row.charge && row.decision)) {
        importedCases = file.rows;
      } else {
        feeRows = file.rows.map((row) => normalizeChargeRecord(row.charge || row));
      }
    }

    if (!feeRows?.length && !importedCases?.length) {
      throw new Error('No fee report was found. Include a report file that is not named for an evidence source.');
    }
    if (importedCases) {
      setCases(importedCases);
    } else {
      setCases(evaluateUnseenDataset(feeRows, nextEvidence).map((item, index) => ({
        ...item,
        sourceCharge: feeRows[index],
      })));
    }
    setEvidenceStore(nextEvidence);
    setDecisionFilter('all');
    setChargeTypeFilter('all');
    setSearch('');
    setNotice(`Analyzed ${importedCases?.length || feeRows?.length} charge records with ${SOURCES.reduce((sum, source) => sum + (nextEvidence[source]?.length || 0), 0)} evidence records available.`);
  }

  function rerunAnalysis() {
    setRunning(true);
    window.setTimeout(() => {
      const sourceCharges = cases.map((item) => item.sourceCharge || item.charge);
      const rerunCases = evaluateUnseenDataset(sourceCharges, evidenceStore).map((item, index) => ({
        ...item,
        sourceCharge: sourceCharges[index],
      }));
      setCases(rerunCases);
      setRunning(false);
      setNotice(`Re-analyzed ${rerunCases.length} charges against the currently loaded operational records.`);
    }, 250);
  }

  function exportClaims() {
    const claims = cases.filter((item) => getAssessment(item) === 'SUPPORTED');
    const bundle = {
      title: 'Evidence-linked recovery claim candidates',
      generated_at: new Date().toISOString(),
      policy: 'Only charges assessed as claim candidates with explicit supporting evidence are included. This is a review package, not an automatically submitted claim.',
      claim_count: claims.length,
      potential_recovery_usd: Number(metrics.potentialRecovery.toFixed(2)),
      claims: claims.map((item) => ({
        charge_id: item.case_id,
        charge: item.charge,
        assessment: assessmentLabel(getAssessment(item)),
        potential_claim_amount_usd: item.decision?.amount_usd ?? chargeAmount(item),
        explanation: item.decision?.reason || '',
        evidence: item.evidence || [],
        evidence_checks: item.checks || [],
        record_fingerprint: item.content_hash || null,
      })),
    };
    const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `recovery-claims-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
    setNotice(`${claims.length} evidence-linked claim candidates exported for review.`);
  }

  function setFilter(filter) {
    setDecisionFilter(filter);
    document.getElementById('charges')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  return (
    <div className="workspace">
      <aside className="sidebar">
        <a href="#overview" className="brand-lockup" aria-label="RecoverIQ home">
          <span className="brand-mark"><ShieldCheck size={22} /></span>
          <span><strong>recover<span>iq</span></strong><small>RECOVERY MANAGER</small></span>
        </a>
        <div className="workspace-label">WORKSPACE</div>
        <nav className="side-nav">
          <a className="nav-item active" href="#overview"><Activity size={17} />Overview</a>
          <a className="nav-item" href="#charges"><ClipboardList size={17} />Charges <span>{metrics.count}</span></a>
          <button className="nav-item" onClick={() => setFilter('SUPPORTED')}><FileCheck2 size={17} />Claim candidates <span>{metrics.claimCandidates}</span></button>
          <a className="nav-item" href="#evidence"><Boxes size={17} />Evidence sources</a>
        </nav>
        <div className="sidebar-spacer" />
        <div className="integrity-card">
          <div className="integrity-icon"><ShieldCheck size={17} /></div>
          <strong>Evidence first</strong>
          <p>Unmatched or unclear evidence never becomes a claim.</p>
          <span><i /> Conservative policy active</span>
        </div>
        <div className="sidebar-footer"><span className="avatar">RM</span><span><strong>Recovery team</strong><small>Demo workspace</small></span><ChevronDown size={15} /></div>
      </aside>

      <main className="main-area" id="overview">
        <header className="topbar">
          <div className="breadcrumb"><span>Workspace</span><span>/</span><strong>Recovery overview</strong></div>
          <div className="topbar-right"><span className="live-status"><i />All systems operational</span><span className="topbar-divider" /><span className="org-chip"><span className="org-avatar">D</span> Demo operator <ChevronDown size={14} /></span></div>
        </header>
        <div className="page-content">
          {notice && <div className="notice-banner"><Check size={16} />{notice}<button onClick={() => setNotice('')} aria-label="Dismiss notification"><X size={15} /></button></div>}
          <section className="page-heading">
            <div><div className="eyebrow"><span className="eyebrow-dot" />RECOVERY INTELLIGENCE</div><h1>Good morning, operator <span>✦</span></h1><p>See what your reports say, what your operations recorded, and what can be defended.</p></div>
            <div className="heading-actions"><button className="button button-quiet" onClick={rerunAnalysis} disabled={running}>{running ? <LoaderCircle className="spin" size={16} /> : <Activity size={16} />}{running ? 'Analyzing…' : 'Re-run analysis'}</button><button className="button button-primary" onClick={() => setShowImport(true)}><Plus size={17} />Add report</button></div>
          </section>

          <section className="hero-card">
            <div className="hero-copy"><div className="hero-kicker"><Sparkles size={14} /> YOUR RECOVERY SNAPSHOT</div><h2>Make every dispute <span>defensible.</span></h2><p>{metrics.claimCandidates} of {metrics.count} reviewed charges have evidence that may support a dispute. Review every cited record before submitting.</p><button className="hero-link" onClick={() => setFilter('SUPPORTED')}>Review claim candidates <ArrowRight size={15} /></button></div>
            <div className="hero-visual" aria-hidden="true">
              <div className="orbit orbit-one" /><div className="orbit orbit-two" /><div className="hero-document"><div className="doc-top"><span /><span /><span /></div><div className="doc-line long" /><div className="doc-line" /><div className="doc-evidence"><CheckCircle2 size={15} /><span><b>Evidence linked</b><small>Record trace verified</small></span></div><div className="doc-line short" /><div className="doc-amount">{formatCurrency(metrics.potentialRecovery)} <small>potential</small></div></div><span className="floating-shield"><ShieldCheck size={23} /></span><span className="floating-check"><Check size={15} /></span>
            </div>
            <div className="hero-foot"><span><ShieldCheck size={14} /> Evidence-linked assessment</span><span><Clock3 size={14} /> Updated just now</span></div>
          </section>

          <section className="stats-grid" aria-label="Recovery metrics">
            <StatCard icon={<CircleDollarSign size={19} />} tone="blue" label="Charges reviewed" value={formatCurrency(metrics.totalCharged)} helper={`${metrics.count} individual charge records`} />
            <StatCard icon={<FileCheck2 size={19} />} tone="green" label="Potential recovery" value={formatCurrency(metrics.potentialRecovery)} helper={`${metrics.claimCandidates} evidence-backed claim candidates`} />
            <StatCard icon={<TriangleAlert size={19} />} tone="amber" label="Silent / uncertain" value={String(metrics.silent)} helper="No claim recommended without stronger evidence" />
            <StatCard icon={<BadgeCheck size={19} />} tone="violet" label="Already reimbursed" value={String(metrics.reimbursed)} helper="Excluded from new claim bundles" />
          </section>

          <section className="review-overview">
            <div className="section-heading"><div><span className="eyebrow">DECISION OVERVIEW</span><h2>Evidence disposition</h2><p>How the available records relate to the reported charges.</p></div><button className="text-button" onClick={() => setFilter('all')}>View all charges <ArrowRight size={15} /></button></div>
            <div className="disposition-grid">
              <button className={`disposition-card disposition-claim ${decisionFilter === 'SUPPORTED' ? 'selected' : ''}`} onClick={() => setFilter('SUPPORTED')}><span className="disposition-icon"><CheckCircle2 size={19} /></span><span className="disposition-text"><strong>Claim candidates</strong><small>Evidence supports disputing charge</small></span><b>{metrics.claimCandidates}</b><ArrowRight size={15} className="disposition-arrow" /></button>
              <button className={`disposition-card disposition-supported ${decisionFilter === 'CONTRADICTED' ? 'selected' : ''}`} onClick={() => setFilter('CONTRADICTED')}><span className="disposition-icon"><XCircle size={19} /></span><span className="disposition-text"><strong>Charge supported</strong><small>Evidence supports the fee</small></span><b>{metrics.chargeSupported}</b><ArrowRight size={15} className="disposition-arrow" /></button>
              <button className={`disposition-card disposition-silent ${decisionFilter === 'UNCERTAIN' ? 'selected' : ''}`} onClick={() => setFilter('UNCERTAIN')}><span className="disposition-icon"><CircleHelp size={19} /></span><span className="disposition-text"><strong>Silent / uncertain</strong><small>Insufficient evidence to decide</small></span><b>{metrics.silent}</b><ArrowRight size={15} className="disposition-arrow" /></button>
            </div>
          </section>

          <section className="charges-section" id="charges">
            <div className="section-heading charges-heading"><div><span className="eyebrow">CHARGE REGISTER</span><h2>Recovery cases</h2><p>Open any charge to inspect its assessment and source records.</p></div><button className="button button-quiet export-button" onClick={exportClaims}><ArrowDownToLine size={16} />Export claim candidates</button></div>
            <div className="table-toolbar">
              <div className="search-box"><Search size={17} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search ID, shipment, order, SKU…" aria-label="Search recovery cases" /></div>
              <div className="filter-select"><Filter size={15} /><select value={chargeTypeFilter} onChange={(event) => setChargeTypeFilter(event.target.value)} aria-label="Filter by charge type"><option value="all">All charge types</option>{[...new Set(cases.map((item) => item.charge?.charge_type).filter(Boolean))].map((type) => <option value={type} key={type}>{getChargeTypeLabel(type)}</option>)}</select><ChevronDown size={14} /></div>
            </div>
            <div className="filter-tabs" role="tablist" aria-label="Filter by assessment">
              {DECISION_FILTERS.map((filter) => {
                const count = filter === 'all' ? cases.length : cases.filter((item) => getAssessment(item) === filter).length;
                const label = filter === 'all' ? 'All charges' : assessmentLabel(filter);
                return <button key={filter} className={decisionFilter === filter ? 'filter-tab active' : 'filter-tab'} onClick={() => setDecisionFilter(filter)} role="tab" aria-selected={decisionFilter === filter}>{label}<span>{count}</span></button>;
              })}
            </div>
            <div className="table-wrap">
              <table className="charge-table">
                <thead><tr><th>Charge / date</th><th>Shipment & item</th><th>Charge reason</th><th>Amount</th><th>Assessment</th><th aria-label="Open details" /></tr></thead>
                <tbody>
                  {filteredCases.length ? filteredCases.slice(0, 12).map((item, index) => {
                    const decision = getAssessment(item);
                    return (
                      <tr key={`${item.case_id || item.charge?.line_id}-${index}`} onClick={() => setSelectedCase(item)} tabIndex={0} onKeyDown={(event) => event.key === 'Enter' && setSelectedCase(item)}>
                        <td><strong className="mono id-cell">{item.case_id || item.charge?.line_id || 'Unidentified'}</strong><small>{item.charge?.posted_date || 'Date not provided'}</small></td>
                        <td><strong className="mono">{item.charge?.fba_shipment_id || item.charge?.order_id || 'No shipment ID'}</strong><small>{item.charge?.sku || 'SKU unavailable'} · {item.charge?.unit_id || 'Unit unavailable'}</small></td>
                        <td><span className="reason-label">{getChargeTypeLabel(item.charge?.charge_type)}</span><small>{item.charge?.quantity || 1} unit{Number(item.charge?.quantity || 1) === 1 ? '' : 's'}</small></td>
                        <td><strong className="amount-cell">{formatCurrency(chargeAmount(item))}</strong>{item.decision?.claimable && <small className="claim-amount">Potential claim {formatCurrency(item.decision.amount_usd)}</small>}</td>
                        <td><DecisionBadge decision={decision} /></td>
                        <td><button className="row-open" aria-label={`Open ${item.case_id} details`}><ArrowRight size={16} /></button></td>
                      </tr>
                    );
                  }) : <tr><td colSpan="6"><div className="empty-state"><ListFilter size={21} /><strong>No matching charges</strong><span>Change the search or filters to see more records.</span><button className="text-button" onClick={() => { setSearch(''); setDecisionFilter('all'); setChargeTypeFilter('all'); }}>Clear filters</button></div></td></tr>}
                </tbody>
              </table>
            </div>
            {filteredCases.length > 12 && <div className="table-footer"><span>Showing 12 of {filteredCases.length} matching charges</span><span>Refine filters to narrow this register</span></div>}
            {filteredCases.length > 0 && filteredCases.length <= 12 && <div className="table-footer"><span>Showing {filteredCases.length} of {cases.length} charges</span><span>Click a row to inspect its evidence trace</span></div>}
          </section>

          <section className="evidence-section" id="evidence">
            <div className="section-heading"><div><span className="eyebrow">OPERATIONAL RECORDS</span><h2>Evidence sources</h2><p>Source records currently available to evaluate charges.</p></div><button className="text-button" onClick={() => setShowImport(true)}>Add evidence <Plus size={15} /></button></div>
            <div className="source-grid">{SOURCES.map((source) => (
              <article className="source-card" key={source}><div className="source-card-top"><IconTile tone="blue">{source === 'receiving' ? <Package size={18} /> : source === 'returns' ? <ArrowDownToLine size={18} /> : <Warehouse size={18} />}</IconTile><span className="source-count">{sourceCounts[source]} records</span></div><h3>{SOURCE_LABELS[source]}</h3><p>{source === 'receiving' ? 'Received quantities, identity, and inbound condition.' : source === 'prep' ? 'Preparation checks captured before shipment.' : source === 'pack' ? 'Packing activity and shipment handling records.' : 'Return events and item identity records.'}</p><span className="source-availability"><i /> Available to match</span></article>
            ))}</div>
          </section>
          <footer className="page-footer"><span><ShieldCheck size={15} /> Recovery decisions are traceable to source records</span><span>RecoverIQ · Evidence-first recovery</span></footer>
        </div>
      </main>
      {showImport && <ImportDialog onClose={() => setShowImport(false)} onImport={importFiles} />}
      {selectedCase && <CaseDrawer item={selectedCase} evidenceStore={evidenceStore} onClose={() => setSelectedCase(null)} />}
    </div>
  );
}

export default App;
