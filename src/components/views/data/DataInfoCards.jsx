import { Trash2 } from 'lucide-react';
import { PALETTE } from '../../../constants/config.js';
import Card from '../../ui/Card.jsx';

export function StatusCard({ dayCount }) {
  return (
    <Card>
      <div className="vf-display" style={{ fontSize: 11, color: PALETTE.muted, letterSpacing: '0.1em', marginBottom: 12 }}>
        ÉTAT
      </div>
      <div className="vf-hero vf-tabular" style={{ fontSize: 32, lineHeight: 1 }}>
        {dayCount}
        <span className="vf-body" style={{ fontSize: 13, fontWeight: 500, color: PALETTE.muted, marginLeft: 6 }}>
          {dayCount > 1 ? 'jours saisis' : 'jour saisi'}
        </span>
      </div>
    </Card>
  );
}

export function DangerCard({ onReset }) {
  return (
    <Card>
      <div className="vf-display" style={{ fontSize: 11, color: PALETTE.muted, letterSpacing: '0.1em', marginBottom: 12 }}>
        DANGER
      </div>
      <button
        onClick={onReset}
        style={{
          width: '100%', padding: '14px',
          background: 'transparent', color: PALETTE.alert,
          border: `1px solid ${PALETTE.alert}`,
          borderRadius: 12, fontWeight: 700, fontSize: 14,
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          cursor: 'pointer',
        }}
        className="vf-body"
      >
        <Trash2 size={18} />
        Tout effacer
      </button>
    </Card>
  );
}

export function BackupHintCard() {
  return (
    <Card style={{ background: PALETTE.warnSoft, borderColor: PALETTE.warn }}>
      <div style={{ display: 'flex', gap: 10 }}>
        <div style={{ flexShrink: 0, width: 4, alignSelf: 'stretch', background: PALETTE.warn, borderRadius: 3 }} />
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: PALETTE.warn, letterSpacing: '0.04em', marginBottom: 6, textTransform: 'uppercase' }}>
            Backup
          </div>
          <div style={{ fontSize: 13, color: PALETTE.ink, lineHeight: 1.5 }}>
            Tes données sont stockées dans le
            <code style={{ background: PALETTE.surface, padding: '1px 6px', borderRadius: 2, fontSize: 12, margin: '0 4px' }}>
              localStorage
            </code>
            de ton navigateur (uniquement sur cet appareil).
            Pense à <strong>exporter le JSON chaque dimanche</strong> en backup —
            si tu changes de navigateur ou nettoies tes données, tu pourras tout réimporter.
          </div>
        </div>
      </div>
    </Card>
  );
}
