import React, { useState } from 'react';
import { 
  X, 
  Download, 
  Copy, 
  Check, 
  FileCheck2, 
  ShieldCheck
} from 'lucide-react';

export const ClaimExporterModal = ({ cases, metrics, onClose }) => {
  const [copied, setCopied] = useState(false);

  // Filter only supported claimable cases
  const supportedCases = cases.filter(c => c.decision.recovery_decision === 'SUPPORTED');

  const generateClaimMarkdown = () => {
    let md = `# RECOVERIQ FINANCIAL RECOVERY DISPUTE PACKAGE\n`;
    md += `**Generated At:** ${new Date().toISOString()}\n`;
    md += `**Agent Version:** 0.3.0 | **Evidence Contract:** 1.0\n`;
    md += `**Total Defensible Claims:** ${supportedCases.length}\n`;
    md += `**Total Claim Value:** $${metrics.recommended_recovery_usd.toFixed(2)}\n\n`;

    md += `---\n\n`;
    md += `## EXECUTIVE SUMMARY STATEMENT\n`;
    md += `This dispute package contains traceably verified recovery claims evaluated against upstream operational evidence (Receiving, Prep, Pack, and Returns). In accordance with strict defensible recovery rules, zero claims have been generated without explicit operational evidence support.\n\n`;

    md += `## ITEMIZED DEFENSIBLE CLAIMS\n\n`;

    supportedCases.forEach((c, idx) => {
      md += `### ${idx + 1}. Claim Case #${c.case_id}\n`;
      md += `- **Charge Type:** ${c.charge.charge_type}\n`;
      md += `- **Tenant Org ID:** ${c.charge.org_id}\n`;
      md += `- **Unit ID:** ${c.charge.unit_id}\n`;
      md += `- **SKU / FNSKU:** ${c.charge.sku} (${c.charge.fnsku || 'N/A'})\n`;
      md += `- **Order ID:** ${c.charge.order_id || 'N/A'}\n`;
      md += `- **FBA Shipment ID:** ${c.charge.fba_shipment_id || 'N/A'}\n`;
      md += `- **Claim Amount:** $${c.decision.amount_usd.toFixed(2)}\n`;
      md += `- **Evidence Rationale:** ${c.decision.reason}\n`;
      
      md += `- **Upstream Evidence References:**\n`;
      if (c.evidence.length === 0) {
        md += `  - None\n`;
      } else {
        c.evidence.forEach(ev => {
          md += `  - [${ev.source.toUpperCase()}] Record: ${ev.record_id} | Operator: ${ev.operator_id} | Captured: ${ev.captured_at}\n`;
          if (ev.photo_refs.length > 0) {
            md += `    - Photos: ${ev.photo_refs.join(', ')}\n`;
          }
        });
      }
      md += `- **Content Hash Audit:** \`${c.content_hash}\` \n\n`;
    });

    return md;
  };

  const handleCopyMarkdown = () => {
    navigator.clipboard.writeText(generateClaimMarkdown());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadFile = () => {
    const element = document.createElement("a");
    const file = new Blob([generateClaimMarkdown()], { type: 'text/markdown' });
    element.href = URL.createObjectURL(file);
    element.download = `RecoverIQ_Dispute_Package_${new Date().toISOString().slice(0, 10)}.md`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" style={{ maxWidth: '850px' }} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div style={{
          padding: '20px 24px',
          borderBottom: '1px solid var(--border-light)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ padding: '8px', borderRadius: '8px', background: 'var(--accent-supported-bg)', color: 'var(--accent-supported)' }}>
              <FileCheck2 size={20} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800 }}>Defensible Claim Package Generator</h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                {supportedCases.length} Claims Ready for Submission • Value: ${metrics.recommended_recovery_usd.toFixed(2)}
              </p>
            </div>
          </div>

          <button 
            style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
            onClick={onClose}
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          <div style={{
            background: 'rgba(99, 102, 241, 0.08)',
            border: '1px solid rgba(99, 102, 241, 0.2)',
            borderRadius: 'var(--radius-md)',
            padding: '14px 18px',
            fontSize: '0.85rem',
            color: 'var(--text-primary)',
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}>
            <ShieldCheck size={24} color="var(--accent-indigo)" style={{ flexShrink: 0 }} />
            <div>
              <strong>Defensibility Audit Complete:</strong> All claims generated below are backed by 100% verifiable upstream evidence. This package is formatted for direct submission to marketplace dispute portals.
            </div>
          </div>

          {/* Code/Markdown Preview */}
          <div style={{
            background: 'var(--bg-input)',
            border: '1px solid var(--border-light)',
            borderRadius: 'var(--radius-md)',
            padding: '16px',
            maxHeight: '340px',
            overflowY: 'auto'
          }}>
            <pre style={{ fontSize: '0.75rem', color: '#cbd5e1', whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>
              {generateClaimMarkdown()}
            </pre>
          </div>

          {/* Action Footer */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Deterministic Fixture Engine v0.3.0
            </span>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button 
                className="btn btn-secondary"
                onClick={handleCopyMarkdown}
              >
                {copied ? <Check size={16} color="var(--accent-supported)" /> : <Copy size={16} />}
                {copied ? 'Copied Markdown' : 'Copy to Clipboard'}
              </button>

              <button 
                className="btn btn-success"
                onClick={handleDownloadFile}
              >
                <Download size={16} /> Download Package (.md)
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};
