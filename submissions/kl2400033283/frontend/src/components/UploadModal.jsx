import React, { useState } from 'react';
import { 
  X, 
  Upload, 
  Play,
  FileSpreadsheet,
  Layers,
  Sparkles,
  Zap,
  CheckCircle2,
  FileCode
} from 'lucide-react';

const PRESET_SAMPLE_FEES = `line_id,report_type,unit_id,org_id,sku,fnsku,fba_shipment_id,order_id,charge_type,quantity,amount_usd,posted_date
FEE-UNSEEN-01,fee_report,UNIT-0003,org_demo_bravo,SKU-PUZZLE-500,X00DUMMY003,FBA-DUMMY-100,,inbound_defect_fee,1,14.50,2026-07-01
FEE-UNSEEN-02,inventory_adjustment,UNIT-0005,org_demo_alpha,SKU-LEASH-6FT,X00DUMMY005,FBA-DUMMY-100,,lost_inbound,1,38.00,2026-07-02
FEE-UNSEEN-03,fee_report,UNIT-0014,org_demo_alpha,SKU-LAMP-LED,X00DUMMY014,FBA-DUMMY-101,,inbound_defect_fee,1,2.00,2026-07-18
FEE-UNSEEN-04,fee_report,UNIT-0014,org_demo_alpha,SKU-LAMP-LED,X00DUMMY014,FBA-DUMMY-101,ORD-DUMMY-50014,refund_issued_item_not_returned,1,0.00,2026-07-18
FEE-UNSEEN-05,fee_report,UNIT-0018,org_demo_bravo,SKU-BOTTLE-750,X00DUMMY018,FBA-DUMMY-101,,inbound_defect_fee,1,1.00,2026-07-20
FEE-UNSEEN-06,inventory_adjustment,UNIT-0014,org_demo_alpha,SKU-LAMP-LED,X00DUMMY014,FBA-DUMMY-101,,lost_inbound,2,0.00,2026-06-16
FEE-UNSEEN-07,fee_report,UNIT-0002,org_demo_alpha,SKU-CANDLE-3,X00DUMMY002,FBA-DUMMY-100,ORD-DUMMY-50002,fulfilment_fee_weight_tier,1,4.25,2026-06-24
FEE-UNSEEN-08,fee_report,UNIT-0007,org_demo_alpha,SKU-CABLE-USBC,X00DUMMY007,FBA-DUMMY-100,ORD-DUMMY-50007,fulfilment_fee_weight_tier,1,3.50,2026-06-16`;

const PRESET_HELDOUT_TEST = `line_id,report_type,unit_id,org_id,sku,amount_usd,charge_type,posted_date
EVAL-001,fee_report,UNIT-0101,org_eval_heldout,SKU-HELDOUT-01,1.50,inbound_defect_fee,2026-07-10
EVAL-002,inventory_adjustment,UNIT-0102,org_eval_heldout,SKU-HELDOUT-02,0.00,lost_inbound,2026-07-11
EVAL-003,fee_report,UNIT-0103,org_eval_heldout,SKU-HELDOUT-03,12.00,damaged_in_warehouse,2026-07-12
EVAL-004,fee_report,UNIT-0104,org_eval_heldout,SKU-HELDOUT-04,6.35,fulfilment_fee_weight_tier,2026-07-13
EVAL-005,fee_report,UNIT-0105,org_eval_heldout,SKU-HELDOUT-05,0.00,refund_issued_item_not_returned,2026-07-14
EVAL-006,fee_report,UNIT-0106,org_eval_heldout,SKU-HELDOUT-06,1.50,inbound_defect_fee,2026-07-15
EVAL-007,inventory_adjustment,UNIT-0107,org_eval_heldout,SKU-HELDOUT-07,0.00,lost_inbound,2026-07-16
EVAL-008,fee_report,UNIT-0108,org_eval_heldout,SKU-HELDOUT-08,12.00,damaged_in_warehouse,2026-07-17`;

