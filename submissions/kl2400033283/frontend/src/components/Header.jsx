import React from 'react';
import { 
  ShieldCheck, 
  Upload, 
  FileText, 
  Search,
  RefreshCw,
  Cpu
} from 'lucide-react';

export const Header = ({
  metrics,
  searchTerm,
  setSearchTerm,
  onOpenUpload,
  onOpenClaimBundle,
  onRunSimulation,
  isSimulating,
  activeTab,
  setActiveTab
}) => {
  return (
    <header style={{
      borderBottom: '1px solid var(--border-light)',
      background: 'rgba(7, 9, 14, 0.85)',
      backdropFilter: 'blur(16px)',
      position: 'sticky',
      top: 0,
      zIndex: 100,
      padding: '16px 32px'
    }}>
      <div style={{
        maxWidth: '1440px',
        margin: '0 auto',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px'
      }}>
        {/* Top Navbar Row */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '16px'
        }}>
          {/* Brand Logo & Version */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{
              width: '42px',
              height: '42px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 20px rgba(99, 102, 241, 0.4)'
            }}>
              <ShieldCheck size={26} color="white" />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h1 style={{ fontSize: '1.4rem', fontWeight: 800, letterSpacing: '-0.02em', background: 'linear-gradient(to right, #ffffff, #94a3b8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                  RecoverIQ
                </h1>
                <span className="badge badge-neutral" style={{ fontSize: '0.7rem' }}>
                  v0.3.0
                </span>
                <span className="badge" style={{ background: 'rgba(99, 102, 241, 0.15)', color: '#818cf8', border: '1px solid rgba(99, 102, 241, 0.3)' }}>
                  <Cpu size={12} /> Evidence-First
                </span>
              </div>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                Sydon.ai x Codequesters Hackathon • Recovery Manager Agent
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button 
              className="btn btn-secondary btn-sm"
              onClick={onRunSimulation}
              disabled={isSimulating}
              title="Re-run deterministic evidence check engine"
            >
              <RefreshCw size={14} className={isSimulating ? 'pulse-glow' : ''} />
              {isSimulating ? 'Processing Engine...' : 'Re-Run Agent'}
            </button>

            <button 
              className="btn btn-primary btn-sm"
              onClick={onOpenUpload}
              style={{ fontWeight: 700, boxShadow: '0 0 12px rgba(99, 102, 241, 0.4)' }}
            >
              <Upload size={14} />
              Upload / Process Unseen Data
            </button>

            <button 
              className="btn btn-secondary btn-sm"
              onClick={onOpenClaimBundle}
            >
              <FileText size={14} />
              Generate Dispute Bundle
            </button>
          </div>
        </div>

        {/* Search & Filter Bar */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px',
          flexWrap: 'wrap'
        }}>
          {/* Search Box */}
          <div style={{ position: 'relative', minWidth: '320px', flex: 1 }}>
            <Search size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }} />
            <input 
              type="text" 
              className="input-field" 
              placeholder="Search by Case ID, SKU, Unit ID, Order ID, FBA Shipment..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ paddingLeft: '40px' }}
            />
          </div>

          {/* Filter Segment Tabs */}
          <div style={{
            display: 'flex',
            background: 'var(--bg-input)',
            padding: '4px',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-light)'
          }}>
            <button 
              style={{
                padding: '6px 14px',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.8rem',
                fontWeight: 600,
                border: 'none',
                cursor: 'pointer',
                background: activeTab === 'all' ? 'var(--accent-indigo)' : 'transparent',
                color: activeTab === 'all' ? 'white' : 'var(--text-secondary)',
                transition: 'all 0.2s'
              }}
              onClick={() => setActiveTab('all')}
            >
              All Charges ({metrics.total_cases})
            </button>

            <button 
              style={{
                padding: '6px 14px',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.8rem',
                fontWeight: 600,
                border: 'none',
                cursor: 'pointer',
                background: activeTab === 'SUPPORTED' ? 'var(--accent-supported-bg)' : 'transparent',
                color: activeTab === 'SUPPORTED' ? 'var(--accent-supported)' : 'var(--text-secondary)',
                borderWidth: activeTab === 'SUPPORTED' ? '1px' : '0px',
                borderColor: 'var(--accent-supported-border)',
                transition: 'all 0.2s'
              }}
              onClick={() => setActiveTab('SUPPORTED')}
            >
              Supported ({metrics.decision_counts.SUPPORTED})
            </button>

            <button 
              style={{
                padding: '6px 14px',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.8rem',
                fontWeight: 600,
                border: 'none',
                cursor: 'pointer',
                background: activeTab === 'CONTRADICTED' ? 'var(--accent-contradicted-bg)' : 'transparent',
                color: activeTab === 'CONTRADICTED' ? 'var(--accent-contradicted)' : 'var(--text-secondary)',
                borderWidth: activeTab === 'CONTRADICTED' ? '1px' : '0px',
                borderColor: 'var(--accent-contradicted-border)',
                transition: 'all 0.2s'
              }}
              onClick={() => setActiveTab('CONTRADICTED')}
            >
              Contradicted ({metrics.decision_counts.CONTRADICTED})
            </button>

            <button 
              style={{
                padding: '6px 14px',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.8rem',
                fontWeight: 600,
                border: 'none',
                cursor: 'pointer',
                background: activeTab === 'UNCERTAIN' ? 'var(--accent-uncertain-bg)' : 'transparent',
                color: activeTab === 'UNCERTAIN' ? 'var(--accent-uncertain)' : 'var(--text-secondary)',
                borderWidth: activeTab === 'UNCERTAIN' ? '1px' : '0px',
                borderColor: 'var(--accent-uncertain-border)',
                transition: 'all 0.2s'
              }}
              onClick={() => setActiveTab('UNCERTAIN')}
            >
              Uncertain ({metrics.decision_counts.UNCERTAIN})
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
