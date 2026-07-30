import { useRef } from 'react';
import { Download, Upload, Check, AlertCircle } from 'lucide-react';
import { PALETTE } from '../../../constants/config.js';
import Card from '../../ui/Card.jsx';

export default function BackupCard({ onExport, onFileChange, importStatus }) {
  const fileInputRef = useRef(null);

  return (
    <Card>
      <div className="vf-display" style={{ fontSize: 11, color: PALETTE.muted, letterSpacing: '0.1em', marginBottom: 12 }}>
        BACKUP
      </div>
      <button
        onClick={onExport}
        style={{
          width: '100%', padding: '14px',
          background: PALETTE.ink, color: PALETTE.inkSoft, border: 'none',
          borderRadius: 12, fontWeight: 700, fontSize: 14,
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          cursor: 'pointer', marginBottom: 8, minHeight: 44,
        }}
        className="vf-body"
      >
        <Download size={18} />
        Exporter en JSON
      </button>
      <button
        onClick={() => fileInputRef.current?.click()}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          width: '100%', padding: '14px',
          background: PALETTE.bg, color: PALETTE.ink,
          border: `1px solid ${PALETTE.line}`,
          borderRadius: 12, fontWeight: 700, fontSize: 14,
          cursor: 'pointer', minHeight: 44,
        }}
        className="vf-body"
      >
        <Upload size={18} />
        Importer un JSON
      </button>
      <input
        ref={fileInputRef}
        type="file"
        accept="application/json"
        onChange={onFileChange}
        style={{ display: 'none' }}
      />
      {importStatus && (
        <div
          style={{
            marginTop: 10, padding: 10, borderRadius: 12,
            background: importStatus.ok ? PALETTE.deepSoft : PALETTE.alertSoft,
            color: importStatus.ok ? PALETTE.deep : PALETTE.alert,
            fontSize: 12, display: 'flex', gap: 8, alignItems: 'center',
          }}
        >
          {importStatus.ok ? <Check size={14} /> : <AlertCircle size={14} />}
          {importStatus.msg}
        </div>
      )}
    </Card>
  );
}
