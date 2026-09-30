import React from 'react';
import { 
  DollarSign, 
  CheckCircle2, 
  XCircle, 
  HelpCircle, 
  TrendingUp
} from 'lucide-react';

export const KPICards = ({ metrics }) => {
  const formatCurrency = (val) => `$${val.toFixed(2)}`;

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
      gap: '16px',
      marginBottom: '24px'
    }}>
      {/* Total Charged Card */}
      <div className="glass-card" style={{ padding: '20px', position: 'relative', overflow: 'hidden' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Total Charges Ingested</p>
            <h3 style={{ fontSize: '1.8rem', fontWeight: 800, marginTop: '6px' }}>{formatCurrency(metrics.total_charged_usd)}</h3>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
              {metrics.total_cases} Fee & Adjustment Records
            </p>
          </div>
          <div style={{
            padding: '10px',
            borderRadius: 'var(--radius-md)',
            background: 'rgba(99, 102, 241, 0.12)',
            color: 'var(--accent-indigo)'
          }}>
            <DollarSign size={22} />
          </div>
        </div>
        <div style={{
          marginTop: '16px',
          height: '4px',
          width: '100%',
          background: 'rgba(255, 255, 255, 0.08)',
          borderRadius: '2px',
          overflow: 'hidden'
        }}>
          <div style={{ height: '100%', width: '100%', background: 'var(--accent-indigo)' }} />
        </div>
      </div>

      {/* Recommended Recovery Card */}
      <div className="glass-card" style={{ 
        padding: '20px', 
        borderColor: 'var(--accent-supported-border)',
        background: 'linear-gradient(135deg, rgba(18, 24, 38, 0.8), rgba(16, 185, 129, 0.08))'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <p style={{ fontSize: '0.8rem', color: 'var(--accent-supported)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
              Defensible Recovery <TrendingUp size={14} />
            </p>
            <h3 style={{ fontSize: '1.8rem', fontWeight: 800, marginTop: '6px', color: 'var(--accent-supported)' }}>
              {formatCurrency(metrics.recommended_recovery_usd)}
            </h3>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
              {metrics.decision_counts.SUPPORTED} Defensible Claims Proven
            </p>
          </div>
          <div style={{
            padding: '10px',
            borderRadius: 'var(--radius-md)',
            background: 'var(--accent-supported-bg)',
            color: 'var(--accent-supported)'
          }}>
            <CheckCircle2 size={22} />
          </div>
        </div>
        <div style={{
          marginTop: '16px',
          height: '4px',
          width: '100%',
          background: 'rgba(255, 255, 255, 0.08)',
          borderRadius: '2px',
          overflow: 'hidden'
        }}>
          <div style={{ 
            height: '100%', 
            width: `${metrics.total_cases ? (metrics.decision_counts.SUPPORTED / metrics.total_cases) * 100 : 0}%`, 
            background: 'var(--accent-supported)' 
          }} />
        </div>
      </div>

      {/* Contradicted Charges Card */}
      <div className="glass-card" style={{ padding: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <p style={{ fontSize: '0.8rem', color: 'var(--accent-contradicted)', fontWeight: 600 }}>Contradicted Charges</p>
            <h3 style={{ fontSize: '1.8rem', fontWeight: 800, marginTop: '6px', color: 'var(--accent-contradicted)' }}>
              {metrics.decision_counts.CONTRADICTED} Cases
            </h3>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
              Operational Evidence Validates Charge
            </p>
          </div>
          <div style={{
            padding: '10px',
            borderRadius: 'var(--radius-md)',
            background: 'var(--accent-contradicted-bg)',
            color: 'var(--accent-contradicted)'
          }}>
            <XCircle size={22} />
          </div>
        </div>
        <div style={{
          marginTop: '16px',
          height: '4px',
          width: '100%',
          background: 'rgba(255, 255, 255, 0.08)',
          borderRadius: '2px',
          overflow: 'hidden'
        }}>
          <div style={{ 
            height: '100%', 
            width: `${metrics.total_cases ? (metrics.decision_counts.CONTRADICTED / metrics.total_cases) * 100 : 0}%`, 
            background: 'var(--accent-contradicted)' 
          }} />
        </div>
      </div>

      {/* Pending Human Review (Uncertain/Silent) Card */}
      <div className="glass-card" style={{ padding: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <p style={{ fontSize: '0.8rem', color: 'var(--accent-uncertain)', fontWeight: 600 }}>Pending Review / Silent</p>
            <h3 style={{ fontSize: '1.8rem', fontWeight: 800, marginTop: '6px', color: 'var(--accent-uncertain)' }}>
              {formatCurrency(metrics.amount_pending_review_usd)}
            </h3>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
              {metrics.decision_counts.UNCERTAIN} Cases ({ (metrics.uncertainty_rate * 100).toFixed(1) }% Silent Rate)
            </p>
          </div>
          <div style={{
            padding: '10px',
            borderRadius: 'var(--radius-md)',
            background: 'var(--accent-uncertain-bg)',
            color: 'var(--accent-uncertain)'
          }}>
            <HelpCircle size={22} />
          </div>
        </div>
        <div style={{
          marginTop: '16px',
          height: '4px',
          width: '100%',
          background: 'rgba(255, 255, 255, 0.08)',
          borderRadius: '2px',
          overflow: 'hidden'
        }}>
          <div style={{ 
            height: '100%', 
            width: `${metrics.total_cases ? (metrics.decision_counts.UNCERTAIN / metrics.total_cases) * 100 : 0}%`, 
            background: 'var(--accent-uncertain)' 
          }} />
        </div>
      </div>
    </div>
  );
};
