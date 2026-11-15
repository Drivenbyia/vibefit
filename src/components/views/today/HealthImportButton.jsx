import { memo } from 'react';
import { HeartPulse } from 'lucide-react';
import { PALETTE, sticker } from '../../../constants/config.js';

/**
 * Import Santé en UN appui : lit le presse-papier rempli par le raccourci iOS
 * « VibeFit Santé » et ne remplit que les champs vides. Toujours visible en
 * tête d'Aujourd'hui, et repris dans le panneau de saisie (`compact`).
 */
function HealthImportButton({ status, onImport, compact = false }) {
  const tone = status ? (status.ok ? PALETTE.deep : PALETTE.warn) : PALETTE.muted;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <button
        type="button"
        onClick={onImport}
        className="vf-display vf-press"
        style={{
          minHeight: compact ? 48 : 56, width: '100%', borderRadius: 18, cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
          fontSize: 13, letterSpacing: '0.06em',
          background: compact ? 'transparent' : PALETTE.ink,
          color: compact ? PALETTE.ink : PALETTE.inkSoft,
          border: compact ? `1px solid ${PALETTE.line}` : 'none',
          boxShadow: compact ? 'none' : sticker(PALETTE.alert, 3),
        }}
      >
        <HeartPulse size={18} color={PALETTE.alert} aria-hidden="true" />
        IMPORTER DEPUIS SANTÉ
      </button>
      {(status || !compact) && (
        <div role="status" className="vf-body" style={{ fontSize: 11, color: tone, lineHeight: 1.4, textAlign: 'center' }}>
          {status ? status.msg : 'Lance le raccourci « VibeFit Santé », puis touche ici. Rien n’est écrasé.'}
        </div>
      )}
    </div>
  );
}

export default memo(HealthImportButton);
