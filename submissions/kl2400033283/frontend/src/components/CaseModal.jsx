import React, { useState } from 'react';
import { 
  X, 
  ShieldCheck, 
  Camera, 
  Layers, 
  Lock,
  Copy,
  Check,
  Edit3
} from 'lucide-react';

export const CaseModal = ({ caseItem, onClose, onSaveOverride }) => {
  const [copiedHash, setCopiedHash] = useState(false);
  const [showOverrideForm, setShowOverrideForm] = useState(false);
  const [overrideDecision, setOverrideDecision] = useState(caseItem.decision.recovery_decision);
  const [overrideReason, setOverrideReason] = useState('');
  const [reviewerName, setReviewerName] = useState('OpReviewer_01');

  const handleCopyHash = () => {
    navigator.clipboard.writeText(caseItem.content_hash);
    setCopiedHash(true);
    setTimeout(() => setCopiedHash(false), 2000);
  };

  const handleApplyOverride = (e) => {
    e.preventDefault();
    if (!overrideReason.trim()) return;
    onSaveOverride(caseItem.case_id, overrideDecision, overrideReason, reviewerName);
    setShowOverrideForm(false);
  };

  const decision = caseItem.decision.recovery_decision;
  const sources = ['receiving', 'prep', 'pack', 'returns'];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div style={{
          padding: '24px 28px',
          borderBottom: '1px solid var(--border-light)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          background: 'rgba(13, 19, 34, 0.95)'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h2 style={{ fontSize: '1.3rem', fontWeight: 800, fontFamily: 'var(--font-mono)' }}>
                Case File #{caseItem.case_id}
              </h2>
              {decision === 'SUPPORTED' && <span className="badge badge-supported">SUPPORTED ($ CLAIMABLE)</span>}
              {decision === 'CONTRADICTED' && <span className="badge badge-contradicted">CONTRADICTED</span>}
              {decision === 'UNCERTAIN' && <span className="badge badge-uncertain">UNCERTAIN (SILENT)</span>}
            </div>

            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
              Charge Type: <strong>{caseItem.charge.charge_type}</strong> • Posted Date: {caseItem.charge.posted_date || 'N/A'}
            </p>
          </div>

          <button 
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              padding: '6px',
              borderRadius: '6px'
            }}
            onClick={onClose}
          >
            <X size={22} />
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ padding: '28px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Recovery Decision Summary Banner */}
          <div style={{
            padding: '20px',
            borderRadius: 'var(--radius-lg)',
            background: decision === 'SUPPORTED' 
              ? 'var(--accent-supported-bg)' 
              : decision === 'CONTRADICTED' 
              ? 'var(--accent-contradicted-bg)' 
              : 'var(--accent-uncertain-bg)',
            border: `1px solid ${
              decision === 'SUPPORTED' 
                ? 'var(--accent-supported-border)' 
                : decision === 'CONTRADICTED' 
                ? 'var(--accent-contradicted-border)' 
                : 'var(--accent-uncertain-border)'
            }`
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <p style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', color: decision === 'SUPPORTED' ? 'var(--accent-supported)' : decision === 'CONTRADICTED' ? 'var(--accent-contradicted)' : 'var(--accent-uncertain)' }}>
                  Recovery Verdict Evaluation
                </p>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, marginTop: '4px' }}>
                  {decision === 'SUPPORTED' ? `Defensible Recovery Claim: $${caseItem.decision.amount_usd.toFixed(2)}` : decision === 'CONTRADICTED' ? 'Charge Supported by Evidence (No Claim Recommended)' : 'Uncertain Evidence — Escalated to Human Review'}
                </h3>
                <p style={{ fontSize: '0.875rem', color: 'var(--text-primary)', marginTop: '8px', lineHeight: 1.5 }}>
                  {caseItem.decision.reason}
                </p>
              </div>

              <div style={{ textAlign: 'right' }}>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Original Charge Amount</p>
                <p style={{ fontSize: '1.4rem', fontWeight: 800 }}>${caseItem.charge.amount_usd.toFixed(2)}</p>
              </div>
            </div>
          </div>

          {/* Charge & Identifiers Grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '12px',
            background: 'var(--bg-input)',
            padding: '16px',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-light)',
            fontSize: '0.8rem'
          }}>
            <div>
              <span style={{ color: 'var(--text-muted)' }}>Tenant Org ID:</span>
              <p style={{ fontWeight: 600, color: '#a5b4fc', marginTop: '2px' }}>{caseItem.charge.org_id}</p>
            </div>
            <div>
              <span style={{ color: 'var(--text-muted)' }}>Unit Identifier:</span>
              <p style={{ fontWeight: 600, fontFamily: 'var(--font-mono)', marginTop: '2px' }}>{caseItem.charge.unit_id}</p>
            </div>
            <div>
              <span style={{ color: 'var(--text-muted)' }}>SKU:</span>
              <p style={{ fontWeight: 600, marginTop: '2px' }}>{caseItem.charge.sku}</p>
            </div>
            <div>
              <span style={{ color: 'var(--text-muted)' }}>FNSKU:</span>
              <p style={{ fontWeight: 600, fontFamily: 'var(--font-mono)', marginTop: '2px' }}>{caseItem.charge.fnsku || 'N/A'}</p>
            </div>
            <div>
              <span style={{ color: 'var(--text-muted)' }}>Order ID:</span>
              <p style={{ fontWeight: 600, marginTop: '2px' }}>{caseItem.charge.order_id || 'N/A'}</p>
            </div>
            <div>
              <span style={{ color: 'var(--text-muted)' }}>FBA Shipment ID:</span>
              <p style={{ fontWeight: 600, marginTop: '2px' }}>{caseItem.charge.fba_shipment_id || 'N/A'}</p>
            </div>
          </div>

          {/* Upstream Evidence Pipeline Traceability */}
          <div>
            <h4 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Layers size={16} color="var(--accent-indigo)" />
              Upstream Operational Evidence Pipeline (Tenant Isolated)
            </h4>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: '12px'
            }}>
              {sources.map(sourceName => {
                const sourceRecords = caseItem.evidence.filter(e => e.source === sourceName);
                const hasEvidence = sourceRecords.length > 0;

                return (
                  <div 
                    key={sourceName}
                    style={{
                      padding: '14px',
                      borderRadius: 'var(--radius-md)',
                      background: hasEvidence ? 'rgba(99, 102, 241, 0.08)' : 'rgba(255, 255, 255, 0.02)',
                      border: `1px solid ${hasEvidence ? 'rgba(99, 102, 241, 0.3)' : 'var(--border-light)'}`,
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <span style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'capitalize' }}>
                        {sourceName} Manager
                      </span>
                      {hasEvidence ? (
                        <span className="badge badge-supported" style={{ fontSize: '0.65rem', padding: '2px 6px' }}>FOUND</span>
                      ) : (
                        <span className="badge badge-neutral" style={{ fontSize: '0.65rem', padding: '2px 6px' }}>SILENT</span>
                      )}
                    </div>

                    {hasEvidence ? (
                      sourceRecords.map((record, idx) => (
                        <div key={idx} style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                          <p>Record: <strong style={{ fontFamily: 'var(--font-mono)' }}>{record.record_id}</strong></p>
                          <p style={{ marginTop: '2px' }}>Operator: {record.operator_id || 'System'}</p>
                          {record.photo_refs.length > 0 && (
                            <div style={{ marginTop: '6px', color: 'var(--accent-cyan)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <Camera size={12} /> {record.photo_refs.length} Photo Evidence Refs
                            </div>
                          )}
                        </div>
                      ))
                    ) : (
                      <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>No upstream record for unit</p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Deterministic Evidence Checks */}
          <div>
            <h4 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ShieldCheck size={16} color="var(--accent-supported)" />
              Deterministic Rule Engine Checks
            </h4>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {caseItem.checks.map((check, index) => (
                <div 
                  key={index}
                  style={{
                    padding: '14px',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--bg-input)',
                    border: '1px solid var(--border-light)'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontWeight: 700, fontSize: '0.85rem', fontFamily: 'var(--font-mono)' }}>
                        {check.check_key}
                      </span>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                        (Confidence: {(check.confidence * 100).toFixed(0)}%)
                      </span>
                    </div>

                    {check.verdict === 'PASS' && <span className="badge badge-supported">PASS (Supports Charge)</span>}
                    {check.verdict === 'FAIL' && <span className="badge badge-contradicted">FAIL (Contradicts Charge)</span>}
                    {check.verdict === 'UNCERTAIN' && <span className="badge badge-uncertain">UNCERTAIN</span>}
                  </div>

                  <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    {check.detail}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Human Override & Review Panel */}
          <div style={{
            padding: '16px',
            borderRadius: 'var(--radius-md)',
            background: 'rgba(255, 255, 255, 0.02)',
            border: '1px solid var(--border-light)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Edit3 size={16} color="var(--accent-violet)" />
                <h4 style={{ fontSize: '0.9rem', fontWeight: 700 }}>Human Reviewer & Overrides</h4>
              </div>

              {!showOverrideForm && (
                <button 
                  className="btn btn-secondary btn-sm"
                  onClick={() => setShowOverrideForm(true)}
                >
                  Edit / Override Verdict
                </button>
              )}
            </div>

            {/* Existing Overrides List */}
            {caseItem.overrides && caseItem.overrides.length > 0 && (
              <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {caseItem.overrides.map((ov, i) => (
                  <div key={i} style={{ fontSize: '0.75rem', background: 'rgba(99, 102, 241, 0.1)', padding: '8px 12px', borderRadius: '6px' }}>
                    <strong>{ov.reviewer}</strong> changed decision to <strong>{ov.new_decision}</strong> on {ov.timestamp}
                    <p style={{ color: 'var(--text-secondary)', marginTop: '2px' }}>"{ov.reason}"</p>
                  </div>
                ))}
              </div>
            )}

            {/* Override Form */}
            {showOverrideForm && (
              <form onSubmit={handleApplyOverride} style={{ marginTop: '14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div>
                    <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Reviewer ID / Name</label>
                    <input 
                      type="text"
                      className="input-field"
                      value={reviewerName}
                      onChange={(e) => setReviewerName(e.target.value)}
                      required
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>New Override Verdict</label>
                    <select 
                      className="input-field"
                      value={overrideDecision}
                      onChange={(e) => setOverrideDecision(e.target.value)}
                    >
                      <option value="SUPPORTED">SUPPORTED ($ Claimable)</option>
                      <option value="CONTRADICTED">CONTRADICTED (No Claim)</option>
                      <option value="UNCERTAIN">UNCERTAIN (Escalate)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Override Justification / Operational Notes</label>
                  <textarea 
                    className="input-field"
                    rows={3}
                    placeholder="Provide evidence rationale for overriding automated rule engine..."
                    value={overrideReason}
                    onChange={(e) => setOverrideReason(e.target.value)}
                    required
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowOverrideForm(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary btn-sm">
                    Save Decision Override
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* Cryptographic SHA-256 Hash & Verification Audit */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 16px',
            background: 'rgba(0,0,0,0.4)',
            borderRadius: 'var(--radius-md)',
            fontSize: '0.75rem',
            fontFamily: 'var(--font-mono)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)' }}>
              <Lock size={14} color="var(--accent-supported)" />
              <span>SHA-256 Trace Hash:</span>
              <span style={{ color: 'var(--text-secondary)' }}>
                {caseItem.content_hash.slice(0, 16)}...{caseItem.content_hash.slice(-16)}
              </span>
            </div>

            <button 
              className="btn btn-secondary btn-sm"
              onClick={handleCopyHash}
              style={{ padding: '4px 8px', fontSize: '0.7rem' }}
            >
              {copiedHash ? <Check size={12} color="var(--accent-supported)" /> : <Copy size={12} />}
              {copiedHash ? 'Copied' : 'Copy Hash'}
            </button>
          </div>

        </div>
      </div>
    </div>
  );
};
