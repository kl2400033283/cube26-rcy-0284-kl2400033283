import React, { useState, useMemo } from 'react';
import initialData from './data/recovery_cases.json';
import upstreamData from './data/upstream_evidence.json';
import { evaluateUnseenDataset } from './utils/ruleEngine.js';

import { Header } from './components/Header.jsx';
import { KPICards } from './components/KPICards.jsx';
import { AnalyticsPanel } from './components/AnalyticsPanel.jsx';
import { CaseTable } from './components/CaseTable.jsx';
import { CaseModal } from './components/CaseModal.jsx';
import { ClaimExporterModal } from './components/ClaimExporterModal.jsx';
import { UploadModal } from './components/UploadModal.jsx';

function parseLine(line) {
  const res = [];
  let cur = '', inQ = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      inQ = !inQ;
    } else if (c === ',' && !inQ) {
      res.push(cur.trim().replace(/^"|"$/g, ''));
      cur = '';
    } else {
      cur += c;
    }
  }
  res.push(cur.trim().replace(/^"|"$/g, ''));
  return res;
}

function parseCSV(text) {
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  if (lines.length === 0) return [];
  const headers = parseLine(lines[0]);
  return lines.slice(1).map(line => {
    const values = parseLine(line);
    const row = {};
    headers.forEach((h, i) => {
      row[h] = values[i] !== undefined ? values[i] : '';
    });
    return row;
  });
}