export const UploadModal = ({ onClose, onImportData }) => {
  const [activeTab, setActiveTab] = useState('upload');
  const [feeReportContent, setFeeReportContent] = useState('');
  const [upstreamReceiving, setUpstreamReceiving] = useState('');
  const [upstreamReturns, setUpstreamReturns] = useState('');
  
  const [fileName, setFileName] = useState(null);
  const [fileContent, setFileContent] = useState(null);
  const [uploadedUpstream, setUploadedUpstream] = useState({});
  const [selectedPreset, setSelectedPreset] = useState(null);

  const handleFileUpload = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    Promise.all(files.map(file => file.text().then(content => ({ file, content }))))
      .then(contents => {
        const upstream = {};
        let feeFile = null;

        contents.forEach(({ file, content }) => {
          const name = file.name.toLowerCase();
          const source = ['receiving', 'returns', 'prep', 'pack'].find(type => name.includes(type));
          if (source) {
            upstream[source] = content;
          } else if (!feeFile || file.name.toLowerCase().includes('fee')) {
            feeFile = { file, content };
          }
        });

        setUploadedUpstream(upstream);
        setFileName(feeFile?.file.name || null);
        setFileContent(feeFile?.content || null);
      })
      .catch(error => alert('Unable to read selected files: ' + error.message));
  };

  const handleSelectPreset = (presetKey) => {
    setSelectedPreset(presetKey);
    if (presetKey === 'unseen') {
      setFeeReportContent(PRESET_SAMPLE_FEES);
    } else if (presetKey === 'heldout') {
      setFeeReportContent(PRESET_HELDOUT_TEST);
    }
  };

  const handleRunImport = () => {
    let contentToUse = '';
    if (activeTab === 'upload') {
      contentToUse = fileContent;
    } else if (activeTab === 'presets') {
      contentToUse = selectedPreset === 'unseen' ? PRESET_SAMPLE_FEES : PRESET_HELDOUT_TEST;
    } else {
      contentToUse = feeReportContent;
    }

    if (!contentToUse || !contentToUse.trim()) return;

    const isJson = contentToUse.trim().startsWith('{') || contentToUse.trim().startsWith('[');
    
    onImportData({
      feeReportRaw: contentToUse,
      fileType: isJson ? 'json' : 'csv',
      customUpstream: {
        receivingRaw: uploadedUpstream.receiving || upstreamReceiving,
        returnsRaw: uploadedUpstream.returns || upstreamReturns,
        prepRaw: uploadedUpstream.prep || '',
        packRaw: uploadedUpstream.pack || ''
      }
    });
    onClose();
  };

  const canSubmit = () => {
    if (activeTab === 'upload') return Boolean(fileContent);
    if (activeTab === 'presets') return Boolean(selectedPreset);
    if (activeTab === 'paste') return Boolean(feeReportContent.trim());
    return false;
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" style={{ maxWidth: '780px' }} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div style={{
          padding: '20px 24px',
          borderBottom: '1px solid var(--border-light)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ padding: '10px', borderRadius: '10px', background: 'rgba(99, 102, 241, 0.15)', color: 'var(--accent-indigo)' }}>
              <Upload size={22} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800 }}>Upload & Process Unseen Sample Data</h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                Ingest any new fee report CSV/JSON or heldout test dataset for real-time deterministic evaluation
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
          
          {/* Method Selector Tabs */}
          <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--border-light)', paddingBottom: '12px' }}>
            <button 
              className={`btn btn-sm ${activeTab === 'upload' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setActiveTab('upload')}
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <Upload size={14} /> Upload Local CSV / JSON File
            </button>
            <button 
              className={`btn btn-sm ${activeTab === 'presets' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setActiveTab('presets')}
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <Zap size={14} /> 1-Click Unseen Presets
            </button>
            <button 
              className={`btn btn-sm ${activeTab === 'paste' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setActiveTab('paste')}
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <FileCode size={14} /> Paste CSV / JSON Text
            </button>
          </div>

          {/* Tab 1: Upload File */}
          {activeTab === 'upload' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{
                border: '2px dashed var(--accent-indigo)',
                borderRadius: 'var(--radius-lg)',
                padding: '36px 20px',
                textAlign: 'center',
                background: 'rgba(99, 102, 241, 0.03)',
                position: 'relative',
                transition: 'all 0.2s ease-in-out'
              }}>
                <Upload size={40} color="var(--accent-indigo)" style={{ opacity: 0.9, marginBottom: '12px' }} />
                <p style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  {fileName ? `Fee report: ${fileName}` : 'Choose fee report and upstream CSV files'}
                </p>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '6px' }}>
                  Select one fee report plus any unseen receiving, prep, pack, or returns CSV files together.
                </p>

                <input 
                  type="file" 
                  accept=".csv, .json"
                  multiple
                  onChange={handleFileUpload}
                  style={{
                    position: 'absolute',
                    inset: 0,
                    opacity: 0,
                    cursor: 'pointer'
                  }}
                />
              </div>

              {fileContent && (
                <div style={{ padding: '12px 16px', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <CheckCircle2 size={18} color="#10b981" />
                  <span style={{ fontSize: '0.82rem', color: 'var(--text-primary)' }}>
                    Loaded file content ({fileContent.split('\n').length} lines). Click <strong>Evaluate Unseen Sample Data</strong> to run evidence checks.
                  </span>
                </div>
              )}
              {Object.keys(uploadedUpstream).length > 0 && (
                <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                  Upstream evidence loaded: {Object.keys(uploadedUpstream).join(', ')}
                </div>
              )}
            </div>
          )}

          {/* Tab 2: Presets */}
          {activeTab === 'presets' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                Select a pre-configured unseen sample dataset to immediately run the evidence-first decision engine:
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div 
                  onClick={() => handleSelectPreset('unseen')}
                  style={{
                    padding: '16px',
                    borderRadius: '10px',
                    border: selectedPreset === 'unseen' ? '2px solid var(--accent-indigo)' : '1px solid var(--border-light)',
                    background: selectedPreset === 'unseen' ? 'rgba(99, 102, 241, 0.12)' : 'var(--bg-card)',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, fontSize: '0.9rem', marginBottom: '6px' }}>
                    <FileSpreadsheet size={16} color="var(--accent-indigo)" />
                    Unseen Fee & Reimbursements
                  </div>
                  <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                    Includes unseen sample charges across inbound defects, lost inventory, warehouse damage, and weight-tier fees.
                  </p>
                </div>

                <div 
                  onClick={() => handleSelectPreset('heldout')}
                  style={{
                    padding: '16px',
                    borderRadius: '10px',
                    border: selectedPreset === 'heldout' ? '2px solid var(--accent-indigo)' : '1px solid var(--border-light)',
                    background: selectedPreset === 'heldout' ? 'rgba(99, 102, 241, 0.12)' : 'var(--bg-card)',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, fontSize: '0.9rem', marginBottom: '6px' }}>
                    <Zap size={16} color="var(--accent-cyan)" />
                    Heldout Evaluation Dataset
                  </div>
                  <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                    Sample heldout cases designed for evaluating tenant isolation and conservative verdict logic.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Tab 3: Paste CSV/JSON */}
          {activeTab === 'paste' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <FileSpreadsheet size={14} color="var(--accent-indigo)" />
                  1. Fee / Reimbursement Report CSV (Required)
                </label>
                <textarea 
                  className="input-field"
                  rows={6}
                  placeholder={`line_id,report_type,charge_type,unit_id,org_id,sku,amount_usd,posted_date\nFEE-NEW-01,fee_report,inbound_defect_fee,UNIT-0003,org_demo_bravo,SKU-PUZZLE-500,14.50,2026-07-01\nFEE-NEW-02,inventory_adjustment,lost_inbound,UNIT-0005,org_demo_alpha,SKU-LEASH-6FT,38.00,2026-07-02`}
                  value={feeReportContent}
                  onChange={(e) => setFeeReportContent(e.target.value)}
                  style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Layers size={14} color="var(--accent-cyan)" />
                  2. Custom Upstream Receiving Records CSV (Optional — Default store used if empty)
                </label>
                <textarea 
                  className="input-field"
                  rows={3}
                  placeholder={`record_id,unit_id,org_id,sku,qty_ordered,qty_received,carton_damage,unit_damage\nRCV-NEW-01,UNIT-0003,org_demo_bravo,SKU-PUZZLE-500,48,48,none,none`}
                  value={upstreamReceiving}
                  onChange={(e) => setUpstreamReceiving(e.target.value)}
                  style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem' }}
                />
              </div>
            </div>
          )}

          {/* Policy Reminder */}
          <div style={{
            fontSize: '0.78rem',
            color: 'var(--text-secondary)',
            background: 'rgba(99, 102, 241, 0.06)',
            padding: '12px 16px',
            borderRadius: 'var(--radius-md)',
            border: '1px solid rgba(99, 102, 241, 0.2)',
            display: 'flex',
            alignItems: 'center',
            gap: '10px'
          }}>
            <Sparkles size={18} color="var(--accent-indigo)" style={{ flexShrink: 0 }} />
            <span>Unseen records will be tenant-matched by <strong>org_id + unit_id</strong> and evaluated through deterministic evidence checks to determine defensible recovery outcomes.</span>
          </div>

          {/* Action Footer */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <button className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>

            <button 
              className="btn btn-primary"
              onClick={handleRunImport}
              disabled={!canSubmit()}
              style={{ fontWeight: 700 }}
            >
              <Play size={16} /> Evaluate Unseen Sample Data
            </button>
          </div>

        </div>
      </div>
    </div>
  );
};
