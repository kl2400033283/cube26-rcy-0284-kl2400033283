import React, { useState } from 'react';
import { 
  Eye, 
  CheckCircle2, 
  XCircle, 
  HelpCircle, 
  Package, 
  Calendar,
  Building2,
  ChevronLeft,
  ChevronRight,
  FileSearch
} from 'lucide-react';

export const CaseTable = ({ cases, onSelectCase }) => {
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;

  const totalPages = Math.ceil(cases.length / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedCases = cases.slice(startIndex, startIndex + itemsPerPage);

  const getDecisionBadge = (decision) => {
    switch (decision) {
      case 'SUPPORTED':
        return (
          <span className="badge badge-supported">
            <CheckCircle2 size={12} /> Supported ($ claimable)
          </span>
        );
      case 'CONTRADICTED':
        return (
          <span className="badge badge-contradicted">
            <XCircle size={12} /> Contradicted
          </span>
        );
      case 'UNCERTAIN':
      default:
        return (
          <span className="badge badge-uncertain">
            <HelpCircle size={12} /> Uncertain (Silent)
          </span>
        );
    }
  };

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
    <div className="glass-card" style={{ padding: '24px', overflow: 'hidden' }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '16px',
        flexWrap: 'wrap',
        gap: '12px'
      }}>
        <div>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Recovery Cases</h3>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
            Showing {cases.length} matching evaluation records
          </p>
        </div>

        {/* Pagination Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Page <strong>{currentPage}</strong> of <strong>{totalPages}</strong>
          </span>
          <div style={{ display: 'flex', gap: '6px' }}>
            <button 
              className="btn btn-secondary btn-sm"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              style={{ padding: '6px 10px' }}
            >
              <ChevronLeft size={16} />
            </button>
            <button 
              className="btn btn-secondary btn-sm"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              style={{ padding: '6px 10px' }}
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Cases Table */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{
          width: '100%',
          borderCollapse: 'collapse',
          textAlign: 'left',
          fontSize: '0.875rem'
        }}>
          <thead>
            <tr style={{
              borderBottom: '1px solid var(--border-light)',
              color: 'var(--text-muted)',
              fontSize: '0.75rem',
              textTransform: 'uppercase',
              letterSpacing: '0.05em'
            }}>
              <th style={{ padding: '12px 16px' }}>Case ID</th>
              <th style={{ padding: '12px 16px' }}>Charge Type / SKU</th>
              <th style={{ padding: '12px 16px' }}>Tenant & Unit</th>
              <th style={{ padding: '12px 16px' }}>Charged Amount</th>
              <th style={{ padding: '12px 16px' }}>Decision Verdict</th>
              <th style={{ padding: '12px 16px' }}>Evidence Sources</th>
              <th style={{ padding: '12px 16px', textAlign: 'right' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {paginatedCases.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                  <FileSearch size={32} style={{ opacity: 0.5, marginBottom: '8px' }} />
                  <p>No matching recovery cases found.</p>
                </td>
              </tr>
            ) : (
              paginatedCases.map((caseItem) => {
                const decision = caseItem.decision.recovery_decision;
                const evidenceSources = caseItem.evidence.map(e => e.source);
                const uniqueSources = Array.from(new Set(evidenceSources));

                return (
                  <tr 
                    key={caseItem.case_id}
                    style={{
                      borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
                      transition: 'background 0.2s',
                      cursor: 'pointer'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                    onClick={() => onSelectCase(caseItem)}
                  >
                    {/* Case ID */}
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ fontWeight: 700, fontFamily: 'var(--font-mono)', color: '#e2e8f0' }}>
                        {caseItem.case_id}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                        <Calendar size={12} /> {caseItem.charge.posted_date || 'N/A'}
                      </div>
                    </td>

                    {/* Charge Type & SKU */}
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                        {getChargeTypeLabel(caseItem.charge.charge_type)}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                        <Package size={12} /> SKU: <strong>{caseItem.charge.sku}</strong>
                      </div>
                    </td>

                    {/* Tenant & Unit */}
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#a5b4fc', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Building2 size={12} /> {caseItem.charge.org_id}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginTop: '2px' }}>
                        Unit: {caseItem.charge.unit_id}
                      </div>
                    </td>

                    {/* Amounts */}
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>
                        ${caseItem.charge.amount_usd.toFixed(2)}
                      </div>
                      {caseItem.decision.claimable && (
                        <div style={{ fontSize: '0.75rem', color: 'var(--accent-supported)', fontWeight: 600 }}>
                          Claim: ${caseItem.decision.amount_usd.toFixed(2)}
                        </div>
                      )}
                    </td>

                    {/* Verdict */}
                    <td style={{ padding: '14px 16px' }}>
                      {getDecisionBadge(decision)}
                    </td>

                    {/* Evidence Sources */}
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                        {uniqueSources.length === 0 ? (
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>No Upstream Evidence</span>
                        ) : (
                          uniqueSources.map(source => (
                            <span 
                              key={source}
                              style={{
                                fontSize: '0.7rem',
                                padding: '2px 8px',
                                borderRadius: '4px',
                                background: 'rgba(99, 102, 241, 0.1)',
                                color: '#a5b4fc',
                                border: '1px solid rgba(99, 102, 241, 0.2)',
                                textTransform: 'capitalize'
                              }}
                            >
                              {source}
                            </span>
                          ))
                        )}
                      </div>
                    </td>

                    {/* Action */}
                    <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                      <button 
                        className="btn btn-secondary btn-sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectCase(caseItem);
                        }}
                      >
                        <Eye size={14} /> Inspect
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