export const App = () => {
  const dataset = initialData;

  const [cases, setCases] = useState(dataset.cases || []);
  const [upstreamStore, setUpstreamStore] = useState(upstreamData);

  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [selectedChargeType, setSelectedChargeType] = useState('all');
  
  const [selectedCase, setSelectedCase] = useState(null);
  const [showClaimBundle, setShowClaimBundle] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);

  // Recalculate Metrics dynamically whenever case list changes
  const metrics = useMemo(() => {
    const total_cases = cases.length;
    const total_charged_usd = cases.reduce((acc, c) => acc + (c.charge?.amount_usd || 0), 0);

    const supported = cases.filter(c => c.decision.recovery_decision === 'SUPPORTED');
    const contradicted = cases.filter(c => c.decision.recovery_decision === 'CONTRADICTED');
    const uncertain = cases.filter(c => c.decision.recovery_decision === 'UNCERTAIN');

    const recommended_recovery_usd = supported.reduce((acc, c) => acc + (c.decision?.amount_usd || 0), 0);
    const amount_pending_review_usd = uncertain.reduce((acc, c) => acc + (c.charge?.amount_usd || 0), 0);

    const decision_counts = {
      SUPPORTED: supported.length,
      CONTRADICTED: contradicted.length,
      UNCERTAIN: uncertain.length,
    };

    const uncertainty_rate = total_cases > 0 ? uncertain.length / total_cases : 0;

    const by_charge_type = {};

    cases.forEach(c => {
      const type = c.charge?.charge_type || 'unknown';
      if (!by_charge_type[type]) {
        by_charge_type[type] = {
          charges: 0,
          amount_usd: 0,
          SUPPORTED: 0,
          CONTRADICTED: 0,
          UNCERTAIN: 0,
        };
      }
      by_charge_type[type].charges += 1;
      by_charge_type[type].amount_usd += c.charge?.amount_usd || 0;

      const dec = c.decision.recovery_decision;
      if (by_charge_type[type][dec] !== undefined) {
        by_charge_type[type][dec] += 1;
      }
    });

    return {
      total_cases,
      total_charged_usd: Number(total_charged_usd.toFixed(2)),
      recommended_recovery_usd: Number(recommended_recovery_usd.toFixed(2)),
      amount_pending_review_usd: Number(amount_pending_review_usd.toFixed(2)),
      decision_counts,
      uncertainty_rate: Number(uncertainty_rate.toFixed(4)),
      by_charge_type,
      ground_truth_note: dataset.metrics?.ground_truth_note || ''
    };
  }, [cases]);

  // Filtered Cases List
  const filteredCases = useMemo(() => {
    return cases.filter(item => {
      // Verdict Tab Filter
      if (activeTab !== 'all' && item.decision.recovery_decision !== activeTab) {
        return false;
      }

      // Charge Type Filter
      if (selectedChargeType !== 'all' && item.charge.charge_type !== selectedChargeType) {
        return false;
      }

      // Search Filter
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const matchCaseId = item.case_id.toLowerCase().includes(query);
        const matchSku = item.charge.sku?.toLowerCase().includes(query);
        const matchUnit = item.charge.unit_id?.toLowerCase().includes(query);
        const matchOrder = item.charge.order_id?.toLowerCase().includes(query);
        const matchOrg = item.charge.org_id?.toLowerCase().includes(query);
        const matchShipment = item.charge.fba_shipment_id?.toLowerCase().includes(query);

        if (!matchCaseId && !matchSku && !matchUnit && !matchOrder && !matchOrg && !matchShipment) {
          return false;
        }
      }

      return true;
    });
  }, [cases, activeTab, selectedChargeType, searchTerm]);

  // Handle Human Decision Override
  const handleSaveOverride = (caseId, newDecision, reason, reviewer) => {
    setCases(prev => prev.map(c => {
      if (c.case_id === caseId) {
        const claimable = newDecision === 'SUPPORTED';
        const newOutcome = {
          ...c.decision,
          recovery_decision: newDecision,
          claimable: claimable,
          amount_usd: claimable ? c.charge.amount_usd : 0,
          reason: `[OVERRIDDEN by ${reviewer}] ${reason}`,
          status: 'overridden',
          decided_by: reviewer,
          decided_at: new Date().toISOString()
        };

        const newOverride = {
          timestamp: new Date().toISOString(),
          reviewer,
          previous_decision: c.decision.recovery_decision,
          new_decision: newDecision,
          reason
        };

        const updated = {
          ...c,
          status: 'overridden',
          decision: newOutcome,
          outcome: newOutcome,
          overrides: [...(c.overrides || []), newOverride]
        };

        if (selectedCase?.case_id === caseId) {
          setSelectedCase(updated);
        }

        return updated;
      }
      return c;
    }));
  };

  // Re-run Agent Evaluation over all current cases
  const handleRunSimulation = () => {
    setIsSimulating(true);
    setTimeout(() => {
      // Re-evaluate using rule engine over all original charges
      const rawCharges = cases.map(c => c.charge);
      const newEvaluatedCases = evaluateUnseenDataset(rawCharges, upstreamStore);
      setCases(newEvaluatedCases);
      setIsSimulating(false);
    }, 1000);
  };

  // Handle Unseen Fee Report CSV/JSON & Custom Upstream Import
  const handleImportData = ({ feeReportRaw, fileType, customUpstream }) => {
    try {
      // Update upstream store if custom upstream records provided
      let currentUpstream = { ...upstreamStore };
      if (customUpstream?.receivingRaw?.trim()) {
        const customRec = parseCSV(customUpstream.receivingRaw);
        currentUpstream.receiving = [...currentUpstream.receiving, ...customRec];
      }
      if (customUpstream?.returnsRaw?.trim()) {
        const customRtn = parseCSV(customUpstream.returnsRaw);
        currentUpstream.returns = [...currentUpstream.returns, ...customRtn];
      }
      if (customUpstream?.prepRaw?.trim()) {
        const customPrep = parseCSV(customUpstream.prepRaw);
        currentUpstream.prep = [...currentUpstream.prep, ...customPrep];
      }
      if (customUpstream?.packRaw?.trim()) {
        const customPack = parseCSV(customUpstream.packRaw);
        currentUpstream.pack = [...currentUpstream.pack, ...customPack];
      }
      setUpstreamStore(currentUpstream);

      if (fileType === 'json') {
        const parsed = JSON.parse(feeReportRaw);
        if (parsed.cases && Array.isArray(parsed.cases)) {
          setCases(parsed.cases);
        } else if (Array.isArray(parsed)) {
          // If array of charges, evaluate using rule engine
          const evaluated = evaluateUnseenDataset(parsed, currentUpstream);
          setCases(evaluated);
        }
      } else {
        // Parse CSV unseen fee records
        const feeRecords = parseCSV(feeReportRaw);
        if (feeRecords.length > 0) {
          // Run complete client-side deterministic rule engine!
          const evaluatedCases = evaluateUnseenDataset(feeRecords, currentUpstream);
          setCases(evaluatedCases);
        } else {
          alert('No valid fee records found in uploaded file.');
        }
      }
    } catch (err) {
      alert('Error evaluating dataset: ' + err.message);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Header Bar */}
      <Header 
        metrics={metrics}
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        onOpenUpload={() => setShowUploadModal(true)}
        onOpenClaimBundle={() => setShowClaimBundle(true)}
        onRunSimulation={handleRunSimulation}
        isSimulating={isSimulating}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />

      {/* Main Content Area */}
      <main style={{
        maxWidth: '1440px',
        margin: '0 auto',
        width: '100%',
        padding: '24px 32px 60px 32px',
        flex: 1
      }}>
        {/* KPI Stat Ribbon */}
        <KPICards metrics={metrics} />

        {/* Analytics & Rules Breakdown */}
        <AnalyticsPanel 
          metrics={metrics}
          selectedChargeType={selectedChargeType}
          setSelectedChargeType={setSelectedChargeType}
        />

        {/* Interactive Case Table */}
        <CaseTable 
          cases={filteredCases}
          onSelectCase={(caseObj) => setSelectedCase(caseObj)}
        />
      </main>

      {/* Footer */}
      <footer style={{
        borderTop: '1px solid var(--border-light)',
        padding: '20px 32px',
        textAlign: 'center',
        fontSize: '0.8rem',
        color: 'var(--text-muted)',
        background: 'rgba(7, 9, 14, 0.95)'
      }}>
        RecoverIQ • CUBE Buildathon by Sydon.ai x Codequesters • Track #5 Recovery Manager
      </footer>

      {/* Modals */}
      {selectedCase && (
        <CaseModal 
          caseItem={selectedCase}
          onClose={() => setSelectedCase(null)}
          onSaveOverride={handleSaveOverride}
        />
      )}

      {showClaimBundle && (
        <ClaimExporterModal 
          cases={cases}
          metrics={metrics}
          onClose={() => setShowClaimBundle(false)}
        />
      )}

      {showUploadModal && (
        <UploadModal 
          onClose={() => setShowUploadModal(false)}
          onImportData={handleImportData}
        />
      )}
    </div>
  );
};

export default App;
