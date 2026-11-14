import { memo } from 'react';
import { ClipboardPaste } from 'lucide-react';
import { PALETTE } from '../../../constants/config.js';
import Card from '../../ui/Card.jsx';

/**
 * Import du raccourci iOS « VibeFit Santé » : le raccourci copie les valeurs
 * du jour (Santé + MyFitnessPal) dans le presse-papier, ce bouton les colle.
 * Rien n'est écrasé : seuls les champs vides sont remplis.
 */
function HealthImportCard({ status, onImport }) {
  return (
    <Card>
      <button
        type="button"
        onClick={onImport}
        className="vf-body"
        style={{
          width: '100%', minHeight: 44, padding: '10px 14px', borderRadius: 12,
          background: PALETTE.surfaceRaised, color: PALETTE.ink, border: `1px solid ${PALETTE.line}`,
          fontWeight: 700, fontSize: 14, cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        }}
      >
        <ClipboardPaste size={18} color={PALETTE.deep} />
        Importer depuis Santé
      </button>
      <div role="status" style={{ fontSize: 11, color: status ? (status.ok ? PALETTE.deep : PALETTE.warn) : PALETTE.muted, marginTop: 6, lineHeight: 1.4 }}>
        {status ? status.msg : 'Lance d’abord le raccourci « VibeFit Santé ». Les saisies existantes ne sont jamais écrasées.'}
      </div>
    </Card>
  );
}

export default memo(HealthImportCard);
