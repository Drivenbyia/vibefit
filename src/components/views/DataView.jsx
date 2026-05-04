import { useState, useRef } from 'react';
import { Download, Upload, Trash2, Check, AlertCircle } from 'lucide-react';
import { PALETTE } from '../../constants/config.js';
import { exportBackup, importBackup } from '../../utils/backupUtils.js';
import Card from '../ui/Card.jsx';

export default function DataView({ data, setData }) {
  const [importStatus, setImportStatus] = useState(null);
  const fileInputRef = useRef(null);

  const handleExport = () => exportBackup(data);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!window.confirm('Êtes-vous sûr de vouloir écraser vos données actuelles ?')) {
      e.target.value = '';
      return;
    }
    importBackup(
      file,
      (parsed) => {
        try {
          if (!parsed.days || typeof parsed.days !== 'object') {
            throw new Error('Format invalide');
          }
          setData((prev) => ({ ...prev, days: { ...prev.days, ...parsed.days } }));
          setImportStatus({ ok: true, msg: `Importé ${Object.keys(parsed.days).length} jour(s)` });
        } catch (err) {
          setImportStatus({ ok: false, msg: 'Fichier invalide : ' + err.message });
        }
        setTimeout(() => setImportStatus(null), 3000);
      },
      (err) => {
        setImportStatus({ ok: false, msg: 'Fichier invalide : ' + err.message });
        setTimeout(() => setImportStatus(null), 3000);
      },
    );
    e.target.value = '';
  };

  const reset = () => {
    if (confirm('Effacer TOUTES les données ? Cette action est irréversible.')) {
      setData({ days: {} });
    }
  };

  const dayCount = Object.keys(data.days).length;

  return (
    <div style={{ padding: '14px 14px 100px', display: 'flex', flexDirection: 'column', gap: 12 }}>
      <Card>
        <div style={{ fontSize: 11, fontWeight: 700, color: PALETTE.muted, letterSpacing: '0.1em', marginBottom: 12 }}>
          ÉTAT
        </div>
        <div className="vf-display vf-tabular" style={{ fontSize: 32, fontWeight: 900, lineHeight: 1 }}>
          {dayCount}
          <span className="vf-body" style={{ fontSize: 13, fontWeight: 500, color: PALETTE.muted, marginLeft: 6 }}>
            {dayCount > 1 ? 'jours saisis' : 'jour saisi'}
          </span>
        </div>
      </Card>

      <Card>
        <div style={{ fontSize: 11, fontWeight: 700, color: PALETTE.muted, letterSpacing: '0.1em', marginBottom: 12 }}>
          BACKUP
        </div>
        <button
          onClick={handleExport}
          style={{
            width: '100%', padding: '14px',
            background: PALETTE.ink, color: '#fff', border: 'none',
            borderRadius: 10, fontWeight: 700, fontSize: 14,
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
            background: PALETTE.paper, color: PALETTE.ink,
            border: `1px solid ${PALETTE.line}`,
            borderRadius: 10, fontWeight: 700, fontSize: 14,
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
          onChange={handleFileChange}
          style={{ display: 'none' }}
        />
        {importStatus && (
          <div
            style={{
              marginTop: 10, padding: 10, borderRadius: 8,
              background: importStatus.ok ? PALETTE.deepSoft : PALETTE.highlight,
              color: importStatus.ok ? PALETTE.deep : PALETTE.accentDark,
              fontSize: 12, display: 'flex', gap: 8, alignItems: 'center',
            }}
          >
            {importStatus.ok ? <Check size={14} /> : <AlertCircle size={14} />}
            {importStatus.msg}
          </div>
        )}
      </Card>

      <Card>
        <div style={{ fontSize: 11, fontWeight: 700, color: PALETTE.muted, letterSpacing: '0.1em', marginBottom: 12 }}>
          DANGER
        </div>
        <button
          onClick={reset}
          style={{
            width: '100%', padding: '14px',
            background: 'transparent', color: PALETTE.accentDark,
            border: `1px solid ${PALETTE.accentDark}`,
            borderRadius: 10, fontWeight: 700, fontSize: 14,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            cursor: 'pointer',
          }}
          className="vf-body"
        >
          <Trash2 size={18} />
          Tout effacer
        </button>
      </Card>

      <Card style={{ background: PALETTE.highlight, borderColor: PALETTE.accent }}>
        <div style={{ display: 'flex', gap: 10 }}>
          <div style={{ flexShrink: 0, width: 4, alignSelf: 'stretch', background: PALETTE.accent, borderRadius: 2 }} />
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: PALETTE.accentDark, letterSpacing: '0.04em', marginBottom: 6, textTransform: 'uppercase' }}>
              Backup
            </div>
            <div style={{ fontSize: 13, color: PALETTE.ink, lineHeight: 1.5 }}>
              Tes données sont stockées dans le
              <code style={{ background: '#fff', padding: '1px 6px', borderRadius: 4, fontSize: 12, margin: '0 4px' }}>
                localStorage
              </code>
              de ton navigateur (uniquement sur cet appareil).
              Pense à <strong>exporter le JSON chaque dimanche</strong> en backup —
              si tu changes de navigateur ou nettoies tes données, tu pourras tout réimporter.
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
