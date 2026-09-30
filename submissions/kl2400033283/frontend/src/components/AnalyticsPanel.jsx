import React from 'react';
import { BarChart2, ShieldCheck } from 'lucide-react';

export const AnalyticsPanel = ({
  metrics,
  selectedChargeType,
  setSelectedChargeType
}) => {
  const chargeTypeKeys = Object.keys(metrics.by_charge_type);

  const getChargeTypeLabel = (type) => {
    switch (type) {
      case 'inbound_defect_fee': return 'Inbound Defect Fee';
      case 'lost_inbound': return 'Lost Inbound Quantity';
      case 'refund_issued_item_not_returned': return 'Refund Issued (Not Returned)';
      case 'fulfilment_fee_weight_tier': return 'Fulfillment Weight Tier';
      case 'damaged_in_warehouse': return 'Damaged in Warehouse';
      default: return type;
    }
  };

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
      gap: '20px',
      marginBottom: '24px'
    }}>
      {/* Charge Type Distribution Chart & Filter Card */}
      <div className="glass-card" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <BarChart2 size={18} color="var(--accent-indigo)" />
            <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>Charge Types & Recovery Breakdown</h3>
          </div>
          {selectedChargeType !== 'all' && (
            <button 
              className="btn btn-secondary btn-sm"
              onClick={() => setSelectedChargeType('all')}
              style={{ fontSize: '0.75rem', padding: '4px 8px' }}
            >
              Reset Filter
            </button>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {chargeTypeKeys.map((typeKey) => {
            const data = metrics.by_charge_type[typeKey];
            const isSelected = selectedChargeType === typeKey;
            const percentage = metrics.total_cases ? Math.round((data.charges / metrics.total_cases) * 100) : 0;

            return (
              <div 
                key={typeKey}
                onClick={() => setSelectedChargeType(isSelected ? 'all' : typeKey)}
                style={{
                  padding: '12px',
                  borderRadius: 'var(--radius-md)',
                  background: isSelected ? 'rgba(99, 102, 241, 0.15)' : 'rgba(255, 255, 255, 0.03)',
                  border: isSelected ? '1px solid var(--accent-indigo)' : '1px solid rgba(255, 255, 255, 0.05)',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px' }}>
                  <span>{getChargeTypeLabel(typeKey)}</span>
                  <span style={{ color: 'var(--text-secondary)' }}>{data.charges} cases (${data.amount_usd.toFixed(2)})</span>
                </div>

                <div style={{ display: 'flex', height: '8px', borderRadius: '4px', overflow: 'hidden', background: 'rgba(0,0,0,0.3)' }}>
                  <div 
                    title={`Supported: ${data.SUPPORTED}`}
                    style={{ width: `${(data.SUPPORTED / (data.charges || 1)) * 100}%`, background: 'var(--accent-supported)' }} 
                  />
                  <div 
                    title={`Contradicted: ${data.CONTRADICTED}`}
                    style={{ width: `${(data.CONTRADICTED / (data.charges || 1)) * 100}%`, background: 'var(--accent-contradicted)' }} 
                  />
                  <div 
                    title={`Uncertain: ${data.UNCERTAIN}`}
                    style={{ width: `${(data.UNCERTAIN / (data.charges || 1)) * 100}%`, background: 'var(--accent-uncertain)' }} 
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginTop: '6px', color: 'var(--text-muted)' }}>
                  <span>S: <strong style={{ color: 'var(--accent-supported)' }}>{data.SUPPORTED}</strong> | C: <strong style={{ color: 'var(--accent-contradicted)' }}>{data.CONTRADICTED}</strong> | U: <strong style={{ color: 'var(--accent-uncertain)' }}>{data.UNCERTAIN}</strong></span>
                  <span>{percentage}% of total</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Decision Integrity & Rule Engine Policy Card */}
      <div className="glass-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <ShieldCheck size={18} color="var(--accent-supported)" />
            <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>Evidence-First Decision Principles</h3>
          </div>

          <div style={{
            background: 'rgba(16, 185, 129, 0.08)',
            border: '1px solid rgba(16, 185, 129, 0.2)',
            borderRadius: 'var(--radius-md)',
            padding: '14px',
            marginBottom: '16px'
          }}>
            <p style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--accent-supported)', marginBottom: '4px' }}>
              "Don't maximize claims. Maximize defensible claims."
            </p>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              RecoverIQ enforces zero hallucination. If upstream evidence is missing, the charge is classified as <strong style={{ color: 'var(--accent-uncertain)' }}>UNCERTAIN (Silent)</strong> rather than inventing a claim.
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--accent-supported)' }} />
              <span><strong>SUPPORTED:</strong> Operational evidence explicitly contradicts fee charge.</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--accent-contradicted)' }} />
              <span><strong>CONTRADICTED:</strong> Operational evidence proves charge was legitimate.</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--accent-uncertain)' }} />
              <span><strong>UNCERTAIN:</strong> Missing measurements or insufficient upstream evidence.</span>
            </div>
          </div>
        </div>

        <div style={{
          marginTop: '20px',
          paddingTop: '16px',
          borderTop: '1px solid var(--border-light)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: '0.75rem',
          color: 'var(--text-muted)'
        }}>
          <span>Tenant Isolation: <strong>org_id + unit_id</strong></span>
          <span>Deterministic Policy v0.3</span>
        </div>
      </div>
    </div>
  );
};
